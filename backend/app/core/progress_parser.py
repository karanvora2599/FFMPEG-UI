"""Parse FFmpeg stderr progress output into structured data."""
import re
from typing import Optional


_TIME_RE = re.compile(r"time=(\d+):(\d+):(\d+\.\d+)")
_SPEED_RE = re.compile(r"speed=\s*([\d.]+)x")
_BITRATE_RE = re.compile(r"bitrate=\s*([\d.]+\s*\S+)")
_SIZE_RE = re.compile(r"size=\s*(\d+\S*)")
_FRAME_RE = re.compile(r"frame=\s*(\d+)")
_FPS_RE = re.compile(r"fps=\s*([\d.]+)")


def parse_progress_line(line: str, total_duration: float = 0.0) -> Optional[dict]:
    """Parse a single FFmpeg stderr line. Returns progress dict or None."""
    if "time=" not in line:
        return None

    result: dict = {"raw": line.strip()}

    m = _TIME_RE.search(line)
    if m:
        h, mn, s = int(m.group(1)), int(m.group(2)), float(m.group(3))
        current_seconds = h * 3600 + mn * 60 + s
        result["current_time"] = current_seconds
        result["current_time_str"] = f"{h:02d}:{mn:02d}:{s:06.3f}"
        if total_duration > 0:
            result["percent"] = min(100.0, round(current_seconds / total_duration * 100, 1))
        else:
            result["percent"] = None

    m = _SPEED_RE.search(line)
    if m:
        result["speed"] = float(m.group(1))

    m = _BITRATE_RE.search(line)
    if m:
        result["bitrate"] = m.group(1).strip()

    m = _SIZE_RE.search(line)
    if m:
        result["size"] = m.group(1)

    m = _FRAME_RE.search(line)
    if m:
        result["frame"] = int(m.group(1))

    m = _FPS_RE.search(line)
    if m:
        result["fps"] = float(m.group(1))

    # Estimate ETA
    speed = result.get("speed", 0)
    current = result.get("current_time", 0)
    if speed and speed > 0 and total_duration > 0:
        remaining_media = max(0, total_duration - current)
        eta_seconds = remaining_media / speed
        result["eta_seconds"] = round(eta_seconds, 1)
    else:
        result["eta_seconds"] = None

    return result
