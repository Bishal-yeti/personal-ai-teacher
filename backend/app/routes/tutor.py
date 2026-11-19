import uuid
import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.database import get_connection
from app.services.tutor_engine import TutorEngine

router = APIRouter(prefix="/tutor", tags=["Tutor"])

class ConversationCreate(BaseModel):
    course_id: str
    title: Optional[str] = "New Study Session"
    mode: Optional[str] = "zero"

class MessageSend(BaseModel):
    conversation_id: str
    content: str
    mode: Optional[str] = None

@router.get("/conversations/{course_id}")
def list_conversations(course_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT c.*, 
            (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
        FROM conversations c
        WHERE c.course_id = ?
        ORDER BY c.updated_at DESC
    """, (course_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@router.post("/conversations")
def create_conversation(conv: ConversationCreate):
    conn = get_connection()
    cursor = conn.cursor()
    conv_id = f"conv-{uuid.uuid4().hex[:8]}"
    now = datetime.utcnow().isoformat()
    cursor.execute("""
        INSERT INTO conversations (id, course_id, title, mode, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (conv_id, conv.course_id, conv.title, conv.mode, now, now))
    conn.commit()
    conn.close()
    return {"id": conv_id, **conv.dict(), "created_at": now, "updated_at": now}

@router.get("/conversations/{conversation_id}/messages")
def get_messages(conversation_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
    """, (conversation_id,))
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        d = dict(r)
        d["citations"] = json.loads(d["citations"]) if d["citations"] else []
        d["math_steps"] = json.loads(d["math_steps"]) if d["math_steps"] else []
        d["pedagogical_meta"] = json.loads(d["pedagogical_meta"]) if d["pedagogical_meta"] else {}
        result.append(d)
    return result

@router.post("/chat")
async def send_chat_message(msg: MessageSend):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT course_id, mode FROM conversations WHERE id = ?", (msg.conversation_id,))
    conv = cursor.fetchone()
    if not conv:
        conn.close()
        raise HTTPException(status_code=404, detail="Conversation not found")

    course_id = conv["course_id"]
    active_mode = msg.mode or conv["mode"] or "zero"

    # Save user message
    user_msg_id = f"msg-{uuid.uuid4().hex[:8]}"
    now = datetime.utcnow().isoformat()
    cursor.execute("""
        INSERT INTO messages (id, conversation_id, role, content, mode, created_at)
        VALUES (?, ?, 'user', ?, ?, ?)
    """, (user_msg_id, msg.conversation_id, msg.content, active_mode, now))
    conn.commit()

    # Fetch recent conversation history prior to this message
    cursor.execute("""
        SELECT role, content FROM messages
        WHERE conversation_id = ? AND id != ?
        ORDER BY created_at ASC
    """, (msg.conversation_id, user_msg_id))
    history = [dict(r) for r in cursor.fetchall()]

    # Generate teacher response
    response_data = await TutorEngine.generate_response(
        course_id=course_id,
        user_message=msg.content,
        mode=active_mode,
        conversation_history=history
    )


    assistant_msg_id = f"msg-{uuid.uuid4().hex[:8]}"
    now_asst = datetime.utcnow().isoformat()
    citations_json = json.dumps(response_data.get("citations", []))
    math_steps_json = json.dumps(response_data.get("math_steps", []))
    meta_json = json.dumps({
        "provider": response_data.get("provider", "local"),
        "needs_api_key": response_data.get("needs_api_key", False),
        "note": response_data.get("note", "")
    })

    cursor.execute("""
        INSERT INTO messages (id, conversation_id, role, content, mode, citations, math_steps, pedagogical_meta, created_at)
        VALUES (?, ?, 'assistant', ?, ?, ?, ?, ?, ?)
    """, (assistant_msg_id, msg.conversation_id, response_data["text"], active_mode, citations_json, math_steps_json, meta_json, now_asst))

    # Update conversation title if first message
    cursor.execute("SELECT COUNT(*) FROM messages WHERE conversation_id = ?", (msg.conversation_id,))
    if cursor.fetchone()[0] <= 2:
        new_title = msg.content[:35] + ("..." if len(msg.content) > 35 else "")
        cursor.execute("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?", (new_title, now_asst, msg.conversation_id))
    else:
        cursor.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now_asst, msg.conversation_id))

    conn.commit()
    conn.close()

    return {
        "id": assistant_msg_id,
        "conversation_id": msg.conversation_id,
        "role": "assistant",
        "content": response_data["text"],
        "mode": active_mode,
        "citations": response_data.get("citations", []),
        "math_steps": response_data.get("math_steps", []),
        "pedagogical_meta": json.loads(meta_json),
        "created_at": now_asst
    }
