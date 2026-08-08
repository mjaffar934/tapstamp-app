import forge from 'https://esm.sh/node-forge@1.3.1';
import { resolvePassColors } from './passTemplates.ts';
import { functionsUrl, SUPABASE_URL } from './client.ts';
import { buildRewardFieldCopy, formatRewardDisplay, stripSegmentProgress } from './walletDisplay.ts';

export interface GoogleWalletPassInput {
  cafe: Record<string, unknown>;
  serialNumber: string;
  stampCount: number;
  status: string;
  customerName?: string | null;
  memberCode?: string | null;
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

/** Drop undefined/null so Google JWT/REST never sees empty optional fields. */
function stripEmpty<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      const nested = stripEmpty(value as Record<string, unknown>);
      if (Object.keys(nested).length > 0) out[key] = nested;
      continue;
    }
    out[key] = value;
  }
  return out as T;
}

/**
 * Google sets `APPROVED` itself after review. Issuers must send `UNDER_REVIEW`
 * on insert/update/JWT — sending `APPROVED` fails with:
 * Invalid review status "APPROVED". Use "UNDER_REVIEW" instead.
 * Prefer the current enum string (legacy camelCase underReview is deprecated).
 */
function reviewStatus(): 'UNDER_REVIEW' {
  return 'UNDER_REVIEW';
}

/** Publishing access is controlled in Google’s console — not by this field. */
export function isGoogleWalletPublic(): boolean {
  return (Deno.env.get('GOOGLE_WALLET_REVIEW_STATUS') || '').toUpperCase() === 'APPROVED';
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
    reviewStatusNote: 'Issuers must always send UNDER_REVIEW; Google flips to APPROVED',
    origins: config?.origins ?? [],
    issuerIdSet: Boolean(config?.issuerId),
    serviceAccountSet: Boolean(config?.serviceAccount),
    privateKeySet: Boolean(config?.privateKey),
  };
}

function buildLoyaltyPayload(input: GoogleWalletPassInput) {
  const config = walletConfig();
  if (!config) throw new Error('Google Wallet not configured');

  const { cafe, serialNumber, stampCount, status, customerName, memberCode, lifetimeStamps, tiers, pendingMilestoneReward } = input;
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
  // Cache-bust hero strip so Google refetches dots after each stamp (not a stale image).
  const stripUrl = `${functionsUrl(`/wallet-strip/${serialNumber}`)}?layout=google&n=${stampCount}&st=${encodeURIComponent(status)}&v=7`;
  const rewardCopy = buildRewardFieldCopy({
    stampCount,
    stampGoal,
    status,
    mainReward: reward,
    lifetimeStamps: lifetimeStamps ?? stampCount,
    tiers: tiers ?? [],
    pendingMilestoneReward,
  });

  const memberLabel = showName && customerName?.trim()
    ? String(customerName).trim().split(/\s+/)[0]
    : null;

  const loyaltyClass = stripEmpty({
    id: classId(config.issuerId, cafeId),
    issuerName: cafeName,
    reviewStatus: 'UNDER_REVIEW',
    programName: cafeName,
    programLogo: logoUrl
      ? { sourceUri: { uri: logoUrl }, contentDescription: { defaultValue: { language: 'en', value: cafeName } } }
      : undefined,
    hexBackgroundColor: rgbToHex(passColors.backgroundColor),
    localizedAccountNameLabel: {
      defaultValue: { language: 'en', value: memberLabel ? 'MEMBER' : 'LOYALTY' },
    },
  });

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
  // Same 4-digit cafe member code shown in the owner/staff app.
  const code = (memberCode?.trim() || '').replace(/\D/g, '').slice(0, 4);

  const loyaltyObject = stripEmpty({
    id: objectId(config.issuerId, serialNumber),
    classId: classId(config.issuerId, cafeId),
    state: isRedeemed ? 'COMPLETED' : 'ACTIVE',
    accountId: code || serialNumber.replace(/-/g, '').slice(0, 8).toUpperCase(),
    accountName: memberLabel || cafeName,
    loyaltyPoints: {
      label: hasLevels ? 'TO NEXT' : 'STAMPS',
      balance: { string: stampBalance },
    },
    secondaryLoyaltyPoints: {
      label: redeemReady ? 'REDEEM NOW' : (hasLevels ? 'NEXT REWARD' : rewardCopy.label),
      balance: { string: rewardCopy.value },
    },
    // QR of the pass serial (same as Apple Wallet) so staff can scan either wallet.
    // alternateText shows the 4-digit member code under the QR.
    barcode: {
      type: 'QR_CODE',
      value: serialNumber,
      alternateText: code || undefined,
    },
    heroImage: {
      sourceUri: { uri: stripUrl },
      contentDescription: { defaultValue: { language: 'en', value: `${stampBalance} stamps` } },
    },
    textModulesData: showName && customerName?.trim()
      ? [{ header: 'MEMBER', body: String(customerName).trim(), id: 'member' }]
      : undefined,
    linksModuleData: {
      uris: [
        {
          uri: 'https://tapstamp.co/support',
          description: 'Customer support',
          id: 'support',
        },
        {
          uri: 'mailto:support@tapstamp.co',
          description: 'Email TapStamp',
          id: 'email',
        },
      ],
    },
  });

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
async function ensureLoyaltyClass(loyaltyClass: Record<string, unknown>): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) {
    console.warn('Google Wallet: skip class ensure — no access token');
    return false;
  }

  // Always UNDER_REVIEW on write — never APPROVED (Google-only).
  const body = { ...loyaltyClass, reviewStatus: 'UNDER_REVIEW' };
  const id = String(loyaltyClass.id);
  const getRes = await fetch(
    `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${id}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (getRes.ok) {
    // PUT replaces the class so old template fields (duplicate strip above barcode) are cleared.
    const updateRes = await fetch(
      `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${id}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );
    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error('Google Wallet class update:', updateRes.status, errText);
      // Fallback PATCH just the review status if full PUT fails.
      const patchRes = await fetch(
        `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reviewStatus: 'UNDER_REVIEW' }),
        },
      );
      if (!patchRes.ok) {
        console.error('Google Wallet class patch:', patchRes.status, await patchRes.text());
        return false;
      }
    }
    return true;
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
      body: JSON.stringify(body),
    },
  );

  if (!insertRes.ok && insertRes.status !== 409) {
    console.error('Google Wallet class insert:', insertRes.status, await insertRes.text());
    return false;
  }
  return true;
}

/** Builds the Google save URL; creates/updates the loyalty class first. */
export async function buildGoogleWalletSaveUrl(input: GoogleWalletPassInput): Promise<string> {
  const { loyaltyClass, loyaltyObject, config } = buildLoyaltyPayload(input);
  const classReady = await ensureLoyaltyClass(loyaltyClass as Record<string, unknown>);

  const now = Math.floor(Date.now() / 1000);
  // If the class already exists via REST, only send the object in the JWT.
  // Embedding a class that still has reviewStatus APPROVED (from an old write) breaks save.
  const payload: Record<string, unknown> = {
    loyaltyObjects: [loyaltyObject],
  };
  if (!classReady) {
    payload.loyaltyClasses = [{ ...loyaltyClass, reviewStatus: 'UNDER_REVIEW' }];
  }

  const jwt = signJwtRs256({
    iss: config.serviceAccount,
    aud: 'google',
    typ: 'savetowallet',
    iat: now,
    origins: config.origins,
    payload,
  }, config.privateKey);

  return `https://pay.google.com/gp/v/save/${jwt}`;
}

export type GoogleWalletUpdateResult = 'ok' | 'fail' | 'skipped';

/** Updates an existing Google Wallet loyalty object after a stamp or redeem. */
export async function updateGoogleWalletObject(
  input: GoogleWalletPassInput,
): Promise<GoogleWalletUpdateResult> {
  if (!isGoogleWalletConfigured()) return 'skipped';

  const token = await getAccessToken();
  if (!token) {
    console.error('Google Wallet sync skipped: no access token');
    return 'fail';
  }

  const { loyaltyObject, loyaltyClass, config } = buildLoyaltyPayload(input);
  await ensureLoyaltyClass(loyaltyClass as Record<string, unknown>);

  const resourceId = objectId(config.issuerId, input.serialNumber);
  const res = await fetch(
    `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${resourceId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loyaltyObject),
    },
  );

  if (res.status === 404) {
    // Object not added to wallet yet — save link will create it on first add.
    return 'skipped';
  }

  if (!res.ok) {
    console.error('Google Wallet update error:', res.status, await res.text());
    return 'fail';
  }

  return 'ok';
}
