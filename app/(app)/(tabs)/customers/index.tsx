import { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOwnerCafe } from '@/hooks/useOwnerCafe';
import { useCustomers } from '@/hooks/useCustomers';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { colors, spacing } from '@/constants/theme';

function displayName(name: string | null, email: string | null): string {
  if (name?.trim()) return name.trim();
  if (email?.trim()) return email.trim();
  return 'Anonymous member';
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export default function CustomersScreen() {
  const { cafe } = useOwnerCafe();
  const { customers, isLoading, error, refetch } = useCustomers(cafe?.id);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const name = displayName(c.customer_name, c.customer_email).toLowerCase();
      return name.includes(q) || c.serial_number.toLowerCase().includes(q);
    });
  }, [customers, query]);

  return (
    <Screen refreshing={isLoading} onRefresh={refetch}>
      <ScreenHeader
        title="Customers"
        subtitle="Your regulars and loyalty members"
      />

      <Input
        value={query}
        onChangeText={setQuery}
        placeholder="Search customers…"
        style={styles.search}
      />

      {error ? (
        <Card>
          <Text variant="bodySmall" muted>{error}</Text>
        </Card>
      ) : null}

      {!cafe ? (
        <Card>
          <Text variant="bodySmall" muted>
            Complete onboarding to link your cafe and see wallet members here.
          </Text>
        </Card>
      ) : isLoading && customers.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : filtered.length === 0 ? (
        <Card style={styles.empty}>
          <Ionicons name="people-outline" size={28} color={colors.textMuted} />
          <Text variant="bodySmall" muted style={styles.emptyText}>
            {query ? 'No customers match your search.' : 'No wallet passes yet. Customers appear here after their first tap.'}
          </Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {filtered.map((customer) => {
            const name = displayName(customer.customer_name, customer.customer_email);
            return (
              <Pressable
                key={customer.id}
                onPress={() => router.push(`/(app)/(tabs)/customers/${customer.id}`)}
              >
                <Card style={styles.row}>
                  <View style={styles.avatar}>
                    <Text variant="bodySmall" color={colors.accentDark} style={styles.initials}>
                      {initials(name)}
                    </Text>
                  </View>
                  <View style={styles.info}>
                    <Text variant="bodySmall" style={styles.name}>
                      {name}
                    </Text>
                    <Text variant="caption" muted>
                      {customer.stamp_count} / {cafe.stamp_goal} stamps · {customer.lifetime_stamps} lifetime
                    </Text>
                  </View>
                  {customer.status === 'redeemed' ? (
                    <View style={styles.readyBadge}>
                      <Text variant="caption" color={colors.accentDark}>Ready</Text>
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  )}
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontWeight: '600',
  },
  readyBadge: {
    backgroundColor: colors.accentMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
  },
  centered: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: 280,
  },
});
