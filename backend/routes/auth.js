const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
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
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) throw new Error('Passwords do not match');
      return true;
    }),
  ],
  register
);

// Login
router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  login
);

// Verify OTP
router.post('/verify-otp', verifyOtp);

// Resend OTP
router.post('/resend-otp', resendOtp);

// SMTP configuration status (non-sensitive)
router.get('/smtp-status', getSmtpConfigStatus);

// Send test email (safe test endpoint)
router.post('/test-smtp', testSmtp);

// Get current user
router.get('/me', protect, getMe);

// Address Management
router.get('/addresses', protect, getAddresses);
router.post('/addresses', protect, addAddress);
router.delete('/addresses/:id', protect, deleteAddress);

module.exports = router;
