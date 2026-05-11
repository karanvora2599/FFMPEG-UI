"""NVIDIA GPU and NVENC capability detection."""
import subprocess
import sys
from typing import Optional


def detect_nvidia_gpu() -> Optional[str]:
    """Try to detect NVIDIA GPU name via nvidia-smi."""
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip().splitlines()[0]
    except FileNotFoundError:
        pass
    except Exception:
        pass

    # Windows fallback via wmic
    if sys.platform == "win32":
        try:
            result = subprocess.run(
                ["wmic", "path", "win32_VideoController", "get", "name"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            for line in result.stdout.splitlines():
                line = line.strip()
                if line and line != "Name" and "NVIDIA" in line.upper():
                    return line
        except Exception:
            pass

    return None


def check_nvenc_encoders(available_encoders: list[str]) -> dict[str, bool]:
    return {
        "h264_nvenc": "h264_nvenc" in available_encoders,
        "hevc_nvenc": "hevc_nvenc" in available_encoders,
        "av1_nvenc": "av1_nvenc" in available_encoders,
    }


def check_cuda_filters(available_filters: list[str]) -> dict[str, bool]:
    cuda_filters = ["scale_cuda", "scale_npp", "hwupload_cuda", "yadif_cuda", "overlay_cuda"]
    return {f: f in available_filters for f in cuda_filters}


def build_gpu_status(
    ffmpeg_path: Optional[str],
    available_encoders: list[str],
    available_filters: list[str],
    hwaccel: dict,
) -> dict:
    gpu_name = detect_nvidia_gpu()
    nvenc = check_nvenc_encoders(available_encoders)
    cuda_filters = check_cuda_filters(available_filters)

    return {
        "gpu_name": gpu_name,
        "gpu_detected": gpu_name is not None,
        "cuda_available": hwaccel.get("cuda", False),
        "nvenc_encoders": nvenc,
        "cuda_filters": cuda_filters,
        "any_nvenc_available": any(nvenc.values()),
        "recommended_encoder": _pick_encoder(nvenc),
    }


def _pick_encoder(nvenc: dict[str, bool]) -> str:
    if nvenc.get("av1_nvenc"):
        return "av1_nvenc"
    if nvenc.get("hevc_nvenc"):
        return "hevc_nvenc"
    if nvenc.get("h264_nvenc"):
        return "h264_nvenc"
    return "libx264"
