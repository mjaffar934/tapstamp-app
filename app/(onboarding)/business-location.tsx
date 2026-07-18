import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';
import { supabase } from '@/lib/supabase';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { BackHeader } from '@/components/ui/BackHeader';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/constants/theme';

export default function OnboardingBusinessLocationScreen() {
  const { business, refreshBusiness } = useAuth();
  const { cafe, isLoading, isSaving, updateCafe } = useOwnerCafe();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (cafe) {
      setName(cafe.name ?? business?.name ?? '');
      setAddress(cafe.address ?? '');
      setCity(cafe.city ?? '');
      setPostcode(cafe.postcode ?? '');
    }
  }, [cafe, business?.name]);

  const handleSave = async () => {
    setSaved(false);
    const trimmedName = name.trim() || cafe?.name;
    const result = await updateCafe({
      name: trimmedName,
      address: address.trim() || null,
      city: city.trim() || null,
      postcode: postcode.trim() || null,
    });
    if (!result.error && trimmedName && business?.id) {
      await supabase.from('businesses').update({ name: trimmedName }).eq('id', business.id);
      await refreshBusiness();
    }
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
      <BackHeader onBack={() => router.back()} />
      <ScreenHeader
        compact
        title="Business location"
        subtitle="Optional — add your address for passes and receipts."
      />

      {!cafe ? (
        <Card>
          <Text variant="bodySmall" muted>Finish activating your programme first.</Text>
        </Card>
      ) : (
        <Card style={styles.form}>
          <Input label="Business name" value={name} onChangeText={setName} placeholder="The Daily Grind" />
          <Input label="Street address" value={address} onChangeText={setAddress} placeholder="12 High Street" />
          <Input label="City" value={city} onChangeText={setCity} placeholder="London" />
          <Input label="Postcode" value={postcode} onChangeText={setPostcode} placeholder="SW1A 1AA" />
          {saved ? <Text variant="caption" color={colors.success}>Location saved</Text> : null}
          <Button title="Save location" onPress={handleSave} loading={isSaving} />
          <Button title="Done" variant="outline" onPress={() => router.back()} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  form: { gap: spacing.md },
});
