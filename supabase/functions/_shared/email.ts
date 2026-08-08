/** Thin transactional email sender (Resend). Never log recipients or bodies. */

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Idempotency key for provider de-dupe when supported */
  idempotencyKey?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface SendEmailResult {
  ok: boolean;
  skipped?: boolean;
  messageId?: string;
  error?: string;
}

function fromAddress(): string {
  return (
    Deno.env.get('EMAIL_FROM')?.trim() ||
    'TapStamp <noreply@tapstamp.co>'
  );
}

/**
 * Offer A nurture stays OFF until Growth M1 go/no-go ([MJ-27] ship board).
 * Enable with NFC_LOYALTY_NURTURE_ENABLED=1|true|yes|on.
 * Sends still require RESEND_API_KEY.
 */
export function isNurtureEmailEnabled(): boolean {
  const raw = (Deno.env.get('NFC_LOYALTY_NURTURE_ENABLED') ?? '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

export async function sendTransactionalEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  const apiKey = (
    Deno.env.get('RESEND_API_KEY')
    ?? Deno.env.get('EMAIL_API_KEY')
    ?? ''
  ).trim();
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY/EMAIL_API_KEY not configured' };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  if (params.idempotencyKey) {
    headers['Idempotency-Key'] = params.idempotencyKey.slice(0, 256);
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from: fromAddress(),
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        reply_to: Deno.env.get('EMAIL_REPLY_TO')?.trim() || 'support@tapstamp.co',
        tags: params.tags,
      }),
    });

    const body = await res.json().catch(() => ({})) as {
      id?: string;
      message?: string;
      name?: string;
    };

    if (!res.ok) {
      return {
        ok: false,
        error: body.message || body.name || `Resend HTTP ${res.status}`,
      };
    }

    return { ok: true, messageId: body.id };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
