require('dotenv').config();
const emailService = require('../services/emailService');

async function runTest() {
  console.log('==============================================');
  console.log('       SHOPNOW REAL SMTP AUDIT & TEST         ');
  console.log('==============================================');
  
  const status = emailService.getSmtpStatus();
  console.log('1. SMTP Environment Configuration:');
  console.log(`   - SMTP_HOST: ${status.host}`);
  console.log(`   - SMTP_PORT: ${status.port}`);
  console.log(`   - SMTP_USER Configured: ${status.hasUser ? 'YES' : 'NO (or placeholder)'}`);
  console.log(`   - SMTP_FROM: ${status.from}`);
  console.log(`   - Overall Configured Status: ${status.configured ? 'READY' : 'NOT CONFIGURED / PLACEHOLDER'}`);
  console.log('----------------------------------------------');

  console.log('2. Testing SMTP Connection:');
  const connResult = await emailService.verifySmtpConnection();
  console.log(`   - Connection Result: ${connResult.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`   - Message: ${connResult.message}`);
  console.log('----------------------------------------------');

  const testEmail = process.argv[2] || process.env.SMTP_USER || process.env.EMAIL_USER;
  if (status.configured && testEmail && !testEmail.includes('your_')) {
    console.log(`3. Attempting to send live test email to: ${testEmail}`);
    try {
      const sendResult = await emailService.sendTestEmail(testEmail);
      console.log('   - Result: SUCCESS');
      console.log(`   - Message ID: ${sendResult.messageId}`);
    } catch (err) {
      console.log('   - Result: FAILED');
      console.log(`   - Error: ${err.message}`);
    }
  } else {
    console.log('3. Live Email Send Test:');
    console.log('   - SKIPPED: Valid external SMTP credentials are not yet configured in backend/.env.');
    console.log('   - Please provide SMTP_USER and SMTP_PASSWORD to send to a real inbox.');
  }

  console.log('==============================================');
}

runTest().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error during test:', err);
  process.exit(1);
});
