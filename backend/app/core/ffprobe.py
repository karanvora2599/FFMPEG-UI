"""ffprobe metadata extraction."""
import json
import subprocess
from pathlib import Path
from typing import Optional


def probe_media(ffprobe_path: str, file_path: Path) -> Optional[dict]:
    """Run ffprobe and return parsed JSON metadata."""
    try:
        result = subprocess.run(
            [
                ffprobe_path,
                "-v", "quiet",
                "-print_format", "json",
                "-show_format",
                "-show_streams",
                str(file_path),
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            return None
        return json.loads(result.stdout)
    except Exception:
        return None


def extract_metadata(probe_data: dict) -> dict:
    """Extract normalized metadata from ffprobe output."""
    fmt = probe_data.get("format", {})
    streams = probe_data.get("streams", [])

    video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)

    duration = float(fmt.get("duration", 0) or 0)
    size_bytes = int(fmt.get("size", 0) or 0)

    width = height = fps = None
    video_codec = None

    if video_stream:
        width = video_stream.get("width")
        height = video_stream.get("height")
        video_codec = video_stream.get("codec_name")
        r_frame_rate = video_stream.get("r_frame_rate", "0/1")
        try:
            num, den = r_frame_rate.split("/")
            fps = round(int(num) / int(den), 3) if int(den) != 0 else None
        except Exception:
            fps = None

    audio_codec = audio_stream.get("codec_name") if audio_stream else None

    # Determine container from format name
    container = fmt.get("format_name", "").split(",")[0]

    return {
        "duration": duration,
        "width": width,
        "height": height,
        "fps": fps,
        "video_codec": video_codec,
        "audio_codec": audio_codec,
        "container": container,
        "size_bytes": size_bytes,
        "bit_rate": int(fmt.get("bit_rate", 0) or 0),
    }
