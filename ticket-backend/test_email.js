import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dispatchEmail } from './services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const targetEmail = process.argv[2] || process.env.EMAIL_USER || 'test@example.com';

console.log(`\n======================================================`);
console.log(`🚀 [TEST EMAIL DISPATCHER]`);
console.log(`Target: ${targetEmail}`);
console.log(`Resend API Key configured: ${Boolean(process.env.RESEND_API_KEY)}`);
console.log(`Brevo API Key configured:  ${Boolean(process.env.BREVO_API_KEY)}`);
console.log(`SMTP/Gmail configured:     ${Boolean(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD)}`);
console.log(`======================================================\n`);

async function run() {
  const result = await dispatchEmail({
    to: targetEmail,
    fullName: 'Test User',
    subject: '✅ QA Software Email Test - HTTP REST API Working!',
    text: 'Hello! This is a test email sent via modern HTTP REST API (port 443) from QA Software Ticketing System.',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 28px; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          <div style="background: #eff6ff; color: #2563eb; width: 40px; height: 40px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold;">QA</div>
          <h2 style="margin: 0; font-size: 18px; color: #0f172a;">QA Software Dispatch Test</h2>
        </div>
        <p style="font-size: 15px; color: #334155; line-height: 1.6;">
          🎉 <strong>Success!</strong> Your modern HTTP REST API email dispatcher is fully configured and delivering emails without traditional SMTP or Nodemailer port restrictions.
        </p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin: 20px 0;">
          <div style="font-size: 13px; color: #64748b; margin-bottom: 4px;">Delivery Mode:</div>
          <div style="font-size: 14px; font-weight: 700; color: #2563eb;">HTTPS Port 443 REST API</div>
        </div>
        <p style="font-size: 13px; color: #94a3b8; margin: 0;">Sent automatically by QA Software Ticketing Backend.</p>
      </div>
    `
  });

  console.log('Result:', result);
  process.exit(0);
}

run().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
