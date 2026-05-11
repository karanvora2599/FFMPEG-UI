from typing import Optional
from pydantic import BaseModel


class FFmpegStatusResponse(BaseModel):
    ffmpeg_found: bool
    ffprobe_found: bool
    ffmpeg_path: Optional[str] = None
    ffprobe_path: Optional[str] = None
    ffmpeg_version: Optional[str] = None
    gpu_name: Optional[str] = None
    gpu_detected: bool = False
    cuda_available: bool = False
    nvenc_encoders: dict[str, bool] = {}
    cuda_filters: dict[str, bool] = {}
    any_nvenc_available: bool = False
    recommended_encoder: str = "libx264"
    hwaccel_methods: list[str] = []
