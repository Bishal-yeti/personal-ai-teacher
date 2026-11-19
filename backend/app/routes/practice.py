import uuid
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.database import get_connection
from app.services.mastery_engine import MasteryEngine

router = APIRouter(prefix="/practice", tags=["Practice & Assessment"])

class QuizGenerateRequest(BaseModel):
    course_id: str
    topic: str
    difficulty: Optional[str] = "intermediate" # 'beginner', 'intermediate', 'advanced', 'exam'

class QuizSubmitRequest(BaseModel):
    assessment_id: str
    answers: Dict[str, Any] # { "q1": "B", "q2": "..." }

# Academic question bank by topic & difficulty
QUESTION_BANK = {
    "Newton's Laws of Motion": [
        {
            "id": "q1",
            "type": "multiple_choice",
            "question": "A 5 kg block rests on a 30° frictionless incline. What is the component of the gravitational force pulling the block down the incline? (g = 9.81 m/s²)",
            "options": [
                {"key": "A", "text": "42.5 N"},
                {"key": "B", "text": "24.5 N"},
                {"key": "C", "text": "49.0 N"},
                {"key": "D", "text": "12.3 N"}
            ],
            "correct_key": "B",
            "explanation": "The component of weight parallel to the incline is W_parallel = m · g · sin(θ) = 5 × 9.81 × sin(30°) = 5 × 9.81 × 0.5 = 24.525 N ≈ 24.5 N.",
            "misconception_if_wrong": "Used cos(θ) instead of sin(θ) for parallel incline component."
        },
        {
            "id": "q2",
            "type": "multiple_choice",
            "question": "According to Newton's Third Law, if object A exerts a force on object B, why don't the action and reaction forces cancel each other out?",
            "options": [
                {"key": "A", "text": "Because they act on two different bodies."},
                {"key": "B", "text": "Because one force occurs slightly after the other."},
                {"key": "C", "text": "Because one force is always friction."},
                {"key": "D", "text": "Because their magnitudes are not actually equal."}
            ],
            "correct_key": "A",
            "explanation": "Action and reaction forces act on distinct physical systems (A on B, and B on A). Forces can only cancel if they act on the same free-body boundary.",
            "misconception_if_wrong": "Misunderstanding internal vs external free-body boundaries."
        },
        {
            "id": "q3",
            "type": "numerical",
            "question": "A 1000 kg vehicle accelerates uniformly from rest to 20 m/s in 5 seconds on a flat road. Calculate the required net horizontal thrust force in Newtons.",
            "correct_value": 4000.0,
            "tolerance": 50.0,
            "unit": "N",
            "explanation": "Acceleration a = (v - v0)/t = (20 - 0)/5 = 4 m/s². By Newton's Second Law, F_net = m · a = 1000 kg × 4 m/s² = 4000 N.",
            "misconception_if_wrong": "Arithmetic or failure to compute acceleration derivative first."
        }
    ],
    "Kinematics of Particles": [
        {
            "id": "q1",
            "type": "multiple_choice",
            "question": "A projectile is launched with velocity v0 at angle θ above horizontal. Neglecting aerodynamic drag, which quantity remains constant throughout the entire trajectory?",
            "options": [
                {"key": "A", "text": "Total velocity vector v(t)"},
                {"key": "B", "text": "Horizontal velocity component v_x"},
                {"key": "C", "text": "Vertical velocity component v_y"},
                {"key": "D", "text": "Kinetic energy"}
            ],
            "correct_key": "B",
            "explanation": "Because no horizontal forces act on the particle (a_x = 0), the horizontal component v_x = v0 · cos(θ) is constant.",
            "misconception_if_wrong": "Confusing scalar speed with directional velocity vectors."
        },
        {
            "id": "q2",
            "type": "numerical",
            "question": "A ball is dropped from a height of 45 meters with zero initial velocity. How many seconds does it take to reach the ground? (Use g = 10 m/s²)",
            "correct_value": 3.0,
            "tolerance": 0.1,
            "unit": "s",
            "explanation": "y = (1/2)gt² => 45 = 0.5 × 10 × t² => 45 = 5t² => t² = 9 => t = 3.0 s.",
            "misconception_if_wrong": "Forgetting the factor of 1/2 in free-fall kinematics."
        }
    ],
    "Work and Kinetic Energy": [
        {
            "id": "q1",
            "type": "multiple_choice",
            "question": "The work-energy theorem states that the net work done by all forces acting on a particle is equal to the change in its:",
            "options": [
                {"key": "A", "text": "Linear momentum"},
                {"key": "B", "text": "Potential energy only"},
                {"key": "C", "text": "Kinetic energy (ΔT)"},
                {"key": "D", "text": "Total mechanical energy"}
            ],
            "correct_key": "C",
            "explanation": "W_net = ∫ F · dr = ΔT = (1/2)m(v2² - v1²). Net work on a particle always equals change in kinetic energy.",
            "misconception_if_wrong": "Confusing net work with conservative work."
        }
    ]
}

@router.post("/generate")
def generate_quiz(req: QuizGenerateRequest):
    topic = req.topic
    questions = QUESTION_BANK.get(topic)
    if not questions:
        # Default questions for any topic
        questions = [
            {
                "id": "q1",
                "type": "multiple_choice",
                "question": f"When analyzing {topic}, what is the primary fundamental conservation law typically applied?",
                "options": [
                    {"key": "A", "text": "Conservation of Energy and Momentum"},
                    {"key": "B", "text": "Archimedes' Buoyancy Principle"},
                    {"key": "C", "text": "Hooke's Elastic Limit Law"},
                    {"key": "D", "text": "Stefan-Boltzmann Radiation Law"}
                ],
                "correct_key": "A",
                "explanation": f"In {topic}, fundamental state equations are derived from conservation of energy, mass, or linear/angular momentum.",
                "misconception_if_wrong": "Misidentifying foundational conservation principle."
            },
            {
                "id": "q2",
                "type": "numerical",
                "question": f"For a standard unit test in {topic}, evaluate the dimensionless ratio when parameter α = 4.0 and β = 2.0 (Calculate α / β):",
                "correct_value": 2.0,
                "tolerance": 0.05,
                "unit": "dimensionless",
                "explanation": "Ratio = 4.0 / 2.0 = 2.0.",
                "misconception_if_wrong": "Ratio inversion error."
            }
        ]

    assessment_id = f"quiz-{uuid.uuid4().hex[:8]}"
    title = f"{topic} Mastery Check ({req.difficulty.capitalize()})"
    now = datetime.utcnow().isoformat()

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO assessments (id, course_id, title, topic, difficulty, questions_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (assessment_id, req.course_id, title, topic, req.difficulty, json.dumps(questions), now))
    conn.commit()
    conn.close()

    # Strip answer keys before returning to student client
    sanitized_questions = []
    for q in questions:
        q_copy = dict(q)
        q_copy.pop("correct_key", None)
        q_copy.pop("correct_value", None)
        sanitized_questions.append(q_copy)

    return {
        "assessment_id": assessment_id,
        "course_id": req.course_id,
        "title": title,
        "topic": topic,
        "difficulty": req.difficulty,
        "questions": sanitized_questions
    }

@router.post("/submit")
def submit_quiz(sub: QuizSubmitRequest):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM assessments WHERE id = ?", (sub.assessment_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Assessment not found")

    questions = json.loads(row["questions_json"])
    total_pts = len(questions)
    score = 0.0
    feedback = []

    for q in questions:
        qid = q["id"]
        user_ans = sub.answers.get(qid)
        is_correct = False
        misc = None

        if q["type"] == "multiple_choice":
            if user_ans == q["correct_key"]:
                is_correct = True
                score += 1.0
            else:
                misc = q.get("misconception_if_wrong")
        elif q["type"] == "numerical":
            try:
                val = float(user_ans)
                target = float(q["correct_value"])
                tol = float(q.get("tolerance", 0.05))
                if abs(val - target) <= tol:
                    is_correct = True
                    score += 1.0
                else:
                    misc = q.get("misconception_if_wrong")
            except (ValueError, TypeError):
                misc = "Invalid numerical input."

        feedback.append({
            "question_id": qid,
            "is_correct": is_correct,
            "user_answer": user_ans,
            "correct_answer": q.get("correct_key") or q.get("correct_value"),
            "explanation": q.get("explanation", ""),
            "misconception": misc
        })

        # Update evidence-based mastery engine for this topic!
        MasteryEngine.record_assessment_result(
            course_id=row["course_id"],
            topic=row["topic"],
            is_correct=is_correct,
            detected_misconception=misc
        )

    now = datetime.utcnow().isoformat()
    cursor.execute("""
        UPDATE assessments
        SET answers_json = ?, score = ?, total_points = ?, feedback_json = ?, completed_at = ?
        WHERE id = ?
    """, (json.dumps(sub.answers), score, total_pts, json.dumps(feedback), now, sub.assessment_id))
    conn.commit()
    conn.close()

    percentage = round((score / total_pts) * 100, 1)

    return {
        "assessment_id": sub.assessment_id,
        "score": score,
        "total_points": total_pts,
        "percentage": percentage,
        "feedback": feedback,
        "mastery_updated": True
    }
