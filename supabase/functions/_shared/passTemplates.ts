export type PassTemplateId = 'classic' | 'midnight' | 'cream' | 'espresso' | 'forest';

export interface PassTemplate {
  id: PassTemplateId;
  name: string;
  backgroundColor: string;
  foregroundColor: string;
  labelColor: string;
}

export const PASS_TEMPLATES: Record<PassTemplateId, PassTemplate> = {
  classic: {
    id: 'classic',
    name: 'Classic Dark',
    backgroundColor: 'rgb(26, 24, 20)',
    foregroundColor: 'rgb(201, 169, 110)',
    labelColor: 'rgb(138, 128, 112)',
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    backgroundColor: 'rgb(12, 14, 20)',
    foregroundColor: 'rgb(180, 195, 220)',
    labelColor: 'rgb(100, 110, 130)',
  },
  cream: {
    id: 'cream',
    name: 'Cream',
    backgroundColor: 'rgb(250, 248, 245)',
    foregroundColor: 'rgb(26, 24, 20)',
    labelColor: 'rgb(138, 128, 112)',
  },
  espresso: {
    id: 'espresso',
    name: 'Espresso',
    backgroundColor: 'rgb(32, 20, 14)',
    foregroundColor: 'rgb(232, 196, 152)',
    labelColor: 'rgb(160, 120, 90)',
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    backgroundColor: 'rgb(16, 28, 22)',
    foregroundColor: 'rgb(168, 204, 176)',
    labelColor: 'rgb(110, 140, 118)',
  },
};

export function resolvePassTemplate(cafe: Record<string, unknown>): PassTemplate {
  const id = String(cafe.pass_template || 'classic') as PassTemplateId;
  return PASS_TEMPLATES[id] ?? PASS_TEMPLATES.classic;
}

function isRgbOrHex(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  const v = value.trim();
  return /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i.test(v) || /^#[0-9a-f]{6}$/i.test(v);
}

function parseRgbParts(color: string): [number, number, number] | null {
  const m = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  if (color.startsWith('#') && color.length >= 7) {
    return [
      parseInt(color.slice(1, 3), 16),
      parseInt(color.slice(3, 5), 16),
      parseInt(color.slice(5, 7), 16),
    ];
  }
  return null;
}

function lumin(rgb: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
}

/** Never ship illegible Wallet colours (e.g. white stamp count on cream). */
export function enforcePassContrast(colors: {
  backgroundColor: string;
  foregroundColor: string;
  labelColor: string;
}): { backgroundColor: string; foregroundColor: string; labelColor: string } {
  const bg = parseRgbParts(colors.backgroundColor) ?? [26, 24, 20];
  let fg = parseRgbParts(colors.foregroundColor) ?? [201, 169, 110];
  let label = parseRgbParts(colors.labelColor) ?? [138, 128, 112];
  const lightBg = lumin(bg) > 0.55;

  if (lightBg) {
    if (lumin(fg) > 0.35) fg = [40, 28, 18];
    if (lumin(label) > 0.5) label = [110, 100, 90];
  } else {
    if (lumin(fg) < 0.45) fg = [201, 169, 110];
    if (lumin(label) < 0.42) label = [176, 164, 148];
  }

  return {
    backgroundColor: `rgb(${bg[0]}, ${bg[1]}, ${bg[2]})`,
    foregroundColor: `rgb(${fg[0]}, ${fg[1]}, ${fg[2]})`,
    labelColor: `rgb(${label[0]}, ${label[1]}, ${label[2]})`,
  };
}

/** Cafe template + optional custom colour overrides. */
export function resolvePassColors(cafe: Record<string, unknown>): PassTemplate {
  const base = resolvePassTemplate(cafe);
  return {
    ...base,
    ...enforcePassContrast({
      backgroundColor: isRgbOrHex(cafe.background_color) ? cafe.background_color.trim() : base.backgroundColor,
      foregroundColor: isRgbOrHex(cafe.foreground_color) ? cafe.foreground_color.trim() : base.foregroundColor,
      labelColor: isRgbOrHex(cafe.label_color) ? cafe.label_color.trim() : base.labelColor,
    }),
  };
}
