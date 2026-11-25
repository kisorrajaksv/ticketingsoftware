import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded cleanly without overriding already-set runtime env vars
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const extractValidEmail = (val) => {
  if (!val || typeof val !== 'string') return '';
  const match = val.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].trim() : '';
};

const resolveSenderEmail = () =>
  extractValidEmail(process.env.EMAIL_FROM_ADDRESS) ||
  extractValidEmail(process.env.EMAIL_USER) ||
  extractValidEmail(process.env.EMAIL_FROM) ||
  'projectdemo691@gmail.com';

const resolveSenderHeader = () => {
  const explicit = (process.env.EMAIL_FROM || '').trim();
  if (explicit && extractValidEmail(explicit)) {
    return explicit.includes('<') ? explicit : `"QA Software Workspace" <${explicit}>`;
  }
  const email = resolveSenderEmail();
  const name = (process.env.EMAIL_FROM_NAME || 'QA Software Workspace').trim();
  return `"${name}" <${email}>`;
};

const formatBrevoError = (data, statusText) => {
  const rawMsg = data?.message || statusText || 'Brevo API error';
  if (/unrecognised IP address|authorised_ips/i.test(rawMsg)) {
    return `${rawMsg} — Turn off IP restriction or authorize this server IP in Brevo: https://app.brevo.com/security/authorised_ips`;
  }
  return rawMsg;
};

/**
 * Returns true if Brevo HTTP API key is configured in environment
 */
export const isEmailConfigured = () => Boolean((process.env.BREVO_API_KEY || '').trim());

/**
 * Brevo HTTP REST API email dispatcher (HTTPS Port 443 — zero SMTP overhead or timeouts).
 * Falls back cleanly to console logging if BREVO_API_KEY is unset or fails.
 */
export const dispatchEmail = async ({
  to,
  fullName = '',
  subject,
  text,
  html,
  replyTo,
  empId,
  role,
  password,
  code,
  department
}) => {
  if (!to) {
    return { success: false, error: 'Recipient email address missing' };
  }

  let lastError = null;
  const brevoKey = (process.env.BREVO_API_KEY || '').trim();

  if (brevoKey) {
    try {
      const fromEmail = resolveSenderEmail();
      const fromName = (process.env.EMAIL_FROM_NAME || 'QA Software Workspace').trim();
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        signal: AbortSignal.timeout(8000),
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: fromName, email: fromEmail },
          to: [{ email: to, name: fullName || to }],
          subject,
          textContent: text,
          htmlContent: html,
          ...(replyTo && extractValidEmail(replyTo)
            ? { replyTo: { email: extractValidEmail(replyTo) } }
            : {})
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && (data?.messageId || data?.messageIds)) {
        const id = data.messageId || data.messageIds[0];
        console.log(`✅ [Brevo API] Email delivered to ${to} (Message ID: ${id})`);
        return { success: true, simulated: false, provider: 'brevo', messageId: id };
      }
      lastError = formatBrevoError(data, res.statusText);
      console.warn(`⚠️ [Brevo API] Error for ${to}:`, lastError);
    } catch (err) {
      lastError = err.message;
      console.warn(`⚠️ [Brevo API] Network error for ${to}:`, err.message);
    }
  }

  // Console Dev Simulation fallback (when BREVO_API_KEY is unset or delivery failed)
  console.log(`\n======================================================`);
  console.log(`📧 [EMAIL SERVICE - CONSOLE FALLBACK]`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  if (fullName) console.log(`Full Name: ${fullName}`);
  if (empId) console.log(`Employee ID: ${empId}`);
  if (role) console.log(`Role: ${role}`);
  if (department) console.log(`Department: ${department}`);
  if (password) console.log(`🔑 Temporary Password: ${password}`);
  if (code) console.log(`🔑 Verification OTP: ${code}`);
  if (lastError) console.log(`⚠️ Reason live delivery failed: ${lastError}`);
  console.log(`🌐 Login URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`======================================================\n`);

  return {
    success: false,
    simulated: true,
    delivery_attempted: Boolean(lastError),
    error: lastError || 'BREVO_API_KEY is not configured in environment.',
    code,
    temporary_password: password,
    message: lastError
      ? `Email delivery failed: ${lastError}`
      : 'BREVO_API_KEY not configured (credentials logged to server console).'
  };
};

/**
 * Returns live diagnostic health of Brevo HTTP REST API configuration
 */
export const checkEmailStatus = async () => {
  const brevoKey = (process.env.BREVO_API_KEY || '').trim();
  const status = {
    configured: Boolean(brevoKey),
    provider: brevoKey ? 'brevo' : 'none',
    user: resolveSenderEmail(),
    from: resolveSenderHeader(),
    transporter_ready: false,
    diagnostic: ''
  };

  if (!brevoKey) {
    status.diagnostic = 'BREVO_API_KEY is not set in environment.';
    return status;
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      signal: AbortSignal.timeout(4000),
      headers: {
        'api-key': brevoKey,
        'Accept': 'application/json'
      }
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      status.transporter_ready = true;
      status.diagnostic = `Brevo HTTP API connected (${data.email || resolveSenderEmail()}).`;
    } else {
      status.transporter_ready = false;
      status.diagnostic = formatBrevoError(data, res.statusText);
    }
  } catch (err) {
    status.transporter_ready = false;
    status.diagnostic = `Brevo API connection check failed: ${err.message}`;
  }

  return status;
};

/**
 * Generates a clean, random temporary password for newly created users
 */
export const generateTemporaryPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$%!';
  
  let result = 'Kanavu@';
  for (let i = 0; i < 4; i++) {
    result += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return result;
};

/**
 * Sends a welcome email containing account details, role, and auto-generated password
 */
export const sendWelcomeEmail = async ({
  to,
  fullName,
  empId,
  role,
  department,
  password
}) => {
  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const fromUser = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'projectdemo691@gmail.com';

  const plainText = `
Welcome to QA Software Workspace!

Hello ${fullName},

Your workspace account has been created by the system administrator. Here are your account details:

- Employee ID: ${empId || 'Assigned'}
- Full Name: ${fullName}
- Email: ${to}
- Department: ${department || 'Quality Assurance'}
- Role: ${role || 'QA Member'}
- Temporary Password: ${password}

Please log in and change your password:
${loginUrl}

Security Notice:
Please change your temporary password immediately upon your first login. Do not share this password with anyone.

Best regards,
The QA Software Administration Team
`.trim();

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to QA Software</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 36px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Brand Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 32px 36px; text-align: left;">
              <div style="display: inline-block; background: rgba(255, 255, 255, 0.18); padding: 6px 12px; border-radius: 8px; color: #ffffff; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 12px;">
                QA SOFTWARE WORKSPACE
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; line-height: 1.25;">
                Welcome to the Team, ${fullName}! 🎉
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #dbeafe; line-height: 1.4;">
                Your workspace member account has been created. Here are your credentials.
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 36px;">
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 1.6;">
                Hello <strong>${fullName}</strong>,<br />
                An administrator has provisioned your account for the QA Software Workspace. You can now log in using the details below:
              </p>

              <!-- Account Details Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 7px 0; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; width: 40%;">Employee ID</td>
                        <td style="padding: 7px 0; font-size: 14px; color: #0f172a; font-weight: 700;">${empId || 'System Assigned'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 7px 0; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Registered Email</td>
                        <td style="padding: 7px 0; font-size: 14px; color: #0f172a; font-weight: 600;">${to}</td>
                      </tr>
                      <tr>
                        <td style="padding: 7px 0; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Department</td>
                        <td style="padding: 7px 0; font-size: 14px; color: #0f172a; font-weight: 600;">${department || 'Quality Assurance'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 7px 0; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Assigned Role</td>
                        <td style="padding: 7px 0; font-size: 14px; color: #2563eb; font-weight: 700;">${role || 'QA Member'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Password Highlight Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #eff6ff; border: 1.5px dashed #60a5fa; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px 24px; text-align: center;">
                    <div style="font-size: 12px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                      Your Temporary Password
                    </div>
                    <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 22px; font-weight: 800; color: #1d4ed8; letter-spacing: 1.5px; background: #ffffff; padding: 10px 18px; border-radius: 8px; display: inline-block; border: 1px solid #bfdbfe;">
                      ${password}
                    </div>
                    <div style="font-size: 12px; color: #3b82f6; margin-top: 8px;">
                      Please change this password immediately after your first sign in.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Login Button CTA -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);">
                      Sign In to Workspace &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; padding: 12px 16px; font-size: 13px; color: #92400e; line-height: 1.5;">
                <strong>Security Reminder:</strong> Never share your login credentials with anyone. Administrators will never ask for your password.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 36px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5;">
              This is an automated notification from QA Software Workspace.<br />
              If you did not expect this invitation, please contact your workspace administrator.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  return await dispatchEmail({
    to,
    fullName,
    subject: `🎉 Welcome to QA Software - Your Workspace Credentials`,
    text: plainText,
    html: htmlContent,
    empId,
    role,
    department,
    password
  });
};

/**
/**
 * Sends an email notification when a project is assigned to a user
 */
export const sendProjectAssignmentEmail = async ({
  to,
  userName,
  managerName,
  projectName,
  projectCode
}) => {
  if (!to) {
    console.warn('sendProjectAssignmentEmail called without recipient email');
    return { success: false, error: 'Recipient email missing' };
  }

  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const fromUser = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'projectdemo691@gmail.com';

  const resolvedUserName = userName || 'Team Member';
  const resolvedManagerName = managerName || 'Management Team';
  const resolvedProjectName = projectName || 'Assigned Project';

  const plainText = `
Hi ${resolvedUserName},

A new project has been assigned to you by ${resolvedManagerName}.

**Project Name:** ${resolvedProjectName}

Please log in to the application to view the project details.
${loginUrl}

Thank you,
Project Management Team
`.trim();

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Project Assigned</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 36px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Brand Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 28px 36px; text-align: left;">
              <div style="display: inline-block; background: rgba(255, 255, 255, 0.18); padding: 5px 12px; border-radius: 6px; color: #ffffff; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 10px;">
                QA SOFTWARE WORKSPACE
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; line-height: 1.3;">
                New Project Assigned 🚀
              </h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 36px; font-size: 15px; line-height: 1.6; color: #334155;">
              <p style="margin: 0 0 16px 0;">
                Hi <strong>${resolvedUserName}</strong>,
              </p>

              <p style="margin: 0 0 20px 0;">
                A new project has been assigned to you by <strong>${resolvedManagerName}</strong>.
              </p>

              <!-- Project Highlight Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px 22px;">
                    <span style="font-size: 14px; color: #475569;"><strong>Project Name:</strong></span>
                    <span style="font-size: 16px; font-weight: 700; color: #0f172a; margin-left: 8px;">
                      ${resolvedProjectName}
                    </span>
                    ${projectCode ? `<span style="font-size: 13px; color: #64748b; margin-left: 6px;">(${projectCode})</span>` : ''}
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px 0;">
                Please log in to the application to view the project details.
              </p>

              <!-- CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 13px 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                      Log In to Application &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.5;">
                Thank you,<br />
                <strong>Project Management Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 36px; text-align: center; font-size: 12px; color: #94a3b8;">
              This is an automated notification from QA Software Workspace.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  return await dispatchEmail({
    to,
    fullName: resolvedUserName,
    subject: `New Project Assigned: ${resolvedProjectName}`,
    text: plainText,
    html: htmlContent
  });
};

/**
 * Sends a password reset email containing a new temporary password and login link
 */
export const sendPasswordResetEmail = async ({
  to,
  fullName,
  empId,
  password
}) => {
  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const fromUser = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@qasoftware.com';

  const plainText = `
Password Reset Request - QA Software Workspace

Hello ${fullName || 'User'},

A password reset request was received for your QA Software Workspace account (${to}).

Your new temporary password is:
${password}

Sign In:
${loginUrl}

Security Notice:
Please change this temporary password immediately after signing in. If you did not initiate this request, please contact your QA Workspace Administrator immediately.

Best regards,
The QA Software Administration Team
`.trim();

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset - QA Software Workspace</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 36px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Brand Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 32px 36px; text-align: left;">
              <div style="display: inline-block; background: rgba(255, 255, 255, 0.18); padding: 6px 12px; border-radius: 8px; color: #ffffff; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 12px;">
                SECURITY &amp; ACCESS
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; line-height: 1.25;">
                Password Reset Request 🔐
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #dbeafe; line-height: 1.4;">
                A temporary password has been generated for your account.
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 36px;">
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 1.6;">
                Hello <strong>${fullName || 'User'}</strong>,<br />
                We received a request to reset your password for your QA Software Workspace account (<strong>${to}</strong>).
              </p>

              <!-- Password Highlight Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #eff6ff; border: 1.5px dashed #60a5fa; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px 24px; text-align: center;">
                    <div style="font-size: 12px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                      Your New Temporary Password
                    </div>
                    <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 22px; font-weight: 800; color: #1d4ed8; letter-spacing: 1.5px; background: #ffffff; padding: 10px 18px; border-radius: 8px; display: inline-block; border: 1px solid #bfdbfe;">
                      ${password}
                    </div>
                    <div style="font-size: 12px; color: #3b82f6; margin-top: 8px;">
                      Use this password to log in, then update it in your profile settings.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Login Button CTA -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);">
                      Sign In with Temporary Password &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; padding: 12px 16px; font-size: 13px; color: #92400e; line-height: 1.5;">
                <strong>Security Reminder:</strong> If you did not request this password reset, your account is still secure with this new temporary password, but please notify your administrator immediately.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 36px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5;">
              This is an automated security message from QA Software Workspace.<br />
              Please do not reply directly to this email.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  return await dispatchEmail({
    to,
    fullName,
    subject: `🔐 QA Software - Temporary Password Reset`,
    text: plainText,
    html: htmlContent,
    empId,
    password
  });
};

/**
 * Sends an email containing a 6-digit verification code (OTP) for password reset
 * Optimized for high inbox deliverability (avoids spam filters)
 */
export const sendVerificationCodeEmail = async ({
  to,
  fullName,
  code
}) => {
  const fromUser = resolveSenderHeader();

  // Clean, spam-safe plain text version matching the HTML content
  const plainText = `
QA Software

Your verification code is: ${code}

Enter this code on the reset password screen to complete your request.
This code will expire in 15 minutes.

If you did not request a password reset, you can safely ignore this email.

Thanks,
QA Software Team
`.trim();

  // Modern, high-deliverability transactional HTML template (clean text-to-HTML ratio, no spam triggers)
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden;">
          
          <!-- Brand Header -->
          <tr>
            <td style="padding: 28px 32px 20px; border-bottom: 1px solid #f3f4f6;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 18px; font-weight: 700; color: #111827; letter-spacing: -0.3px;">
                      QA Software
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 28px 32px 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #111827;">
                Reset your password
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.5; color: #4b5563;">
                Hello${fullName ? ' ' + fullName : ''}, we received a request to reset your password. Use the verification code below to continue:
              </p>

              <!-- OTP Code Display -->
              <div style="background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 20px; text-align: center; margin: 24px 0;">
                <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111827; display: inline-block;">
                  ${code}
                </span>
              </div>

              <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.5; color: #6b7280;">
                This code is valid for <strong>15 minutes</strong>. If you did not request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Clean Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.4;">
                This is an automated message from QA Software.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  return await dispatchEmail({
    to,
    fullName,
    subject: `${code} is your QA Software verification code`,
    text: plainText,
    html: htmlContent,
    code,
    replyTo: fromUser,
    headers: {
      'X-Priority': '3',
      'X-Entity-Ref-ID': `otp-${Date.now()}-${code}`,
      'X-Auto-Response-Suppress': 'All'
    }
  });
};
