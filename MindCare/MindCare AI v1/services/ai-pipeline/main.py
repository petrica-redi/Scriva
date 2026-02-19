"""AI Medical Scribe — Python AI Pipeline Service"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import audio, notes, billing, ehr
from utils.logging import setup_logging
from models.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    setup_logging()
    yield


settings = get_settings()

app = FastAPI(
    title="AI Medical Scribe — AI Pipeline",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(audio.router, prefix="/ws", tags=["audio"])
app.include_router(notes.router, prefix="/api", tags=["notes"])
app.include_router(billing.router, prefix="/api", tags=["billing"])
app.include_router(ehr.router, prefix="/api", tags=["ehr"])


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-pipeline"}
