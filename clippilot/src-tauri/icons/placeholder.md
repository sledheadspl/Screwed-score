# Icons

Place the following app icon files here before building:

- `32x32.png` — 32×32 app icon
- `128x128.png` — 128×128 app icon
- `128x128@2x.png` — 256×256 HiDPI app icon
- `icon.icns` — macOS icon bundle
- `icon.ico` — Windows icon

Generate all sizes from a 1024×1024 master PNG using:

```bash
# Using ImageMagick
convert master.png -resize 32x32 32x32.png
convert master.png -resize 128x128 128x128.png
convert master.png -resize 256x256 "128x128@2x.png"

# For .ico (Windows)
convert master.png -resize 256x256 icon.ico

# For .icns (macOS) — use iconutil on macOS
mkdir icon.iconset
convert master.png -resize 1024x1024 icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset -o icon.icns
```

Or use the Tauri icon generator:
```bash
npm run tauri icon path/to/master.png
```
