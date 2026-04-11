import { useSettingsStore } from "../store/settingsStore";

/** useSettings — thin wrapper that re-exports the settings store. */
export function useSettings() {
  return useSettingsStore();
}

/** Convenience hook for social accounts only */
export function useSocialAccounts() {
  const { socialAccounts, addSocialAccount, removeSocialAccount } = useSettingsStore();
  return { socialAccounts, addSocialAccount, removeSocialAccount };
}

/** Convenience hook for stream accounts only */
export function useStreamAccounts() {
  const { streamAccounts, addStreamAccount, removeStreamAccount } = useSettingsStore();
  return { streamAccounts, addStreamAccount, removeStreamAccount };
}
