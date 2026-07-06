/** Full swatch lists for pass colour picking — background, text, and labels. */

export const PASS_BACKGROUND_COLORS: string[] = [
  'rgb(26, 24, 20)',
  'rgb(12, 14, 20)',
  'rgb(22, 32, 24)',
  'rgb(32, 18, 22)',
  'rgb(28, 30, 34)',
  'rgb(18, 22, 28)',
  'rgb(40, 28, 20)',
  'rgb(24, 20, 32)',
  'rgb(20, 36, 40)',
  'rgb(36, 24, 16)',
  'rgb(250, 248, 245)',
  'rgb(255, 255, 255)',
  'rgb(245, 242, 235)',
  'rgb(238, 232, 220)',
  'rgb(28, 28, 30)',
  'rgb(44, 44, 46)',
  'rgb(0, 51, 102)',
  'rgb(20, 60, 50)',
  'rgb(80, 20, 40)',
  'rgb(60, 40, 20)',
];

export const PASS_FOREGROUND_COLORS: string[] = [
  'rgb(255, 255, 255)',
  'rgb(250, 248, 245)',
  'rgb(201, 169, 110)',
  'rgb(196, 154, 108)',
  'rgb(180, 195, 220)',
  'rgb(168, 198, 152)',
  'rgb(212, 165, 155)',
  'rgb(255, 214, 120)',
  'rgb(140, 200, 255)',
  'rgb(255, 180, 180)',
  'rgb(26, 24, 20)',
  'rgb(12, 14, 20)',
  'rgb(44, 44, 46)',
  'rgb(0, 122, 255)',
  'rgb(52, 199, 89)',
  'rgb(255, 59, 48)',
  'rgb(255, 149, 0)',
  'rgb(175, 82, 222)',
  'rgb(90, 200, 250)',
  'rgb(255, 204, 0)',
];

export const PASS_LABEL_COLORS: string[] = [
  'rgb(138, 128, 112)',
  'rgb(100, 110, 130)',
  'rgb(108, 128, 102)',
  'rgb(140, 110, 115)',
  'rgb(120, 125, 132)',
  'rgb(142, 142, 147)',
  'rgb(174, 174, 178)',
  'rgb(181, 173, 160)',
  'rgb(160, 150, 140)',
  'rgb(130, 140, 150)',
  'rgb(180, 170, 155)',
  'rgb(110, 120, 110)',
  'rgb(150, 130, 120)',
  'rgb(100, 100, 110)',
  'rgb(200, 190, 175)',
];

export function labelColorForBackground(bg: string): string {
  const light = bg.includes('250') || bg.includes('255') || bg.includes('245') || bg.includes('238');
  return light ? 'rgb(138, 128, 112)' : 'rgb(142, 142, 147)';
}
