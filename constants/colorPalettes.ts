export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  backgroundColor: string;
  foregroundColor: string;
  labelColor: string;
}

/** Curated palettes — owners pick a finished look, not individual colours */
export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: 'espresso-gold',
    name: 'Espresso & Gold',
    description: 'Warm dark roast with brass accents',
    backgroundColor: 'rgb(26, 24, 20)',
    foregroundColor: 'rgb(201, 169, 110)',
    labelColor: 'rgb(138, 128, 112)',
  },
  {
    id: 'midnight-silver',
    name: 'Midnight',
    description: 'Deep navy with cool silver highlights',
    backgroundColor: 'rgb(12, 14, 20)',
    foregroundColor: 'rgb(180, 195, 220)',
    labelColor: 'rgb(100, 110, 130)',
  },
  {
    id: 'cream-ink',
    name: 'Cream',
    description: 'Light boutique feel with ink typography',
    backgroundColor: 'rgb(250, 248, 245)',
    foregroundColor: 'rgb(26, 24, 20)',
    labelColor: 'rgb(138, 128, 112)',
  },
  {
    id: 'forest-moss',
    name: 'Forest',
    description: 'Earthy green for natural brands',
    backgroundColor: 'rgb(22, 32, 24)',
    foregroundColor: 'rgb(168, 198, 152)',
    labelColor: 'rgb(108, 128, 102)',
  },
  {
    id: 'wine-blush',
    name: 'Wine',
    description: 'Rich burgundy with soft rose gold',
    backgroundColor: 'rgb(32, 18, 22)',
    foregroundColor: 'rgb(212, 165, 155)',
    labelColor: 'rgb(140, 110, 115)',
  },
  {
    id: 'slate-copper',
    name: 'Slate',
    description: 'Modern grey with copper detail',
    backgroundColor: 'rgb(28, 30, 34)',
    foregroundColor: 'rgb(196, 154, 108)',
    labelColor: 'rgb(120, 125, 132)',
  },
];

export function getPalette(id: string): ColorPalette {
  return COLOR_PALETTES.find((p) => p.id === id) ?? COLOR_PALETTES[0];
}
