import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkEmailStatus, dispatchEmail } from './services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const targetEmail = process.argv[2] || process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || 'test@example.com';

console.log(`\n======================================================`);
console.log(`🚀 [BREVO API EMAIL DIAGNOSTIC]`);
console.log(`Target:          ${targetEmail}`);
console.log(`Brevo API Key:   ${process.env.BREVO_API_KEY ? 'Configured' : 'Missing'}`);
console.log(`Sender Identity: ${process.env.EMAIL_FROM || process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || 'not set'}`);
console.log(`======================================================\n`);

async function run() {
  const health = await checkEmailStatus();
  console.log('Health Check:', health);

  const startedAt = Date.now();
  const result = await dispatchEmail({
    to: targetEmail,
    fullName: 'Test User',
    subject: '✅ QA Software Email Test - Brevo HTTPS API Working!',
    text: 'Hello! This is a test email sent via Brevo HTTP REST API (port 443) from QA Software Ticketing System.',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 28px; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px;">
        <h2 style="margin: 0 0 12px; font-size: 18px; color: #0f172a;">QA Software Dispatch Test</h2>
        <p style="font-size: 15px; color: #334155; line-height: 1.6;">
          Your Brevo HTTP REST API email dispatcher is delivering emails over HTTPS port 443 without SMTP port restrictions.
        </p>
        <p style="font-size: 13px; color: #94a3b8; margin: 0;">Sent automatically by QA Software Ticketing Backend.</p>
      </div>
    `
  });

  console.log(`Result (${Date.now() - startedAt}ms):`, result);
  process.exit(result.success ? 0 : 1);
}

run().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
