import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.database import get_connection

router = APIRouter(prefix="/courses", tags=["Courses"])

class CourseCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    category: Optional[str] = "Engineering"
    subject_code: Optional[str] = ""
    icon: Optional[str] = "GraduationCap"
    color: Optional[str] = "#3b82f6"

@router.get("")
def list_courses():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.*, 
            (SELECT COUNT(*) FROM documents WHERE course_id = c.id) as document_count,
            (SELECT COUNT(*) FROM conversations WHERE course_id = c.id) as conversation_count,
            (SELECT COUNT(*) FROM notes WHERE course_id = c.id) as note_count
        FROM courses c
        ORDER BY c.created_at ASC
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@router.post("")
def create_course(course: CourseCreate):
    conn = get_connection()
    cursor = conn.cursor()
    course_id = f"course-{uuid.uuid4().hex[:8]}"
    cursor.execute("""
        INSERT INTO courses (id, title, description, category, subject_code, icon, color)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (course_id, course.title, course.description, course.category, course.subject_code, course.icon, course.color))
    conn.commit()
    conn.close()
    return {"id": course_id, **course.dict()}

@router.get("/{course_id}")
def get_course(course_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM courses WHERE id = ?", (course_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Course not found")
    return dict(row)

@router.delete("/{course_id}")
def delete_course(course_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM courses WHERE id = ?", (course_id,))
    conn.commit()
    conn.close()
    return {"success": True}
