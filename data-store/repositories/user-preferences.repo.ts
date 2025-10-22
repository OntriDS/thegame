// data-store/repositories/user-preferences.repo.ts
import { kvGet, kvSet } from '../kv';

const PREFERENCES_KEY = 'preferences:user';

export async function getUserPreferences(): Promise<Record<string, any>> {
  const prefs = await kvGet<Record<string, any>>(PREFERENCES_KEY);
  return prefs ?? {};
}

export async function setUserPreference(key: string, value: any): Promise<void> {
  const prefs = await getUserPreferences();
  prefs[key] = value;
  await kvSet(PREFERENCES_KEY, prefs);
}

export async function getUserPreference(key: string): Promise<any | null> {
  const prefs = await getUserPreferences();
  return prefs[key] ?? null;
}
