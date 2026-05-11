import asyncio
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core import ffmpeg as ffmpeg_core
from app.core.command_builder import FFmpegCommandBuilder, PRESETS, build_from_node_graph
from app.core.database import get_db
from app.core import job_runner
from app.models.job import Job
from app.models.media import MediaItem
from app.schemas.job import JobCreateRequest, JobResponse, ProjectCreateRequest, ProjectResponse
from app.models.project import Project

router = APIRouter(prefix="/api", tags=["jobs"])


# --- Projects ---

@router.post("/projects", response_model=ProjectResponse)
async def create_project(req: ProjectCreateRequest, db: AsyncSession = Depends(get_db)):
    project = Project(id=str(uuid.uuid4()), name=req.name, description=req.description)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/projects", response_model=list[ProjectResponse])
async def list_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).order_by(Project.created_at.desc()))
    return result.scalars().all()


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    p = await db.get(Project, project_id)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


# --- Jobs ---

@router.post("/jobs", response_model=JobResponse)
async def create_job(req: JobCreateRequest, db: AsyncSession = Depends(get_db)):
    ffmpeg_path = ffmpeg_core.get_ffmpeg_path(settings.ffmpeg_path)
    if not ffmpeg_path:
        raise HTTPException(status_code=503, detail="FFmpeg not found on system")

    # Resolve input media
    if not req.input_media_ids:
        raise HTTPException(status_code=400, detail="No input media specified")

    first_media = await db.get(MediaItem, req.input_media_ids[0])
    if not first_media:
        raise HTTPException(status_code=404, detail="Input media not found")

    input_path = Path(first_media.stored_path)

    # Merge preset settings if provided
    job_settings = {}
    if req.preset_id and req.preset_id in PRESETS:
        job_settings.update(PRESETS[req.preset_id])
    job_settings.update(req.settings)

    # Determine output path
    container = job_settings.get("container", "mp4")
    if req.output_filename:
        out_name = req.output_filename
        if not out_name.endswith(f".{container}"):
            out_name = f"{out_name}.{container}"
    else:
        stem = input_path.stem
        job_id_short = str(uuid.uuid4())[:8]
        out_name = f"{stem}_{job_id_short}.{container}"

    output_path = settings.outputs_dir / out_name

    # Build FFmpeg command
    if req.node_graph:
        ffmpeg_args = build_from_node_graph(req.node_graph, ffmpeg_path, input_path, output_path)
    else:
        builder = FFmpegCommandBuilder(ffmpeg_path)
        ffmpeg_args = builder.build(job_settings, input_path, output_path)

    command_preview = " ".join(f'"{a}"' if " " in a else a for a in ffmpeg_args)

    job = Job(
        id=str(uuid.uuid4()),
        project_id=req.project_id,
        name=req.name or f"Job - {first_media.filename}",
        status="queued",
        input_media_ids=req.input_media_ids,
        output_path=str(output_path),
        ffmpeg_args_json=ffmpeg_args,
        generated_command_preview=command_preview,
        settings_json=job_settings,
        progress=0.0,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


@router.get("/jobs", response_model=list[JobResponse])
async def list_jobs(project_id: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    stmt = select(Job)
    if project_id:
        stmt = stmt.where(Job.project_id == project_id)
    stmt = stmt.order_by(Job.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/jobs/{job_id}/start", response_model=JobResponse)
async def start_job(job_id: str, db: AsyncSession = Depends(get_db)):
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status == "running":
        raise HTTPException(status_code=409, detail="Job is already running")
    if job.status in ("completed", "canceled"):
        raise HTTPException(status_code=409, detail=f"Job already {job.status}")

    if not job.ffmpeg_args_json:
        raise HTTPException(status_code=400, detail="Job has no FFmpeg args")

    # Resolve input duration for progress calculation
    total_duration = 0.0
    if job.input_media_ids:
        first = await db.get(MediaItem, job.input_media_ids[0])
        if first and first.duration:
            total_duration = first.duration

    job.status = "running"
    job.started_at = datetime.now(timezone.utc)
    job.progress = 0.0
    await db.commit()

    async def on_progress(jid: str, progress: dict):
        async with _get_session() as session:
            j = await session.get(Job, jid)
            if j and progress.get("percent") is not None:
                j.progress = progress["percent"]
                await session.commit()

    async def on_complete(jid: str, success: bool, error: Optional[str]):
        async with _get_session() as session:
            j = await session.get(Job, jid)
            if j:
                j.status = "completed" if success else "failed"
                j.completed_at = datetime.now(timezone.utc)
                j.progress = 100.0 if success else j.progress
                j.error_message = error
                await session.commit()

    asyncio.create_task(
        job_runner.run_job(
            job_id,
            list(job.ffmpeg_args_json),
            total_duration,
            on_progress,
            on_complete,
        )
    )

    await db.refresh(job)
    return job


@router.post("/jobs/{job_id}/cancel", response_model=JobResponse)
async def cancel_job(job_id: str, db: AsyncSession = Depends(get_db)):
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    canceled = await job_runner.cancel_job(job_id)
    if canceled or job.status == "running":
        job.status = "canceled"
        job.completed_at = datetime.now(timezone.utc)
        await db.commit()

    await db.refresh(job)
    return job


@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, db: AsyncSession = Depends(get_db)):
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status == "running":
        await job_runner.cancel_job(job_id)
    await db.delete(job)
    await db.commit()
    return {"ok": True}


# --- WebSocket for job progress ---

@router.websocket("/ws/jobs/{job_id}")
async def job_websocket(job_id: str, websocket: WebSocket):
    await websocket.accept()
    job_runner.subscribe_ws(job_id, websocket)
    try:
        while True:
            # Keep connection alive, client can send pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        job_runner.unsubscribe_ws(job_id, websocket)


# Helper to create a new DB session for background tasks

from contextlib import asynccontextmanager
from app.core.database import AsyncSessionLocal


@asynccontextmanager
async def _get_session():
    async with AsyncSessionLocal() as session:
        yield session
