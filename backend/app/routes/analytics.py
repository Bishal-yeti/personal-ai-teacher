import uuid
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.database import get_connection
from app.services.mastery_engine import MasteryEngine

router = APIRouter(prefix="/analytics", tags=["Analytics & Mastery"])

class StudyPlanCreate(BaseModel):
    course_id: str
    title: str
    exam_date: str
    target_goal: Optional[str] = "Score >= 90% on University Final"
    selected_topics: List[str]

@router.get("/mastery/{course_id}")
def get_mastery(course_id: str):
    records = MasteryEngine.get_course_mastery(course_id)
    overall_mastery = sum(r["mastery_score"] for r in records) / max(1, len(records)) if records else 0.0
    weak_topics = [r for r in records if r["mastery_score"] < 65.0]
    mastered_topics = [r for r in records if r["mastery_score"] >= 80.0]

    return {
        "course_id": course_id,
        "overall_mastery": round(overall_mastery, 1),
        "total_topics_tracked": len(records),
        "weak_topics": weak_topics,
        "mastered_topics": mastered_topics,
        "records": records
    }

@router.post("/mastery/reset/{course_id}")
def reset_mastery(course_id: str):
    MasteryEngine.reset_course_mastery(course_id)
    return {"success": True, "message": "Mastery records have been reset."}

@router.get("/study-plans/{course_id}")
def get_study_plans(course_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM study_plans WHERE course_id = ? ORDER BY created_at DESC", (course_id,))
    rows = cursor.fetchall()
    conn.close()

    plans = []
    for r in rows:
        d = dict(r)
        d["topics"] = json.loads(d["topics_json"]) if d["topics_json"] else []
        d["schedule"] = json.loads(d["schedule_json"]) if d["schedule_json"] else []
        plans.append(d)
    return plans

@router.post("/study-plans")
def create_study_plan(plan: StudyPlanCreate):
    # Generate spaced repetition schedule
    today = datetime.now()
    schedule = []
    interval_days = [1, 3, 7, 14]

    for idx, topic in enumerate(plan.selected_topics):
        for rep_idx, days in enumerate(interval_days):
            session_date = today + timedelta(days=idx*2 + days)
            schedule.append({
                "id": f"s-{uuid.uuid4().hex[:6]}",
                "topic": topic,
                "repetition": rep_idx + 1,
                "date": session_date.strftime("%Y-%m-%d"),
                "status": "pending",
                "session_type": "Concept Review" if rep_idx == 0 else ("Practice Problems" if rep_idx < 3 else "Timed Mock Test")
            })

    schedule.sort(key=lambda s: s["date"])

    plan_id = f"plan-{uuid.uuid4().hex[:8]}"
    now = datetime.utcnow().isoformat()

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO study_plans (id, course_id, title, exam_date, target_goal, topics_json, schedule_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (plan_id, plan.course_id, plan.title, plan.exam_date, plan.target_goal, json.dumps(plan.selected_topics), json.dumps(schedule), now))
    conn.commit()
    conn.close()

    return {
        "id": plan_id,
        "course_id": plan.course_id,
        "title": plan.title,
        "exam_date": plan.exam_date,
        "target_goal": plan.target_goal,
        "topics": plan.selected_topics,
        "schedule": schedule
    }
