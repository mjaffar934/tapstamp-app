import { type ReactNode, Dimensions, Image, View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';

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

const PASS_WIDTH = Math.min(Dimensions.get('window').width - 64, 300);

function StampDots({
  filled,
  total,
  color,
  size = 10,
}: {
  filled: number;
  total: number;
  color: string;
  size?: number;
}) {
  const count = Math.min(total, 12);
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: count }).map((_, i) => {
        const on = i < filled;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              { width: size, height: size, borderRadius: size / 2, borderColor: color },
              on ? { backgroundColor: color, opacity: 1 } : { opacity: 0.35 },
            ]}
          />
        );
      })}
    </View>
  );
}

function StampStrip({
  filled,
  total,
  bg,
  fg,
}: {
  filled: number;
  total: number;
  bg: string;
  fg: string;
}) {
  const count = Math.min(total, 12);
  return (
    <View style={[styles.strip, { backgroundColor: bg }]}>
      <View style={styles.dotsRowCentered}>
        {Array.from({ length: count }).map((_, i) => {
          const on = i < filled;
          return (
            <View
              key={i}
              style={[
                styles.dot,
                { borderColor: fg },
                on ? { backgroundColor: fg, opacity: 1 } : { opacity: 0.35 },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

function PassFace({
  businessName,
  backgroundColor,
  foregroundColor,
  labelColor,
  logoUri,
  stampsFilled = 3,
  stampGoal = 10,
  reward = 'Free coffee',
  showCustomerName = false,
  customerName,
  variant,
}: WalletPreviewProps & { variant: 'apple' | 'google' }) {
  const headerLabel = 'LOYALTY';
  const headerValue = businessName ?? 'Your business';
  const memberLine = showCustomerName && customerName ? customerName : null;

  return (
    <View style={[styles.pass, { backgroundColor, width: PASS_WIDTH }]}>
      <View style={styles.passHead}>
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={styles.logo} resizeMode="contain" />
        ) : (
          <View style={[styles.logoMonogram, { backgroundColor: `${foregroundColor}22` }]}>
            <Text style={[styles.logoMonogramText, { color: foregroundColor }]}>
              {(businessName ?? 'B').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.headText}>
          <Text style={[styles.label, { color: labelColor }]}>{headerLabel}</Text>
          <Text style={[styles.brand, { color: foregroundColor }]} numberOfLines={1}>
            {headerValue}
          </Text>
          {memberLine ? (
            <Text style={[styles.memberLine, { color: labelColor }]} numberOfLines={1}>
              {memberLine}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.stampsRow}>
        <View>
          <Text style={[styles.label, { color: labelColor }]}>STAMPS</Text>
          <Text style={[styles.stampCount, { color: foregroundColor }]}>
            {stampsFilled} / {stampGoal}
          </Text>
        </View>
      </View>

      <View style={[styles.rewardRow, { borderTopColor: `${foregroundColor}18` }]}>
        <View style={styles.rewardText}>
          <Text style={[styles.label, { color: labelColor }]}>REWARD</Text>
          <Text style={[styles.rewardValue, { color: foregroundColor }]} numberOfLines={1}>
            {reward}
          </Text>
        </View>
      </View>

      <StampStrip
        filled={stampsFilled}
        total={stampGoal}
        bg={backgroundColor}
        fg={foregroundColor}
      />
    </View>
  );
}

function IPhoneFrame({ children }: { children: ReactNode }) {
  return (
    <View style={styles.phone}>
      <View style={styles.phoneScreen}>
        <View style={styles.dynamicIsland} />
        <View style={styles.walletSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Wallet</Text>
          {children}
        </View>
      </View>
    </View>
  );
}

function AndroidFrame({ children }: { children: ReactNode }) {
  return (
    <View style={styles.androidPhone}>
      <View style={styles.gpayHeader}>
        <View style={styles.gpayDot} />
        <Text style={styles.gpayLabel}>Google Wallet</Text>
      </View>
      <View style={styles.androidScreen}>{children}</View>
    </View>
  );
}

export function AppleWalletPreview(props: WalletPreviewProps) {
  return (
    <View style={styles.deviceWrap}>
      <IPhoneFrame>
        <PassFace {...props} variant="apple" />
      </IPhoneFrame>
      <Text style={styles.caption}>Apple Wallet</Text>
    </View>
  );
}

export function GoogleWalletPreview(props: WalletPreviewProps) {
  return (
    <View style={styles.deviceWrap}>
      <AndroidFrame>
        <PassFace {...props} variant="google" />
      </AndroidFrame>
      <Text style={styles.caption}>Google Wallet</Text>
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
  pair: { gap: 28, alignItems: 'center' },
  deviceWrap: { alignItems: 'center', gap: 8 },
  caption: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: 'Inter_500Medium',
  },
  phone: {
    width: PASS_WIDTH + 24,
    borderRadius: 28,
    backgroundColor: '#1C1C1E',
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  phoneScreen: {
    borderRadius: 22,
    backgroundColor: '#000',
    overflow: 'hidden',
    minHeight: 340,
  },
  dynamicIsland: {
    alignSelf: 'center',
    width: 72,
    height: 22,
    borderRadius: 14,
    backgroundColor: '#1C1C1E',
    marginTop: 8,
    marginBottom: 4,
  },
  walletSheet: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    paddingHorizontal: 10,
    paddingBottom: 14,
    alignItems: 'center',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C8C8CC',
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  androidPhone: {
    width: PASS_WIDTH + 16,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  gpayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  gpayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4285F4',
  },
  gpayLabel: {
    fontSize: 12,
    color: '#5F6368',
    fontFamily: 'Inter_500Medium',
  },
  androidScreen: {
    padding: 8,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  pass: {
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  passHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  logoMonogram: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMonogramText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  headText: { flex: 1 },
  memberLine: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
    opacity: 0.8,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  label: {
    fontSize: 9,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontFamily: 'Inter_600SemiBold',
    opacity: 0.75,
  },
  brand: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
  },
  stampsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  stampCount: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
    lineHeight: 32,
    marginTop: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    maxWidth: 100,
    justifyContent: 'flex-end',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  dotsRowCentered: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  strip: {
    marginTop: 14,
    marginHorizontal: -14,
    marginBottom: -14,
    paddingVertical: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rewardText: { flex: 1, paddingRight: 8 },
  rewardValue: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
  },
});
