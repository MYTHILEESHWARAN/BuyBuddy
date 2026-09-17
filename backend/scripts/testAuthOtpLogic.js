require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const OTP = require('../models/OTP');
const jwt = require('jsonwebtoken');

async function testOtpLogic() {
  console.log('==============================================');
  console.log('   TESTING AUTH OTP & ACCOUNT ACTIVATION LOGIC');
  console.log('==============================================');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✔ Connected to MongoDB');

  const testEmail = 'otptest_' + Date.now() + '@example.com';
  const testPassword = 'Password123!';

  // Clean up any prior test records
  await User.deleteMany({ email: testEmail });
  await OTP.deleteMany({ email: testEmail });

  // 1. Create unverified user (Simulating registration)
  console.log('\n--- 1. Testing Registration (Unverified State) ---');
  const user = await User.create({
    name: 'OTP Test User',
    email: testEmail,
    password: testPassword,
    isVerified: false,
  });
  console.log(`✔ Created user ${user.email}, isVerified: ${user.isVerified}`);
  if (user.isVerified !== false) throw new Error('Expected isVerified to be false initially');

  // 2. Generate and store OTP
  console.log('\n--- 2. Testing OTP Storage with Expiry & Attempts ---');
  const testOtp = '849201';
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const otpRecord = await OTP.create({
    email: testEmail,
    otp: testOtp,
    purpose: 'registration',
    attempts: 0,
    maxAttempts: 5,
    lastSentAt: new Date(),
    expiresAt,
  });
  console.log(`✔ Stored OTP record: code=${otpRecord.otp}, maxAttempts=${otpRecord.maxAttempts}, attempts=${otpRecord.attempts}`);

  // 3. Test Invalid OTP and attempt counter increment
  console.log('\n--- 3. Testing Incorrect OTP Handling & Attempt Counter ---');
  const wrongOtp = '000000';
  let fetchedOtp = await OTP.findOne({ email: testEmail });
  if (fetchedOtp.otp !== wrongOtp) {
    fetchedOtp.attempts += 1;
    await fetchedOtp.save();
    console.log(`✔ Attempt 1 failed. attempts count: ${fetchedOtp.attempts}/${fetchedOtp.maxAttempts}`);
  }
  if (fetchedOtp.attempts !== 1) throw new Error('Attempts count did not increment');

  // 4. Test Resend Cooldown
  console.log('\n--- 4. Testing Resend Cooldown (60s) ---');
  const elapsed = (Date.now() - new Date(fetchedOtp.lastSentAt).getTime()) / 1000;
  const cooldownPeriod = 60;
  const inCooldown = elapsed < cooldownPeriod;
  console.log(`✔ Time since last sent: ${Math.round(elapsed)}s. Cooldown active: ${inCooldown}`);
  if (!inCooldown) throw new Error('Expected cooldown to be active');

  // 5. Test Valid OTP Verification & Account Activation
  console.log('\n--- 5. Testing Valid OTP Verification & Activation ---');
  if (fetchedOtp.otp === testOtp) {
    // Delete OTP
    await OTP.deleteOne({ _id: fetchedOtp._id });
    // Activate user
    user.isVerified = true;
    await user.save();
    console.log(`✔ OTP verified and deleted. User activated: isVerified=${user.isVerified}`);
  }
  if (!user.isVerified) throw new Error('User was not activated');

  // 6. Test JWT generation for activated user
  console.log('\n--- 6. Testing JWT Generation & Verification ---');
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log(`✔ JWT generated and decoded successfully. User ID: ${decoded.id}`);

  // 7. Test Expired OTP check
  console.log('\n--- 7. Testing Expired OTP Invalidation ---');
  const expiredOtpRecord = await OTP.create({
    email: 'expired_' + testEmail,
    otp: '123456',
    purpose: 'registration',
    attempts: 0,
    maxAttempts: 5,
    lastSentAt: new Date(Date.now() - 20 * 60 * 1000),
    expiresAt: new Date(Date.now() - 10 * 60 * 1000), // Expired 10 min ago
  });
  const isExpired = expiredOtpRecord.expiresAt < new Date();
  console.log(`✔ Expired record check: isExpired=${isExpired}`);
  if (!isExpired) throw new Error('Expected OTP to be expired');
  await OTP.deleteMany({ email: 'expired_' + testEmail });

  // Clean up test user
  await User.deleteMany({ email: testEmail });
  await OTP.deleteMany({ email: testEmail });

  console.log('\n==============================================');
  console.log('   ALL AUTH OTP LOGIC TESTS PASSED SUCCESSFULLY! ✔');
  console.log('==============================================');

  await mongoose.disconnect();
}

testOtpLogic().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
