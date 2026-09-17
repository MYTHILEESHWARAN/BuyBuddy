const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const OTP = require('../models/OTP');
const emailService = require('../services/emailService');

// ──────────────────────────────────────────
// Helper: generate JWT
// ──────────────────────────────────────────
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// ──────────────────────────────────────────
// Helper: generate secure 6-digit OTP
// ──────────────────────────────────────────
const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

// ──────────────────────────────────────────
// @route   POST /api/auth/register
// @desc    Register a new user & send real OTP to verify email
// @access  Public
// ──────────────────────────────────────────
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  const { name, email, password } = req.body;
  const cleanEmail = email.toLowerCase().trim();

  try {
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser && existingUser.isVerified) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    let user;
    if (existingUser && !existingUser.isVerified) {
      // User registered previously but never verified their email — update info
      existingUser.name = name;
      existingUser.password = password; // Will be hashed by pre('save')
      user = await existingUser.save();
    } else {
      // Create new unverified user
      user = await User.create({ name, email: cleanEmail, password, isVerified: false });
    }

    // Generate secure 6-digit OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    await OTP.findOneAndDelete({ email: cleanEmail });
    await OTP.create({
      email: cleanEmail,
      otp,
      purpose: 'registration',
      attempts: 0,
      maxAttempts: 5,
      lastSentAt: new Date(),
      expiresAt,
    });

    // Send real email OTP via SMTP (fall back to console log in dev)
    try {
      await emailService.sendOTPEmail(cleanEmail, otp, 'registration');
    } catch (emailError) {
      console.error(`[AUTH] Registration OTP dispatch failed: ${emailError.message}`);
      // DEV MODE: If SMTP not configured, print OTP to console so dev can still test
      console.warn(`\n${'='.repeat(50)}`);
      console.warn(`[DEV] REGISTRATION OTP for ${cleanEmail}: ${otp}`);
      console.warn(`[DEV] Copy this OTP and paste it in the browser`);
      console.warn(`${'='.repeat(50)}\n`);
    }

    return res.status(201).json({
      success: true,
      message: 'Registration initiated! A verification code has been sent to your email.',
      email: user.email,
      requiresOtp: true,
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// ──────────────────────────────────────────
// @route   POST /api/auth/login
// @desc    Verify password, send OTP to email
// @access  Public
// ──────────────────────────────────────────
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  const { email, password } = req.body;
  const cleanEmail = email.toLowerCase().trim();

  try {
    const user = await User.findOne({ email: cleanEmail }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if account has not been verified yet
    const purpose = user.isVerified ? 'login' : 'registration';

    // Generate secure 6-digit OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OTP.findOneAndDelete({ email: cleanEmail });
    await OTP.create({
      email: cleanEmail,
      otp,
      purpose,
      attempts: 0,
      maxAttempts: 5,
      lastSentAt: new Date(),
      expiresAt,
    });

    // Send real email OTP via SMTP (fall back to console log in dev)
    try {
      await emailService.sendOTPEmail(cleanEmail, otp, purpose);
    } catch (emailError) {
      console.error(`[AUTH] Login OTP dispatch failed: ${emailError.message}`);
      // DEV MODE: If SMTP not configured, print OTP to console so dev can still test
      console.warn(`\n${'='.repeat(50)}`);
      console.warn(`[DEV] LOGIN OTP for ${cleanEmail}: ${otp}`);
      console.warn(`[DEV] Copy this OTP and paste it in the browser`);
      console.warn(`${'='.repeat(50)}\n`);
    }

    const message = user.isVerified
      ? 'OTP sent to your email address. Please verify to complete login.'
      : 'Please verify your email address to activate your account. A verification code has been sent to your email.';

    return res.status(200).json({
      success: true,
      message,
      email: cleanEmail,
      requiresOtp: true,
      unverified: !user.isVerified,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// ──────────────────────────────────────────
// @route   POST /api/auth/verify-otp
// @desc    Verify OTP, activate account (if new), and issue JWT
// @access  Public
// ──────────────────────────────────────────
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanOtp = otp.toString().trim();

  try {
    const record = await OTP.findOne({ email: cleanEmail });

    if (!record) {
      return res.status(400).json({ message: 'OTP has expired or was not requested. Please request a new code.' });
    }

    // Check expiration
    if (record.expiresAt < new Date()) {
      await OTP.findOneAndDelete({ email: cleanEmail });
      return res.status(400).json({ message: 'OTP has expired. Please request a new code.' });
    }

    // Check maximum attempts
    if (record.attempts >= record.maxAttempts) {
      await OTP.findOneAndDelete({ email: cleanEmail });
      return res.status(429).json({ message: 'Maximum verification attempts exceeded. Please request a new code.' });
    }

    // Validate OTP code
    if (record.otp !== cleanOtp) {
      record.attempts += 1;
      if (record.attempts >= record.maxAttempts) {
        await OTP.findOneAndDelete({ email: cleanEmail });
        return res.status(400).json({ message: 'Incorrect OTP. Maximum attempts exceeded. Please request a new code.' });
      }
      await record.save();
      const remaining = record.maxAttempts - record.attempts;
      return res.status(400).json({ message: `Invalid OTP. You have ${remaining} attempt(s) remaining.` });
    }

    // OTP is valid — remove record to prevent replay
    await OTP.findOneAndDelete({ email: cleanEmail });

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ message: 'User account not found' });
    }

    // Activate account if this was an email verification
    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    // Generate JWT
    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// ──────────────────────────────────────────
// @route   POST /api/auth/resend-otp
// @desc    Resend OTP to email with 60-second cooldown
// @access  Public
// ──────────────────────────────────────────
const resendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  const cleanEmail = email.toLowerCase().trim();

  try {
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      // Avoid user enumeration
      return res.status(200).json({ message: 'If that email exists, a new OTP has been sent.' });
    }

    // Enforce 60-second resend cooldown
    const existingRecord = await OTP.findOne({ email: cleanEmail });
    if (existingRecord && existingRecord.lastSentAt) {
      const elapsedSeconds = (Date.now() - new Date(existingRecord.lastSentAt).getTime()) / 1000;
      const cooldownPeriod = 60; // 60 seconds
      if (elapsedSeconds < cooldownPeriod) {
        const remainingWait = Math.ceil(cooldownPeriod - elapsedSeconds);
        return res.status(429).json({
          message: `Please wait ${remainingWait} second(s) before requesting another OTP.`,
          cooldownRemaining: remainingWait,
        });
      }
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const purpose = existingRecord?.purpose || (user.isVerified ? 'login' : 'registration');

    await OTP.findOneAndDelete({ email: cleanEmail });
    await OTP.create({
      email: cleanEmail,
      otp,
      purpose,
      attempts: 0,
      maxAttempts: 5,
      lastSentAt: new Date(),
      expiresAt,
    });

    try {
      await emailService.sendOTPEmail(cleanEmail, otp, purpose);
    } catch (emailError) {
      console.error(`[AUTH] Resend OTP dispatch failed: ${emailError.message}`);
      // DEV MODE: If SMTP not configured, print OTP to console so dev can still test
      console.warn(`\n${'='.repeat(50)}`);
      console.warn(`[DEV] RESEND OTP for ${cleanEmail}: ${otp}`);
      console.warn(`[DEV] Copy this OTP and paste it in the browser`);
      console.warn(`${'='.repeat(50)}\n`);
    }

    return res.status(200).json({ message: 'A new OTP has been sent to your email.' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// ──────────────────────────────────────────
// @route   GET /api/auth/smtp-status
// @desc    Check whether SMTP is configured (non-sensitive)
// @access  Public
// ──────────────────────────────────────────
const getSmtpConfigStatus = async (req, res) => {
  const status = emailService.getSmtpStatus();
  return res.status(200).json({
    smtp: status,
  });
};

// ──────────────────────────────────────────
// @route   POST /api/auth/test-smtp
// @desc    Send test email to verify SMTP delivery
// @access  Public / Protected
// ──────────────────────────────────────────
const testSmtp = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Recipient email is required for test' });
  }

  try {
    const result = await emailService.sendTestEmail(email);
    return res.status(200).json({
      success: true,
      message: `Test email sent successfully to ${email}`,
      messageId: result.messageId,
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      message: error.message,
    });
  }
};

// ──────────────────────────────────────────
// @route   GET /api/auth/me
// @desc    Get current authenticated user
// @access  Private
// ──────────────────────────────────────────
const getMe = async (req, res) => {
  return res.status(200).json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role || 'user',
      isVerified: req.user.isVerified,
      addresses: req.user.addresses || [],
    },
  });
};

// ──────────────────────────────────────────
// @route   GET /api/auth/addresses
// @desc    Get user's saved shipping addresses
// @access  Private
// ──────────────────────────────────────────
const getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    return res.status(200).json({ addresses: user.addresses || [] });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching addresses' });
  }
};

// ──────────────────────────────────────────
// @route   POST /api/auth/addresses
// @desc    Add a new shipping address
// @access  Private
// ──────────────────────────────────────────
const addAddress = async (req, res) => {
  const { fullName, phone, address, city, state, postalCode, landmark, isDefault } = req.body;
  if (!fullName || !phone || !address || !city || !state || !postalCode) {
    return res.status(400).json({ message: 'All required address fields must be filled' });
  }

  try {
    const user = await User.findById(req.user._id);
    if (isDefault && user.addresses) {
      user.addresses.forEach((a) => (a.isDefault = false));
    }

    user.addresses.push({
      fullName,
      phone,
      address,
      city,
      state,
      postalCode,
      landmark: landmark || '',
      isDefault: isDefault || user.addresses.length === 0,
    });

    await user.save();
    return res.status(201).json({ message: 'Address added successfully', addresses: user.addresses });
  } catch (error) {
    return res.status(500).json({ message: 'Error saving address' });
  }
};

// ──────────────────────────────────────────
// @route   DELETE /api/auth/addresses/:id
// @desc    Delete a saved address
// @access  Private
// ──────────────────────────────────────────
const deleteAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.addresses = user.addresses.filter((a) => a._id.toString() !== req.params.id);
    await user.save();
    return res.status(200).json({ message: 'Address deleted successfully', addresses: user.addresses });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting address' });
  }
};

module.exports = {
  register,
  login,
  verifyOtp,
  resendOtp,
  getSmtpConfigStatus,
  testSmtp,
  getMe,
  getAddresses,
  addAddress,
  deleteAddress,
};
