import dotenv from 'dotenv';
dotenv.config();

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
  mock?: boolean;
}

/**
 * Resend Email Service for ProNex-ArchAI (A&F Design)
 * Supports both Resend REST API (https://api.resend.com/emails)
 * and safe dev mock logging when placeholder key is used.
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  const apiKey = (process.env.RESEND_API_KEY || process.env.SMTP_PASS || '').trim();
  const defaultFrom = process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM || 'A&F Design <onboarding@resend.dev>';
  const from = options.from || defaultFrom;
  const to = Array.isArray(options.to) ? options.to : [options.to];

  // If no key or placeholder key, simulate sending safely in dev mode
  const isPlaceholder = !apiKey || apiKey.includes('PLACEHOLDER') || apiKey.length < 10;

  if (isPlaceholder) {
    console.log(`[Resend Email Dev Mode] Simulated dispatch to: ${to.join(', ')} | Subject: "${options.subject}"`);
    return {
      success: true,
      id: `mock_resend_${Date.now()}`,
      mock: true,
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Resend Error]', data);
      return {
        success: false,
        error: data.message || 'Failed to send email via Resend API',
      };
    }

    return {
      success: true,
      id: data.id,
    };
  } catch (err: any) {
    console.error('[Resend Network Error]', err);
    return {
      success: false,
      error: err.message || 'Network error communicating with Resend',
    };
  }
}

/**
 * Send Studio Portal Onboarding Invitation & Password Setup Email
 */
export async function sendInvitationEmail(
  to: string,
  data: {
    fullName: string;
    role: string;
    username: string;
    setupLink: string;
    studioName?: string;
  }
): Promise<EmailResult> {
  const studio = data.studioName || process.env.STUDIO_NAME || 'A&F Design';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Welcome to ${studio}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1117; color: #c9d1d9; margin: 0; padding: 40px 20px; }
    .card { max-width: 560px; margin: 0 auto; background-color: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 36px 32px; }
    .logo { font-size: 20px; font-weight: 700; color: #BF935A; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 24px; }
    h1 { font-size: 22px; color: #f0f6fc; margin: 0 0 16px 0; font-weight: 600; }
    p { font-size: 14px; line-height: 1.6; color: #8b949e; margin: 0 0 20px 0; }
    .info-box { background-color: #21262d; border: 1px solid #30363d; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 13px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .info-label { color: #8b949e; }
    .info-value { color: #f0f6fc; font-weight: 600; font-family: monospace; }
    .btn { display: inline-block; background-color: #BF935A; color: #ffffff !important; font-weight: 600; font-size: 14px; padding: 12px 28px; text-decoration: none; border-radius: 6px; margin-bottom: 24px; text-align: center; }
    .footer { font-size: 12px; color: #6e7681; border-top: 1px solid #21262d; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">${studio}</div>
    <h1>Welcome, ${data.fullName}</h1>
    <p>You have been invited to access the <strong>${studio}</strong> Studio Collaboration Portal as <strong>${data.role}</strong>.</p>
    
    <div class="info-box">
      <div class="info-row"><span class="info-label">Assigned Role:</span> <span class="info-value">${data.role}</span></div>
      <div class="info-row"><span class="info-label">Username:</span> <span class="info-value">${data.username}</span></div>
      <div class="info-row"><span class="info-label">Security:</span> <span class="info-value">Universal WhatsApp OTP Enabled</span></div>
    </div>

    <p>To ensure strict single-tenant security, we never generate permanent passwords. Please click the button below to set up your personal password:</p>

    <div style="text-align: center;">
      <a href="${data.setupLink}" class="btn">Set Up Your Password & Enter Portal</a>
    </div>

    <p style="font-size: 12px; color: #6e7681;">Or copy this secure link into your browser:<br><span style="word-break: break-all; color: #BF935A;">${data.setupLink}</span></p>

    <div class="footer">
      <p style="margin: 0;">This single-use setup link will expire in 48 hours. If you did not expect this invitation, please contact studio administration.</p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to,
    subject: `Welcome to ${studio} - Set Up Your Account`,
    html,
    text: `Welcome to ${studio}, ${data.fullName}!\n\nYou have been invited to the Studio Portal as ${data.role}.\nUsername: ${data.username}\n\nSet up your password using this link (expires in 48h):\n${data.setupLink}`,
  });
}

/**
 * Send Meeting Consultation Confirmation Email
 */
export async function sendMeetingConfirmationEmail(
  to: string,
  data: {
    fullName: string;
    projectCode: string;
    date: string;
    slot: string;
    agenda: string;
  }
): Promise<EmailResult> {
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background-color: #0d1117; color: #c9d1d9; padding: 20px;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 24px;">
    <h2 style="color: #BF935A; margin-top: 0;">Consultation Meeting Confirmed</h2>
    <p>Dear ${data.fullName},</p>
    <p>Your 90-minute architectural consultation for Project <strong>${data.projectCode}</strong> has been successfully booked.</p>
    <ul>
      <li><strong>Date:</strong> ${data.date}</li>
      <li><strong>Slot:</strong> ${data.slot}</li>
      <li><strong>Agenda:</strong> ${data.agenda}</li>
    </ul>
    <p style="font-size: 12px; color: #8b949e;">A&F Design Studio • Architecture & Interior Practice</p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to,
    subject: `Meeting Confirmed: Project ${data.projectCode} on ${data.date} (${data.slot})`,
    html,
  });
}
