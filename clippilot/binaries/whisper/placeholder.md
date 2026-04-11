# Whisper.cpp Binary

Download or compile whisper.cpp and place the binary + model here.

## Windows
1. Download pre-built from: https://github.com/ggerganov/whisper.cpp/releases
2. Place `main.exe` in this directory
3. Download the base English model:
   ```
   mkdir models
   curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin -o models/ggml-base.en.bin
   ```

## Linux / macOS
```bash
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
make
cp main binaries/whisper/main
bash ./models/download-ggml-model.sh base.en
cp models/ggml-base.en.bin binaries/whisper/models/
```

## Directory structure expected:
```
binaries/whisper/
├── main (or main.exe on Windows)
└── models/
    └── ggml-base.en.bin
```
