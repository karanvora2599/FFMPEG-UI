from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "GPU Media Forge"
    debug: bool = False
    host: str = "127.0.0.1"
    port: int = 8000

    # Storage paths relative to backend root
    base_dir: Path = Path(__file__).parent.parent.parent
    storage_dir: Path = base_dir / "storage"
    media_dir: Path = storage_dir / "media"
    thumbnails_dir: Path = storage_dir / "thumbnails"
    outputs_dir: Path = storage_dir / "outputs"
    temp_dir: Path = storage_dir / "temp"
    db_path: Path = storage_dir / "gpu_media_forge.db"

    # FFmpeg
    ffmpeg_path: str = ""
    ffprobe_path: str = ""

    # CORS origins for local dev
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# Ensure storage directories exist
for d in [
    settings.media_dir,
    settings.thumbnails_dir,
    settings.outputs_dir,
    settings.temp_dir,
]:
    d.mkdir(parents=True, exist_ok=True)
