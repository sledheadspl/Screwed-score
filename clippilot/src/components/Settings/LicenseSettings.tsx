import { Crown, Key, RefreshCw, Zap } from "lucide-react";
import { useState } from "react";
import Button from "../Common/Button";
import { useSettingsStore } from "../../store/settingsStore";
import { toast } from "../Common/Toast";
import { validateLicense } from "../../api/tauri";

const TIER_COLORS: Record<string, string> = {
  free: "text-dark-300",
  pro: "text-brand-400",
  unlimited: "text-yellow-400",
};

const TIER_LIMITS: Record<string, { clips: number | "Unlimited"; label: string }> = {
  free: { clips: 10, label: "Free" },
  pro: { clips: 100, label: "Pro" },
  unlimited: { clips: "Unlimited", label: "Unlimited" },
};

export default function LicenseSettings() {
  const { settings, updateSettings } = useSettingsStore();
  const [licenseKey, setLicenseKey] = useState(settings.license_key ?? "");
  const [activating, setActivating] = useState(false);

  const tier = settings.license_status ?? "free";
  const tierInfo = TIER_LIMITS[tier];
  const used = settings.clips_used_this_month ?? 0;
  const limit = tierInfo?.clips;
  const progressPct =
    typeof limit === "number" ? Math.min((used / limit) * 100, 100) : 0;

  const handleActivate = async () => {
    if (!licenseKey.trim()) return;
    setActivating(true);
    try {
      const result = await validateLicense(licenseKey.trim());
      await updateSettings({
        license_key: licenseKey.trim(),
        license_status: result.tier,
      });
      toast.success(
        "License activated!",
        `You are now on the ${result.tier} plan.`,
      );
    } catch (err) {
      toast.error("Invalid license key", String(err));
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Current plan */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Crown size={16} className={TIER_COLORS[tier] ?? "text-dark-300"} />
            <h3 className="text-sm font-semibold text-white">Current Plan</h3>
          </div>
          <span
            className={`text-sm font-bold uppercase tracking-wide ${TIER_COLORS[tier] ?? "text-dark-300"}`}
          >
            {tierInfo?.label ?? "Free"}
          </span>
        </div>

        {/* Usage */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-dark-400 mb-1.5">
            <span>Clips used this month</span>
            <span className="text-white font-semibold">
              {used} / {typeof limit === "number" ? limit : "∞"}
            </span>
          </div>
          {typeof limit === "number" && (
            <div className="h-2 rounded-full bg-dark-700">
              <div
                className={`h-full rounded-full transition-all ${
                  progressPct > 80 ? "bg-red-500" : "bg-brand-600"
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>

        {/* Plan features */}
        <div className="text-xs text-dark-400 space-y-1">
          {tier === "free" && (
            <>
              <p>• 10 clips per month</p>
              <p>• ClipPilot watermark on all clips</p>
              <p>• Manual publishing only</p>
            </>
          )}
          {tier === "pro" && (
            <>
              <p>• 100 clips per month</p>
              <p>• No watermark</p>
              <p>• Auto-publish to all platforms</p>
              <p>• All caption styles</p>
            </>
          )}
          {tier === "unlimited" && (
            <>
              <p>• Unlimited clips</p>
              <p>• No watermark</p>
              <p>• Priority processing</p>
              <p>• White-label + API access</p>
            </>
          )}
        </div>
      </div>

      {/* License key input */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Key size={16} className="text-brand-400" />
          <h3 className="text-sm font-semibold text-white">License Key</h3>
        </div>

        <div className="flex gap-2">
          <input
            className="input-field flex-1 selectable font-mono text-sm"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            placeholder="CLIP-XXXX-XXXX-XXXX-XXXX"
            maxLength={24}
          />
          <Button
            variant="primary"
            icon={<RefreshCw size={14} />}
            loading={activating}
            onClick={handleActivate}
            disabled={!licenseKey.trim()}
          >
            Activate
          </Button>
        </div>
      </div>

      {/* Upgrade */}
      {tier === "free" && (
        <div className="glass-card p-5 border border-brand-500/20 bg-brand-600/5">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-brand-400" />
            <h3 className="text-sm font-semibold text-white">Upgrade to Pro</h3>
          </div>
          <p className="text-xs text-dark-400 mb-4">
            Get 100 clips/month, remove watermarks, and enable auto-posting for $19/mo or $149/yr.
          </p>
          <div className="flex gap-2">
            <Button variant="primary">
              <Crown size={14} /> Get Pro — $19/mo
            </Button>
            <Button variant="secondary">View All Plans</Button>
          </div>
        </div>
      )}
    </div>
  );
}
