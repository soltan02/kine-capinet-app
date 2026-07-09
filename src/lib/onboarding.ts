import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── First-run onboarding state ──────────────────────────────
// Keyed per-account so a shared device with multiple role logins
// each see the carousel/checklist once, independently.

const seenKey = (profileId: string) => `onboarding_seen_${profileId}`;
const checklistDismissedKey = (profileId: string) => `onboarding_checklist_dismissed_${profileId}`;

export async function hasSeenOnboarding(profileId: string): Promise<boolean> {
  const v = await AsyncStorage.getItem(seenKey(profileId));
  return v === '1';
}

export async function markOnboardingSeen(profileId: string): Promise<void> {
  await AsyncStorage.setItem(seenKey(profileId), '1');
}

export async function isChecklistDismissed(profileId: string): Promise<boolean> {
  const v = await AsyncStorage.getItem(checklistDismissedKey(profileId));
  return v === '1';
}

export async function dismissChecklist(profileId: string): Promise<void> {
  await AsyncStorage.setItem(checklistDismissedKey(profileId), '1');
}
