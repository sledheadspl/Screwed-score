import { Type, Droplets } from "lucide-react";
import { AppSettings, useSettingsStore } from "../../store/settingsStore";
import { toast } from "../Common/Toast";

const FONTS = [
  "Montserrat",
  "Inter",
  "Arial Black",
  "Impact",
  "Bebas Neue",
  "Roboto Bold",
];

const ANIMATIONS = [
  { id: "none", label: "None" },
  { id: "fade", label: "Fade In" },
  { id: "word_by_word", label: "Word by Word" },
  { id: "karaoke", label: "Karaoke" },
];

export default function ClipStyleSettings() {
  const { settings, updateSettings } = useSettingsStore();

  const handleSave = async (updates: Partial<AppSettings>) => {
    try {
      await updateSettings(updates);
      toast.success("Style saved");
    } catch (err) {
      toast.error("Failed to save", String(err));
    }
  };

  return (
    <div className="space-y-5">
      {/* Caption font */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Type size={16} className="text-brand-400" />
          <h3 className="text-sm font-semibold text-white">Caption Style</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Font</label>
            <div className="grid grid-cols-3 gap-2">
              {FONTS.map((font) => (
                <button
                  key={font}
                  onClick={() => handleSave({ caption_font: font })}
                  className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                    settings.caption_font === font
                      ? "bg-brand-600/20 border-brand-500/40 text-brand-300"
                      : "bg-dark-800 border-white/10 text-dark-300 hover:border-white/20"
                  }`}
                  style={{ fontFamily: font }}
                >
                  {font}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Text Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.caption_color ?? "#FFFFFF"}
                  onChange={(e) => handleSave({ caption_color: e.target.value })}
                  className="w-10 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <input
                  className="input-field flex-1 selectable font-mono text-xs"
                  value={settings.caption_color ?? "#FFFFFF"}
                  onChange={(e) => handleSave({ caption_color: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="label">Outline Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.caption_outline_color ?? "#000000"}
                  onChange={(e) => handleSave({ caption_outline_color: e.target.value })}
                  className="w-10 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <input
                  className="input-field flex-1 selectable font-mono text-xs"
                  value={settings.caption_outline_color ?? "#000000"}
                  onChange={(e) => handleSave({ caption_outline_color: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Animation Style</label>
            <div className="flex gap-2">
              {ANIMATIONS.map((anim) => (
                <button
                  key={anim.id}
                  onClick={() => handleSave({ caption_animation: anim.id })}
                  className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                    settings.caption_animation === anim.id
                      ? "bg-brand-600/20 border-brand-500/40 text-brand-300"
                      : "bg-dark-800 border-white/10 text-dark-300 hover:border-white/20"
                  }`}
                >
                  {anim.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Watermark */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Droplets size={16} className="text-brand-400" />
          <h3 className="text-sm font-semibold text-white">Watermark</h3>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Show ClipPilot watermark</p>
            <p className="text-xs text-dark-400 mt-0.5">
              Required on Free plan. Upgrade to Pro to remove.
            </p>
          </div>
          <button
            onClick={() =>
              handleSave({
                watermark_enabled: settings.watermark_enabled ? 0 : 1,
              })
            }
            disabled={settings.license_status === "free"}
            className={`relative w-10 h-5.5 rounded-full border transition-all
              ${settings.watermark_enabled
                ? "bg-brand-600 border-brand-500"
                : "bg-dark-700 border-white/10"
              }
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                settings.watermark_enabled ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Caption Preview</h3>
        <div
          className="relative h-32 rounded-lg bg-dark-900 flex items-end justify-center pb-4 overflow-hidden"
          style={{ background: "linear-gradient(135deg, #1a1f35 0%, #0f1422 100%)" }}
        >
          <p
            style={{
              fontFamily: settings.caption_font ?? "Montserrat",
              color: settings.caption_color ?? "#FFFFFF",
              textShadow: `2px 2px 0 ${settings.caption_outline_color ?? "#000000"},
                           -2px 2px 0 ${settings.caption_outline_color ?? "#000000"},
                           2px -2px 0 ${settings.caption_outline_color ?? "#000000"},
                           -2px -2px 0 ${settings.caption_outline_color ?? "#000000"}`,
              fontSize: "18px",
              fontWeight: "bold",
            }}
          >
            This is how your captions look!
          </p>
        </div>
      </div>
    </div>
  );
}
