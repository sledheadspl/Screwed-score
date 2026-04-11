import { useSettingsStore } from "../store/settingsStore";

export type LicenseTier = "free" | "pro" | "unlimited";

const LIMITS: Record<LicenseTier, number | null> = {
  free: 10,
  pro: 100,
  unlimited: null,
};

const FEATURES: Record<LicenseTier, string[]> = {
  free: [],
  pro: ["no_watermark", "auto_publish", "all_caption_styles"],
  unlimited: ["no_watermark", "auto_publish", "all_caption_styles", "white_label", "api_access"],
};

/**
 * useLicense — Feature gate checks based on the current license tier.
 * All feature checks go through this hook to centralize licensing logic.
 */
export function useLicense() {
  const { settings } = useSettingsStore();
  const tier = (settings.license_status ?? "free") as LicenseTier;
  const used = settings.clips_used_this_month ?? 0;
  const limit = LIMITS[tier];
  const features = FEATURES[tier];

  const can = (feature: string): boolean => features.includes(feature);

  const canGenerateClip = (): boolean => {
    if (limit === null) return true;
    return used < limit;
  };

  const clipsRemaining = (): number | null => {
    if (limit === null) return null;
    return Math.max(0, limit - used);
  };

  return {
    tier,
    used,
    limit,
    features,
    can,
    canGenerateClip,
    clipsRemaining,
    isPro: tier === "pro" || tier === "unlimited",
    isUnlimited: tier === "unlimited",
    isFree: tier === "free",
  };
}
