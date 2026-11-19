import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import init_db
from app.routes import courses, documents, tutor, solver, practice, analytics, notes, visualizer, settings as settings_routes

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="Intelligent Personal AI Teacher & Learning Assistant Backend API"
)

# Enable CORS for frontend Vite development server & production builds
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database schema and initial data
@app.on_event("startup")
def on_startup():
    init_db()

# Mount API Routers
app.include_router(courses.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(tutor.router, prefix="/api")
app.include_router(solver.router, prefix="/api")
app.include_router(practice.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(notes.router, prefix="/api")
app.include_router(visualizer.router, prefix="/api")
app.include_router(settings_routes.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.version
    }

# Mount built frontend
dist_path = "/home/antigravity/frontend/dist"
if os.path.exists(dist_path):
    app.mount("/", StaticFiles(directory=dist_path, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
