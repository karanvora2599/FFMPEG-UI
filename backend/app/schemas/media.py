from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class MediaItemResponse(BaseModel):
    id: str
    project_id: str
    original_path: str
    stored_path: str
    filename: str
    duration: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    fps: Optional[float] = None
    video_codec: Optional[str] = None
    audio_codec: Optional[str] = None
    container: Optional[str] = None
    size_bytes: int = 0
    bit_rate: Optional[int] = None
    thumbnail_path: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MediaImportRequest(BaseModel):
    project_id: str
    file_path: str  # Absolute path on local filesystem
