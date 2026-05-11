import shutil
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core import ffmpeg as ffmpeg_core
from app.core.ffprobe import probe_media, extract_metadata
from app.core.database import get_db
from app.models.media import MediaItem
from app.schemas.media import MediaItemResponse, MediaImportRequest

router = APIRouter(prefix="/api/media", tags=["media"])


async def _generate_thumbnail(ffmpeg_path: str, file_path: Path, media_id: str) -> Optional[str]:
    thumb_name = f"{media_id}.jpg"
    thumb_path = settings.thumbnails_dir / thumb_name
    from app.core.command_builder import FFmpegCommandBuilder
    builder = FFmpegCommandBuilder(ffmpeg_path)
    cmd = builder.build_thumbnail(ffmpeg_path, file_path, thumb_path)

    import asyncio
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await asyncio.wait_for(proc.wait(), timeout=30)
        if thumb_path.exists():
            return str(thumb_path)
    except Exception:
        pass
    return None


async def _import_file(file_path: Path, project_id: str, db: AsyncSession) -> MediaItem:
    if not file_path.exists():
        raise HTTPException(status_code=400, detail=f"File not found: {file_path}")

    ffmpeg_path = ffmpeg_core.get_ffmpeg_path(settings.ffmpeg_path)
    ffprobe_path = ffmpeg_core.get_ffprobe_path(settings.ffprobe_path)

    if not ffprobe_path:
        raise HTTPException(status_code=503, detail="ffprobe not found on system")

    probe = probe_media(ffprobe_path, file_path)
    meta = extract_metadata(probe) if probe else {}

    media_id = str(uuid.uuid4())
    thumbnail_path = None

    if ffmpeg_path and meta.get("duration", 0) > 0:
        thumbnail_path = await _generate_thumbnail(ffmpeg_path, file_path, media_id)

    item = MediaItem(
        id=media_id,
        project_id=project_id,
        original_path=str(file_path),
        stored_path=str(file_path),
        filename=file_path.name,
        duration=meta.get("duration"),
        width=meta.get("width"),
        height=meta.get("height"),
        fps=meta.get("fps"),
        video_codec=meta.get("video_codec"),
        audio_codec=meta.get("audio_codec"),
        container=meta.get("container"),
        size_bytes=meta.get("size_bytes", 0),
        bit_rate=meta.get("bit_rate"),
        thumbnail_path=thumbnail_path,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.post("/import", response_model=MediaItemResponse)
async def import_by_path(req: MediaImportRequest, db: AsyncSession = Depends(get_db)):
    """Import a file from its local filesystem path."""
    item = await _import_file(Path(req.file_path), req.project_id, db)
    return item


@router.post("/upload", response_model=MediaItemResponse)
async def upload_file(
    project_id: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a file from the browser."""
    dest = settings.media_dir / file.filename
    # Avoid overwrite collisions
    if dest.exists():
        stem = dest.stem
        suffix = dest.suffix
        dest = settings.media_dir / f"{stem}_{uuid.uuid4().hex[:6]}{suffix}"

    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    item = await _import_file(dest, project_id, db)
    return item


@router.get("", response_model=list[MediaItemResponse])
async def list_media(project_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(MediaItem)
    if project_id:
        stmt = stmt.where(MediaItem.project_id == project_id)
    stmt = stmt.order_by(MediaItem.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{media_id}", response_model=MediaItemResponse)
async def get_media(media_id: str, db: AsyncSession = Depends(get_db)):
    item = await db.get(MediaItem, media_id)
    if not item:
        raise HTTPException(status_code=404, detail="Media not found")
    return item


@router.delete("/{media_id}")
async def delete_media(media_id: str, db: AsyncSession = Depends(get_db)):
    item = await db.get(MediaItem, media_id)
    if not item:
        raise HTTPException(status_code=404, detail="Media not found")
    await db.delete(item)
    await db.commit()
    return {"ok": True}


@router.get("/{media_id}/stream")
async def stream_media(media_id: str, db: AsyncSession = Depends(get_db)):
    """Stream a media file for browser playback."""
    item = await db.get(MediaItem, media_id)
    if not item:
        raise HTTPException(status_code=404, detail="Media not found")
    file_path = Path(item.stored_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    # Determine media type
    suffix = file_path.suffix.lower()
    media_type_map = {
        '.mp4': 'video/mp4',
        '.mkv': 'video/x-matroska',
        '.mov': 'video/quicktime',
        '.webm': 'video/webm',
        '.avi': 'video/x-msvideo',
        '.mp3': 'audio/mpeg',
        '.aac': 'audio/aac',
        '.wav': 'audio/wav',
        '.flac': 'audio/flac',
    }
    mt = media_type_map.get(suffix, 'application/octet-stream')
    return FileResponse(str(file_path), media_type=mt)


@router.get("/thumbnail/{media_id}")
async def get_thumbnail(media_id: str, db: AsyncSession = Depends(get_db)):
    item = await db.get(MediaItem, media_id)
    if not item or not item.thumbnail_path:
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    thumb = Path(item.thumbnail_path)
    if not thumb.exists():
        raise HTTPException(status_code=404, detail="Thumbnail file missing")
    return FileResponse(str(thumb), media_type="image/jpeg")
