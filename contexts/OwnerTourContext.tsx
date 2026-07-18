import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { router } from 'expo-router';
import { OwnerTour, type OwnerTourStep } from '@/components/onboarding/OwnerTour';
import { completeOwnerTour, shouldShowOwnerTour } from '@/lib/ownerTour';

const STEPS: OwnerTourStep[] = [
  {
    icon: 'card-outline',
    title: 'Customise your card',
    body: 'Set your reward, logo, and messages here. Customers see this on their Wallet pass and tap page.',
    route: '/(app)/(tabs)/settings/card-settings',
  },
  {
    icon: 'people-outline',
    title: 'Staff mode',
    body: 'Manually add stamps or redeem rewards. Share your staff code with the team.',
    route: '/(app)/(tabs)/barista',
  },
  {
    icon: 'megaphone-outline',
    title: 'Run campaigns',
    body: 'Schedule promotions on your customer tap page — great for events or slow days.',
    route: '/(app)/(tabs)/campaigns',
  },
  {
    icon: 'phone-portrait-outline',
    title: 'How customers collect stamps',
    body: 'They tap your TapStamp with their phone, add the card to Wallet, then tap the stamp again on each visit.',
    route: '/(app)/(tabs)/settings/share',
  },
];

interface OwnerTourContextValue {
  startTourIfNeeded: () => Promise<boolean>;
}

const OwnerTourContext = createContext<OwnerTourContextValue | null>(null);

export function OwnerTourProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  const finish = useCallback(async () => {
    await completeOwnerTour();
    setVisible(false);
    setStep(0);
    router.replace('/(app)/(tabs)/home');
  }, []);

  const startTourIfNeeded = useCallback(async () => {
    if (!(await shouldShowOwnerTour())) return false;
    setStep(0);
    setVisible(true);
    router.replace(STEPS[0].route);
    return true;
  }, []);

  const next = useCallback(async () => {
    if (step >= STEPS.length - 1) {
      await finish();
      return;
    }
    const nextStep = step + 1;
    setStep(nextStep);
    router.push(STEPS[nextStep].route);
  }, [step, finish]);

  const value = useMemo(() => ({ startTourIfNeeded }), [startTourIfNeeded]);

  return (
    <OwnerTourContext.Provider value={value}>
      {children}
      <OwnerTour
        visible={visible}
        step={step}
        steps={STEPS}
        onNext={() => void next()}
        onSkip={() => void finish()}
      />
    </OwnerTourContext.Provider>
  );
}

export function useOwnerTour(): OwnerTourContextValue {
  const ctx = useContext(OwnerTourContext);
  if (!ctx) throw new Error('useOwnerTour must be used within OwnerTourProvider');
  return ctx;
}
