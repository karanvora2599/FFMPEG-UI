# GPU Media Forge

A local GPU-accelerated video processing workstation built on FFmpeg and NVIDIA NVENC.

## Features

- **Professional dark UI** — Media library, preview monitor, inspector, job queue, node pipeline
- **NVIDIA GPU acceleration** — h264_nvenc, hevc_nvenc, av1_nvenc with automatic detection
- **CUDA filters** — scale_cuda, hwupload_cuda, yadif_cuda where available
- **Visual node pipeline** — Build FFmpeg filter graphs visually with React Flow
- **Real-time progress** — Live FFmpeg logs and progress over WebSocket
- **Presets** — YouTube 1080p/4K, Instagram Reels, H.264/H.265/AV1 NVENC, ProRes, audio export
- **Batch support** — Queue multiple jobs with cancel/retry
- **Local-only** — No cloud services, everything runs on your machine

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, Zustand, React Flow |
| Backend | Python, FastAPI, SQLite (aiosqlite), WebSockets |
| Processing | FFmpeg, ffprobe, NVIDIA NVENC, CUDA |

## Requirements

- **FFmpeg** ≥ 6.0 with NVENC support (see below)
- **Python** ≥ 3.11
- **Node.js** ≥ 18
- **NVIDIA GPU** with driver ≥ 471.41 (for NVENC)

## Setup

### Windows

```bat
# 1. Start the backend (auto-creates virtualenv)
start-backend.bat

# 2. In a new terminal, start the frontend
start-frontend.bat

# 3. Open http://localhost:5173
```

### Linux / macOS

```bash
chmod +x start-backend.sh
./start-backend.sh

# In another terminal:
cd frontend && npm run dev

# Open http://localhost:5173
```

## Installing FFmpeg with NVENC

### Windows (Recommended: gyan.dev full build)

1. Download from https://www.gyan.dev/ffmpeg/builds/ — choose `ffmpeg-release-full.7z`
2. Extract to `C:\ffmpeg\`
3. The app auto-detects `C:\ffmpeg\bin\ffmpeg.exe`

Or install via Chocolatey:
```powershell
choco install ffmpeg-full
```

Or via winget:
```powershell
winget install Gyan.FFmpeg
```

### Verify NVENC support

```bash
ffmpeg -encoders | grep nvenc
# Should show: h264_nvenc, hevc_nvenc, av1_nvenc
```

```bash
ffmpeg -hwaccels
# Should show: cuda
```

### NVIDIA Driver Requirements

| NVENC Codec | Minimum Driver (Windows) |
|-------------|--------------------------|
| H.264 NVENC | 378.66+ |
| H.265 NVENC | 378.66+ |
| AV1 NVENC   | 522.25+ (RTX 40-series) |

## Project Structure

```
gpu-media-forge/
  backend/
    app/
      api/         # FastAPI route handlers
      core/        # FFmpeg detection, command builder, job runner
      models/      # SQLAlchemy models
      schemas/     # Pydantic schemas
    storage/       # Media, thumbnails, outputs (auto-created)
    requirements.txt
  frontend/
    src/
      components/  # UI components (media, preview, inspector, nodes, jobs)
      lib/         # API client, utilities
      store/       # Zustand state
      types/       # TypeScript types
      routes/      # Page layouts
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/system/ffmpeg-status` | FFmpeg and GPU capability detection |
| `GET /api/system/presets` | Available encoding presets |
| `POST /api/projects` | Create project |
| `POST /api/media/import` | Import file by local path |
| `POST /api/media/upload` | Upload file from browser |
| `GET /api/media` | List media items |
| `GET /api/media/{id}/stream` | Stream media for browser preview |
| `POST /api/jobs` | Create a processing job |
| `POST /api/jobs/{id}/start` | Start FFmpeg execution |
| `POST /api/jobs/{id}/cancel` | Cancel running job |
| `WS /ws/jobs/{id}` | Live progress and log streaming |

## Example FFmpeg Commands Generated

```bash
# H.264 NVENC transcode
ffmpeg -y -hwaccel cuda -i input.mp4 -c:v h264_nvenc -preset p5 -b:v 8M -c:a aac -b:a 192k output.mp4

# H.265 NVENC 4K
ffmpeg -y -hwaccel cuda -i input.mp4 -vf scale_cuda=3840:2160 -c:v hevc_nvenc -preset p5 -b:v 35M -c:a aac -b:a 192k output.mp4

# AV1 NVENC (RTX 40-series)
ffmpeg -y -hwaccel cuda -i input.mp4 -c:v av1_nvenc -preset p5 -b:v 4M -c:a opus -b:a 128k output.mkv

# Trim + GPU transcode
ffmpeg -y -ss 10 -to 30 -i input.mp4 -c:v h264_nvenc -preset p5 -c:a aac output.mp4

# Extract audio
ffmpeg -y -i input.mp4 -vn -c:a libmp3lame -b:a 320k output.mp3
```

## Troubleshooting

**"CPU Mode" shown instead of GPU**
- Ensure FFmpeg was compiled with NVENC support (`ffmpeg -encoders | grep nvenc`)
- Update NVIDIA drivers to latest version
- Some FFmpeg builds from package managers exclude NVENC — use gyan.dev or compile from source

**Backend won't start**
- Check Python 3.11+ is installed: `python --version`
- Check port 8000 is free: `netstat -an | findstr 8000`

**Video won't preview in browser**
- Browser codec support varies. MP4/H.264 works universally. MKV/HEVC may require hardware decoding support.
- Use Chrome or Edge for best compatibility.

**AV1 NVENC not available**
- AV1 NVENC requires RTX 40-series (Ada Lovelace) or newer GPUs.
- The app will automatically use H.265 NVENC as fallback.
