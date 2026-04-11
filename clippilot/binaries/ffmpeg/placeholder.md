# FFmpeg Binary

Download a static FFmpeg build and place `ffmpeg.exe` (Windows) or `ffmpeg` (Linux/macOS) here.

## Windows
Download from: https://www.gyan.dev/ffmpeg/builds/
- Choose `ffmpeg-release-essentials.zip`
- Extract `ffmpeg.exe` and `ffprobe.exe` to this directory

## Linux / macOS
```bash
# Linux
wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
tar -xf ffmpeg-release-amd64-static.tar.xz
cp ffmpeg-7.x-amd64-static/ffmpeg binaries/ffmpeg/
cp ffmpeg-7.x-amd64-static/ffprobe binaries/ffmpeg/

# macOS (via Homebrew)
brew install ffmpeg
cp $(which ffmpeg) binaries/ffmpeg/
cp $(which ffprobe) binaries/ffmpeg/
```

Required binaries: `ffmpeg`, `ffprobe` (or `.exe` equivalents on Windows)
