import { Image, View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, radius, shadows, spacing } from '@/constants/theme';

export interface WalletPreviewProps {
  businessName?: string;
  backgroundColor: string;
  foregroundColor: string;
  labelColor: string;
  logoUri?: string | null;
  stampsFilled?: number;
  stampGoal?: number;
  reward?: string;
  showCustomerName?: boolean;
  customerName?: string;
}

function StampRow({ filled, total, fg }: { filled: number; total: number; fg: string }) {
  return (
    <View style={styles.stampRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.stampDot,
            { borderColor: fg },
            i < filled && { backgroundColor: fg },
          ]}
        />
      ))}
    </View>
  );
}

function PassFace({
  businessName,
  backgroundColor,
  foregroundColor,
  labelColor,
  logoUri,
  stampsFilled = 1,
  stampGoal = 10,
  reward = 'Free coffee',
  showCustomerName = false,
  customerName,
}: WalletPreviewProps) {
  const headerLabel = showCustomerName && customerName ? 'MEMBER' : 'LOYALTY';
  const headerName = showCustomerName && customerName
    ? customerName
    : (businessName ?? 'Your business');

  return (
    <View style={[styles.passFace, { backgroundColor }]}>
      <View style={styles.passHeader}>
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={styles.logo} resizeMode="contain" />
        ) : (
          <View style={[styles.logoPlaceholder, { borderColor: foregroundColor }]} />
        )}
        <View style={styles.passHeaderText}>
          <Text style={[styles.passLabel, { color: labelColor }]}>{headerLabel}</Text>
          <Text style={[styles.passName, { color: foregroundColor }]} numberOfLines={1}>
            {headerName}
          </Text>
        </View>
      </View>
      <Text style={[styles.passLabel, { color: labelColor, marginTop: spacing.md }]}>STAMPS</Text>
      <Text style={[styles.passCount, { color: foregroundColor }]}>
        {stampsFilled} / {stampGoal}
      </Text>
      <StampRow filled={stampsFilled} total={Math.min(stampGoal, 10)} fg={foregroundColor} />
      <Text style={[styles.passLabel, { color: labelColor, marginTop: spacing.lg }]}>REWARD</Text>
      <Text style={[styles.passReward, { color: foregroundColor }]}>{reward}</Text>
      <View style={styles.qrSection}>
        <View style={[styles.qrBox, { borderColor: `${foregroundColor}33` }]}>
          <View style={[styles.qrInner, { backgroundColor: `${foregroundColor}18` }]} />
        </View>
        <Text style={[styles.qrHint, { color: labelColor }]}>Show at counter</Text>
      </View>
    </View>
  );
}

export function AppleWalletPreview(props: WalletPreviewProps) {
  return (
    <View style={styles.device}>
      <Text variant="caption" muted style={styles.deviceLabel}>Apple Wallet</Text>
      <View style={styles.appleShell}>
        <PassFace {...props} />
      </View>
    </View>
  );
}

export function GoogleWalletPreview(props: WalletPreviewProps) {
  return (
    <View style={styles.device}>
      <Text variant="caption" muted style={styles.deviceLabel}>Google Wallet</Text>
      <View style={styles.googleShell}>
        <View style={styles.googleBar}>
          <View style={styles.googleDot} />
          <Text variant="caption" style={styles.googleBarText}>Google Wallet</Text>
        </View>
        <PassFace {...props} />
      </View>
    </View>
  );
}

export function WalletPreviewPair(props: WalletPreviewProps) {
  return (
    <View style={styles.pair}>
      <AppleWalletPreview {...props} />
      <GoogleWalletPreview {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  pair: { gap: spacing.lg },
  device: { gap: spacing.sm },
  deviceLabel: { textAlign: 'center', letterSpacing: 0.5 },
  appleShell: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  googleShell: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  googleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  googleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4285F4',
  },
  googleBarText: { color: '#5F6368', fontSize: 11 },
  passFace: { padding: spacing.lg },
  passHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  logo: { width: 40, height: 40, borderRadius: radius.sm },
  passHeaderText: { flex: 1 },
  passLabel: { fontSize: 10, letterSpacing: 1.2, fontFamily: 'Inter_600SemiBold' },
  passName: { fontSize: 18, fontFamily: 'Inter_600SemiBold', marginTop: 2 },
  passCount: { fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5, marginTop: 4 },
  passReward: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginTop: 4 },
  stampRow: { flexDirection: 'row', gap: 6, marginTop: spacing.sm },
  stampDot: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  qrSection: {
    marginTop: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  qrBox: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  qrInner: {
    flex: 1,
    borderRadius: 4,
  },
  qrHint: {
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontFamily: 'Inter_600SemiBold',
  },
});
