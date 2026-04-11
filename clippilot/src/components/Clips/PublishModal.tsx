import { Send } from "lucide-react";
import { useState } from "react";
import Modal from "../Common/Modal";
import Button from "../Common/Button";
import { Clip } from "../../store/clipStore";
import { useSocialAccounts } from "../../hooks/useSettings";

interface PublishModalProps {
  clip: Clip | null;
  onClose: () => void;
  onPublish: (clipId: number, platforms: string[], title: string, description: string, hashtags: string[]) => Promise<void>;
}

const PLATFORM_ICONS: Record<string, string> = {
  tiktok: "TT",
  youtube_shorts: "YT",
  twitter: "X",
};

const PLATFORM_LABELS: Record<string, string> = {
  tiktok: "TikTok",
  youtube_shorts: "YouTube Shorts",
  twitter: "Twitter/X",
};

export default function PublishModal({ clip, onClose, onPublish }: PublishModalProps) {
  const { socialAccounts } = useSocialAccounts();
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState(clip?.title ?? "");
  const [description, setDescription] = useState(clip?.description ?? "");
  const [hashtagInput, setHashtagInput] = useState(
    Array.isArray(clip?.hashtags) ? clip.hashtags.join(" ") : ""
  );
  const [publishing, setPublishing] = useState(false);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  };

  const handlePublish = async () => {
    if (!clip || selectedPlatforms.size === 0) return;
    const hashtags = hashtagInput
      .split(/[\s,]+/)
      .map((h) => h.replace(/^#/, "").trim())
      .filter(Boolean);

    setPublishing(true);
    try {
      await onPublish(
        clip.id,
        Array.from(selectedPlatforms),
        title,
        description,
        hashtags,
      );
      onClose();
    } finally {
      setPublishing(false);
    }
  };

  const connectedPlatforms = socialAccounts
    .filter((a) => a.is_active)
    .map((a) => a.platform);

  return (
    <Modal
      isOpen={!!clip}
      onClose={onClose}
      title="Publish Clip"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<Send size={14} />}
            loading={publishing}
            disabled={selectedPlatforms.size === 0 || !title.trim()}
            onClick={handlePublish}
          >
            Publish to {selectedPlatforms.size} platform{selectedPlatforms.size !== 1 ? "s" : ""}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Platform selection */}
        <div>
          <label className="label">Select Platforms</label>
          <div className="flex gap-2">
            {Object.keys(PLATFORM_LABELS).map((platform) => {
              const connected = connectedPlatforms.includes(platform);
              const selected = selectedPlatforms.has(platform);
              return (
                <button
                  key={platform}
                  onClick={() => connected && togglePlatform(platform)}
                  disabled={!connected}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all
                    ${
                      selected
                        ? "bg-brand-600/20 border-brand-500/40 text-brand-300"
                        : connected
                        ? "bg-dark-700 border-white/10 text-dark-300 hover:border-white/20"
                        : "bg-dark-800 border-white/5 text-dark-600 cursor-not-allowed"
                    }`}
                >
                  <span className="text-xs font-bold">{PLATFORM_ICONS[platform]}</span>
                  <span>{PLATFORM_LABELS[platform]}</span>
                  {!connected && <span className="text-[10px] text-dark-600">(not connected)</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="label">Title</label>
          <input
            className="input-field selectable"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter clip title..."
            maxLength={150}
          />
          <p className="text-xs text-dark-500 mt-1">{title.length}/150</p>
        </div>

        {/* Description */}
        <div>
          <label className="label">Description</label>
          <textarea
            className="input-field selectable resize-none"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
          />
        </div>

        {/* Hashtags */}
        <div>
          <label className="label">Hashtags</label>
          <input
            className="input-field selectable"
            value={hashtagInput}
            onChange={(e) => setHashtagInput(e.target.value)}
            placeholder="#gaming #clips #viral"
          />
          <p className="text-xs text-dark-500 mt-1">Separate with spaces or commas</p>
        </div>
      </div>
    </Modal>
  );
}
