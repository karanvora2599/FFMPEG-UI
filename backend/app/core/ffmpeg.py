"""FFmpeg binary detection and path resolution."""
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Optional


_COMMON_PATHS: dict[str, list[str]] = {
    "win32": [
        r"C:\ffmpeg\bin\ffmpeg.exe",
        r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
        r"C:\Program Files (x86)\ffmpeg\bin\ffmpeg.exe",
    ],
    "other": [
        "/usr/bin/ffmpeg",
        "/usr/local/bin/ffmpeg",
        "/opt/homebrew/bin/ffmpeg",
    ],
}


def find_binary(name: str, override: str = "") -> Optional[str]:
    if override and Path(override).is_file():
        return override

    found = shutil.which(name)
    if found:
        return found

    platform_key = "win32" if sys.platform == "win32" else "other"
    for template in _COMMON_PATHS[platform_key]:
        p = Path(template.replace("ffmpeg", name))
        if p.is_file():
            return str(p)

    return None


def get_ffmpeg_path(override: str = "") -> Optional[str]:
    return find_binary("ffmpeg", override)


def get_ffprobe_path(override: str = "") -> Optional[str]:
    return find_binary("ffprobe", override)


def get_ffmpeg_version(ffmpeg_path: str) -> str:
    try:
        result = subprocess.run(
            [ffmpeg_path, "-version"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        first_line = result.stdout.splitlines()[0] if result.stdout else ""
        return first_line
    except Exception:
        return "unknown"


def get_available_encoders(ffmpeg_path: str) -> list[str]:
    try:
        result = subprocess.run(
            [ffmpeg_path, "-encoders", "-hide_banner"],
            capture_output=True,
            text=True,
            timeout=15,
        )
        encoders = []
        for line in result.stdout.splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("=") or stripped.startswith("Encoders"):
                continue
            parts = stripped.split()
            if len(parts) >= 2 and len(parts[0]) >= 6:
                encoders.append(parts[1])
        return encoders
    except Exception:
        return []


def get_available_filters(ffmpeg_path: str) -> list[str]:
    try:
        result = subprocess.run(
            [ffmpeg_path, "-filters", "-hide_banner"],
            capture_output=True,
            text=True,
            timeout=15,
        )
        filters = []
        for line in result.stdout.splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("=") or stripped.startswith("Filters"):
                continue
            parts = stripped.split()
            # Filter lines look like: "... name description"
            if len(parts) >= 2 and ("." in parts[0] or "->" in parts[0]):
                filters.append(parts[1])
        return filters
    except Exception:
        return []


def check_hwaccel_support(ffmpeg_path: str) -> dict:
    """Check which hardware acceleration methods are available."""
    try:
        result = subprocess.run(
            [ffmpeg_path, "-hwaccels", "-hide_banner"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        accels = [
            line.strip()
            for line in result.stdout.splitlines()
            if line.strip() and line.strip() != "Hardware acceleration methods:"
        ]
        return {"methods": accels, "cuda": "cuda" in accels}
    except Exception:
        return {"methods": [], "cuda": False}
