"""Async job execution with WebSocket progress streaming."""
import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.core.progress_parser import parse_progress_line

logger = logging.getLogger(__name__)

# job_id -> asyncio.subprocess.Process
_running_processes: dict[str, asyncio.subprocess.Process] = {}

# job_id -> list of WebSocket connections
_ws_subscribers: dict[str, list] = {}


def subscribe_ws(job_id: str, ws) -> None:
    _ws_subscribers.setdefault(job_id, []).append(ws)


def unsubscribe_ws(job_id: str, ws) -> None:
    subs = _ws_subscribers.get(job_id, [])
    if ws in subs:
        subs.remove(ws)


async def _broadcast(job_id: str, message: dict) -> None:
    subs = _ws_subscribers.get(job_id, [])
    dead = []
    for ws in subs:
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        unsubscribe_ws(job_id, ws)


async def run_job(
    job_id: str,
    ffmpeg_args: list[str],
    total_duration: float,
    on_progress,  # async callable(job_id, progress_dict)
    on_complete,  # async callable(job_id, success, error_msg)
) -> None:
    """Execute FFmpeg command, stream progress, call callbacks."""
    logger.info("Starting job %s: %s", job_id, " ".join(ffmpeg_args))

    try:
        proc = await asyncio.create_subprocess_exec(
            *ffmpeg_args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _running_processes[job_id] = proc
    except FileNotFoundError as e:
        await on_complete(job_id, False, f"FFmpeg not found: {e}")
        return
    except Exception as e:
        await on_complete(job_id, False, str(e))
        return

    stderr_lines = []

    async def read_stderr():
        assert proc.stderr is not None
        async for raw_line in proc.stderr:
            line = raw_line.decode("utf-8", errors="replace")
            stderr_lines.append(line)

            progress = parse_progress_line(line, total_duration)
            if progress:
                await on_progress(job_id, progress)
                await _broadcast(job_id, {"type": "progress", "data": progress})
            else:
                # Still emit raw log lines
                await _broadcast(job_id, {"type": "log", "data": line.rstrip()})

    await asyncio.gather(read_stderr(), proc.wait())

    _running_processes.pop(job_id, None)

    if proc.returncode == 0:
        await _broadcast(job_id, {"type": "complete", "data": {"success": True}})
        await on_complete(job_id, True, None)
    else:
        error = "".join(stderr_lines[-20:])
        await _broadcast(job_id, {"type": "complete", "data": {"success": False, "error": error}})
        await on_complete(job_id, False, error)


async def cancel_job(job_id: str) -> bool:
    proc = _running_processes.get(job_id)
    if proc is None:
        return False
    try:
        proc.terminate()
        await asyncio.sleep(0.5)
        if proc.returncode is None:
            proc.kill()
        _running_processes.pop(job_id, None)
        await _broadcast(job_id, {"type": "canceled", "data": {}})
        return True
    except Exception as e:
        logger.error("Failed to cancel job %s: %s", job_id, e)
        return False
