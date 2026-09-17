const emailService = require('../services/emailService');

module.exports = {
  sendOTPEmail: emailService.sendOTPEmail,
  isEmailConfigured: emailService.isSmtpConfigured,
  sendEmail: emailService.sendEmail,
};
