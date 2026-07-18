import {
  BlobWriter,
  TextReader,
  Uint8ArrayReader,
  ZipWriter,
} from 'https://deno.land/x/zipjs@v2.7.52/index.js';
import { Image } from 'https://deno.land/x/imagescript@1.3.0/mod.ts';
import { SUPABASE_URL, functionsUrl } from './client.ts';
import { resolvePassColors } from './passTemplates.ts';
import { buildStampStripPng, type StampStripColors } from './stampStrip.ts';
import {
  buildStampDotsRow,
  buildRewardFieldCopy,
  formatRewardDisplay,
  stripSegmentProgress,
} from './walletDisplay.ts';
import { currentMembershipLevel } from './membershipLevels.ts';
import { createPkcs7Signature, sha1Hex } from './pkcs7.ts';

export interface PassInput {
  cafe: Record<string, unknown>;
  serialNumber: string;
  authToken: string;
  stampCount: number;
  status: string;
  customerName?: string | null;
  memberCode?: string | null;
  lifetimeStamps?: number | null;
  tiers?: Array<{ stamp_count: number; reward: string }>;
  pendingMilestoneReward?: string | null;
}

const PASS_TYPE_ID = Deno.env.get('PASS_TYPE_ID') || 'pass.com.tapstamp.loyalty';
const APPLE_TEAM_ID = Deno.env.get('APPLE_TEAM_ID') || '';
const MAX_IMAGE_BYTES = 512_000;

const LOGO_SIZES = [
  { name: 'logo.png', w: 160, h: 50 },
  { name: 'logo@2x.png', w: 320, h: 100 },
  { name: 'logo@3x.png', w: 480, h: 150 },
] as const;

const ICON_SIZES = [
  { name: 'icon.png', w: 29, h: 29 },
  { name: 'icon@2x.png', w: 58, h: 58 },
  { name: 'icon@3x.png', w: 87, h: 87 },
] as const;

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function parseColorToRgba(color: string): number {
  const rgb = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgb) {
    return (Number(rgb[1]) << 24) | (Number(rgb[2]) << 16) | (Number(rgb[3]) << 8) | 255;
  }
  if (color.startsWith('#') && color.length >= 7) {
    return (parseInt(color.slice(1, 3), 16) << 24) |
      (parseInt(color.slice(3, 5), 16) << 16) |
      (parseInt(color.slice(5, 7), 16) << 8) | 255;
  }
  return (0x1a << 24) | (0x18 << 16) | (0x14 << 8) | 255;
}

function resolveColors(cafe: Record<string, unknown>) {
  const colors = resolvePassColors(cafe);
  return { bg: colors.backgroundColor, fg: colors.foregroundColor, label: colors.labelColor };
}

export { buildStampDotsRow } from './walletDisplay.ts';

function buildPassJson(input: PassInput): string {
  const { cafe, serialNumber, authToken, stampCount, status, customerName, memberCode, lifetimeStamps, tiers, pendingMilestoneReward } = input;
  const stampGoal = Number(cafe.stamp_goal) || 10;
  const reward = truncate(formatRewardDisplay(String(cafe.reward || 'Free reward')), 24);
  const cafeName = String(cafe.name || 'TapStamp');
  const isRedeemed = status === 'redeemed';
  const isComplete = !isRedeemed && stampCount >= stampGoal;
  const colors = resolveColors(cafe);
  const showName = cafe.show_customer_name_on_pass !== false;
  const lifetime = Number(lifetimeStamps) || stampCount;

  // Logo left, shop name top right (Apple Wallet header).
  const headerFields: Array<{ key: string; label: string; value: string }> = [
    {
      key: 'brand',
      label: 'LOYALTY',
      value: truncate(cafeName, 22),
    },
  ];

  const sortedTiers = [...(tiers ?? [])].sort(
    (a, b) => Number(a.stamp_count) - Number(b.stamp_count),
  );
  const hasLevels = sortedTiers.length >= 2;
  const rewardCopy = buildRewardFieldCopy({
    stampCount,
    stampGoal,
    status,
    mainReward: String(cafe.reward || 'Free reward'),
    lifetimeStamps: lifetime,
    tiers: sortedTiers,
    pendingMilestoneReward,
  });
  const redeemReady = isRedeemed || isComplete || rewardCopy.label === 'REDEEM'
    || Boolean(pendingMilestoneReward?.trim());
  const segment = stripSegmentProgress(stampCount, stampGoal, sortedTiers, {
    complete: isComplete || redeemReady,
    redeemed: isRedeemed || redeemReady,
  });

  // Primary stays the stamp count (Apple always renders primary huge — never put
  // "REDEEM NOW" there). Redeem cue lives in the smaller secondary field.
  let primaryFields: Array<Record<string, unknown>> = [];
  if (hasLevels) {
    primaryFields = [
      {
        key: 'stamps',
        label: `OF ${segment.total}`,
        value: String(Math.max(redeemReady ? 1 : 0, segment.filled)),
        changeMessage: 'Stamp added — now at %@',
      },
    ];
  } else {
    primaryFields = [
      {
        key: 'stamps',
        label: `OF ${stampGoal}`,
        value: String(stampCount),
        changeMessage: 'Stamp added — now at %@',
      },
    ];
  }

  const secondaryFields: Array<Record<string, unknown>> = [];
  if (redeemReady) {
    secondaryFields.push({
      key: 'reward',
      label: 'REDEEM NOW',
      value: truncate(rewardCopy.value, 36),
      changeMessage: 'Reward ready — %@',
    });
  } else if (hasLevels) {
    secondaryFields.push({
      key: 'next_reward',
      label: 'NEXT REWARD',
      value: truncate(rewardCopy.value, 36),
      changeMessage: 'Next reward — %@',
    });
  } else {
    secondaryFields.push({
      key: 'reward',
      label: rewardCopy.label,
      value: truncate(rewardCopy.value, 36),
      changeMessage: rewardCopy.label === 'NEXT REWARD'
        ? 'Next reward — %@'
        : 'Reward update — %@',
    });
  }

  const membership = currentMembershipLevel(lifetime, sortedTiers);
  const auxiliaryFields: Array<{ key: string; label: string; value: string }> = [];

  // MEMBER CODE first so it gets the strongest aux slot when only one/two are used.
  if (memberCode) {
    auxiliaryFields.push({
      key: 'member_code',
      label: 'MEMBER CODE',
      value: memberCode,
    });
  }
  if (showName && customerName) {
    auxiliaryFields.push({
      key: 'member',
      label: 'MEMBER',
      value: truncate(customerName.split(/\s+/)[0] || customerName, 18),
    });
  } else if (membership && !hasLevels) {
    auxiliaryFields.push({
      key: 'level',
      label: 'LEVEL',
      value: truncate(membership.name, 16),
    });
  }

  const howItWorks = hasLevels
    ? `Stamp levels: ${sortedTiers.map((t) => `${t.stamp_count} = ${formatRewardDisplay(t.reward)}`).join(', ')}. Show this pass at the counter.`
    : `Collect ${stampGoal} stamps to earn ${reward}. Show this pass at the counter.`;

  const storeCard: Record<string, unknown> = {
    headerFields,
    primaryFields,
    secondaryFields,
    auxiliaryFields,
    backFields: [
      {
        key: 'terms',
        label: 'HOW IT WORKS',
        value: howItWorks,
      },
    ],
  };

  if (showName && customerName) {
    (storeCard.backFields as Array<{ key: string; label: string; value: string }>).unshift({
      key: 'member',
      label: 'MEMBER',
      value: truncate(customerName, 48),
    });
  }

  for (const tier of sortedTiers) {
    (storeCard.backFields as Array<{ key: string; label: string; value: string }>).push({
      key: `tier_${tier.stamp_count}`,
      label: `${tier.stamp_count} STAMPS`,
      value: truncate(formatRewardDisplay(tier.reward), 48),
    });
  }

  const nextTier = sortedTiers.find((t) => Number(t.stamp_count) > stampCount);
  if (nextTier) {
    const remaining = Number(nextTier.stamp_count) - stampCount;
    (storeCard.backFields as Array<{ key: string; label: string; value: string }>).push({
      key: 'next_tier',
      label: 'NEXT REWARD',
      value: `${remaining} stamp${remaining === 1 ? '' : 's'} until ${truncate(formatRewardDisplay(nextTier.reward), 40)}`,
    });
  }

  const barcodeMessage = serialNumber;
  const pass = {
    formatVersion: 1,
    passTypeIdentifier: PASS_TYPE_ID,
    teamIdentifier: APPLE_TEAM_ID,
    organizationName: cafeName,
    description: `${cafeName} Loyalty`,
    serialNumber,
    logoText: ' ',
    suppressStripShine: true,
    backgroundColor: colors.bg,
    foregroundColor: colors.fg,
    labelColor: colors.label,
    webServiceURL: functionsUrl('/passkit-register'),
    authenticationToken: authToken,
    barcodes: [
      {
        format: 'PKBarcodeFormatQR',
        message: barcodeMessage,
        messageEncoding: 'iso-8859-1',
        altText: memberCode ? `Member ${memberCode}` : undefined,
      },
    ],
    barcode: {
      format: 'PKBarcodeFormatQR',
      message: barcodeMessage,
      messageEncoding: 'iso-8859-1',
      altText: memberCode ? `Member ${memberCode}` : undefined,
    },
    storeCard,
  };

  return JSON.stringify(pass);
}

function cropSquare(img: Image): Image {
  const size = Math.min(img.width, img.height);
  const x = Math.floor((img.width - size) / 2);
  const y = Math.floor((img.height - size) / 2);
  return img.crop(x, y, size, size);
}

/** Knock out solid white / near-white logo mats so they blend into the pass. */
function removeSolidLogoBackground(source: Image): Image {
  const out = source.clone();
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      const px = out.getPixelAt(x + 1, y + 1);
      const r = (px >> 24) & 0xff;
      const g = (px >> 16) & 0xff;
      const b = (px >> 8) & 0xff;
      const a = px & 0xff;
      if (a < 8) continue;
      // Pure / near-white mats, plus light grey JPEG compression mats
      const nearWhite = r > 218 && g > 218 && b > 218;
      const flatGrey = nearWhite && Math.abs(r - g) < 14 && Math.abs(g - b) < 14;
      if (flatGrey) {
        out.setPixelAt(x + 1, y + 1, (r << 24) | (g << 16) | (b << 8) | 0);
      }
    }
  }
  return out;
}

function fitLogoLeft(
  img: Image,
  canvasW: number,
  canvasH: number,
  bg: number,
): Image {
  if (img.width < 1 || img.height < 1) {
    const canvas = new Image(canvasW, canvasH);
    canvas.fill(bg);
    return canvas;
  }

  const cleaned = removeSolidLogoBackground(img);
  const scale = Math.min(canvasW / cleaned.width, canvasH / cleaned.height);
  const w = Math.max(1, Math.round(cleaned.width * scale));
  const h = Math.max(1, Math.round(cleaned.height * scale));
  const resized = cleaned.clone().resize(w, h);
  const canvas = new Image(canvasW, canvasH);
  canvas.fill(bg);
  canvas.composite(resized, 0, Math.max(0, Math.floor((canvasH - h) / 2)));
  return canvas;
}

/** Neutral wallet list / notification icon when the cafe has no uploaded logo. */
async function buildGenericTapStampIcon(bg: number, fg: number, size: number): Promise<Uint8Array> {
  const dim = Math.max(8, size);
  const img = new Image(dim, dim);
  img.fill(bg);
  const pad = Math.max(2, Math.round(dim * 0.16));
  const inner = dim - pad * 2;
  const barH = Math.max(2, Math.round(inner * 0.22));
  const barW = Math.max(4, Math.round(inner * 0.72));
  const ox = Math.floor((dim - barW) / 2);
  const oy = Math.floor((dim - barH) / 2);
  const ring = blendAlpha(bg, fg, 0.28);
  for (let y = pad; y < pad + inner; y++) {
    for (let x = pad; x < pad + inner; x++) {
      const dx = x - dim / 2;
      const dy = y - dim / 2;
      if (dx * dx + dy * dy <= (inner / 2) * (inner / 2)) {
        img.setPixelAt(x + 1, y + 1, ring);
      }
    }
  }
  for (let y = oy; y < oy + barH; y++) {
    for (let x = ox; x < ox + barW; x++) {
      img.setPixelAt(x + 1, y + 1, fg);
    }
  }
  return await img.encode();
}

function blendAlpha(bg: number, fg: number, alpha: number): number {
  const br = (bg >> 24) & 0xff;
  const bg_ = (bg >> 16) & 0xff;
  const bb = (bg >> 8) & 0xff;
  const fr = (fg >> 24) & 0xff;
  const fg_ = (fg >> 16) & 0xff;
  const fb = (fg >> 8) & 0xff;
  return (
    (Math.round(br + (fr - br) * alpha) << 24) |
    (Math.round(bg_ + (fg_ - bg_) * alpha) << 16) |
    (Math.round(bb + (fb - bb) * alpha) << 8) |
    255
  );
}

async function prepareLogos(
  bytes: Uint8Array | null,
  bgRgba: number,
  _fgRgba: number,
): Promise<Record<string, Uint8Array>> {
  const out: Record<string, Uint8Array> = {};
  let source: Image | null = null;

  if (bytes && bytes.length > 0 && bytes.length <= MAX_IMAGE_BYTES) {
    try {
      const decoded = await Image.decode(bytes);
      if (decoded.width >= 1 && decoded.height >= 1) {
        source = decoded;
      }
    } catch {
      source = null;
    }
  }

  if (!source) return out;

  for (const { name, w, h } of LOGO_SIZES) {
    out[name] = await fitLogoLeft(source, w, h, bgRgba).encode();
  }
  return out;
}

async function prepareIcons(
  bytes: Uint8Array | null,
  bg: number,
  fg: number,
): Promise<Record<string, Uint8Array>> {
  const out: Record<string, Uint8Array> = {};
  let source: Image | null = null;

  if (bytes && bytes.length > 0 && bytes.length <= MAX_IMAGE_BYTES) {
    try {
      const decoded = await Image.decode(bytes);
      if (decoded.width >= 1 && decoded.height >= 1) {
        source = cropSquare(removeSolidLogoBackground(decoded));
      }
    } catch {
      source = null;
    }
  }

  for (const { name, w, h } of ICON_SIZES) {
    if (source && source.width >= 1 && source.height >= 1) {
      const canvas = new Image(w, h);
      canvas.fill(bg);
      const resized = source.clone().resize(w, h);
      canvas.composite(resized, 0, 0);
      out[name] = await canvas.encode();
    } else {
      out[name] = await buildGenericTapStampIcon(bg, fg, w);
    }
  }
  return out;
}

async function buildStripImages(
  stampCount: number,
  goal: number,
  isRedeemed: boolean,
  colors: StampStripColors,
  isComplete: boolean,
  customStripBytes?: Uint8Array | null,
): Promise<Record<string, Uint8Array>> {
  const sizes = [
    { name: 'strip.png', w: 375, h: 123 },
    { name: 'strip@2x.png', w: 750, h: 246 },
    { name: 'strip@3x.png', w: 1125, h: 369 },
  ] as const;

  let custom: Image | null = null;
  if (customStripBytes && customStripBytes.length > 0) {
    try {
      custom = await Image.decode(customStripBytes);
    } catch {
      custom = null;
    }
  }

  const out: Record<string, Uint8Array> = {};
  for (const { name, w, h } of sizes) {
    if (custom && custom.width >= 1 && custom.height >= 1) {
      out[name] = await buildStampStripPng(
        w,
        h,
        stampCount,
        goal,
        isRedeemed,
        colors,
        isComplete,
        custom,
      );
    } else {
      out[name] = await buildStampStripPng(w, h, stampCount, goal, isRedeemed, colors, isComplete);
    }
  }
  return out;
}

async function fetchImage(url: string | null | undefined): Promise<Uint8Array | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length > MAX_IMAGE_BYTES) return null;
    return bytes;
  } catch {
    return null;
  }
}

export async function buildPkpass(input: PassInput): Promise<Uint8Array> {
  const certPem = Deno.env.get('PASS_CERT');
  const keyPem = Deno.env.get('PASS_KEY');
  const wwdrPem = Deno.env.get('WWDR_CERT');

  if (!certPem || !keyPem || !wwdrPem) {
    throw new Error('Pass signing certificates not configured (PASS_CERT, PASS_KEY, WWDR_CERT)');
  }

  const colors = resolveColors(input.cafe);
  const bgRgba = parseColorToRgba(colors.bg);
  const fgRgba = parseColorToRgba(colors.fg);

  const rawLogo = await fetchImage(input.cafe.logo_url as string | null);
  const rawStrip = await fetchImage(input.cafe.strip_image_url as string | null);
  const passJson = buildPassJson(input);

  const stampGoal = Number(input.cafe.stamp_goal) || 10;
  const isRedeemed = input.status === 'redeemed';
  const isComplete = !isRedeemed && input.stampCount >= stampGoal;
  const stripColors: StampStripColors = { background: colors.bg, foreground: colors.fg };
  const pending = Boolean(input.pendingMilestoneReward?.trim());
  const redeemVisual = isRedeemed || isComplete || pending;
  const segment = stripSegmentProgress(
    input.stampCount,
    stampGoal,
    input.tiers,
    { complete: redeemVisual, redeemed: redeemVisual },
  );

  const [logos, icons, strips] = await Promise.all([
    prepareLogos(rawLogo, bgRgba, fgRgba),
    prepareIcons(rawLogo, bgRgba, fgRgba),
    // Keep normal filled dots on redeem — no glow-blob strip takeover.
    buildStripImages(
      segment.filled,
      Math.max(1, segment.total),
      false,
      stripColors,
      false,
      rawStrip,
    ),
  ]);

  const files: Record<string, Uint8Array> = {
    'pass.json': new TextEncoder().encode(passJson),
    ...logos,
    ...icons,
    ...strips,
  };

  const manifest: Record<string, string> = {};
  for (const [name, data] of Object.entries(files)) {
    manifest[name] = await sha1Hex(data);
  }
  const manifestJson = JSON.stringify(manifest);

  const signature = createPkcs7Signature(
    new TextEncoder().encode(manifestJson),
    certPem,
    keyPem,
    wwdrPem,
  );

  const zipWriter = new ZipWriter(new BlobWriter('application/vnd.apple.pkpass'));
  for (const [name, data] of Object.entries(files)) {
    await zipWriter.add(name, new Uint8ArrayReader(data), { level: 0 });
  }
  await zipWriter.add('manifest.json', new TextReader(manifestJson));
  await zipWriter.add('signature', new Uint8ArrayReader(signature));

  const blob = await zipWriter.close();
  return new Uint8Array(await blob.arrayBuffer());
}
