import { sendEmail } from './src/utils/emailService';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from the same directory
dotenv.config({ path: path.join(__dirname, '.env') });

async function runTest() {
  console.log('🧪 Starting Email Service Test...');
  
  const testEmail = process.env['EMAIL_USER'] || '';
  if (!testEmail) {
    console.error('❌ EMAIL_USER not found in .env');
    return;
  }

  const subject = 'WasteZero Email Utility Test';
  const text = 'This is a test email from the new WasteZero email utility service.';
  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #4CAF50; border-radius: 10px;">
      <h2 style="color: #4CAF50;">Utility Test Successful</h2>
      <p>This email confirms that the centralized <strong>emailService.ts</strong> is working correctly.</p>
      <p>Timestamp: ${new Date().toLocaleString()}</p>
    </div>
  `;

  console.log(`📡 Sending test email to: ${testEmail}...`);
  const success = await sendEmail(testEmail, subject, text, html);

  if (success) {
    console.log('✅ TEST PASSED: Email sent successfully via utility!');
  } else {
    console.error('❌ TEST FAILED: Could not send email via utility.');
  }
}

runTest().catch(console.error);
