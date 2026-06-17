import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;

const isConfigured = Boolean(RESEND_API_KEY && RESEND_FROM_EMAIL);

if (!isConfigured) {
  console.warn(
    '[mailer] RESEND_API_KEY or RESEND_FROM_EMAIL is not set — reset emails will be logged to the console instead of sent.',
  );
}

// Construct lazily: the Resend SDK throws if instantiated without an API key.
const resend = isConfigured ? new Resend(RESEND_API_KEY as string) : null;

/**
 * Send the password recovery email containing a one-time reset link.
 * When email is not configured (local dev), the link is logged to the console
 * so the flow can still be exercised end to end.
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string,
): Promise<void> {
  if (!resend) {
    console.info(`[mailer] (dev) password reset link for ${to}: ${resetUrl}`);
    return;
  }

  const html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #0f172a;">
    <h2 style="margin: 0 0 16px;">Reset your DocSign password</h2>
    <p style="margin: 0 0 16px; line-height: 1.5;">Hi ${name},</p>
    <p style="margin: 0 0 16px; line-height: 1.5;">
      We received a request to reset your password. Click the button below to
      choose a new one. This link is valid for <strong>1 hour</strong> and can
      only be used once.
    </p>
    <p style="margin: 0 0 24px;">
      <a href="${resetUrl}"
         style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">
        Reset Password
      </a>
    </p>
    <p style="margin: 0 0 8px; line-height: 1.5; font-size: 13px; color: #64748b;">
      If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p style="margin: 0 0 24px; word-break: break-all; font-size: 13px; color: #64748b;">
      ${resetUrl}
    </p>
    <p style="margin: 0; line-height: 1.5; font-size: 13px; color: #64748b;">
      If you didn't request this, you can safely ignore this email.
    </p>
  </div>`;

  const { error } = await resend.emails.send({
    from: RESEND_FROM_EMAIL as string,
    to,
    subject: 'Reset your DocSign password',
    html,
  });

  if (error) {
    throw new Error(`[mailer] failed to send reset email: ${error.message}`);
  }
}
