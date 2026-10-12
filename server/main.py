import os
import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Ensure repository root is on Python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from server.config import FIGURES_DIR
from server.api.system import router as system_router
from server.api.metrics import router as metrics_router
from server.api.faults import router as faults_router
from server.api.incidents import router as incidents_router
from server.api.rca import router as rca_router
from server.api.benchmark import router as benchmark_router
from server.api.research import router as research_router
from server.api.reports import router as reports_router
from server.api.fsm import router as fsm_router

app = FastAPI(
    title="OSCAR Root Cause Analysis Platform API",
    description="Unified API for Live Microservice Simulation, RCA Diagnostics, and Research Benchmark Exploration",
    version="2.0.0"
)

# Enable CORS for local Vite development (port 5173) and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.responses import FileResponse
from fastapi import Request

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

# Mount Frontend Assets if built
if FRONTEND_DIST.exists() and (FRONTEND_DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

# Mount Figures Directory as Static Files if present
if FIGURES_DIR.exists():
    app.mount("/static/figures", StaticFiles(directory=str(FIGURES_DIR)), name="figures")
    app.mount("/figures", StaticFiles(directory=str(FIGURES_DIR)), name="figures_alias")

# Register All API Routers
app.include_router(system_router)
app.include_router(metrics_router)
app.include_router(faults_router)
app.include_router(incidents_router)
app.include_router(rca_router)
app.include_router(benchmark_router)
app.include_router(research_router)
app.include_router(reports_router)
app.include_router(fsm_router)

@app.get("/")
def root_info(request: Request):
    accept = request.headers.get("accept", "")
    if "text/html" in accept and FRONTEND_DIST.exists() and (FRONTEND_DIST / "index.html").exists():
        return FileResponse(str(FRONTEND_DIST / "index.html"))
    return {
        "platform": "OSCAR Root Cause Analysis Platform",
        "version": "2.0.0",
        "status": "operational",
        "docs_url": "/docs",
        "ui_url": "/",
        "modes": ["LIVE_SIMULATION", "RESEARCH_BENCHMARK"]
    }

@app.get("/ui")
def serve_ui():
    if FRONTEND_DIST.exists() and (FRONTEND_DIST / "index.html").exists():
        return FileResponse(str(FRONTEND_DIST / "index.html"))
    return {"message": "Frontend not built yet. Run 'npm run build' in frontend directory."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.main:app", host="0.0.0.0", port=8000, reload=True)
