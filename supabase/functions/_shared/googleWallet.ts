import forge from 'https://esm.sh/node-forge@1.3.1';
import { resolvePassColors } from './passTemplates.ts';
import { functionsUrl, SUPABASE_URL } from './client.ts';
import { buildStampDotsRow, buildRewardFieldCopy, formatRewardDisplay, stripSegmentProgress } from './walletDisplay.ts';

export interface GoogleWalletPassInput {
  cafe: Record<string, unknown>;
  serialNumber: string;
  stampCount: number;
  status: string;
  customerName?: string | null;
  lifetimeStamps?: number | null;
  tiers?: Array<{ stamp_count: number; reward: string }>;
  pendingMilestoneReward?: string | null;
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

/** Google REST expects camelCase reviewStatus values. */
function reviewStatus(): 'underReview' | 'approved' {
  return (Deno.env.get('GOOGLE_WALLET_REVIEW_STATUS') || '').toUpperCase() === 'APPROVED'
    ? 'approved'
    : 'underReview';
}

/** True only after Google grants publishing access AND secret is set. */
export function isGoogleWalletPublic(): boolean {
  return reviewStatus() === 'approved';
}

function walletConfig():
  | { issuerId: string; serviceAccount: string; privateKey: string; origins: string[] }
  | null {
  const issuerId = Deno.env.get('GOOGLE_WALLET_ISSUER_ID');
  const serviceAccount = Deno.env.get('GOOGLE_WALLET_SERVICE_ACCOUNT');
  const privateKey = Deno.env.get('GOOGLE_WALLET_PRIVATE_KEY')?.replace(/\\n/g, '\n');
  if (!issuerId || !serviceAccount || !privateKey) return null;

  const publicBase = (Deno.env.get('FUNCTIONS_PUBLIC_URL') || '').replace(/\/$/, '');
  const fromEnv = (Deno.env.get('GOOGLE_WALLET_ORIGINS') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Origins must match the page that hosts the Add to Wallet button (tapstamp.co).
  const origins = [...new Set([
    ...fromEnv,
    'https://tapstamp.co',
    publicBase,
    SUPABASE_URL?.replace(/\/$/, ''),
  ].filter(Boolean))] as string[];

  return { issuerId, serviceAccount, privateKey, origins };
}

export function isGoogleWalletConfigured(): boolean {
  return walletConfig() !== null;
}

export function googleWalletDiag(): Record<string, unknown> {
  const config = walletConfig();
  return {
    configured: Boolean(config),
    public: isGoogleWalletPublic(),
    reviewStatus: reviewStatus(),
    origins: config?.origins ?? [],
    issuerIdSet: Boolean(config?.issuerId),
    serviceAccountSet: Boolean(config?.serviceAccount),
    privateKeySet: Boolean(config?.privateKey),
  };
}

function buildLoyaltyPayload(input: GoogleWalletPassInput) {
  const config = walletConfig();
  if (!config) throw new Error('Google Wallet not configured');

  const { cafe, serialNumber, stampCount, status, customerName, lifetimeStamps, tiers, pendingMilestoneReward } = input;
  const cafeId = String(cafe.id);
  const cafeName = String(cafe.name || 'TapStamp');
  const stampGoal = Number(cafe.stamp_goal) || 10;
  const reward = formatRewardDisplay(String(cafe.reward || 'Free reward'));
  const isRedeemed = status === 'redeemed';
  const isComplete = !isRedeemed && stampCount >= stampGoal;
  const passColors = resolvePassColors(cafe);
  const logoUrl = cafe.logo_url ? String(cafe.logo_url) : undefined;
  const showName = cafe.show_customer_name_on_pass !== false;
  const hasLevels = (tiers?.length ?? 0) >= 2;
  const pending = Boolean(pendingMilestoneReward?.trim());
  const segment = stripSegmentProgress(stampCount, stampGoal, tiers ?? [], {
    complete: isComplete || pending,
    redeemed: isRedeemed || pending,
  });
  const stampDots = hasLevels
    ? buildStampDotsRow(segment.filled, segment.total, isRedeemed || isComplete || pending)
    : buildStampDotsRow(stampCount, stampGoal, isRedeemed || isComplete);
  const stripUrl = functionsUrl(`/wallet-strip/${serialNumber}`);
  const rewardCopy = buildRewardFieldCopy({
    stampCount,
    stampGoal,
    status,
    mainReward: reward,
    lifetimeStamps: lifetimeStamps ?? stampCount,
    tiers: tiers ?? [],
    pendingMilestoneReward,
  });

  const loyaltyClass = {
    id: classId(config.issuerId, cafeId),
    issuerName: cafeName,
    reviewStatus: reviewStatus(),
    programName: cafeName,
    programLogo: logoUrl
      ? { sourceUri: { uri: logoUrl }, contentDescription: { defaultValue: { language: 'en', value: cafeName } } }
      : undefined,
    hexBackgroundColor: rgbToHex(passColors.backgroundColor),
    localizedAccountNameLabel: {
      defaultValue: { language: 'en', value: 'LOYALTY' },
    },
    classTemplateInfo: {
      cardBarcodeSectionDetails: {
        firstTopDetail: {
          fieldSelector: {
            fields: [{ fieldPath: 'object.heroImage' }],
          },
        },
      },
    },
  };

  const stampBalance = (() => {
    if (isRedeemed || isComplete || pending) {
      if (hasLevels && !isRedeemed) {
        return `${segment.filled} / ${segment.total}`;
      }
      return `${stampGoal} / ${stampGoal}`;
    }
    if (hasLevels) {
      return `${segment.filled} / ${segment.total}`;
    }
    return `${stampCount} / ${stampGoal}`;
  })();
  const redeemReady = isRedeemed || isComplete || rewardCopy.label === 'REDEEM' || pending;

  const loyaltyObject: Record<string, unknown> = {
    id: objectId(config.issuerId, serialNumber),
    classId: classId(config.issuerId, cafeId),
    state: isRedeemed ? 'COMPLETED' : 'ACTIVE',
    accountId: serialNumber.replace(/-/g, '').slice(0, 20),
    accountName: cafeName,
    loyaltyPoints: {
      label: hasLevels ? 'TO NEXT' : 'STAMPS',
      balance: { string: stampBalance },
    },
    secondaryLoyaltyPoints: {
      label: redeemReady ? 'REDEEM NOW' : (hasLevels ? 'NEXT REWARD' : rewardCopy.label),
      balance: { string: rewardCopy.value },
    },
    barcode: {
      type: 'QR_CODE',
      value: serialNumber,
      alternateText: serialNumber.slice(0, 8).toUpperCase(),
    },
    heroImage: {
      sourceUri: { uri: stripUrl },
      contentDescription: { defaultValue: { language: 'en', value: stampDots } },
    },
  };

  const modules: Array<{ header: string; body: string; id: string }> = [];
  if (showName && customerName) {
    modules.push({ header: 'MEMBER', body: String(customerName), id: 'member' });
  }
  if (modules.length) loyaltyObject.textModulesData = modules;

  loyaltyObject.linksModuleData = {
    uris: [
      {
        uri: 'https://tapstamp.co/support',
        description: 'Customer support',
        id: 'support',
      },
      {
        uri: 'mailto:support@tapstamp.com',
        description: 'Email TapStamp',
        id: 'email',
      },
    ],
  };

  return { loyaltyClass, loyaltyObject, config };
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

/** Ensures the loyalty class exists in Google (needed for save + publishing access). */
async function ensureLoyaltyClass(loyaltyClass: Record<string, unknown>): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    console.warn('Google Wallet: skip class ensure — no access token');
    return;
  }

  const id = String(loyaltyClass.id);
  const getRes = await fetch(
    `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${id}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (getRes.ok) {
    const patchRes = await fetch(
      `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loyaltyClass),
      },
    );
    if (!patchRes.ok) {
      console.error('Google Wallet class patch:', patchRes.status, await patchRes.text());
    }
    return;
  }

  if (getRes.status !== 404) {
    console.error('Google Wallet class get:', getRes.status, await getRes.text());
  }

  const insertRes = await fetch(
    'https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loyaltyClass),
    },
  );

  if (!insertRes.ok && insertRes.status !== 409) {
    console.error('Google Wallet class insert:', insertRes.status, await insertRes.text());
  }
}

/** Builds the Google save URL; creates/updates the loyalty class first. */
export async function buildGoogleWalletSaveUrl(input: GoogleWalletPassInput): Promise<string> {
  const { loyaltyClass, loyaltyObject, config } = buildLoyaltyPayload(input);
  await ensureLoyaltyClass(loyaltyClass as Record<string, unknown>);

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

/** Updates an existing Google Wallet loyalty object after a stamp or redeem. */
export async function updateGoogleWalletObject(input: GoogleWalletPassInput): Promise<void> {
  if (!isGoogleWalletConfigured()) return;

  const token = await getAccessToken();
  if (!token) return;

  const { loyaltyObject, loyaltyClass, config } = buildLoyaltyPayload(input);
  await ensureLoyaltyClass(loyaltyClass as Record<string, unknown>);

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
