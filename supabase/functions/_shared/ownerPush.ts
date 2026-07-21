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
