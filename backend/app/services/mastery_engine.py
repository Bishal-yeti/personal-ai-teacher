import json
import sqlite3
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.core.database import get_connection

class MasteryEngine:
    @staticmethod
    def get_course_mastery(course_id: str) -> List[Dict[str, Any]]:
        """Returns evidence-based mastery records for a course."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, topic, mastery_score, total_attempts, correct_attempts, last_practiced, misconceptions_json
            FROM mastery_records
            WHERE course_id = ?
            ORDER BY mastery_score ASC
        """, (course_id,))
        rows = cursor.fetchall()
        conn.close()

        records = []
        for r in rows:
            misconceptions = []
            try:
                misconceptions = json.loads(r["misconceptions_json"] or "[]")
            except Exception:
                pass

            records.append({
                "id": r["id"],
                "topic": r["topic"],
                "mastery_score": round(r["mastery_score"], 1),
                "total_attempts": r["total_attempts"],
                "correct_attempts": r["correct_attempts"],
                "last_practiced": r["last_practiced"],
                "misconceptions": misconceptions,
                "needs_revision": r["mastery_score"] < 60.0
            })
        return records

    @staticmethod
    def record_assessment_result(course_id: str, topic: str, is_correct: bool, score_delta: float = 10.0, detected_misconception: Optional[str] = None):
        """
        Updates genuine mastery score based on actual assessment submission.
        Uses exponential moving average / Bayesian evidence weighting.
        """
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT id, mastery_score, total_attempts, correct_attempts, misconceptions_json FROM mastery_records WHERE course_id = ? AND topic = ?", (course_id, topic))
        row = cursor.fetchone()

        now = datetime.utcnow().isoformat()

        if row:
            rec_id = row["id"]
            current_score = row["mastery_score"]
            total_attempts = row["total_attempts"] + 1
            correct_attempts = row["correct_attempts"] + (1 if is_correct else 0)

            # Update score: increase on correct, decrease / slight penalty on wrong
            if is_correct:
                new_score = min(100.0, current_score + (100.0 - current_score) * 0.15)
            else:
                new_score = max(0.0, current_score - current_score * 0.15)

            misconceptions = []
            try:
                misconceptions = json.loads(row["misconceptions_json"] or "[]")
            except Exception:
                pass

            if detected_misconception and detected_misconception not in misconceptions:
                misconceptions.append(detected_misconception)

            cursor.execute("""
                UPDATE mastery_records
                SET mastery_score = ?, total_attempts = ?, correct_attempts = ?, last_practiced = ?, misconceptions_json = ?
                WHERE id = ?
            """, (new_score, total_attempts, correct_attempts, now, json.dumps(misconceptions), rec_id))
        else:
            rec_id = f"m-{abs(hash(topic)) % 1000000}"
            initial_score = 75.0 if is_correct else 35.0
            total_attempts = 1
            correct_attempts = 1 if is_correct else 0
            misconceptions = [detected_misconception] if detected_misconception else []

            cursor.execute("""
                INSERT INTO mastery_records (id, course_id, topic, mastery_score, total_attempts, correct_attempts, last_practiced, misconceptions_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (rec_id, course_id, topic, initial_score, total_attempts, correct_attempts, now, json.dumps(misconceptions)))

        conn.commit()
        conn.close()

    @staticmethod
    def reset_course_mastery(course_id: str):
        """Resets mastery stats for a course so student can restart evaluation."""
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM mastery_records WHERE course_id = ?", (course_id,))
        conn.commit()
        conn.close()
