from fastapi import APIRouter
from app.core.config import settings
from app.core import ffmpeg as ffmpeg_core
from app.core.gpu_detect import build_gpu_status
from app.core.command_builder import PRESETS
from app.schemas.system import FFmpegStatusResponse

router = APIRouter(prefix="/api/system", tags=["system"])


@router.get("/ffmpeg-status", response_model=FFmpegStatusResponse)
async def get_ffmpeg_status():
    ffmpeg_path = ffmpeg_core.get_ffmpeg_path(settings.ffmpeg_path)
    ffprobe_path = ffmpeg_core.get_ffprobe_path(settings.ffprobe_path)

    if not ffmpeg_path:
        return FFmpegStatusResponse(ffmpeg_found=False, ffprobe_found=ffprobe_path is not None)

    version = ffmpeg_core.get_ffmpeg_version(ffmpeg_path)
    encoders = ffmpeg_core.get_available_encoders(ffmpeg_path)
    filters = ffmpeg_core.get_available_filters(ffmpeg_path)
    hwaccel = ffmpeg_core.check_hwaccel_support(ffmpeg_path)
    gpu = build_gpu_status(ffmpeg_path, encoders, filters, hwaccel)

    return FFmpegStatusResponse(
        ffmpeg_found=True,
        ffprobe_found=ffprobe_path is not None,
        ffmpeg_path=ffmpeg_path,
        ffprobe_path=ffprobe_path,
        ffmpeg_version=version,
        gpu_name=gpu["gpu_name"],
        gpu_detected=gpu["gpu_detected"],
        cuda_available=gpu["cuda_available"],
        nvenc_encoders=gpu["nvenc_encoders"],
        cuda_filters=gpu["cuda_filters"],
        any_nvenc_available=gpu["any_nvenc_available"],
        recommended_encoder=gpu["recommended_encoder"],
        hwaccel_methods=hwaccel.get("methods", []),
    )


@router.get("/presets")
async def get_presets():
    return PRESETS
