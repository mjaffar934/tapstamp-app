/** Locked shop / loyalty quiz answered once during onboarding. */

export type ProgramMode = 'stamps' | 'stamps_levels';
export type DesignMode = 'classic' | 'ai';

export interface LoyaltyLevelAnswer {
  stamp_count: number;
  reward: string;
}

export interface PassDesignQuiz {
  version: 1;
  program_mode: ProgramMode;
  reward: string;
  stamp_goal: number;
  levels: LoyaltyLevelAnswer[];
  /** Detailed free-text: what they sell, known for, neighbourhood */
  shop_story: string;
  /** Overall room / brand atmosphere */
  atmosphere: string;
  atmosphere_notes: string;
  /** Who visits most */
  regulars: string[];
  visit_frequency: string;
  loyalty_goal: string;
  /** Colour mood for the card */
  colour_mood: string;
  brand_colour_notes: string;
  /** Optional one-liner for the feel of opening Wallet */
  wallet_feel: string;
}

export const ATMOSPHERES = [
  { id: 'neighbourhood_cosy', label: 'Cosy neighbourhood spot' },
  { id: 'specialty_quiet', label: 'Quiet specialty / craft' },
  { id: 'busy_grab', label: 'Busy grab-and-go' },
  { id: 'polished', label: 'Polished & contemporary' },
  { id: 'playful', label: 'Playful & characterful' },
  { id: 'premium_dark', label: 'Dark & premium' },
] as const;

export const REGULARS = [
  { id: 'locals', label: 'Local regulars' },
  { id: 'office', label: 'Office / remote workers' },
  { id: 'students', label: 'Students' },
  { id: 'families', label: 'Families' },
  { id: 'tourists', label: 'Tourists / passer-by' },
] as const;

export const VISIT_FREQ = [
  { id: 'few_week', label: 'A few times a week' },
  { id: 'weekly', label: 'About weekly' },
  { id: 'fortnightly', label: 'Every couple of weeks' },
  { id: 'monthly', label: 'Monthly' },
] as const;

export const LOYALTY_GOALS = [
  { id: 'return', label: 'Get people coming back more often' },
  { id: 'reward_best', label: 'Spoil my best regulars' },
  { id: 'stand_out', label: 'Stand out vs nearby shops' },
  { id: 'simple', label: 'Keep loyalty simple and clear' },
] as const;

export const COLOUR_MOODS = [
  { id: 'warm_earth', label: 'Warm earthy browns' },
  { id: 'cream_soft', label: 'Soft cream & muted tones' },
  { id: 'fresh_green', label: 'Fresh greens' },
  { id: 'cool_blue', label: 'Cool blues' },
  { id: 'bold_contrast', label: 'Bold high contrast' },
  { id: 'black_gold', label: 'Black & gold premium' },
] as const;

export const WALLET_FEELS = [
  { id: 'friendly', label: 'Friendly & welcoming' },
  { id: 'craft', label: 'Craft & considered' },
  { id: 'luxe', label: 'Quietly luxurious' },
  { id: 'fun', label: 'Fun & memorable' },
] as const;

export function emptyPassDesignQuiz(): PassDesignQuiz {
  return {
    version: 1,
    program_mode: 'stamps',
    reward: 'Free coffee',
    stamp_goal: 10,
    levels: [
      { stamp_count: 5, reward: 'Free pastry' },
      { stamp_count: 10, reward: 'Free coffee' },
    ],
    shop_story: '',
    atmosphere: '',
    atmosphere_notes: '',
    regulars: [],
    visit_frequency: '',
    loyalty_goal: '',
    colour_mood: '',
    brand_colour_notes: '',
    wallet_feel: '',
  };
}

export function quizAnswersComplete(q: PassDesignQuiz): { ok: boolean; missing: string } {
  if (!q.shop_story.trim() || q.shop_story.trim().length < 24) {
    return { ok: false, missing: 'Tell us a bit more about your shop (a few sentences).' };
  }
  if (!q.atmosphere) return { ok: false, missing: 'Pick the atmosphere that fits your place.' };
  if (!q.regulars.length) return { ok: false, missing: 'Select who your regulars are.' };
  if (!q.visit_frequency) return { ok: false, missing: 'How often do regulars visit?' };
  if (!q.loyalty_goal) return { ok: false, missing: 'What matters most for your loyalty card?' };
  if (!q.colour_mood) return { ok: false, missing: 'Pick a colour mood for the card.' };
  if (!q.wallet_feel) return { ok: false, missing: 'How should the Wallet card feel?' };
  return { ok: true, missing: '' };
}

export function quizToAiPayload(q: PassDesignQuiz, businessName?: string, bizType?: string) {
  const atmosphereLabel = ATMOSPHERES.find((a) => a.id === q.atmosphere)?.label ?? q.atmosphere;
  const colourLabel = COLOUR_MOODS.find((c) => c.id === q.colour_mood)?.label ?? q.colour_mood;
  const feelLabel = WALLET_FEELS.find((w) => w.id === q.wallet_feel)?.label ?? q.wallet_feel;
  const regularsLabel = q.regulars
    .map((id) => REGULARS.find((r) => r.id === id)?.label ?? id)
    .join(', ');
  const visitLabel = VISIT_FREQ.find((v) => v.id === q.visit_frequency)?.label ?? q.visit_frequency;
  const goalLabel = LOYALTY_GOALS.find((g) => g.id === q.loyalty_goal)?.label ?? q.loyalty_goal;

  const sells = [
    q.shop_story.trim(),
    q.atmosphere_notes.trim() ? `Space notes: ${q.atmosphere_notes.trim()}` : '',
    `Atmosphere: ${atmosphereLabel}`,
    `Regulars: ${regularsLabel}`,
    q.brand_colour_notes.trim() ? `Brand colour notes: ${q.brand_colour_notes.trim()}` : '',
    `Wallet feel: ${feelLabel}`,
  ].filter(Boolean).join('\n');

  return {
    program_mode: q.program_mode,
    reward: q.reward,
    stamp_goal: q.stamp_goal,
    levels: q.program_mode === 'stamps_levels' ? q.levels : [],
    visit_frequency: visitLabel,
    goal_priority: goalLabel,
    business_name: businessName,
    biz_type: bizType,
    sells,
    brand_colour: colourLabel,
    vibe: `${atmosphereLabel}; ${feelLabel}; ${colourLabel}`,
  };
}

/** Local palette when Anthropic is unreachable — still follows locked quiz answers. */
export function paletteFromQuiz(q: PassDesignQuiz): {
  backgroundColor: string;
  foregroundColor: string;
  labelColor: string;
  rationale: string;
} {
  const mood = q.colour_mood;
  const atmosphere = q.atmosphere;
  let backgroundColor = 'rgb(255, 252, 248)';
  let foregroundColor = 'rgb(72, 48, 32)';
  let labelColor = 'rgb(120, 108, 96)';

  if (mood === 'black_gold' || atmosphere === 'premium_dark') {
    backgroundColor = 'rgb(26, 24, 20)';
    foregroundColor = 'rgb(201, 169, 110)';
    labelColor = 'rgb(168, 156, 138)';
  } else if (mood === 'warm_earth') {
    backgroundColor = 'rgb(250, 244, 236)';
    foregroundColor = 'rgb(92, 52, 28)';
    labelColor = 'rgb(140, 110, 88)';
  } else if (mood === 'cream_soft') {
    backgroundColor = 'rgb(252, 250, 246)';
    foregroundColor = 'rgb(56, 48, 40)';
    labelColor = 'rgb(130, 118, 104)';
  } else if (mood === 'fresh_green') {
    backgroundColor = 'rgb(248, 252, 248)';
    foregroundColor = 'rgb(28, 88, 58)';
    labelColor = 'rgb(90, 120, 100)';
  } else if (mood === 'cool_blue') {
    backgroundColor = 'rgb(246, 249, 252)';
    foregroundColor = 'rgb(24, 64, 120)';
    labelColor = 'rgb(100, 118, 140)';
  } else if (mood === 'bold_contrast') {
    backgroundColor = 'rgb(18, 18, 18)';
    foregroundColor = 'rgb(245, 245, 245)';
    labelColor = 'rgb(180, 180, 180)';
  } else if (atmosphere === 'playful') {
    backgroundColor = 'rgb(255, 250, 245)';
    foregroundColor = 'rgb(180, 60, 40)';
    labelColor = 'rgb(150, 110, 90)';
  }

  return {
    backgroundColor,
    foregroundColor,
    labelColor,
    rationale: `Colours matched to your ${COLOUR_MOODS.find((c) => c.id === mood)?.label ?? 'shop'} mood and atmosphere.`,
  };
}

export function labelFor(
  list: ReadonlyArray<{ id: string; label: string }>,
  id: string,
): string {
  return list.find((item) => item.id === id)?.label ?? id;
}
