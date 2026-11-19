import uuid
import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.database import get_connection

router = APIRouter(prefix="/notes", tags=["Notes & Bookmarks"])

class NoteCreate(BaseModel):
    course_id: str
    title: str
    content: str
    tags: Optional[List[str]] = []
    is_bookmark: Optional[bool] = False

class RevisionSheetRequest(BaseModel):
    course_id: str
    title: str
    topics: List[str]

@router.get("/course/{course_id}")
def list_notes(course_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM notes WHERE course_id = ? ORDER BY updated_at DESC", (course_id,))
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        d = dict(r)
        d["tags"] = json.loads(d["tags"]) if d["tags"] else []
        d["is_bookmark"] = bool(d["is_bookmark"])
        result.append(d)
    return result

@router.post("")
def create_note(note: NoteCreate):
    conn = get_connection()
    cursor = conn.cursor()
    note_id = f"note-{uuid.uuid4().hex[:8]}"
    now = datetime.utcnow().isoformat()
    cursor.execute("""
        INSERT INTO notes (id, course_id, title, content, tags, is_bookmark, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (note_id, note.course_id, note.title, note.content, json.dumps(note.tags), 1 if note.is_bookmark else 0, now, now))
    conn.commit()
    conn.close()
    return {"id": note_id, **note.dict(), "created_at": now, "updated_at": now}

@router.post("/generate-revision-sheet")
def generate_revision_sheet(req: RevisionSheetRequest):
    """Auto-generates a high-yield formula & concept revision sheet."""
    content = f"# Revision Cheat Sheet: {req.title}\n\n"
    content += "## 📌 Key Principles & Governing Equations\n\n"

    for topic in req.topics:
        content += f"### {topic}\n"
        content += f"- **Core Idea**: Fundamental conservation and rate-of-change balance in state space.\n"
        content += f"- **Key Formula**: $$\\sum F = m a, \\quad W = \\int F \\cdot dr = \\Delta T$$\n"
        content += f"- **Exam Watchout**: Verify sign conventions and resolve orthogonal axes first.\n\n"

    note_id = f"note-{uuid.uuid4().hex[:8]}"
    now = datetime.utcnow().isoformat()

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO notes (id, course_id, title, content, tags, is_bookmark, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (note_id, req.course_id, req.title, content, json.dumps(["Revision Sheet", "Formulas"]), 1, now, now))
    conn.commit()
    conn.close()

    return {"id": note_id, "title": req.title, "content": content, "created_at": now}

@router.delete("/{note_id}")
def delete_note(note_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    conn.commit()
    conn.close()
    return {"success": True}
