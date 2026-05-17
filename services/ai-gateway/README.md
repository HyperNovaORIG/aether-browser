# Aether AI Gateway

Python microservice that handles heavy AI workloads that aren't a great fit
for the Node.js desktop main process:

- PDF parsing and OCR
- Audio transcription (Whisper) and YouTube video summarisation
- Web scraping with browser automation
- Bulk embedding jobs and re-ranking
- Long-running research pipelines

The desktop app talks to the gateway over HTTP (`http://127.0.0.1:7788` by
default) and the gateway optionally fans out to provider SDKs that aren't
available in Node (e.g. `transformers`, `playwright`).

The MVP exposes stubs that return deterministic mock data so the desktop UI
is fully wired up; real implementations are tracked in `docs/roadmap.md`.

## Run

```bash
cd services/ai-gateway
pip install -e .
uvicorn aether_gateway.main:app --reload --port 7788
```
