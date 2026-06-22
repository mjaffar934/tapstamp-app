import { secureStorage } from './storage';

const KEY = 'tapstamp_staff_session';

export interface StaffSession {
  cafeId: string;
  cafeName: string;
  staffCode: string;
}

export async function getStaffSession(): Promise<StaffSession | null> {
  try {
    const raw = await secureStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StaffSession;
  } catch {
    return null;
  }
}

export async function setStaffSession(session: StaffSession): Promise<void> {
  await secureStorage.setItem(KEY, JSON.stringify(session));
}

export async function clearStaffSession(): Promise<void> {
  await secureStorage.removeItem(KEY);
}
