import forge from 'https://esm.sh/node-forge@1.3.1';

export interface GoogleWalletPassInput {
  cafe: Record<string, unknown>;
  serialNumber: string;
  stampCount: number;
  status: string;
  customerName?: string | null;
}

function base64url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64urlBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function signJwtRs256(payload: Record<string, unknown>, privateKeyPem: string): string {
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const unsigned = `${header}.${body}`;

  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const md = forge.md.sha256.create();
  md.update(unsigned, 'utf8');
  const signature = privateKey.sign(md);
  return `${unsigned}.${base64urlBytes(new Uint8Array(forge.util.binary.raw.decode(signature)))}`;
}

function rgbToHex(color: string): string {
  const rgb = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (!rgb) return '#1a1814';
  const hex = (n: string) => Number(n).toString(16).padStart(2, '0');
  return `#${hex(rgb[1])}${hex(rgb[2])}${hex(rgb[3])}`;
}

function classId(issuerId: string, cafeId: string): string {
  return `${issuerId}.tapstamp_cafe_${cafeId.replace(/-/g, '_')}`;
}

function objectId(issuerId: string, serialNumber: string): string {
  return `${issuerId}.tapstamp_pass_${serialNumber.replace(/-/g, '_')}`;
}

function walletConfig():
  | { issuerId: string; serviceAccount: string; privateKey: string; origins: string[] }
  | null {
  const issuerId = Deno.env.get('GOOGLE_WALLET_ISSUER_ID');
  const serviceAccount = Deno.env.get('GOOGLE_WALLET_SERVICE_ACCOUNT');
  const privateKey = Deno.env.get('GOOGLE_WALLET_PRIVATE_KEY')?.replace(/\\n/g, '\n');
  const origins = (Deno.env.get('GOOGLE_WALLET_ORIGINS') || Deno.env.get('SUPABASE_URL') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!issuerId || !serviceAccount || !privateKey) return null;
  return { issuerId, serviceAccount, privateKey, origins };
}

export function isGoogleWalletConfigured(): boolean {
  return walletConfig() !== null;
}

function buildLoyaltyPayload(input: GoogleWalletPassInput) {
  const config = walletConfig();
  if (!config) throw new Error('Google Wallet not configured');

  const { cafe, serialNumber, stampCount, status, customerName } = input;
  const cafeId = String(cafe.id);
  const cafeName = String(cafe.name || 'TapStamp');
  const stampGoal = Number(cafe.stamp_goal) || 10;
  const reward = String(cafe.reward || 'Free reward');
  const isRedeemed = status === 'redeemed';
  const bg = String(cafe.background_color || 'rgb(26, 24, 20)');
  const logoUrl = cafe.logo_url ? String(cafe.logo_url) : undefined;
  const campaignMessage = typeof cafe.active_campaign_message === 'string'
    ? cafe.active_campaign_message.trim()
    : '';

  const loyaltyClass = {
    id: classId(config.issuerId, cafeId),
    issuerName: cafeName,
    reviewStatus: 'UNDER_REVIEW',
    programName: `${cafeName} Loyalty`,
    programLogo: logoUrl
      ? { sourceUri: { uri: logoUrl }, contentDescription: { defaultValue: { language: 'en', value: cafeName } } }
      : undefined,
    hexBackgroundColor: rgbToHex(bg),
  };

  const loyaltyObject = {
    id: objectId(config.issuerId, serialNumber),
    classId: classId(config.issuerId, cafeId),
    state: isRedeemed ? 'COMPLETED' : 'ACTIVE',
    accountId: serialNumber,
    accountName: customerName ? String(customerName) : 'Member',
    loyaltyPoints: {
      label: 'Stamps',
      balance: { string: isRedeemed ? `${stampGoal} / ${stampGoal}` : `${stampCount} / ${stampGoal}` },
    },
    secondaryLoyaltyPoints: {
      label: 'Reward',
      balance: { string: isRedeemed ? 'Ready to redeem' : reward },
    },
    barcode: {
      type: 'QR_CODE',
      value: serialNumber,
      alternateText: 'Show at counter',
    },
    ...(campaignMessage
      ? {
        textModulesData: [{
          header: 'Update',
          body: campaignMessage,
          id: 'campaign',
        }],
      }
      : {}),
  };

  return { loyaltyClass, loyaltyObject, config };
}

export function buildGoogleWalletSaveUrl(input: GoogleWalletPassInput): string {
  const { loyaltyClass, loyaltyObject, config } = buildLoyaltyPayload(input);
  const now = Math.floor(Date.now() / 1000);

  const jwt = signJwtRs256({
    iss: config.serviceAccount,
    aud: 'google',
    typ: 'savetowallet',
    iat: now,
    origins: config.origins,
    payload: {
      loyaltyClasses: [loyaltyClass],
      loyaltyObjects: [loyaltyObject],
    },
  }, config.privateKey);

  return `https://pay.google.com/gp/v/save/${jwt}`;
}

async function getAccessToken(): Promise<string | null> {
  const config = walletConfig();
  if (!config) return null;

  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwtRs256({
    iss: config.serviceAccount,
    scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }, config.privateKey);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!res.ok) {
    console.error('Google OAuth error:', await res.text());
    return null;
  }

  const data = await res.json();
  return data.access_token ?? null;
}

/** Updates an existing Google Wallet loyalty object after a stamp or redeem. */
export async function updateGoogleWalletObject(input: GoogleWalletPassInput): Promise<void> {
  if (!isGoogleWalletConfigured()) return;

  const token = await getAccessToken();
  if (!token) return;

  const { loyaltyObject, config } = buildLoyaltyPayload(input);
  const resourceId = objectId(config.issuerId, input.serialNumber);

  const res = await fetch(
    `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${resourceId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loyaltyObject),
    },
  );

  if (res.status === 404) {
    // Object not added to wallet yet — save link will create it on first add.
    return;
  }

  if (!res.ok) {
    console.error('Google Wallet update error:', res.status, await res.text());
  }
}
