import {
  BlobWriter,
  TextReader,
  Uint8ArrayReader,
  ZipWriter,
} from 'https://deno.land/x/zipjs@v2.7.52/index.js';
import { Image } from 'https://deno.land/x/imagescript@1.3.0/mod.ts';
import { SUPABASE_URL, functionsUrl } from './client.ts';
import { PASS_TEMPLATES } from './passTemplates.ts';
import { TAPSTAMP_BG, TAPSTAMP_FG, TAPSTAMP_LABEL } from './brand.ts';
import { buildStampStripPng } from './stampStrip.ts';
import { buildStampDotsRow, formatRewardDisplay } from './walletDisplay.ts';
import { createPkcs7Signature, sha1Hex } from './pkcs7.ts';

export interface PassInput {
  cafe: Record<string, unknown>;
  serialNumber: string;
  authToken: string;
  stampCount: number;
  status: string;
  customerName?: string | null;
  lifetimeStamps?: number | null;
  tiers?: Array<{ stamp_count: number; reward: string }>;
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

function normalizePassColor(color: unknown, fallback: string): string {
  if (typeof color !== 'string' || !color) return fallback;
  const rgb = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgb) return `rgb(${rgb[1]}, ${rgb[2]}, ${rgb[3]})`;
  const hex = color.match(/^#?([0-9a-f]{6})$/i);
  if (hex) {
    const n = hex[1];
    return `rgb(${parseInt(n.slice(0, 2), 16)}, ${parseInt(n.slice(2, 4), 16)}, ${parseInt(n.slice(4, 6), 16)})`;
  }
  return fallback;
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

function darken(color: number, amount: number): number {
  const r = Math.max(0, ((color >> 24) & 0xff) - amount);
  const g = Math.max(0, ((color >> 16) & 0xff) - amount);
  const b = Math.max(0, ((color >> 8) & 0xff) - amount);
  return (r << 24) | (g << 16) | (b << 8) | 255;
}

function resolveColors(_cafe: Record<string, unknown>) {
  const template = PASS_TEMPLATES.classic;
  return { bg: template.backgroundColor, fg: template.foregroundColor, label: template.labelColor };
}

export { buildStampDotsRow } from './walletDisplay.ts';

function buildPassJson(input: PassInput): string {
  const { cafe, serialNumber, authToken, stampCount, status, customerName, lifetimeStamps, tiers } = input;
  const stampGoal = Number(cafe.stamp_goal) || 10;
  const reward = truncate(formatRewardDisplay(String(cafe.reward || 'Free reward')), 24);
  const cafeName = String(cafe.name || 'TapStamp');
  const isRedeemed = status === 'redeemed';
  const colors = resolveColors(cafe);
  const showName = cafe.show_customer_name_on_pass !== false;
  const campaignMessage = typeof cafe.active_campaign_message === 'string'
    ? cafe.active_campaign_message.trim()
    : '';
  const lifetime = Number(lifetimeStamps) || stampCount;

  const headerFields: Array<{ key: string; label: string; value: string }> = [
    {
      key: 'cafe',
      label: 'LOYALTY',
      value: truncate(cafeName, 18),
    },
  ];

  if (showName && customerName) {
    headerFields.push({
      key: 'member',
      label: 'MEMBER',
      value: truncate(customerName, 18),
    });
  }

  const storeCard: Record<string, unknown> = {
    headerFields,
    primaryFields: isRedeemed
      ? [
        {
          key: 'status',
          label: 'REDEEM',
          value: 'Now',
          changeMessage: 'Your reward is ready — open Wallet to claim it',
        },
      ]
      : [
        {
          key: 'stamps',
          label: 'STAMPS',
          value: `${stampCount} / ${stampGoal}`,
          changeMessage: 'New stamp — you are now at %@',
        },
      ],
    auxiliaryFields: [
      {
        key: 'reward',
        label: 'REWARD',
        value: reward,
        ...(isRedeemed ? { changeMessage: 'Reward unlocked — %@' } : {}),
      },
    ],
    backFields: [
      {
        key: 'program',
        label: 'PROGRAM',
        value: cafeName,
      },
      {
        key: 'terms',
        label: 'HOW IT WORKS',
        value: `Collect ${stampGoal} stamps to earn ${reward}.`,
      },
    ],
  };

  const nextTier = (tiers ?? []).find((t) => Number(t.stamp_count) > lifetime);
  if (nextTier) {
    const remaining = Number(nextTier.stamp_count) - lifetime;
    (storeCard.backFields as Array<{ key: string; label: string; value: string }>).push({
      key: 'next_tier',
      label: 'NEXT MILESTONE',
      value: `${remaining} stamp${remaining === 1 ? '' : 's'} until ${truncate(formatRewardDisplay(nextTier.reward), 40)}`,
    });
  }

  if (campaignMessage) {
    (storeCard.backFields as Array<{ key: string; label: string; value: string }>).unshift({
      key: 'campaign',
      label: 'MESSAGE',
      value: truncate(campaignMessage, 120),
    });
  }

  const pass = {
    formatVersion: 1,
    passTypeIdentifier: PASS_TYPE_ID,
    teamIdentifier: APPLE_TEAM_ID,
    organizationName: cafeName,
    description: `${cafeName} Loyalty`,
    serialNumber,
    logoText: truncate(cafeName, 12),
    suppressStripShine: true,
    backgroundColor: colors.bg,
    foregroundColor: colors.fg,
    labelColor: colors.label,
    webServiceURL: functionsUrl('/passkit-register'),
    authenticationToken: authToken,
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

  const scale = Math.min(canvasW / img.width, canvasH / img.height);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const resized = img.clone().resize(w, h);
  const canvas = new Image(canvasW, canvasH);
  canvas.fill(bg);
  canvas.composite(resized, 0, Math.max(0, Math.floor((canvasH - h) / 2)));
  return canvas;
}

async function buildMonogramIcon(
  bg: number,
  fg: number,
  size: number,
  initial?: string,
): Promise<Uint8Array> {
  const dim = Math.max(8, size);
  const img = new Image(dim, dim);
  img.fill(bg);
  const pad = Math.max(2, Math.round(dim * 0.12));
  img.drawCircle(dim / 2, dim / 2, dim / 2 - pad, fg);

  if (initial && initial.length === 1) {
    // Simple centred initial — imagescript has no native text; circle mark suffices for premium fallback
    img.drawCircle(dim / 2, dim / 2, Math.max(2, Math.round(dim * 0.18)), darken(bg, 8));
  } else {
    img.drawCircle(dim / 2, dim / 2, Math.max(2, Math.round(dim * 0.14)), darken(bg, 6));
  }

  return await img.encode();
}

async function prepareLogos(
  bytes: Uint8Array | null,
  bgRgba: number,
  fgRgba: number,
  initial?: string,
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

  for (const { name, w, h } of LOGO_SIZES) {
    if (source) {
      out[name] = await fitLogoLeft(source, w, h, bgRgba).encode();
    } else {
      const mark = await Image.decode(
        await buildMonogramIcon(bgRgba, fgRgba, Math.min(w, h), initial),
      );
      out[name] = await fitLogoLeft(mark, w, h, bgRgba).encode();
    }
  }
  return out;
}

async function prepareIcons(
  bytes: Uint8Array | null,
  bg: number,
  fg: number,
  initial?: string,
): Promise<Record<string, Uint8Array>> {
  const out: Record<string, Uint8Array> = {};
  let source: Image | null = null;

  if (bytes && bytes.length > 0 && bytes.length <= MAX_IMAGE_BYTES) {
    try {
      const decoded = await Image.decode(bytes);
      if (decoded.width >= 1 && decoded.height >= 1) {
        source = cropSquare(decoded);
      }
    } catch {
      source = null;
    }
  }

  for (const { name, w, h } of ICON_SIZES) {
    if (source && source.width >= 1 && source.height >= 1) {
      out[name] = await source.clone().resize(w, h).encode();
    } else {
      out[name] = await buildMonogramIcon(bg, fg, w, initial);
    }
  }
  return out;
}

async function buildStripImages(
  stampCount: number,
  goal: number,
  isRedeemed: boolean,
): Promise<Record<string, Uint8Array>> {
  const sizes = [
    { name: 'strip.png', w: 375, h: 123 },
    { name: 'strip@2x.png', w: 750, h: 246 },
    { name: 'strip@3x.png', w: 1125, h: 369 },
  ] as const;

  const out: Record<string, Uint8Array> = {};
  for (const { name, w, h } of sizes) {
    out[name] = await buildStampStripPng(w, h, stampCount, goal, isRedeemed);
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

  const passJson = buildPassJson(input);
  const rawLogo = await fetchImage(input.cafe.logo_url as string | null);

  const cafeInitial = String(input.cafe.name || 'T').charAt(0).toUpperCase();

  const stampGoal = Number(input.cafe.stamp_goal) || 10;
  const isRedeemed = input.status === 'redeemed';

  const [logos, icons, strips] = await Promise.all([
    prepareLogos(rawLogo, bgRgba, fgRgba, cafeInitial),
    prepareIcons(rawLogo, bgRgba, fgRgba, cafeInitial),
    buildStripImages(input.stampCount, stampGoal, isRedeemed),
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
