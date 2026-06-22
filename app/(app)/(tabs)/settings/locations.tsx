import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { BackHeader } from '@/components/ui/BackHeader';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/constants/theme';

export default function LocationsScreen() {
  const { cafe, isLoading, isSaving, updateCafe } = useOwnerCafe();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (cafe) {
      setName(cafe.name ?? '');
      setAddress(cafe.address ?? '');
      setCity(cafe.city ?? '');
      setPostcode(cafe.postcode ?? '');
    }
  }, [cafe]);

  const handleSave = async () => {
    setSaved(false);
    const result = await updateCafe({
      name: name.trim() || cafe?.name,
      address: address.trim() || null,
      city: city.trim() || null,
      postcode: postcode.trim() || null,
    });
    if (!result.error) setSaved(true);
  };

  if (isLoading) {
    return (
      <Screen scroll={false}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackHeader />
      <ScreenHeader
        compact
        title="Location"
        subtitle="Your cafe details shown on passes and tap pages."
      />

      {!cafe ? (
        <Card>
          <Text variant="bodySmall" muted>Link your account to a cafe to manage location details.</Text>
        </Card>
      ) : (
        <>
          <Card style={styles.form}>
            <Input label="Cafe name" value={name} onChangeText={setName} placeholder="The Daily Grind" />
            <Input label="Street address" value={address} onChangeText={setAddress} placeholder="12 High Street" />
            <Input label="City" value={city} onChangeText={setCity} placeholder="London" />
            <Input label="Postcode" value={postcode} onChangeText={setPostcode} placeholder="SW1A 1AA" />
            {saved ? <Text variant="caption" color={colors.success}>Location saved</Text> : null}
            <Button title="Save location" onPress={handleSave} loading={isSaving} />
          </Card>

          <Card style={styles.comingSoon}>
            <Text variant="h3">Multiple branches</Text>
            <Text variant="bodySmall" muted>
              Multi-location support with per-branch staff is on the roadmap. For now, manage your primary cafe here.
            </Text>
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  form: { gap: spacing.md, marginBottom: spacing.lg },
  comingSoon: { gap: spacing.sm, backgroundColor: colors.surfaceElevated },
});
