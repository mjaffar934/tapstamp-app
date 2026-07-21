import { Image } from 'https://deno.land/x/imagescript@1.3.0/mod.ts';
import { TAPSTAMP_BG, TAPSTAMP_FG } from './brand.ts';

export interface StampStripColors {
  background: string;
  foreground: string;
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

function drawRing(img: Image, cx: number, cy: number, radius: number, color: number, thickness: number) {
  const outer = radius + thickness;
  for (let y = Math.floor(cy - outer); y <= Math.ceil(cy + outer); y++) {
    for (let x = Math.floor(cx - outer); x <= Math.ceil(cx + outer); x++) {
      if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= outer && dist >= radius - thickness * 0.5) {
        img.setPixelAt(x + 1, y + 1, color);
      }
    }
  }
}

function drawFilledCircle(img: Image, cx: number, cy: number, radius: number, color: number) {
  const r = radius + 1;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue;
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        img.setPixelAt(x + 1, y + 1, color);
      }
    }
  }
}

function paintPremiumBackground(img: Image, bg: number, fg: number) {
  const wash = blendAlpha(bg, fg, 0.06);
  const edge = blendAlpha(bg, fg, 0.14);
  for (let y = 0; y < img.height; y++) {
    const t = y / Math.max(1, img.height - 1);
    const row = blendAlpha(bg, wash, t * 0.85);
    for (let x = 0; x < img.width; x++) {
      img.setPixelAt(x + 1, y + 1, row);
    }
  }
  for (let x = 0; x < img.width; x++) {
    img.setPixelAt(x + 1, 1, edge);
    img.setPixelAt(x + 1, 2, blendAlpha(bg, fg, 0.08));
  }
}

/** Premium stamp strip — soft wash + glowing filled stamps. Optional photo base. */
export async function buildStampStripPng(
  width: number,
  height: number,
  stampCount: number,
  goal: number,
  isRedeemed: boolean,
  colors?: StampStripColors,
  isComplete = false,
  photoBase?: Image | null,
  /** Apple leaves room for the count; Google hero should be full-width centered. */
  layout: 'apple' | 'centered' = 'apple',
): Promise<Uint8Array> {
  const bgRgba = parseColorToRgba(colors?.background ?? TAPSTAMP_BG);
  const fgRgba = parseColorToRgba(colors?.foreground ?? TAPSTAMP_FG);
  const img = new Image(width, height);
  if (photoBase && photoBase.width >= 1 && photoBase.height >= 1) {
    const resized = photoBase.clone().resize(width, height);
    img.composite(resized, 0, 0);
    const shade = blendAlpha(0x000000ff, bgRgba, 0.35);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const px = img.getPixelAt(x + 1, y + 1);
        img.setPixelAt(x + 1, y + 1, blendAlpha(px, shade, 0.28));
      }
    }
  } else {
    paintPremiumBackground(img, bgRgba, fgRgba);
  }

  const centered = layout === 'centered';

  if (isRedeemed || isComplete || goal < 1) {
    const glow = blendAlpha(bgRgba, fgRgba, 0.2);
    const cx = Math.floor(width * (centered ? 0.5 : 0.62));
    const cy = Math.floor(height * 0.5);
    drawFilledCircle(img, cx, cy, Math.max(18, Math.round(height * 0.22)), glow);
    drawFilledCircle(img, cx, cy, Math.max(10, Math.round(height * 0.12)), fgRgba);
    return await img.encode();
  }

  const filled = stampCount;
  const dotCount = Math.max(goal, 1);
  const leftGutter = Math.round(width * (centered ? 0.08 : 0.34));
  const rightPad = Math.round(width * (centered ? 0.08 : 0.06));
  const usableW = width - leftGutter - rightPad;
  const gap = Math.max(6, Math.round(Math.min(usableW, height) * (centered ? 0.045 : 0.03)));
  const maxDotR = Math.max(8, Math.round(Math.min(usableW, height) * (centered ? 0.16 : 0.12)));
  const minDotR = centered ? 8 : 5;
  let dotR = Math.floor((usableW - gap * (dotCount - 1)) / (dotCount * 2));
  dotR = Math.max(minDotR, Math.min(maxDotR, dotR));

  const maxPerRow = Math.max(4, Math.floor(usableW / (dotR * 2 + gap)));
  const rows = dotCount > maxPerRow ? 2 : 1;
  const perRow = rows === 1 ? dotCount : Math.ceil(dotCount / 2);
  const rowGap = rows === 1 ? 0 : Math.max(8, Math.round(dotR * 1.4));
  const totalRowsH = rows * (dotR * 2) + (rows - 1) * rowGap;
  const firstCy = Math.floor((height - totalRowsH) / 2) + dotR;
  const ringColor = blendAlpha(bgRgba, fgRgba, 0.55);
  const glowColor = blendAlpha(bgRgba, fgRgba, 0.5);
  const innerHighlight = blendAlpha(fgRgba, 0xffffffff, 0.22);
  const stampFg = fgRgba;

  for (let i = 0; i < dotCount; i++) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const dotsThisRow = row === rows - 1 ? dotCount - perRow * (rows - 1) : perRow;
    const thisRowW = dotsThisRow * dotR * 2 + (dotsThisRow - 1) * gap;
    const rowStartX = leftGutter + Math.floor((usableW - thisRowW) / 2) + dotR;
    const cx = rowStartX + col * (dotR * 2 + gap);
    const cy = firstCy + row * (dotR * 2 + rowGap);
    const on = i < filled;
    if (on) {
      drawFilledCircle(img, cx, cy, dotR + Math.max(2, Math.round(dotR * 0.35)), glowColor);
      drawFilledCircle(img, cx, cy, dotR, stampFg);
      drawFilledCircle(img, cx - Math.round(dotR * 0.22), cy - Math.round(dotR * 0.22), Math.max(2, Math.round(dotR * 0.28)), innerHighlight);
    } else {
      drawFilledCircle(img, cx, cy, dotR, blendAlpha(0xffffffff, bgRgba, 0.55));
      drawRing(img, cx, cy, dotR, ringColor, Math.max(2, Math.round(dotR * 0.2)));
    }
  }

  return await img.encode();
}
