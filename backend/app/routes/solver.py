import uuid
import json
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.database import get_connection
from app.services.math_engine import MathEngine

router = APIRouter(prefix="/solver", tags=["Problem Solver"])

class ProblemSolveRequest(BaseModel):
    course_id: str
    problem_type: str # 'algebra', 'differentiation', 'integration', 'mechanics_incline', 'mechanics_projectile'
    expression: Optional[str] = None
    variable: Optional[str] = "x"
    order: Optional[int] = 1
    lower_bound: Optional[str] = None
    upper_bound: Optional[str] = None
    mechanics_params: Optional[Dict[str, float]] = None

@router.post("/solve")
def solve_problem(req: ProblemSolveRequest):
    result = {}
    if req.problem_type == "algebra":
        if not req.expression:
            raise HTTPException(status_code=400, detail="Expression required")
        result = MathEngine.solve_algebraic_equation(req.expression, req.variable or "x")
    elif req.problem_type == "differentiation":
        if not req.expression:
            raise HTTPException(status_code=400, detail="Expression required")
        result = MathEngine.differentiate(req.expression, req.variable or "x", req.order or 1)
    elif req.problem_type == "integration":
        if not req.expression:
            raise HTTPException(status_code=400, detail="Expression required")
        result = MathEngine.integrate(req.expression, req.variable or "x", req.lower_bound, req.upper_bound)
    elif req.problem_type == "mechanics_incline":
        params = req.mechanics_params or {"m": 10.0, "theta_deg": 30.0, "mu_k": 0.2, "F_applied": 0.0}
        result = MathEngine.solve_mechanics_problem("incline_friction", params)
    elif req.problem_type == "mechanics_projectile":
        params = req.mechanics_params or {"v0": 25.0, "angle_deg": 45.0, "y0": 0.0}
        result = MathEngine.solve_mechanics_problem("projectile", params)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported problem type: {req.problem_type}")

    if "error" in result:
        raise HTTPException(status_code=422, detail=result["error"])

    # Persist problem solution
    conn = get_connection()
    cursor = conn.cursor()
    sol_id = f"sol-{uuid.uuid4().hex[:8]}"
    now = datetime.utcnow().isoformat()
    cursor.execute("""
        INSERT INTO problem_solutions (id, course_id, problem_text, category, steps_json, sympy_result, dimension_check, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        sol_id,
        req.course_id,
        req.expression or req.problem_type,
        req.problem_type,
        json.dumps(result.get("steps", [])),
        result.get("result_exact", ""),
        result.get("dimension_check", ""),
        now
    ))
    conn.commit()
    conn.close()

    result["solution_id"] = sol_id
    return result

@router.get("/history/{course_id}")
def get_solution_history(course_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM problem_solutions
        WHERE course_id = ?
        ORDER BY created_at DESC
        LIMIT 20
    """, (course_id,))
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        d = dict(r)
        d["steps"] = json.loads(d["steps_json"]) if d["steps_json"] else []
        results.append(d)
    return results
