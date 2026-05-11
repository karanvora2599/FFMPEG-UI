import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Float, Integer, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, default="")

    # Status: queued | running | completed | failed | canceled
    status: Mapped[str] = mapped_column(String, default="queued")

    input_media_ids: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    output_path: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    ffmpeg_args_json: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    generated_command_preview: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Settings used to build the command
    settings_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    progress: Mapped[float] = mapped_column(Float, default=0.0)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
