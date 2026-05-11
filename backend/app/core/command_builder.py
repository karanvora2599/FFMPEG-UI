"""Build FFmpeg argument arrays from structured settings. Never uses shell=True."""
from pathlib import Path
from typing import Any, Optional


class FFmpegCommandBuilder:
    def __init__(self, ffmpeg_path: str):
        self.ffmpeg_path = ffmpeg_path

    def build(self, settings: dict, input_path: Path, output_path: Path) -> list[str]:
        """Build ffmpeg args list from settings dict. Returns full command."""
        args = [self.ffmpeg_path, "-y"]

        # Hardware acceleration input flag
        use_gpu = settings.get("use_gpu", False)
        hwaccel = settings.get("hwaccel", "cuda")
        if use_gpu and settings.get("video_codec", "").endswith("_nvenc"):
            args += ["-hwaccel", hwaccel]

        # Trim: seek before input for fast seeking
        if settings.get("trim_start"):
            args += ["-ss", str(settings["trim_start"])]
        if settings.get("trim_end"):
            args += ["-to", str(settings["trim_end"])]

        args += ["-i", str(input_path)]

        # Video filters
        vf_filters = self._build_vf(settings)
        if vf_filters:
            args += ["-vf", ",".join(vf_filters)]

        # Video codec
        video_codec = settings.get("video_codec")
        if settings.get("extract_audio_only"):
            args += ["-vn"]
        elif video_codec:
            args += ["-c:v", video_codec]
            args += self._build_video_codec_args(settings)
        else:
            args += ["-c:v", "copy"]

        # Audio codec
        audio_codec = settings.get("audio_codec")
        if settings.get("no_audio"):
            args += ["-an"]
        elif audio_codec:
            args += ["-c:a", audio_codec]
            if settings.get("audio_bitrate"):
                args += ["-b:a", settings["audio_bitrate"]]
        else:
            args += ["-c:a", "copy"]

        args.append(str(output_path))
        return args

    def build_thumbnail(
        self, ffmpeg_path: str, input_path: Path, output_path: Path, timestamp: float = 3.0
    ) -> list[str]:
        return [
            ffmpeg_path, "-y",
            "-ss", str(timestamp),
            "-i", str(input_path),
            "-frames:v", "1",
            "-vf", "scale=320:-1",
            "-q:v", "3",
            str(output_path),
        ]

    def _build_vf(self, settings: dict) -> list[str]:
        filters = []

        # Scale
        width = settings.get("output_width")
        height = settings.get("output_height")
        use_gpu = settings.get("use_gpu", False)
        if width and height:
            scale_filter = "scale_cuda" if use_gpu and settings.get("cuda_scale") else "scale"
            filters.append(f"{scale_filter}={width}:{height}")

        # FPS
        if settings.get("output_fps"):
            filters.append(f"fps={settings['output_fps']}")

        # Crop
        crop = settings.get("crop")
        if crop:
            filters.append(f"crop={crop['w']}:{crop['h']}:{crop['x']}:{crop['y']}")

        # Extra vf filters from node graph (color adjust, denoise, etc.)
        for extra in settings.get("extra_vf", []):
            filters.append(extra)

        return filters

    def _build_video_codec_args(self, settings: dict) -> list[str]:
        args = []
        codec = settings.get("video_codec", "")

        if codec.endswith("_nvenc"):
            preset = settings.get("nvenc_preset", "p5")
            args += ["-preset", preset]
            if settings.get("video_bitrate"):
                args += ["-b:v", settings["video_bitrate"]]
            if settings.get("cq"):
                args += ["-cq", str(settings["cq"])]
        elif codec == "libx264":
            crf = settings.get("crf", 23)
            args += ["-crf", str(crf)]
            preset = settings.get("cpu_preset", "medium")
            args += ["-preset", preset]
        elif codec == "libx265":
            crf = settings.get("crf", 28)
            args += ["-crf", str(crf)]
            args += ["-preset", settings.get("cpu_preset", "medium")]
        elif codec == "prores_ks":
            args += ["-profile:v", str(settings.get("prores_profile", 3))]

        return args


PRESETS: dict[str, dict[str, Any]] = {
    "h264_nvenc_mp4": {
        "label": "H.264 NVENC MP4",
        "use_gpu": True,
        "video_codec": "h264_nvenc",
        "audio_codec": "aac",
        "audio_bitrate": "192k",
        "video_bitrate": "8M",
        "nvenc_preset": "p5",
        "container": "mp4",
    },
    "h265_nvenc_mp4": {
        "label": "H.265 NVENC MP4",
        "use_gpu": True,
        "video_codec": "hevc_nvenc",
        "audio_codec": "aac",
        "audio_bitrate": "192k",
        "video_bitrate": "6M",
        "nvenc_preset": "p5",
        "container": "mp4",
    },
    "av1_nvenc": {
        "label": "AV1 NVENC MKV",
        "use_gpu": True,
        "video_codec": "av1_nvenc",
        "audio_codec": "opus",
        "audio_bitrate": "128k",
        "video_bitrate": "4M",
        "nvenc_preset": "p5",
        "container": "mkv",
    },
    "youtube_1080p": {
        "label": "YouTube 1080p",
        "use_gpu": True,
        "video_codec": "h264_nvenc",
        "audio_codec": "aac",
        "audio_bitrate": "192k",
        "video_bitrate": "8M",
        "output_width": 1920,
        "output_height": 1080,
        "nvenc_preset": "p5",
        "container": "mp4",
    },
    "youtube_4k": {
        "label": "YouTube 4K",
        "use_gpu": True,
        "video_codec": "hevc_nvenc",
        "audio_codec": "aac",
        "audio_bitrate": "192k",
        "video_bitrate": "35M",
        "output_width": 3840,
        "output_height": 2160,
        "nvenc_preset": "p5",
        "container": "mp4",
    },
    "instagram_reels": {
        "label": "Instagram Reels 1080x1920",
        "use_gpu": True,
        "video_codec": "h264_nvenc",
        "audio_codec": "aac",
        "audio_bitrate": "128k",
        "video_bitrate": "5M",
        "output_width": 1080,
        "output_height": 1920,
        "nvenc_preset": "p5",
        "container": "mp4",
    },
    "prores_cpu": {
        "label": "ProRes (CPU Fallback)",
        "use_gpu": False,
        "video_codec": "prores_ks",
        "audio_codec": "pcm_s16le",
        "prores_profile": 3,
        "container": "mov",
    },
    "audio_mp3": {
        "label": "Audio MP3",
        "extract_audio_only": True,
        "audio_codec": "libmp3lame",
        "audio_bitrate": "320k",
        "container": "mp3",
    },
    "audio_aac": {
        "label": "Audio AAC",
        "extract_audio_only": True,
        "audio_codec": "aac",
        "audio_bitrate": "256k",
        "container": "m4a",
    },
    "audio_wav": {
        "label": "Audio WAV (PCM)",
        "extract_audio_only": True,
        "audio_codec": "pcm_s16le",
        "container": "wav",
    },
    "cpu_h264": {
        "label": "H.264 CPU (libx264)",
        "use_gpu": False,
        "video_codec": "libx264",
        "audio_codec": "aac",
        "audio_bitrate": "192k",
        "crf": 23,
        "cpu_preset": "medium",
        "container": "mp4",
    },
}


def build_from_node_graph(nodes: list[dict], ffmpeg_path: str, input_path: Path, output_path: Path) -> list[str]:
    """Compile a node graph into an FFmpeg command."""
    settings: dict[str, Any] = {"use_gpu": False}

    for node in nodes:
        node_type = node.get("type")
        data = node.get("data", {})

        if node_type == "TrimNode":
            if data.get("start"):
                settings["trim_start"] = data["start"]
            if data.get("end"):
                settings["trim_end"] = data["end"]

        elif node_type == "ScaleNode":
            settings["output_width"] = data.get("width")
            settings["output_height"] = data.get("height")
            settings["cuda_scale"] = data.get("use_cuda", False)

        elif node_type == "FpsNode":
            settings["output_fps"] = data.get("fps")

        elif node_type == "CropNode":
            settings["crop"] = {
                "w": data.get("w", 1920),
                "h": data.get("h", 1080),
                "x": data.get("x", 0),
                "y": data.get("y", 0),
            }

        elif node_type == "EncodeNode":
            settings["video_codec"] = data.get("video_codec", "h264_nvenc")
            settings["audio_codec"] = data.get("audio_codec", "aac")
            settings["video_bitrate"] = data.get("video_bitrate", "8M")
            settings["audio_bitrate"] = data.get("audio_bitrate", "192k")
            settings["use_gpu"] = data.get("use_gpu", False)
            settings["nvenc_preset"] = data.get("nvenc_preset", "p5")

        elif node_type == "AudioNormalizeNode":
            target_i = data.get("target_i", -16)
            target_tp = data.get("target_tp", -1.5)
            settings["audio_normalize"] = True
            settings["audio_normalize_i"] = target_i
            settings["audio_normalize_tp"] = target_tp

        elif node_type == "ColorAdjustNode":
            settings["color_adjust"] = {
                "brightness": data.get("brightness", 0),
                "contrast": data.get("contrast", 0),
                "saturation": data.get("saturation", 1),
                "gamma": data.get("gamma", 1),
            }

        elif node_type == "DenoiseNode":
            settings["denoise"] = {
                "filter": data.get("filter", "hqdn3d"),
                "strength": data.get("strength", 3),
            }

        elif node_type == "OutputNode":
            container = data.get("container", "mp4")
            if container:
                settings["container"] = container

    builder = FFmpegCommandBuilder(ffmpeg_path)

    # Build video filter chain (vf) incorporating all vf-based effects
    extra_vf: list[str] = []

    if settings.get("color_adjust"):
        ca = settings["color_adjust"]
        b = ca.get("brightness", 0)
        c = ca.get("contrast", 0)
        s = ca.get("saturation", 1)
        g = ca.get("gamma", 1)
        extra_vf.append(f"eq=brightness={b}:contrast={c}:saturation={s}:gamma={g}")

    if settings.get("denoise"):
        dn = settings["denoise"]
        strength = dn.get("strength", 3)
        if dn.get("filter") == "nlmeans":
            extra_vf.append(f"nlmeans=s={strength}")
        else:
            extra_vf.append(f"hqdn3d={strength}:{strength}:{strength}:{strength}")

    if extra_vf:
        settings["extra_vf"] = extra_vf

    cmd = builder.build(settings, input_path, output_path)

    # Insert loudnorm if audio normalize was requested
    if settings.get("audio_normalize"):
        i = settings.get("audio_normalize_i", -16)
        tp = settings.get("audio_normalize_tp", -1.5)
        cmd.insert(-1, "-af")
        cmd.insert(-1, f"loudnorm=I={i}:TP={tp}:LRA=11")

    return cmd
