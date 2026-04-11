import { Download, Share2, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Clip } from "../../store/clipStore";
import { formatDuration, formatRelativeTime } from "../../utils/formatters";

interface ClipPreviewProps {
  clip: Clip | null;
  onClose: () => void;
  onPublish: (clip: Clip) => void;
  onDelete: (clip: Clip) => void;
}

export default function ClipPreview({
  clip,
  onClose,
  onPublish,
  onDelete,
}: ClipPreviewProps) {
  return (
    <AnimatePresence>
      {clip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="relative z-10 flex gap-6 max-h-[90vh]"
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.93 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {/* Video player — 9:16 */}
            <div className="relative w-[270px] shrink-0">
              <div className="aspect-[9/16] rounded-xl overflow-hidden bg-dark-900 border border-white/10">
                {clip.file_path ? (
                  <video
                    src={`file://${clip.file_path}`}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-dark-500 text-sm">No video file</p>
                  </div>
                )}
              </div>
            </div>

            {/* Info panel */}
            <div className="glass-card w-72 flex flex-col self-start mt-6">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <h2 className="text-sm font-semibold text-white">Clip Details</h2>
                <button onClick={onClose} className="btn-ghost p-1.5 -mr-1.5">
                  <X size={16} />
                </button>
              </div>

              <div className="p-4 flex flex-col gap-4 flex-1">
                {/* Title */}
                <div>
                  <label className="label">Title</label>
                  <p className="text-sm text-white">{clip.title ?? "Untitled Clip"}</p>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="glass-card p-2.5">
                    <p className="text-dark-400 mb-0.5">Duration</p>
                    <p className="font-semibold text-white">
                      {clip.duration ? formatDuration(clip.duration) : "—"}
                    </p>
                  </div>
                  <div className="glass-card p-2.5">
                    <p className="text-dark-400 mb-0.5">Score</p>
                    <p className="font-semibold text-brand-400">
                      {clip.score != null ? Math.round(clip.score) : "—"}
                    </p>
                  </div>
                  <div className="glass-card p-2.5">
                    <p className="text-dark-400 mb-0.5">Status</p>
                    <p className="font-semibold text-white capitalize">{clip.status}</p>
                  </div>
                  <div className="glass-card p-2.5">
                    <p className="text-dark-400 mb-0.5">Created</p>
                    <p className="font-semibold text-white">
                      {formatRelativeTime(clip.created_at)}
                    </p>
                  </div>
                </div>

                {/* Transcript */}
                {clip.transcript && (
                  <div>
                    <label className="label">Transcript</label>
                    <p className="text-xs text-dark-300 leading-relaxed line-clamp-4">
                      {clip.transcript}
                    </p>
                  </div>
                )}

                {/* Trigger */}
                {clip.trigger_reason && (
                  <div>
                    <label className="label">Triggered by</label>
                    <span className="badge-blue badge">{clip.trigger_reason}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-white/5 flex flex-col gap-2">
                <button
                  onClick={() => onPublish(clip)}
                  disabled={clip.status !== "ready"}
                  className="btn-primary w-full justify-center disabled:opacity-40"
                >
                  <Share2 size={15} />
                  Publish Clip
                </button>
                <div className="flex gap-2">
                  <button className="btn-secondary flex-1 justify-center text-xs">
                    <Download size={13} />
                    Download
                  </button>
                  <button
                    onClick={() => {
                      onDelete(clip);
                      onClose();
                    }}
                    className="btn-danger flex-1 justify-center text-xs"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
