import { Check, Scissors } from "lucide-react";
import { useState } from "react";
import { Clip, useClipStore } from "../../store/clipStore";
import { toast } from "../Common/Toast";
import Button from "../Common/Button";
import Modal from "../Common/Modal";

interface ClipEditorProps {
  clip: Clip | null;
  onClose: () => void;
}

export default function ClipEditor({ clip, onClose }: ClipEditorProps) {
  const { updateClip } = useClipStore();
  const [title, setTitle] = useState(clip?.title ?? "");
  const [description, setDescription] = useState(clip?.description ?? "");
  const [hashtags, setHashtags] = useState(
    Array.isArray(clip?.hashtags) ? clip.hashtags.join(" ") : ""
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!clip) return;
    setSaving(true);
    try {
      const tags = hashtags
        .split(/[\s,]+/)
        .map((h) => h.replace(/^#/, "").trim())
        .filter(Boolean);

      await updateClip(clip.id, { title, description, hashtags: tags });
      toast.success("Clip saved", "Your changes have been saved.");
      onClose();
    } catch (err) {
      toast.error("Failed to save", String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={!!clip}
      onClose={onClose}
      title="Edit Clip"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<Check size={14} />}
            loading={saving}
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </>
      }
    >
      <div className="flex gap-5">
        {/* Preview */}
        <div className="w-40 shrink-0">
          <div className="aspect-[9/16] rounded-lg bg-dark-700 overflow-hidden border border-white/10">
            {clip?.file_path ? (
              <video
                src={`file://${clip.file_path}`}
                className="w-full h-full object-contain"
                controls
              />
            ) : clip?.thumbnail_path ? (
              <img
                src={`file://${clip.thumbnail_path}`}
                alt="Clip preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Scissors size={24} className="text-dark-500" />
              </div>
            )}
          </div>
        </div>

        {/* Edit form */}
        <div className="flex-1 space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              className="input-field selectable"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Clip title..."
              maxLength={150}
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input-field selectable resize-none"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the clip..."
            />
          </div>

          <div>
            <label className="label">Hashtags</label>
            <input
              className="input-field selectable"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#gaming #clips #highlights"
            />
            <p className="text-xs text-dark-500 mt-1">Separate with spaces or commas</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
