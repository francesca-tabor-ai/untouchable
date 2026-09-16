/**
 * Pluggable email. Development logs to the console and sends nothing; a real provider is
 * dropped in behind the same interface without touching call sites.
 *
 * Every send checks consent where the message is optional. Reminders are part of a service
 * the person asked for; campaign email is not, and needs `marketing_email`.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain text. We do not send HTML email — it is one more place to leak and to break. */
  body: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    console.info(
      ["", "── email (not sent — console provider) ──", `to:      ${message.to}`, `subject: ${message.subject}`, "", message.body, "────────────────────────────────────────", ""].join(
        "\n",
      ),
    );
  }
}

let provider: EmailProvider = new ConsoleEmailProvider();

/** Swap the provider — used by tests, and by the real provider at boot. */
export function setEmailProvider(next: EmailProvider) {
  provider = next;
}

export function getEmailProvider(): EmailProvider {
  return provider;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  return provider.send(message);
}
