/** Send an Expo push notification to an owner device. */
export async function sendExpoPush(
  token: string | null | undefined,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  if (!token?.startsWith('ExponentPushToken')) {
    console.warn('Owner push skipped: no Expo push token');
    return;
  }

  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        sound: 'default',
        title,
        body,
        data: data ?? {},
        channelId: 'billing',
      }),
    });
    if (!res.ok) {
      console.error('Expo push failed:', res.status, await res.text().catch(() => ''));
    }
  } catch (err) {
    console.error('Expo push error:', err);
  }
}

export async function notifyOwnerCardDeclined(params: {
  expoPushToken?: string | null;
  businessName?: string | null;
}): Promise<void> {
  await sendExpoPush(
    params.expoPushToken,
    'Card declined',
    `Your TapStamp payment failed${params.businessName ? ` for ${params.businessName}` : ''}. Update your card in Plan → Billing.`,
    { type: 'billing_declined' },
  );
}

/**
 * Ops alert when an NFC shop order pays.
 * Push optional (ORDER_NOTIFY_EXPO_PUSH_TOKEN); never log buyer PII.
 */
export async function notifyAdminsHardwareOrder(params: {
  productName?: string | null;
  email?: string | null;
  businessName?: string | null;
  programUrl?: string | null;
  sku?: string | null;
}): Promise<void> {
  const sku = params.sku?.trim() || 'unknown_sku';
  const product = params.productName?.trim() || sku;
  const hasEmail = Boolean(params.email?.includes('@'));

  console.log('Hardware shop paid (admin notify)', {
    sku,
    productName: product,
    hasEmail,
    hasBusinessName: Boolean(params.businessName?.trim()),
    hasProgramUrl: Boolean(params.programUrl?.trim()),
  });

  const token = Deno.env.get('ORDER_NOTIFY_EXPO_PUSH_TOKEN');
  await sendExpoPush(
    token,
    'NFC shop order',
    `${product}${hasEmail ? ' · buyer on file' : ''}`,
    {
      type: 'hardware_shop_paid',
      sku,
    },
  );

  const adminCsv = (Deno.env.get('ADMIN_EMAILS') ?? '').trim();
  const admins = adminCsv
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes('@'));
  if (!admins.length || !hasEmail) return;

  try {
    const { sendTransactionalEmail } = await import('./email.ts');
    const biz = (params.businessName ?? '').trim() || '—';
    await sendTransactionalEmail({
      to: admins[0],
      subject: `NFC hardware order: ${product}`,
      text: [
        'New hardware shop payment',
        `SKU: ${sku}`,
        `Product: ${product}`,
        `Business: ${biz}`,
        `Buyer email: ${params.email}`,
        params.programUrl ? `Program URL: ${params.programUrl}` : '',
      ].filter(Boolean).join('\n'),
      html: `<p>New hardware shop payment</p><ul>
        <li>SKU: ${sku}</li>
        <li>Product: ${product}</li>
        <li>Business: ${biz}</li>
        <li>Buyer: ${params.email}</li>
        ${params.programUrl ? `<li>Program URL: ${params.programUrl}</li>` : ''}
      </ul>`,
      tags: [{ name: 'campaign', value: 'hardware_admin_alert' }],
    });
  } catch (err) {
    console.warn('Admin hardware email skipped', (err as Error).message);
  }
}
