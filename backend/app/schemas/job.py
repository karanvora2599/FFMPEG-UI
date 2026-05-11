from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel


class JobCreateRequest(BaseModel):
    project_id: str
    name: str = ""
    input_media_ids: list[str]
    settings: dict[str, Any]
    output_filename: Optional[str] = None
    preset_id: Optional[str] = None
    node_graph: Optional[list[dict]] = None


class JobResponse(BaseModel):
    id: str
    project_id: str
    name: str
    status: str
    input_media_ids: Optional[list] = None
    output_path: Optional[str] = None
    ffmpeg_args_json: Optional[list] = None
    generated_command_preview: Optional[str] = None
    settings_json: Optional[dict] = None
    progress: float
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectCreateRequest(BaseModel):
    name: str
    description: str = ""


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
