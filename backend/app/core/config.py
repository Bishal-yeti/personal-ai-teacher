import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
DB_PATH = DATA_DIR / "teacher.db"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    app_name: str = "Personal AI Teacher"
    version: str = "1.0.0"
    db_path: str = str(DB_PATH)
    upload_dir: str = str(UPLOAD_DIR)
    
    # AI Providers Configuration
    default_provider: str = os.getenv("AI_PROVIDER", "gemini") # gemini, openai, anthropic, groq, offline
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    
    # Models
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o")
    
    # Document limits
    max_upload_size_bytes: int = 50 * 1024 * 1024 # 50 MB
    allowed_extensions: list = [".pdf", ".docx", ".pptx", ".txt", ".md", ".xlsx", ".csv", ".png", ".jpg", ".jpeg", ".webp"]

settings = Settings()
