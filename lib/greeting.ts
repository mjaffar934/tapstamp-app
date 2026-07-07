import type { User } from '@supabase/supabase-js';
import type { Business } from '@/types/database';

/** Time-of-day greeting using the device local timezone. */
export function getTimeGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getOwnerFirstName(
  business: Business | null | undefined,
  user: User | null | undefined,
): string {
  const fromOwner = business?.owner_name?.trim();
  if (fromOwner) return fromOwner.split(/\s+/)[0] ?? fromOwner;

  const metaName =
    typeof user?.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name.trim()
      : typeof user?.user_metadata?.name === 'string'
        ? user.user_metadata.name.trim()
        : '';

  if (metaName) return metaName.split(/\s+/)[0] ?? metaName;

  const email = user?.email ?? business?.email;
  if (email) {
    const local = email.split('@')[0]?.replace(/[._-]+/g, ' ').trim();
    if (local) {
      const first = local.split(/\s+/)[0];
      return first.charAt(0).toUpperCase() + first.slice(1);
    }
  }

  return 'there';
}

export function getBusinessDisplayName(
  business: Business | null | undefined,
  cafe: { name?: string | null } | null | undefined,
): string {
  return business?.name?.trim() || cafe?.name?.trim() || 'Your business';
}

export function getPersonalizedGreeting(
  business: Business | null | undefined,
  user: User | null | undefined,
  date = new Date(),
): string {
  return `${getTimeGreeting(date)}, ${getOwnerFirstName(business, user)}`;
}
