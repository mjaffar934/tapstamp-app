import { useEffect, useMemo, useState } from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BackHeader } from '@/components/ui/BackHeader';
import { OnboardingStepHeader } from '@/components/onboarding/OnboardingStepHeader';
import { ExpandableWalletPreview } from '@/components/ExpandableWalletPreview';
import {
  classicBrandColors,
  loadOnboardingDraft,
  saveOnboardingDraft,
  type DesignMode,
  type PassDesignQuiz,
} from '@/lib/onboardingDraft';
import {
  ATMOSPHERES,
  COLOUR_MOODS,
  LOYALTY_GOALS,
  REGULARS,
  VISIT_FREQ,
  WALLET_FEELS,
  emptyPassDesignQuiz,
  quizAnswersComplete,
  quizToAiPayload,
  paletteFromQuiz,
  type LoyaltyLevelAnswer,
  type ProgramMode,
} from '@/lib/passDesignQuiz';
import { designPassWithAi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';
import { useTapStampAlert } from '@/contexts/AlertContext';
import { colors, radius, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type QuizStep = 'program' | 'rewards' | 'shop' | 'design' | 'lock';

function Choice({
  label,
  subtitle,
  selected,
  onPress,
  icon,
}: {
  label: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable style={[styles.choice, selected && styles.choiceOn]} onPress={onPress}>
      {icon ? (
        <Ionicons
          name={icon}
          size={22}
          color={selected ? colors.accentDark : colors.textSecondary}
        />
      ) : null}
      <View style={styles.choiceText}>
        <Text variant="bodySmall" style={selected ? styles.choiceLabelOn : undefined}>
          {label}
        </Text>
        {subtitle ? <Text variant="caption" muted>{subtitle}</Text> : null}
      </View>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={22}
        color={selected ? colors.accent : colors.border}
      />
    </Pressable>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.chip, selected && styles.chipOn]} onPress={onPress}>
      <Text variant="caption" style={selected ? styles.chipTextOn : undefined}>{label}</Text>
    </Pressable>
  );
}

export default function LoyaltySetupScreen() {
  const { business } = useAuth();
  const { cafe, refetch } = useOwnerCafe();
  const alert = useTapStampAlert();

  const [step, setStep] = useState<QuizStep>('program');
  const [quiz, setQuiz] = useState<PassDesignQuiz>(emptyPassDesignQuiz());
  const [designMode, setDesignMode] = useState<DesignMode>('classic');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [colorsState, setColorsState] = useState(classicBrandColors());
  const [saving, setSaving] = useState(false);
  const [lockAck, setLockAck] = useState(false);

  useEffect(() => {
    loadOnboardingDraft().then((d) => {
      setQuiz(d.quiz);
      setDesignMode(d.designMode);
      setLogoUri(d.logoUri);
      setColorsState({
        backgroundColor: d.backgroundColor,
        foregroundColor: d.foregroundColor,
        labelColor: d.labelColor,
      });
      setAiNote(d.aiRationale);
      if (cafe?.pass_design_locked_at) {
        setStep('design');
      }
    });
  }, [cafe?.pass_design_locked_at]);

  const displayName = cafe?.name ?? business?.name ?? 'Your business';
  const displayLogo = logoUri ?? cafe?.logo_url ?? null;
  const previewReward =
    quiz.program_mode === 'stamps_levels'
      ? quiz.levels[quiz.levels.length - 1]?.reward || quiz.reward
      : quiz.reward.trim() || 'Free coffee';
  const previewGoal =
    quiz.program_mode === 'stamps_levels' && quiz.levels.length
      ? Math.max(...quiz.levels.map((l) => Number(l.stamp_count) || 0), quiz.stamp_goal || 10)
      : quiz.stamp_goal;

  const stepIndex = useMemo(() => {
    if (step === 'program') return 1;
    if (step === 'rewards') return 2;
    if (step === 'shop') return 2;
    if (step === 'design') return 3;
    return 3;
  }, [step]);

  const patchQuiz = async (patch: Partial<PassDesignQuiz>) => {
    const next = { ...quiz, ...patch };
    setQuiz(next);
    await saveOnboardingDraft({
      quiz: next,
      programMode: next.program_mode,
      reward: next.reward,
      stampGoal: next.stamp_goal,
    });
  };

  const applyClassic = async () => {
    const classic = classicBrandColors();
    setDesignMode('classic');
    setColorsState(classic);
    setAiNote(null);
    await saveOnboardingDraft({
      designMode: 'classic',
      ...classic,
      aiRationale: null,
    });
  };

  const runAi = async () => {
    const check = quizAnswersComplete(quiz);
    if (!check.ok) {
      alert('Finish the shop questions', check.missing);
      setStep('shop');
      return;
    }

    setAiBusy(true);
    const payload = quizToAiPayload(
      quiz,
      displayName,
      business?.business_type ?? (await loadOnboardingDraft()).bizType,
    );

    let result: Awaited<ReturnType<typeof designPassWithAi>> = { error: 'pending' };
    try {
      // Skip cafe path during onboarding generate — faster auth, less failure surface
      result = await designPassWithAi(null, {
        bizType: payload.biz_type,
        apply: false,
        quiz: payload,
      });
      if (result.error && /network|fetch failed|lost/i.test(result.error)) {
        result = await designPassWithAi(null, {
          bizType: payload.biz_type,
          apply: false,
          quiz: payload,
        });
      }
    } catch (err) {
      result = { error: err instanceof Error ? err.message : 'AI design failed' };
    }
    setAiBusy(false);

    if (result.error || !result.suggestion) {
      const local = paletteFromQuiz(quiz);
      setDesignMode('ai');
      setColorsState({
        backgroundColor: local.backgroundColor,
        foregroundColor: local.foregroundColor,
        labelColor: local.labelColor,
      });
      setAiNote(
        result.error
          ? `AI was unavailable (${result.error}). Used your shop answers for colours instead.`
          : local.rationale,
      );
      await saveOnboardingDraft({
        designMode: 'ai',
        backgroundColor: local.backgroundColor,
        foregroundColor: local.foregroundColor,
        labelColor: local.labelColor,
        aiRationale: local.rationale,
      });
      setStep('lock');
      return;
    }

    const s = result.suggestion;
    setDesignMode('ai');
    setColorsState({
      backgroundColor: s.background_color,
      foregroundColor: s.foreground_color,
      labelColor: s.label_color,
    });
    const note = result.source === 'fallback'
      ? `${s.rationale} (AI service fallback${result.fallback_reason ? `: ${result.fallback_reason}` : ''})`
      : s.rationale;
    setAiNote(note);
    await saveOnboardingDraft({
      designMode: 'ai',
      backgroundColor: s.background_color,
      foregroundColor: s.foreground_color,
      labelColor: s.label_color,
      aiRationale: note,
    });
    setStep('lock');
  };

  const finishAndLock = async () => {
    if (!lockAck) {
      alert(
        'Confirm first',
        'Tick the box to confirm these answers are final — they can’t be changed later.',
      );
      return;
    }

    const check = quizAnswersComplete(quiz);
    if (!check.ok) {
      alert('Finish the shop questions', check.missing);
      setStep('shop');
      return;
    }

    setSaving(true);
    await saveOnboardingDraft({
      designMode,
      ...colorsState,
      aiRationale: aiNote,
      quiz,
    });

    if (cafe?.id) {
      const mainReward =
        quiz.program_mode === 'stamps_levels'
          ? quiz.levels[quiz.levels.length - 1]?.reward || quiz.reward
          : quiz.reward.trim() || 'Free coffee';
      const mainGoal =
        quiz.program_mode === 'stamps_levels'
          ? Math.max(...quiz.levels.map((l) => Number(l.stamp_count) || 0), quiz.stamp_goal || 10)
          : quiz.stamp_goal;

      const lockedQuiz: PassDesignQuiz = {
        ...quiz,
        reward: mainReward,
        stamp_goal: mainGoal,
      };

      const isAi = designMode === 'ai';
      const { error } = await supabase.from('cafes').update({
        reward: mainReward,
        stamp_goal: mainGoal,
        pass_template: 'classic',
        background_color: colorsState.backgroundColor,
        foreground_color: colorsState.foregroundColor,
        label_color: colorsState.labelColor,
        pass_design_quiz: lockedQuiz,
        pass_design_locked_at: new Date().toISOString(),
        pass_design_mode: designMode,
        ...(isAi
          ? {
              ai_background_color: colorsState.backgroundColor,
              ai_foreground_color: colorsState.foregroundColor,
              ai_label_color: colorsState.labelColor,
            }
          : {}),
      } as never).eq('id', cafe.id);

      if (error) {
        setSaving(false);
        alert('Could not save', error.message);
        return;
      }

      if (quiz.program_mode === 'stamps_levels' && quiz.levels.length) {
        await supabase.from('reward_tiers').delete().eq('cafe_id', cafe.id);
        await supabase.from('reward_tiers').insert(
          quiz.levels.map((l) => ({
            cafe_id: cafe.id,
            stamp_count: l.stamp_count,
            reward: l.reward,
          })) as never,
        );
      } else {
        await supabase.from('reward_tiers').delete().eq('cafe_id', cafe.id);
      }
      await refetch();
    }

    setSaving(false);
    router.push('/(onboarding)/card-preview');
  };

  const setProgramMode = (mode: ProgramMode) => {
    void patchQuiz({ program_mode: mode });
  };

  const updateLevel = (index: number, patch: Partial<LoyaltyLevelAnswer>) => {
    const levels = quiz.levels.map((l, i) => (i === index ? { ...l, ...patch } : l));
    void patchQuiz({ levels });
  };

  const toggleRegular = (id: string) => {
    const has = quiz.regulars.includes(id);
    const regulars = has ? quiz.regulars.filter((r) => r !== id) : [...quiz.regulars, id];
    void patchQuiz({ regulars });
  };

  const titles: Record<QuizStep, { title: string; subtitle: string }> = {
    program: {
      title: 'How should stamps work?',
      subtitle: 'Choose your loyalty style. You’ll lock these answers before finishing — they can’t be changed later.',
    },
    rewards: {
      title: 'Set your rewards',
      subtitle: 'These stay locked after onboarding. You can still switch Classic ↔ AI look anytime.',
    },
    shop: {
      title: 'Tell us about your shop',
      subtitle: 'A few detailed answers so AI (and your card) feel personal — not generic.',
    },
    design: {
      title: 'Design your wallet card',
      subtitle: 'TapStamp classic, or build an AI card from your shop answers. You can switch this anytime later.',
    },
    lock: {
      title: 'Confirm & lock in',
      subtitle: 'Review your card. Once you continue, shop and reward answers are permanent.',
    },
  };

  return (
    <Screen>
      <BackHeader />
      <OnboardingStepHeader
        step={Math.min(3, stepIndex)}
        title={titles[step].title}
        subtitle={titles[step].subtitle}
      />

      {step === 'program' ? (
        <View style={styles.stack}>
          <Choice
            icon="ellipse-outline"
            label="Simple stamp card"
            subtitle="e.g. 10 stamps = free coffee"
            selected={quiz.program_mode === 'stamps'}
            onPress={() => setProgramMode('stamps')}
          />
          <Choice
            icon="trophy-outline"
            label="Stamps with levels"
            subtitle="e.g. 5 = pastry, 10 = coffee"
            selected={quiz.program_mode === 'stamps_levels'}
            onPress={() => setProgramMode('stamps_levels')}
          />
          <Button title="Continue" onPress={() => setStep('rewards')} style={styles.cta} />
        </View>
      ) : null}

      {step === 'rewards' ? (
        <View style={styles.stack}>
          {quiz.program_mode === 'stamps' ? (
            <Card style={styles.form}>
              <Input
                label="Main reward"
                value={quiz.reward}
                onChangeText={(reward) => void patchQuiz({ reward })}
                placeholder="Free coffee"
              />
              <Input
                label="Stamps needed"
                value={String(quiz.stamp_goal || '')}
                onChangeText={(v) => void patchQuiz({ stamp_goal: parseInt(v, 10) || 0 })}
                keyboardType="number-pad"
                placeholder="10"
              />
            </Card>
          ) : (
            <Card style={styles.form}>
              <Text variant="bodySmall" muted>
                Set 2–3 stamp milestones.
              </Text>
              {quiz.levels.slice(0, 3).map((level, index) => (
                <View key={index} style={styles.levelRow}>
                  <View style={styles.levelInput}>
                    <Input
                      label="Stamps"
                      value={String(level.stamp_count || '')}
                      onChangeText={(v) => updateLevel(index, { stamp_count: parseInt(v, 10) || 0 })}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.levelInputWide}>
                    <Input
                      label="Reward"
                      value={level.reward}
                      onChangeText={(reward) => updateLevel(index, { reward })}
                    />
                  </View>
                </View>
              ))}
              {quiz.levels.length < 3 ? (
                <Button
                  title="Add another level"
                  variant="ghost"
                  onPress={() =>
                    void patchQuiz({
                      levels: [
                        ...quiz.levels,
                        {
                          stamp_count: (quiz.levels[quiz.levels.length - 1]?.stamp_count ?? 10) + 5,
                          reward: 'VIP treat',
                        },
                      ],
                    })
                  }
                />
              ) : null}
            </Card>
          )}
          <View style={styles.rowBtns}>
            <Button title="Back" variant="ghost" onPress={() => setStep('program')} style={styles.flex} />
            <Button title="Continue" style={styles.flex} onPress={() => setStep('shop')} />
          </View>
        </View>
      ) : null}

      {step === 'shop' ? (
        <View style={styles.stack}>
          <Card style={styles.form}>
            <Input
              label="About your shop"
              value={quiz.shop_story}
              onChangeText={(shop_story) => void patchQuiz({ shop_story })}
              placeholder="What you sell, what you’re known for, and the area you’re in…"
              multiline
              style={styles.multiline}
              textAlignVertical="top"
            />

            <Text variant="caption" muted style={styles.sectionLabel}>What does walking in feel like?</Text>
            <View style={styles.chips}>
              {ATMOSPHERES.map((a) => (
                <Chip
                  key={a.id}
                  label={a.label}
                  selected={quiz.atmosphere === a.id}
                  onPress={() => void patchQuiz({ atmosphere: a.id })}
                />
              ))}
            </View>
            <Input
              label="Anything specific about the look? (optional)"
              value={quiz.atmosphere_notes}
              onChangeText={(atmosphere_notes) => void patchQuiz({ atmosphere_notes })}
              placeholder="Exposed brick, plants, neon sign, dark wood…"
            />

            <Text variant="caption" muted style={styles.sectionLabel}>Who are most of your regulars?</Text>
            <View style={styles.chips}>
              {REGULARS.map((r) => (
                <Chip
                  key={r.id}
                  label={r.label}
                  selected={quiz.regulars.includes(r.id)}
                  onPress={() => toggleRegular(r.id)}
                />
              ))}
            </View>

            <Text variant="caption" muted style={styles.sectionLabel}>How often do they visit?</Text>
            <View style={styles.chips}>
              {VISIT_FREQ.map((f) => (
                <Chip
                  key={f.id}
                  label={f.label}
                  selected={quiz.visit_frequency === f.id}
                  onPress={() => void patchQuiz({ visit_frequency: f.id })}
                />
              ))}
            </View>

            <Text variant="caption" muted style={styles.sectionLabel}>What matters most for loyalty?</Text>
            <View style={styles.chips}>
              {LOYALTY_GOALS.map((g) => (
                <Chip
                  key={g.id}
                  label={g.label}
                  selected={quiz.loyalty_goal === g.id}
                  onPress={() => void patchQuiz({ loyalty_goal: g.id })}
                />
              ))}
            </View>

            <Text variant="caption" muted style={styles.sectionLabel}>Colour mood for the Wallet card</Text>
            <View style={styles.chips}>
              {COLOUR_MOODS.map((c) => (
                <Chip
                  key={c.id}
                  label={c.label}
                  selected={quiz.colour_mood === c.id}
                  onPress={() => void patchQuiz({ colour_mood: c.id })}
                />
              ))}
            </View>
            <Input
              label="Exact brand colours? (optional)"
              value={quiz.brand_colour_notes}
              onChangeText={(brand_colour_notes) => void patchQuiz({ brand_colour_notes })}
              placeholder="e.g. deep forest green + cream, or #2C1810"
            />

            <Text variant="caption" muted style={styles.sectionLabel}>When someone opens the card in Wallet, it should feel…</Text>
            <View style={styles.chips}>
              {WALLET_FEELS.map((w) => (
                <Chip
                  key={w.id}
                  label={w.label}
                  selected={quiz.wallet_feel === w.id}
                  onPress={() => void patchQuiz({ wallet_feel: w.id })}
                />
              ))}
            </View>
          </Card>

          <Card style={styles.lockWarnEarly}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.accentDark} />
            <Text variant="caption" style={styles.lockWarnText}>
              These answers are locked after you confirm on the next screens. You can’t edit them later — only Classic vs AI look can change.
            </Text>
          </Card>

          <View style={styles.rowBtns}>
            <Button title="Back" variant="ghost" onPress={() => setStep('rewards')} style={styles.flex} />
            <Button
              title="Continue"
              style={styles.flex}
              onPress={() => {
                const check = quizAnswersComplete(quiz);
                if (!check.ok) {
                  alert('A few more details', check.missing);
                  return;
                }
                setStep('design');
              }}
            />
          </View>
        </View>
      ) : null}

      {step === 'design' ? (
        <View style={styles.stack}>
          <Choice
            icon="diamond-outline"
            label="TapStamp classic"
            subtitle="Our premium dark gold card — ready to go"
            selected={designMode === 'classic'}
            onPress={() => void applyClassic()}
          />
          <Choice
            icon="sparkles-outline"
            label="Design with AI for my shop"
            subtitle="Built from the shop answers you just gave"
            selected={designMode === 'ai'}
            onPress={() => setDesignMode('ai')}
          />
          <View style={styles.rowBtns}>
            <Button title="Back" variant="ghost" onPress={() => setStep('shop')} style={styles.flex} />
            <Button
              title={designMode === 'ai' ? 'Build my card' : 'Continue'}
              loading={aiBusy}
              disabled={aiBusy}
              style={styles.flex}
              onPress={() => {
                if (designMode === 'ai') void runAi();
                else setStep('lock');
              }}
            />
          </View>
        </View>
      ) : null}

      {step === 'lock' ? (
        <View style={styles.stack}>
          {aiBusy ? (
            <Card style={styles.building}>
              <ActivityIndicator color={colors.accent} />
              <Text variant="bodySmall">Designing your loyalty card…</Text>
            </Card>
          ) : (
            <>
              <ExpandableWalletPreview
                title="Wallet preview"
                businessName={displayName}
                backgroundColor={colorsState.backgroundColor}
                foregroundColor={colorsState.foregroundColor}
                labelColor={colorsState.labelColor}
                logoUri={displayLogo}
                stampGoal={previewGoal}
                stampsFilled={Math.min(2, previewGoal)}
                reward={previewReward}
                levels={quiz.program_mode === 'stamps_levels' ? quiz.levels : undefined}
                showCustomerName
                customerName="Alex"
              />
              {aiNote ? <Text variant="caption" muted style={styles.aiNote}>{aiNote}</Text> : null}
              <Text variant="caption" muted>
                {quiz.program_mode === 'stamps'
                  ? `${previewGoal} stamps = ${previewReward}`
                  : quiz.levels.map((l) => `${l.stamp_count} = ${l.reward}`).join(' · ')}
              </Text>

              <Card style={styles.lockBox}>
                <Pressable style={styles.lockRow} onPress={() => setLockAck((v) => !v)}>
                  <Ionicons
                    name={lockAck ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={lockAck ? colors.accent : colors.border}
                  />
                  <Text variant="bodySmall" style={styles.lockCopy}>
                    I understand my shop answers and rewards are final and can’t be changed later. I can still switch between TapStamp classic and AI anytime.
                  </Text>
                </Pressable>
              </Card>
            </>
          )}

          <View style={styles.rowBtns}>
            <Button title="Back" variant="ghost" onPress={() => setStep('design')} style={styles.flex} />
            <Button
              title="Lock in & continue"
              loading={saving}
              disabled={saving || aiBusy || !lockAck}
              style={styles.flex}
              onPress={() => void finishAndLock()}
            />
          </View>
          {designMode === 'ai' ? (
            <Button title="Regenerate with AI" variant="outline" loading={aiBusy} onPress={() => void runAi()} />
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md, marginBottom: spacing.xl },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  choiceOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  choiceText: { flex: 1, gap: 2 },
  choiceLabelOn: { fontFamily: 'Inter_600SemiBold', color: colors.accentDark },
  sectionLabel: { marginTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  chipTextOn: { color: colors.accentDark, fontFamily: 'Inter_600SemiBold' },
  form: { gap: spacing.md },
  multiline: { minHeight: 110, paddingTop: spacing.md },
  levelRow: { flexDirection: 'row', gap: spacing.sm },
  levelInput: { flex: 0.35 },
  levelInputWide: { flex: 0.65 },
  rowBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  flex: { flex: 1 },
  cta: { marginTop: spacing.md },
  building: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  aiNote: { textAlign: 'center' },
  lockWarnEarly: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.accentMuted,
  },
  lockWarnText: { flex: 1, color: colors.accentDark, lineHeight: 18 },
  lockBox: { gap: spacing.sm },
  lockRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  lockCopy: { flex: 1, lineHeight: 22 },
});
