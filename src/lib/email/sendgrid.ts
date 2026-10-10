/**
 * Thin SendGrid v3 client (plain fetch, no SDK dependency).
 * Server-only: reads secrets from environment variables.
 */

export type EmailConfig = {
  apiKey: string | undefined;
  fromEmail: string | undefined;
  fromName: string;
  replyTo: string | undefined;
  notifyTo: string | undefined;
};

export function emailConfig(): EmailConfig {
  const clean = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);
  return {
    apiKey: clean(process.env.SENDGRID_API_KEY),
    fromEmail: clean(process.env.SENDGRID_FROM_EMAIL),
    fromName: clean(process.env.SENDGRID_FROM_NAME) ?? "iSN",
    replyTo: clean(process.env.SENDGRID_REPLY_TO),
    notifyTo: clean(process.env.LEAD_NOTIFICATION_TO),
  };
}

/** Local testing only: SENDGRID_SANDBOX=true makes SendGrid validate the request without delivering. */
const SANDBOX = process.env.NODE_ENV !== "production" && process.env.SENDGRID_SANDBOX === "true";

export const isEmailConfigured = (c: EmailConfig) => Boolean(c.apiKey && c.fromEmail);

export type Attachment = { content: string; filename: string; type: string };

export type MailInput = {
  to: { email: string; name?: string };
  subject: string;
  text: string;
  html?: string;
  attachments?: Attachment[];
};

export async function sendMail(config: EmailConfig, mail: MailInput): Promise<void> {
  if (!config.apiKey || !config.fromEmail) throw new Error("SendGrid is not configured");

  const payload = {
    personalizations: [{ to: [{ email: mail.to.email, ...(mail.to.name ? { name: mail.to.name } : {}) }] }],
    from: { email: config.fromEmail, name: config.fromName },
    reply_to: { email: config.replyTo ?? config.fromEmail },
    subject: mail.subject,
    content: [
      { type: "text/plain", value: mail.text },
      ...(mail.html ? [{ type: "text/html", value: mail.html }] : []),
    ],
    ...(SANDBOX ? { mail_settings: { sandbox_mode: { enable: true } } } : {}),
    ...(mail.attachments?.length
      ? { attachments: mail.attachments.map((a) => ({ ...a, disposition: "attachment" })) }
      : {}),
  };

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  // SendGrid answers 202 Accepted when the message is queued (sandbox mode answers 200).
  if (response.status !== 202 && !(SANDBOX && response.status === 200)) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new Error(`SendGrid responded ${response.status}: ${detail}`);
  }
}
