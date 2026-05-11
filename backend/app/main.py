import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import init_db
from app.api import system, media, jobs

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database...")
    await init_db()
    logger.info("GPU Media Forge backend started on http://%s:%s", settings.host, settings.port)
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="GPU Media Forge",
    description="Local GPU-accelerated video processing API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(system.router)
app.include_router(media.router)
app.include_router(jobs.router)

# Serve thumbnails and outputs as static files
app.mount("/thumbnails", StaticFiles(directory=str(settings.thumbnails_dir)), name="thumbnails")
app.mount("/outputs", StaticFiles(directory=str(settings.outputs_dir)), name="outputs")


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.app_name}
