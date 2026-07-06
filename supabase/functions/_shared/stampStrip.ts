import { Image } from 'https://deno.land/x/imagescript@1.3.0/mod.ts';
import { TAPSTAMP_BG, TAPSTAMP_FG } from './brand.ts';

function parseColorToRgba(color: string): number {
  const rgb = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgb) {
    return (Number(rgb[1]) << 24) | (Number(rgb[2]) << 16) | (Number(rgb[3]) << 8) | 255;
  }
  return (0x1a << 24) | (0x18 << 16) | (0x14 << 8) | 255;
}

/** Stamp-dot strip image — same visual as Apple Wallet strip. */
export async function buildStampStripPng(
  width: number,
  height: number,
  stampCount: number,
  goal: number,
  isRedeemed: boolean,
): Promise<Uint8Array> {
  const bgRgba = parseColorToRgba(TAPSTAMP_BG);
  const fgRgba = parseColorToRgba(TAPSTAMP_FG);
  const filled = isRedeemed ? goal : stampCount;

  const img = new Image(width, height);
  img.fill(bgRgba);

  const dotR = Math.max(6, Math.round(width * 0.022));
  const gap = Math.max(4, Math.round(width * 0.018));
  const rowW = goal * dotR * 2 + (goal - 1) * gap;
  let x = Math.floor((width - rowW) / 2) + dotR;
  const cy = Math.floor(height / 2);
  const ring = Math.max(2, Math.round(dotR * 0.22));

  for (let i = 0; i < goal; i++) {
    if (i < filled) {
      img.drawCircle(x, cy, dotR, fgRgba);
    } else {
      img.drawCircle(x, cy, dotR, fgRgba);
      img.drawCircle(x, cy, Math.max(1, dotR - ring), bgRgba);
    }
    x += dotR * 2 + gap;
  }

  return await img.encode();
}
