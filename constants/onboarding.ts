import { COLOR_PALETTES } from '@/constants/colorPalettes';

const DEFAULT = COLOR_PALETTES[0];

export const ONBOARDING_STEPS = 7;

export function stepLabel(step: number): string {
  return `Step ${step} of ${ONBOARDING_STEPS}`;
}

export const DEFAULT_CARD_COLORS = {
  backgroundColor: DEFAULT.backgroundColor,
  foregroundColor: DEFAULT.foregroundColor,
  labelColor: DEFAULT.labelColor,
};

export const DEFAULT_LOYALTY = {
  reward: 'Free coffee',
  stampGoal: 10,
  minimumSpendEnabled: false,
  minimumSpend: null as number | null,
};

export const WAITING_FUN_FACTS = [
  {
    icon: 'wallet-outline' as const,
    title: 'No customer app',
    body: 'Your regulars tap your stamp and add a card to Apple Wallet or Google Wallet in seconds.',
  },
  {
    icon: 'notifications-outline' as const,
    title: 'Push campaigns',
    body: 'Send a message to every wallet pass — perfect for double-stamp Saturdays or new menu launches.',
  },
  {
    icon: 'cafe-outline' as const,
    title: 'Counter-ready barista mode',
    body: 'Staff scan wallet QR codes or pick customers from a list — stamps and redemptions in one tap.',
  },
  {
    icon: 'time-outline' as const,
    title: 'Trial starts at go-live',
    body: 'Your 14-day free software trial begins when you link your stamp — not when you ordered.',
  },
  {
    icon: 'sparkles-outline' as const,
    title: 'Premium by design',
    body: 'Handcrafted counter stamps and wallet passes that feel as considered as your coffee.',
  },
];

export const WAITING_TIMELINE = [
  { title: 'Stamp in the post', detail: 'We ship your loyalty stamp within 48 hours of payment.' },
  { title: 'Sign in to the app', detail: 'Use the same email and password you created on tapstamp.co.' },
  { title: 'Customise your card', detail: 'Colours, logo, reward rules, and staff setup — about 5 minutes.' },
  { title: 'Link your stamp', detail: 'Tap your stamp to your phone to connect it to your loyalty programme.' },
  { title: 'Customers tap', detail: 'Their wallet card updates instantly. You are live — trial starts now.' },
];
