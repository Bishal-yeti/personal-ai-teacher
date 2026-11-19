import os
import uuid
import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.core.config import settings
from app.core.database import get_connection
from app.services.doc_parser import DocumentParserService
from app.services.rag_engine import RAGEngine

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.get("/course/{course_id}")
def list_documents(course_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT d.*, 
            (SELECT COUNT(*) FROM document_chunks WHERE document_id = d.id) as chunk_count
        FROM documents d
        WHERE d.course_id = ?
        ORDER BY d.created_at DESC
    """, (course_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@router.post("/upload")
async def upload_document(
    course_id: str = Form(...),
    doc_category: str = Form("lecture_notes"), # 'lecture_notes', 'textbook', 'syllabus', 'exam_paper'
    file: UploadFile = File(...)
):
    # Verify course exists
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM courses WHERE id = ?", (course_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Course not found")

    ext = Path(file.filename).suffix.lower()
    if ext not in settings.allowed_extensions:
        conn.close()
        raise HTTPException(status_code=400, detail=f"File extension {ext} not supported")

    doc_id = f"doc-{uuid.uuid4().hex[:8]}"
    saved_filename = f"{doc_id}_{file.filename}"
    file_path = os.path.join(settings.upload_dir, saved_filename)

    # Save to disk
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    file_size = os.path.getsize(file_path)

    # Parse document structure
    try:
        parsed = DocumentParserService.extract_document(file_path, file.filename)
    except Exception as e:
        conn.close()
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to parse document: {str(e)}")

    page_count = parsed.get("page_count", 1)
    summary = parsed.get("summary", "")
    chunks = parsed.get("chunks", [])

    # Insert document record
    cursor.execute("""
        INSERT INTO documents (id, course_id, filename, file_type, file_path, file_size, page_count, doc_category, summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (doc_id, course_id, file.filename, ext, file_path, file_size, page_count, doc_category, summary))

    # Insert chunks with page provenance
    for idx, c in enumerate(chunks):
        chunk_id = f"chunk-{uuid.uuid4().hex[:10]}"
        cursor.execute("""
            INSERT INTO document_chunks (id, document_id, course_id, chunk_index, page_number, chapter_title, heading, content)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (chunk_id, doc_id, course_id, idx, c.page_number, c.chapter, c.heading, c.content))

    conn.commit()
    conn.close()

    return {
        "id": doc_id,
        "course_id": course_id,
        "filename": file.filename,
        "page_count": page_count,
        "chunk_count": len(chunks),
        "doc_category": doc_category,
        "summary": summary
    }

@router.get("/search")
def search_materials(course_id: str, query: str, top_k: int = 5):
    hits = RAGEngine.search_course_materials(course_id, query, top_k=top_k)
    return {"course_id": course_id, "query": query, "hits": hits}

@router.get("/cross-reference")
def cross_reference(course_id: str, topic: str):
    res = RAGEngine.cross_reference_topic(course_id, topic)
    return res

@router.delete("/{doc_id}")
def delete_document(doc_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT file_path FROM documents WHERE id = ?", (doc_id,))
    row = cursor.fetchone()
    if row and os.path.exists(row["file_path"]):
        try:
            os.remove(row["file_path"])
        except Exception:
            pass
    cursor.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    conn.commit()
    conn.close()
    return {"success": True}
