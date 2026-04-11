import { CheckCircle, ExternalLink, Link2, Unlink } from "lucide-react";
import { useState } from "react";
import Button from "../Common/Button";
import Modal from "../Common/Modal";
import { useSettingsStore } from "../../store/settingsStore";
import { toast } from "../Common/Toast";

interface AccountSectionProps {
  title: string;
  description: string;
  accounts: Array<{
    id: number;
    platform: string;
    username?: string | null;
    display_name?: string | null;
    is_active: number;
  }>;
  platforms: Array<{ id: string; name: string; color: string }>;
  onConnect: (platform: string, data: { username: string; token: string }) => Promise<void>;
  onDisconnect: (id: number) => Promise<void>;
}

function AccountSection({
  title,
  description,
  accounts,
  platforms,
  onConnect,
  onDisconnect,
}: AccountSectionProps) {
  const [connecting, setConnecting] = useState<string | null>(null);
  const [form, setForm] = useState({ username: "", token: "" });

  const handleConnect = async (platform: string) => {
    if (!form.username || !form.token) return;
    try {
      await onConnect(platform, form);
      setConnecting(null);
      setForm({ username: "", token: "" });
    } catch (err) {
      toast.error("Connection failed", String(err));
    }
  };

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
      <p className="text-xs text-dark-400 mb-4">{description}</p>

      <div className="space-y-2">
        {platforms.map((platform) => {
          const connected = accounts.find(
            (a) => a.platform === platform.id && a.is_active,
          );

          return (
            <div
              key={platform.id}
              className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-dark-800/50 border border-white/5"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white`}
                  style={{ background: platform.color }}
                >
                  {platform.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{platform.name}</p>
                  {connected ? (
                    <p className="text-xs text-green-400 flex items-center gap-1">
                      <CheckCircle size={10} />
                      {connected.display_name ?? connected.username ?? "Connected"}
                    </p>
                  ) : (
                    <p className="text-xs text-dark-500">Not connected</p>
                  )}
                </div>
              </div>

              {connected ? (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Unlink size={12} />}
                  onClick={() => onDisconnect(connected.id)}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Link2 size={12} />}
                  onClick={() => setConnecting(platform.id)}
                >
                  Connect
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Connection modal */}
      {connecting && (
        <Modal
          isOpen={!!connecting}
          onClose={() => setConnecting(null)}
          title={`Connect ${platforms.find((p) => p.id === connecting)?.name}`}
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setConnecting(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleConnect(connecting)}
                disabled={!form.username || !form.token}
              >
                Connect
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-brand-600/10 border border-brand-500/20 text-xs text-brand-300">
              OAuth flow coming in Phase 6. For now, enter your credentials manually.
            </div>
            <div>
              <label className="label">Username</label>
              <input
                className="input-field selectable"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                placeholder="your_username"
              />
            </div>
            <div>
              <label className="label">Access Token</label>
              <input
                type="password"
                className="input-field selectable"
                value={form.token}
                onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
                placeholder="OAuth access token"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function AccountConnections() {
  const { streamAccounts, socialAccounts, addStreamAccount, removeStreamAccount,
          addSocialAccount, removeSocialAccount } = useSettingsStore();

  return (
    <div className="space-y-5">
      <AccountSection
        title="Stream Sources"
        description="Connect your streaming accounts to monitor live streams"
        accounts={streamAccounts}
        platforms={[
          { id: "twitch", name: "Twitch", color: "#9147ff" },
          { id: "youtube", name: "YouTube", color: "#ff0000" },
          { id: "kick", name: "Kick", color: "#53fc18" },
        ]}
        onConnect={async (platform, data) => {
          await addStreamAccount(platform, data.username, data.token);
          toast.success(`${platform} connected`);
        }}
        onDisconnect={async (id) => {
          await removeStreamAccount(id);
          toast.success("Account disconnected");
        }}
      />

      <AccountSection
        title="Publishing Accounts"
        description="Connect social accounts to publish clips automatically"
        accounts={socialAccounts}
        platforms={[
          { id: "tiktok", name: "TikTok", color: "#010101" },
          { id: "youtube_shorts", name: "YouTube Shorts", color: "#ff0000" },
          { id: "twitter", name: "Twitter/X", color: "#1da1f2" },
        ]}
        onConnect={async (platform, data) => {
          await addSocialAccount(platform, data.username, data.token);
          toast.success(`${platform} connected`);
        }}
        onDisconnect={async (id) => {
          await removeSocialAccount(id);
          toast.success("Account disconnected");
        }}
      />
    </div>
  );
}
