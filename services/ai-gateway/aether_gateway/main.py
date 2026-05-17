"""FastAPI entry point for the Aether AI Gateway."""

from __future__ import annotations

import time
from typing import Any

import structlog
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import __version__

logger = structlog.get_logger("aether_gateway")

app = FastAPI(
    title="Aether AI Gateway",
    version=__version__,
    description="Python microservice for PDF/video/embedding workloads.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5179", "http://127.0.0.1:5179"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/healthz")
def healthz() -> dict[str, Any]:
    return {"status": "ok", "version": __version__, "ts": time.time()}


class PdfSummarizeRequest(BaseModel):
    url: str = Field(..., description="URL of the PDF to summarise.")
    instructions: str | None = None


class PdfSummarizeResponse(BaseModel):
    summary: str
    citations: list[str]
    words: int


@app.post("/v1/pdf/summarize", response_model=PdfSummarizeResponse)
def pdf_summarize(request: PdfSummarizeRequest) -> PdfSummarizeResponse:
    """Stubbed PDF summarisation.

    Replace with `pypdf` + the AI router. The desktop client treats this
    endpoint as the source of truth so backends can be swapped freely.
    """
    logger.info("pdf.summarize", url=request.url)
    return PdfSummarizeResponse(
        summary=(
            f"[stub] Summary of {request.url}\n\n"
            "This is a placeholder response from the AI gateway. In production "
            "Aether downloads the PDF, extracts text with pypdf, chunks it, and "
            "runs a map-reduce summary against the configured model."
        ),
        citations=[request.url],
        words=120,
    )


class VideoSummarizeRequest(BaseModel):
    url: str = Field(..., description="YouTube / generic video URL.")
    language: str = "en"


class VideoSummarizeResponse(BaseModel):
    summary: str
    chapters: list[dict[str, Any]]
    transcript_preview: str


@app.post("/v1/video/summarize", response_model=VideoSummarizeResponse)
def video_summarize(request: VideoSummarizeRequest) -> VideoSummarizeResponse:
    logger.info("video.summarize", url=request.url)
    return VideoSummarizeResponse(
        summary=f"[stub] Summary of {request.url}",
        chapters=[
            {"start": 0, "end": 60, "title": "Introduction"},
            {"start": 60, "end": 240, "title": "Main argument"},
        ],
        transcript_preview="Hello and welcome to the video…",
    )


class SearchRequest(BaseModel):
    query: str
    limit: int = 10


class SearchResult(BaseModel):
    url: str
    title: str
    snippet: str


@app.post("/v1/web/search", response_model=list[SearchResult])
def web_search(request: SearchRequest) -> list[SearchResult]:
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="empty query")
    logger.info("web.search", q=request.query)
    return [
        SearchResult(
            url=f"https://example.com/{i}",
            title=f"{request.query} — result {i + 1}",
            snippet=f"Example snippet about '{request.query}'. Replace this with a real "
            "search provider (Brave/SerpAPI/Bing).",
        )
        for i in range(min(request.limit, 5))
    ]


class EmbedRequest(BaseModel):
    text: list[str]
    model: str = "nomic-embed-text"


class EmbedResponse(BaseModel):
    vectors: list[list[float]]
    model: str


@app.post("/v1/embed", response_model=EmbedResponse)
def embed(request: EmbedRequest) -> EmbedResponse:
    """Returns deterministic mock embeddings (32 dims) for development."""
    logger.info("embed", model=request.model, n=len(request.text))
    vectors: list[list[float]] = []
    for piece in request.text:
        h = abs(hash(piece))
        vectors.append([((h >> (i * 3)) & 0xFFFF) / 65535.0 for i in range(32)])
    return EmbedResponse(vectors=vectors, model=request.model)
