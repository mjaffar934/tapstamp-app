import { secureStorage } from './storage';
import { DEFAULT_CARD_COLORS, DEFAULT_LOYALTY } from '@/constants/onboarding';
import { TAPSTAMP_BRAND } from '@/constants/tapstampBrand';
import {
  emptyPassDesignQuiz,
  type DesignMode,
  type PassDesignQuiz,
  type ProgramMode,
} from '@/lib/passDesignQuiz';

export type { DesignMode, ProgramMode, PassDesignQuiz };
export type { LoyaltyLevelAnswer as LoyaltyLevelDraft } from '@/lib/passDesignQuiz';

const KEY = 'tapstamp_onboarding_draft';

export interface OnboardingDraft {
  bizType: string;
  backgroundColor: string;
  foregroundColor: string;
  labelColor: string;
  logoUri: string | null;
  chipCode: string | null;
  reward: string;
  stampGoal: number;
  minimumSpendEnabled: boolean;
  minimumSpend: number | null;
  programMode: ProgramMode;
  designMode: DesignMode;
  quiz: PassDesignQuiz;
  aiRationale: string | null;
}

const DEFAULT_DRAFT: OnboardingDraft = {
  bizType: 'cafe',
  ...DEFAULT_CARD_COLORS,
  backgroundColor: TAPSTAMP_BRAND.backgroundColor,
  foregroundColor: TAPSTAMP_BRAND.foregroundColor,
  labelColor: TAPSTAMP_BRAND.labelColor,
  logoUri: null,
  chipCode: null,
  ...DEFAULT_LOYALTY,
  programMode: 'stamps',
  designMode: 'classic',
  quiz: emptyPassDesignQuiz(),
  aiRationale: null,
};

function migrateQuiz(parsed: Partial<OnboardingDraft> & Record<string, unknown>): PassDesignQuiz {
  const base = emptyPassDesignQuiz();
  const q = (parsed.quiz && typeof parsed.quiz === 'object')
    ? parsed.quiz as Partial<PassDesignQuiz>
    : {};

  return {
    ...base,
    ...q,
    program_mode: (q.program_mode || parsed.programMode || base.program_mode) as ProgramMode,
    reward: String(q.reward || parsed.reward || base.reward),
    stamp_goal: Number(q.stamp_goal || parsed.stampGoal || base.stamp_goal) || 10,
    levels: Array.isArray(q.levels) && q.levels.length
      ? q.levels
      : Array.isArray(parsed.levels) && (parsed.levels as PassDesignQuiz['levels']).length
        ? parsed.levels as PassDesignQuiz['levels']
        : base.levels,
    shop_story: String(q.shop_story || parsed.sells || ''),
    atmosphere: String(q.atmosphere || parsed.vibe || ''),
    atmosphere_notes: String(q.atmosphere_notes || ''),
    regulars: Array.isArray(q.regulars) ? q.regulars : [],
    visit_frequency: String(q.visit_frequency || parsed.visitFrequency || ''),
    loyalty_goal: String(q.loyalty_goal || parsed.goalPriority || ''),
    colour_mood: String(q.colour_mood || parsed.brandColour || ''),
    brand_colour_notes: String(q.brand_colour_notes || ''),
    wallet_feel: String(q.wallet_feel || ''),
  };
}

export async function loadOnboardingDraft(): Promise<OnboardingDraft> {
  try {
    const raw = await secureStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_DRAFT, quiz: emptyPassDesignQuiz() };
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft> & Record<string, unknown>;
    const quiz = migrateQuiz(parsed);
    return {
      ...DEFAULT_DRAFT,
      ...parsed,
      quiz,
      programMode: quiz.program_mode,
      reward: quiz.reward,
      stampGoal: quiz.stamp_goal,
      designMode: (parsed.designMode as DesignMode) || 'classic',
    };
  } catch {
    return { ...DEFAULT_DRAFT, quiz: emptyPassDesignQuiz() };
  }
}

export async function saveOnboardingDraft(patch: Partial<OnboardingDraft> & { quiz?: Partial<PassDesignQuiz> }): Promise<OnboardingDraft> {
  const current = await loadOnboardingDraft();
  const quiz = patch.quiz
    ? { ...current.quiz, ...patch.quiz }
    : current.quiz;
  if (patch.programMode) quiz.program_mode = patch.programMode;
  if (patch.reward) quiz.reward = patch.reward;
  if (patch.stampGoal) quiz.stamp_goal = patch.stampGoal;

  const merged: OnboardingDraft = {
    ...current,
    ...patch,
    quiz,
    programMode: quiz.program_mode,
    reward: quiz.reward,
    stampGoal: quiz.stamp_goal,
  };
  await secureStorage.setItem(KEY, JSON.stringify(merged));
  return merged;
}

export async function clearOnboardingDraft(): Promise<void> {
  await secureStorage.removeItem(KEY);
}

export function classicBrandColors() {
  return {
    backgroundColor: TAPSTAMP_BRAND.backgroundColor,
    foregroundColor: TAPSTAMP_BRAND.foregroundColor,
    labelColor: TAPSTAMP_BRAND.labelColor,
  };
}
