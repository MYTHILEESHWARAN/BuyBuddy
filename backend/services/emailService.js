const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * Validates whether SMTP configuration contains non-placeholder credentials
 */
const isSmtpConfigured = () => {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.EMAIL_PASS;
  
  if (!user || !pass) return false;
  if (user === 'your_gmail@gmail.com' || user === 'your_email@gmail.com') return false;
  if (pass === 'your_gmail_app_password' || pass === 'your_app_password') return false;
  if (user.includes('example.com')) return false;

  return true;
};

/**
 * Returns SMTP configuration status without exposing sensitive secrets
 */
const getSmtpStatus = () => {
  const configured = isSmtpConfigured();
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || '';
  const from = process.env.SMTP_FROM || (user ? `ShopNow <${user}>` : 'ShopNow <no-reply@shopnow.com>');

  return {
    configured,
    host,
    port,
    hasUser: !!user && !user.includes('your_'),
    from,
  };
};

/**
 * Creates and returns a Nodemailer transporter instance
 */
const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error('SMTP credentials are missing. Please configure SMTP_USER and SMTP_PASSWORD in backend/.env');
  }

  const isSecure = port === 465;

  const transportOptions = {
    host,
    port,
    secure: isSecure,
    auth: {
      user,
      pass,
    },
    // Useful for cloud hosting and various SMTP providers
    tls: {
      rejectUnauthorized: false,
    },
  };

  return nodemailer.createTransport(transportOptions);
};

/**
 * Verifies SMTP connection and credentials
 */
const verifySmtpConnection = async () => {
  if (!isSmtpConfigured()) {
    return {
      success: false,
      message: 'SMTP credentials are not configured or are set to placeholder values in backend/.env',
    };
  }

  try {
    const transporter = createTransporter();
    await transporter.verify();
    return { success: true, message: 'SMTP server is ready to send emails' };
  } catch (error) {
    return {
      success: false,
      message: `SMTP connection failed: ${error.message}`,
    };
  }
};

/**
 * Core email sending function using Nodemailer
 * @param {Object} options - { to, subject, html, text }
 */
const sendEmail = async ({ to, subject, html, text }) => {
  if (!to) {
    throw new Error('Recipient email address is required');
  }

  if (!isSmtpConfigured()) {
    const errMessage = 'SMTP is not configured with valid credentials. Please configure SMTP_USER and SMTP_PASSWORD in backend/.env';
    console.error(`[SMTP ERROR] OTP email failed: ${errMessage}`);
    throw new Error(errMessage);
  }

  const transporter = createTransporter();
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const fromAddress = process.env.SMTP_FROM || `ShopNow <${user}>`;

  const mailOptions = {
    from: fromAddress,
    to: to.trim().toLowerCase(),
    subject,
    html,
    text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP SUCCESS] OTP email sent successfully to ${to} (MessageID: ${info.messageId})`);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error(`[SMTP ERROR] OTP email failed: ${error.message}`);
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};

/**
 * Sends a 6-digit OTP email with ShopNow branding, expiry, security notice, and text fallback
 * @param {string} toEmail - Recipient email
 * @param {string} otp - 6-digit OTP code
 * @param {'registration'|'login'|'resend'} type - Context of the OTP
 */
const sendOTPEmail = async (toEmail, otp, type = 'registration') => {
  const isRegistration = type === 'registration';
  const title = isRegistration ? 'Email Verification Code' : 'Login Verification Code';
  const actionText = isRegistration
    ? 'Thank you for registering with ShopNow! Please use the 6-digit verification code below to activate your account.'
    : 'We received a login request for your ShopNow account. Please use the 6-digit verification code below to continue.';

  const subject = isRegistration
    ? 'ShopNow - Your Email Verification OTP'
    : 'ShopNow - Your Login Verification OTP';

  const plainText = `ShopNow - ${title}\n\n` +
    `${actionText}\n\n` +
    `Your Verification Code: ${otp}\n\n` +
    `This code will expire in 10 minutes.\n\n` +
    `Security Notice: If you did not request this code, please ignore this email or contact support. Never share your OTP with anyone.\n\n` +
    `Best regards,\n` +
    `ShopNow Security Team\n` +
    `https://shopnow.com`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #f1f5f9;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #1e293b;
          -webkit-font-smoothing: antialiased;
        }
        .wrapper {
          width: 100%;
          table-layout: fixed;
          background-color: #f1f5f9;
          padding: 40px 16px;
        }
        .main-card {
          max-width: 520px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.08);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
          padding: 32px 24px;
          text-align: center;
          color: #ffffff;
        }
        .brand-name {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.5px;
          margin: 0;
          color: #ffffff;
        }
        .brand-tagline {
          font-size: 13px;
          opacity: 0.9;
          margin-top: 4px;
          letter-spacing: 0.2px;
        }
        .content {
          padding: 36px 32px 28px;
        }
        .greeting {
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 12px;
        }
        .instruction {
          font-size: 15px;
          line-height: 1.6;
          color: #475569;
          margin: 0 0 28px;
        }
        .otp-container {
          background: #f8fafc;
          border: 2px dashed #6366f1;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          margin-bottom: 28px;
        }
        .otp-label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          font-weight: 700;
          color: #6366f1;
          margin-bottom: 8px;
        }
        .otp-code {
          font-family: 'Courier New', Courier, monospace;
          font-size: 40px;
          font-weight: 800;
          letter-spacing: 10px;
          color: #1e1b4b;
          margin: 0;
        }
        .expiry-badge {
          display: inline-block;
          background-color: #fef3c7;
          color: #92400e;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 9999px;
          margin-top: 12px;
        }
        .security-notice {
          background-color: #f8fafc;
          border-left: 4px solid #f59e0b;
          border-radius: 4px;
          padding: 14px 16px;
          margin-bottom: 24px;
        }
        .security-notice p {
          margin: 0;
          font-size: 13px;
          line-height: 1.5;
          color: #64748b;
        }
        .security-notice strong {
          color: #334155;
        }
        .footer {
          border-top: 1px solid #f1f5f9;
          padding: 24px 32px;
          background-color: #f8fafc;
          text-align: center;
        }
        .footer-text {
          font-size: 12px;
          color: #94a3b8;
          line-height: 1.6;
          margin: 0;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="main-card">
          <!-- Header -->
          <div class="header">
            <h1 class="brand-name">🛍 ShopNow</h1>
            <div class="brand-tagline">India's Trusted Shopping Destination</div>
          </div>
          
          <!-- Content -->
          <div class="content">
            <h2 class="greeting">${title}</h2>
            <p class="instruction">${actionText}</p>
            
            <!-- OTP Box -->
            <div class="otp-container">
              <div class="otp-label">Verification Code</div>
              <div class="otp-code">${otp}</div>
              <div class="expiry-badge">⏱ Valid for 10 minutes</div>
            </div>
            
            <!-- Security Warning -->
            <div class="security-notice">
              <p><strong>Security Tip:</strong> ShopNow staff will never call, email, or message you asking for this OTP code. Do not share it with anyone.</p>
            </div>
            
            <p style="font-size: 13px; color: #94a3b8; margin: 0;">If you didn't initiate this request, no action is needed — your account remains safe.</p>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <p class="footer-text">This is an automated security message from ShopNow E-Commerce.<br>© ${new Date().getFullYear()} ShopNow Inc. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: toEmail,
    subject,
    html,
    text: plainText,
  });
};

/**
 * Sends a test email to verify SMTP configuration
 */
const sendTestEmail = async (toEmail) => {
  const subject = 'ShopNow - SMTP Email Delivery Test';
  const text = 'This is a test email sent from the ShopNow E-Commerce backend to verify that Nodemailer SMTP delivery is functioning correctly.';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 20px auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #4f46e5;">🛍 ShopNow SMTP Test</h2>
      <p>Congratulations! Your SMTP configuration is working correctly.</p>
      <p style="color: #64748b; font-size: 14px;">Timestamp: ${new Date().toISOString()}</p>
      <p style="color: #16a34a; font-weight: bold;">✔ Email delivery verified.</p>
    </div>
  `;

  return await sendEmail({ to: toEmail, subject, html, text });
};

module.exports = {
  isSmtpConfigured,
  getSmtpStatus,
  verifySmtpConnection,
  sendEmail,
  sendOTPEmail,
  sendTestEmail,
};
