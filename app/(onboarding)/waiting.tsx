import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuth } from '@/contexts/AuthContext';
import { markKitReceived } from '@/lib/api';
import { WAITING_FUN_FACTS, WAITING_TIMELINE } from '@/constants/onboarding';
import { planLabel } from '@/constants/plans';
import { monthlyPriceLabel } from '@/lib/planUtils';
import { PLANS, HARDWARE_PRICE_GBP } from '@/constants/plans';
import { colors, radius, spacing } from '@/constants/theme';
import type { PlanId } from '@/constants/plans';

export default function WaitingScreen() {
  const { business, signOut, refreshBusiness } = useAuth();
  const [loading, setLoading] = useState(false);
  const [factIndex, setFactIndex] = useState(0);

  const planId = (business?.plan_selected ?? 'starter') as PlanId;
  const plan = PLANS[planId];
  const fact = WAITING_FUN_FACTS[factIndex];

  useEffect(() => {
    const timer = setInterval(() => {
      setFactIndex((i) => (i + 1) % WAITING_FUN_FACTS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const confirmKit = async () => {
    setLoading(true);
    const result = await markKitReceived();
    setLoading(false);
    if (result.error) return;
    await refreshBusiness();
    router.replace('/(onboarding)/welcome');
  };

  return (
    <Screen>
      <View style={styles.topBar}>
        <BrandLogo size={40} />
        <Pressable onPress={async () => { await signOut(); router.replace('/(auth)/gate'); }} hitSlop={12}>
          <Text variant="bodySmall" color={colors.textSecondary}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={styles.iconWrap}>
          <Ionicons name="cube-outline" size={36} color={colors.accent} />
        </View>
        <Text variant="caption" color={colors.accentDark} style={styles.eyebrow}>
          STILL WAITING ON YOUR STAMP?
        </Text>
        <Text variant="hero" style={styles.title}>Your stamp is on the way</Text>
        <Text muted style={styles.subtitle}>
          We post your handcrafted loyalty stamp within 48 hours. While you wait, here is what you are building towards.
        </Text>
      </View>

      <Card style={styles.planCard}>
        <Text variant="caption" muted>YOUR ORDER</Text>
        <Text variant="h3">{plan.name}</Text>
        <Text variant="bodySmall" muted>
          Stamp paid · £{HARDWARE_PRICE_GBP}
          {plan.monthlyGbp != null ? ` · ${monthlyPriceLabel(planId)}` : ' · Free after trial'}
        </Text>
        {business?.shipping_address_line1 ? (
          <Text variant="bodySmall" muted style={styles.address}>
            Shipping to {business.shipping_address_line1}
            {business.city ? `, ${business.city}` : ''}
            {business.postcode ? ` ${business.postcode}` : ''}
          </Text>
        ) : null}
      </Card>

      <Card style={styles.factCard}>
        <View style={styles.factHeader}>
          <Ionicons name={fact.icon} size={22} color={colors.accentDark} />
          <Text variant="caption" muted>{factIndex + 1} / {WAITING_FUN_FACTS.length}</Text>
        </View>
        <Text variant="h3">{fact.title}</Text>
        <Text variant="bodySmall" muted>{fact.body}</Text>
        <View style={styles.dots}>
          {WAITING_FUN_FACTS.map((_, i) => (
            <View key={i} style={[styles.dot, i === factIndex && styles.dotActive]} />
          ))}
        </View>
      </Card>

      <Card style={styles.timeline} padded={false}>
        <Text variant="h3" style={styles.timelineTitle}>How go-live works</Text>
        {WAITING_TIMELINE.map((item, i) => (
          <View key={item.title} style={styles.timelineRow}>
            <View style={styles.timelineNum}>
              <Text variant="caption" color={colors.accentDark}>{i + 1}</Text>
            </View>
            <View style={styles.timelineText}>
              <Text variant="bodySmall" style={styles.timelineLabel}>{item.title}</Text>
              <Text variant="caption" muted>{item.detail}</Text>
            </View>
          </View>
        ))}
      </Card>

      <Button title="I've received my stamp — let's set up" onPress={confirmKit} loading={loading} />
      <Text variant="caption" muted style={styles.hint}>
        Signed in as {business?.email ?? 'your account'} · {planLabel(planId)} plan
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  hero: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  eyebrow: { letterSpacing: 1.2 },
  title: { textAlign: 'center' },
  subtitle: {
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 24,
  },
  planCard: { gap: spacing.xs, marginBottom: spacing.md },
  address: { marginTop: spacing.sm },
  factCard: { gap: spacing.sm, marginBottom: spacing.md, backgroundColor: colors.surfaceElevated },
  factHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 18,
  },
  timeline: {
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  timelineTitle: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  timelineNum: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineText: { flex: 1, gap: 2 },
  timelineLabel: { fontWeight: '600' },
  hint: {
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
});
