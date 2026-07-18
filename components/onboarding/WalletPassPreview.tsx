import { Dimensions, Image, View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { enforcePassContrast } from '@/lib/passTemplates';
import { buildRewardFieldCopy, stripSegmentProgress, type RewardTierLike } from '@/lib/walletRewardCopy';

export interface WalletPreviewProps {
  businessName?: string;
  backgroundColor: string;
  foregroundColor: string;
  labelColor: string;
  logoUri?: string | null;
  stripImageUri?: string | null;
  stampsFilled?: number;
  stampGoal?: number;
  reward?: string;
  levels?: RewardTierLike[];
  lifetimeStamps?: number;
  showCustomerName?: boolean;
  customerName?: string;
  memberCode?: string;
  passStatus?: 'active' | 'complete' | 'redeemed';
}

const PASS_WIDTH = Math.min(Dimensions.get('window').width - 72, 340);

/**
 * Apple Wallet storeCard-style preview (matches live pkpass layout users see):
 * logo + header → stamp strip zone (count + dots) → reward / member code → QR
 */
function StampStrip({
  filled,
  total,
  stampValue,
  stampLabel,
  bg,
  fg,
  label,
  stripImageUri,
  complete = false,
  stampsOnLeft = false,
}: {
  filled: number;
  total: number;
  stampValue: string;
  stampLabel: string;
  bg: string;
  fg: string;
  label: string;
  stripImageUri?: string | null;
  complete?: boolean;
  stampsOnLeft?: boolean;
}) {
  const count = Math.max(total, 0);
  const showDots = count > 0;
  const dotSize = showDots
    ? Math.max(10, Math.min(14, Math.floor(((PASS_WIDTH - 56) * 0.62) / count) - 5))
    : 0;
  const displayFilled = complete && showDots ? count : Math.min(filled, count);

  return (
    <View style={[styles.strip, { backgroundColor: bg }]}>
      {stripImageUri ? (
        <Image source={{ uri: stripImageUri }} style={styles.stripBg} resizeMode="cover" />
      ) : null}
      <View style={[styles.stripInner, stampsOnLeft && styles.stripInnerSplit]}>
        <View style={stampsOnLeft ? styles.stripLeft : undefined}>
          {stampValue ? (
            <Text style={[styles.stripCount, { color: fg }]} numberOfLines={1}>
              {stampValue}
            </Text>
          ) : null}
          {stampLabel ? (
            <Text style={[styles.stripLabel, { color: label }]}>{stampLabel}</Text>
          ) : null}
        </View>
        {showDots ? (
          <View style={[styles.dotsRow, stampsOnLeft && styles.dotsRowRight]}>
            {Array.from({ length: count }).map((_, i) => {
              const on = i < displayFilled;
              return (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      width: Math.max(dotSize, 11),
                      height: Math.max(dotSize, 11),
                      borderRadius: Math.max(dotSize, 11) / 2,
                      borderColor: fg,
                      backgroundColor: on ? fg : 'transparent',
                      opacity: on ? 1 : 0.4,
                    },
                  ]}
                />
              );
            })}
          </View>
        ) : stampValue ? (
          <View style={[styles.readyGlow, { backgroundColor: fg }]} />
        ) : null}
      </View>
    </View>
  );
}

export function WalletPassCard({
  businessName,
  backgroundColor,
  foregroundColor,
  labelColor,
  logoUri,
  stripImageUri,
  stampsFilled = 1,
  stampGoal = 10,
  reward = 'Free coffee',
  levels,
  lifetimeStamps,
  showCustomerName = false,
  customerName,
  memberCode = '4827',
  passStatus = 'active',
}: WalletPreviewProps) {
  const safe = enforcePassContrast({ backgroundColor, foregroundColor, labelColor });
  const cafeName = businessName ?? 'Your business';
  const isRedeemed = passStatus === 'redeemed';
  const isComplete = passStatus === 'complete';
  const sortedLevels = [...(levels ?? [])].sort(
    (a, b) => Number(a.stamp_count) - Number(b.stamp_count),
  );
  const hasLevels = sortedLevels.length >= 2;
  const segment = stripSegmentProgress(stampsFilled, stampGoal, sortedLevels, {
    complete: isComplete,
    redeemed: isRedeemed,
  });
  const rewardCopy = buildRewardFieldCopy({
    stampCount: stampsFilled,
    stampGoal,
    status: passStatus === 'redeemed' ? 'redeemed' : 'active',
    mainReward: reward,
    lifetimeStamps: lifetimeStamps ?? stampsFilled,
    tiers: levels,
  });

  const redeemReady = isRedeemed || isComplete || rewardCopy.label === 'REDEEM';
  const stripValue = hasLevels
    ? String(redeemReady ? Math.max(1, segment.filled) : segment.filled)
    : String(stampsFilled);
  const stripLabel = hasLevels ? `OF ${Math.max(1, segment.total)}` : `OF ${stampGoal}`;

  return (
    <View style={[styles.pass, { backgroundColor: safe.backgroundColor, width: PASS_WIDTH }]}>
      <View style={styles.headerRow}>
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={styles.logo} resizeMode="contain" />
        ) : (
          <View style={[styles.logoPlaceholder, { borderColor: `${safe.foregroundColor}40` }]}>
            <Text style={[styles.logoPlaceholderText, { color: safe.foregroundColor }]}>
              {(cafeName[0] ?? 'T').toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.headerFields}>
          <Text style={[styles.fieldLabel, { color: safe.labelColor }]}>LOYALTY</Text>
          <Text style={[styles.headerValue, { color: safe.foregroundColor }]} numberOfLines={1}>
            {cafeName}
          </Text>
        </View>
      </View>

      <StampStrip
        filled={hasLevels ? (redeemReady ? Math.max(1, segment.filled) : segment.filled) : stampsFilled}
        total={hasLevels ? Math.max(1, segment.total) : stampGoal}
        stampValue={stripValue}
        stampLabel={stripLabel}
        bg={safe.backgroundColor}
        fg={safe.foregroundColor}
        label={safe.labelColor}
        stripImageUri={stripImageUri}
        complete={redeemReady}
        stampsOnLeft
      />

      <View style={styles.fieldsRow}>
        <View style={[styles.fieldCol, styles.fieldColWide]}>
          <Text style={[styles.fieldLabel, { color: safe.labelColor }]}>
            {redeemReady ? 'REDEEM NOW' : hasLevels ? 'NEXT REWARD' : rewardCopy.label}
          </Text>
          <Text style={[styles.rewardValueBig, { color: safe.foregroundColor }]} numberOfLines={2}>
            {rewardCopy.value}
          </Text>
        </View>
        <View style={[styles.fieldCol, styles.fieldColEnd]}>
          <Text style={[styles.fieldLabel, { color: safe.labelColor }]}>MEMBER CODE</Text>
          <Text style={[styles.codeValueBig, { color: safe.foregroundColor }]}>{memberCode}</Text>
        </View>
      </View>

      {showCustomerName && customerName ? (
        <View style={styles.memberRow}>
          <Text style={[styles.fieldLabel, { color: safe.labelColor }]}>MEMBER</Text>
          <Text style={[styles.auxValue, { color: safe.foregroundColor }]} numberOfLines={1}>
            {customerName.split(' ')[0]}
          </Text>
        </View>
      ) : null}

      <View style={[styles.barcodeZone, { borderTopColor: `${safe.foregroundColor}22` }]}>
        <View style={styles.qrBox}>
          <View style={styles.qrGrid}>
            {Array.from({ length: 49 }).map((_, i) => {
              const filledCell = (i * 11 + 3) % 5 !== 0 && (i * 3) % 7 !== 1;
              return (
                <View
                  key={i}
                  style={[styles.qrCell, filledCell && styles.qrCellOn]}
                />
              );
            })}
          </View>
        </View>
        <Text style={[styles.barcodeAlt, { color: safe.labelColor }]}>
          {memberCode ? `Member ${memberCode}` : 'Scan at counter'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pass: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 10,
    minHeight: 52,
  },
  logo: {
    width: 50,
    height: 38,
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholderText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  headerFields: {
    flex: 1,
    minWidth: 0,
  },
  fieldLabel: {
    fontSize: 9,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontFamily: 'Inter_600SemiBold',
    opacity: 0.95,
  },
  headerValue: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 1,
    letterSpacing: -0.2,
  },
  strip: {
    minHeight: 110,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stripBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  stripInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 4,
  },
  stripInnerSplit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  stripLeft: {
    width: '32%',
    alignItems: 'flex-start',
  },
  stripCount: {
    fontSize: 40,
    fontFamily: 'Inter_400Regular',
    letterSpacing: -1,
    lineHeight: 44,
    zIndex: 1,
  },
  stripLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: 'Inter_600SemiBold',
    zIndex: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    zIndex: 1,
    marginTop: 4,
  },
  dotsRowRight: {
    flex: 1,
    marginTop: 0,
    justifyContent: 'flex-end',
  },
  dotsRowSolo: {
    marginTop: 16,
  },
  readyGlow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    opacity: 0.85,
    marginTop: 10,
    alignSelf: 'center',
  },
  dot: {
    borderWidth: 1.5,
  },
  fieldsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  fieldCol: { flex: 1, minWidth: 0 },
  fieldColWide: { flex: 1.4 },
  fieldColEnd: { alignItems: 'flex-end' },
  rewardValue: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
    lineHeight: 18,
  },
  rewardValueBig: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 3,
    lineHeight: 22,
  },
  codeValue: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 2,
    marginTop: 2,
  },
  codeValueBig: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 2,
    marginTop: 3,
  },
  levelsRow: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  levelsValue: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
    lineHeight: 17,
  },
  memberRow: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  auxValue: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    marginTop: 1,
  },
  barcodeZone: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  qrBox: {
    width: 96,
    height: 96,
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 8,
  },
  qrGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  qrCell: {
    width: '14.28%',
    height: '14.28%',
  },
  qrCellOn: {
    backgroundColor: '#111',
  },
  barcodeAlt: {
    fontSize: 10,
    letterSpacing: 0.8,
    fontFamily: 'Inter_500Medium',
  },
});
