import { PASS_BACKGROUND_COLORS, PASS_FOREGROUND_COLORS, labelColorForBackground } from '@/constants/passColors';

export const ONBOARDING_STEPS = 5;

export function stepLabel(step: number): string {
  return `Step ${step} of ${ONBOARDING_STEPS}`;
}

export const DEFAULT_CARD_COLORS = {
  backgroundColor: PASS_BACKGROUND_COLORS[0],
  foregroundColor: PASS_FOREGROUND_COLORS[2],
  labelColor: labelColorForBackground(PASS_BACKGROUND_COLORS[0]),
};

export const DEFAULT_LOYALTY = {
  reward: 'Free coffee',
  stampGoal: 10,
  minimumSpendEnabled: false,
  minimumSpend: null as number | null,
};
