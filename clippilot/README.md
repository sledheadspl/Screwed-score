# ClipPilot

> AI-powered auto-clip desktop app for streamers. Automatically detects viral moments from live streams, generates vertical short-form clips with captions, and publishes to TikTok, YouTube Shorts, and Twitter/X.

## Stack

- **Desktop:** Tauri 2.0 (Rust + WebView2) → ships as a ~10MB Windows `.exe`
- **Frontend:** React 18 + TypeScript + Tailwind CSS + Framer Motion
- **Video:** FFmpeg (bundled) + Whisper.cpp (bundled) for offline captioning
- **Database:** SQLite via `tauri-plugin-sql`
- **State:** Zustand stores + custom hooks (designed for future React Native port)

## Architecture

```
clippilot/
├── src-tauri/          # Rust backend
│   └── src/
│       ├── commands/   # Tauri IPC commands
│       ├── services/   # Stream monitor, detector, processor, captioner, publisher
│       └── db/         # SQLite schema (canonical source)
├── src/                # React frontend
│   ├── components/     # UI components (Layout, Dashboard, Clips, Streams, Settings, Common)
│   ├── pages/          # Route-level pages
│   ├── store/          # Zustand stores (clips, streams, settings)
│   ├── hooks/          # Business logic hooks (swap for RN modules on mobile)
│   ├── api/            # Tauri IPC wrappers + social platform stubs
│   ├── db/             # SQLite schema (JS-side initialization)
│   └── utils/          # Pure utility functions (formatters, validators)
└── binaries/           # Bundled FFmpeg + Whisper.cpp
```

## System Requirements (Build)

### Windows (Primary Target)
- Node.js 18+
- Rust stable (`rustup install stable`)
- WebView2 Runtime (ships with Windows 10 1803+)
- Visual Studio Build Tools 2022

### Linux (Development)
```bash
sudo apt install libgtk-3-dev libwebkit2gtk-4.1-dev \
  libayatana-appindicator3-dev librsvg2-dev \
  libssl-dev libglib2.0-dev
```

### macOS
```bash
xcode-select --install
```

## Getting Started

```bash
# 1. Clone and install
cd clippilot
npm install

# 2. Download FFmpeg (place in binaries/ffmpeg/)
# See binaries/ffmpeg/placeholder.md

# 3. Download Whisper.cpp + model (place in binaries/whisper/)
# See binaries/whisper/placeholder.md

# 4. Development mode
npm run tauri dev

# 5. Build Windows installer
npm run tauri build
# Output: src-tauri/target/release/bundle/
```

## Development Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ Done | Foundation: Tauri setup, SQLite, UI shell, dark theme |
| 2 | 🔲 Next | Stream capture: FFmpeg segmenting, rolling buffer, status UI |
| 3 | 🔲 | Detection engine: audio analysis, chat velocity, keyword matching |
| 4 | 🔲 | Video pipeline: smart crop, captions, watermark, thumbnails |
| 5 | 🔲 | Clips UI: library grid, preview player, editor, bulk actions |
| 6 | 🔲 | Publishing: OAuth flows, TikTok/YouTube/Twitter upload |
| 7 | 🔲 | Licensing: key validation, feature gating, usage tracking |
| 8 | 🔲 | Polish: testing, auto-updater, code signing, docs |

## Moment Detection Algorithm

```
moment_score =
  (audio_spike_intensity * audio_weight)   // 0-100, default weight 0.3
+ (chat_velocity_multiplier * chat_weight) // 1-10x, default weight 0.3
+ alert_points                             // sub=20, dono=30, raid=50
+ keyword_match_points                     // user-configured

if moment_score > threshold (default 50):
  capture_clip(timestamp - pre_roll, timestamp + post_roll)
```

## Licensing

- **Free:** 10 clips/month, watermark, manual posting
- **Pro ($19/mo):** 100 clips, no watermark, auto-post
- **Unlimited ($49/mo):** Unlimited clips, white-label, API

Key format: `CLIP-XXXX-XXXX-XXXX-XXXX`

## Mobile (Future)

Architecture decisions made for React Native portability:
- Business logic in hooks, not components
- `src/api/tauri.ts` wraps all Tauri calls (swap for native modules)
- Zustand works in React Native
- No web-only APIs in shared code
- Pure utility functions in `src/utils/`
