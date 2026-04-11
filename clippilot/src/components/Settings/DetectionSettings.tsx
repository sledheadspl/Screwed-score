import { Plus, Trash2, Zap } from "lucide-react";
import { useState } from "react";
import Slider from "../Common/Slider";
import Button from "../Common/Button";
import { AppSettings, useSettingsStore } from "../../store/settingsStore";
import { toast } from "../Common/Toast";

export default function DetectionSettings() {
  const { settings, updateSettings } = useSettingsStore();
  const [newKeyword, setNewKeyword] = useState("");
  const [newKeywordPoints, setNewKeywordPoints] = useState(25);
  const [saving, setSaving] = useState(false);

  const handleSave = async (updates: Partial<AppSettings>) => {
    setSaving(true);
    try {
      await updateSettings(updates);
      toast.success("Settings saved");
    } catch (err) {
      toast.error("Failed to save settings", String(err));
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = () => {
    const word = newKeyword.trim();
    if (!word) return;
    const existing = settings.keywords ?? [];
    if (existing.some((k) => k.word === word)) return;
    handleSave({ keywords: [...existing, { word, points: newKeywordPoints }] });
    setNewKeyword("");
    setNewKeywordPoints(25);
  };

  const removeKeyword = (word: string) => {
    handleSave({
      keywords: (settings.keywords ?? []).filter((k) => k.word !== word),
    });
  };

  return (
    <div className="space-y-6">
      {/* Sensitivity */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} className="text-brand-400" />
          <h3 className="text-sm font-semibold text-white">Detection Sensitivity</h3>
        </div>

        <div className="space-y-5">
          <Slider
            label="Threshold"
            value={settings.detection_sensitivity ?? 50}
            min={20}
            max={100}
            onChange={(v) => handleSave({ detection_sensitivity: v })}
            hint="Lower = more clips, Higher = only the best moments"
          />

          <Slider
            label="Audio Weight"
            value={Math.round((settings.audio_weight ?? 0.3) * 100)}
            min={0}
            max={100}
            displayValue={`${Math.round((settings.audio_weight ?? 0.3) * 100)}%`}
            onChange={(v) => handleSave({ audio_weight: v / 100 })}
            hint="How much audio spikes influence the score"
          />

          <Slider
            label="Chat Weight"
            value={Math.round((settings.chat_weight ?? 0.3) * 100)}
            min={0}
            max={100}
            displayValue={`${Math.round((settings.chat_weight ?? 0.3) * 100)}%`}
            onChange={(v) => handleSave({ chat_weight: v / 100 })}
            hint="How much chat velocity influences the score"
          />
        </div>
      </div>

      {/* Clip duration */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Clip Duration</h3>

        <Slider
          label="Pre-roll"
          value={settings.pre_roll_seconds ?? 5}
          min={3}
          max={15}
          displayValue={`${settings.pre_roll_seconds ?? 5}s`}
          onChange={(v) => handleSave({ pre_roll_seconds: v })}
          hint="Seconds to include before the detected moment"
        />

        <Slider
          label="Post-roll"
          value={settings.post_roll_seconds ?? 10}
          min={5}
          max={30}
          displayValue={`${settings.post_roll_seconds ?? 10}s`}
          onChange={(v) => handleSave({ post_roll_seconds: v })}
          hint="Seconds to include after the detected moment"
        />

        <div>
          <label className="label">Max Clip Length</label>
          <div className="flex gap-2">
            {[15, 30, 60, 90].map((len) => (
              <button
                key={len}
                onClick={() => handleSave({ clip_length_max: len })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                  (settings.clip_length_max ?? 30) === len
                    ? "bg-brand-600/20 border-brand-500/40 text-brand-300"
                    : "bg-dark-800 border-white/10 text-dark-300 hover:border-white/20"
                }`}
              >
                {len}s
              </button>
            ))}
          </div>
        </div>

        <Slider
          label="Cooldown Between Clips"
          value={settings.cooldown_seconds ?? 60}
          min={30}
          max={300}
          step={15}
          displayValue={`${settings.cooldown_seconds ?? 60}s`}
          onChange={(v) => handleSave({ cooldown_seconds: v })}
          hint="Minimum time between auto-detected clips"
        />
      </div>

      {/* Keywords */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Keyword Triggers</h3>

        <div className="flex gap-2 mb-4">
          <input
            className="input-field flex-1 selectable"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="Keyword..."
            onKeyDown={(e) => e.key === "Enter" && addKeyword()}
          />
          <input
            type="number"
            className="input-field w-20 selectable"
            value={newKeywordPoints}
            onChange={(e) => setNewKeywordPoints(Number(e.target.value))}
            min={1}
            max={100}
            title="Points"
          />
          <Button
            variant="secondary"
            icon={<Plus size={14} />}
            onClick={addKeyword}
            disabled={!newKeyword.trim()}
          >
            Add
          </Button>
        </div>

        {(!settings.keywords || settings.keywords.length === 0) ? (
          <p className="text-xs text-dark-500">No keywords configured yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {settings.keywords.map((kw) => (
              <div
                key={kw.word}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-dark-700/80 border border-white/10 text-xs"
              >
                <span className="text-white font-medium">{kw.word}</span>
                <span className="text-dark-400">+{kw.points}pts</span>
                <button
                  onClick={() => removeKeyword(kw.word)}
                  className="text-dark-600 hover:text-red-400 transition-colors ml-0.5"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
