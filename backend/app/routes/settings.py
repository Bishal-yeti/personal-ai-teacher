from typing import Dict, Any, Optional
from fastapi import APIRouter
from pydantic import BaseModel
from app.core.database import get_connection
from app.services.llm_provider import LLMProvider

router = APIRouter(prefix="/settings", tags=["Settings"])

class KeyUpdateRequest(BaseModel):
    provider: str # 'gemini', 'openai', 'groq', 'anthropic'
    api_key: str

@router.get("/status")
def get_system_status():
    status = LLMProvider.get_provider_status()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM courses")
    course_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM documents")
    doc_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM document_chunks")
    chunk_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM messages")
    msg_count = cursor.fetchone()[0]
    conn.close()

    return {
        "status": "operational",
        "llm_providers": status,
        "database_stats": {
            "total_courses": course_count,
            "total_documents": doc_count,
            "indexed_chunks": chunk_count,
            "total_messages": msg_count
        }
    }

@router.post("/keys")
def set_api_key(req: KeyUpdateRequest):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO app_settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    """, (f"{req.provider.lower()}_api_key", req.api_key.strip()))
    conn.commit()
    conn.close()
    return {"success": True, "provider": req.provider, "message": f"{req.provider.capitalize()} API key saved."}
