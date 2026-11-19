import sqlite3
import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from app.core.config import settings

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Courses
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT DEFAULT 'Engineering',
        subject_code TEXT,
        icon TEXT DEFAULT 'GraduationCap',
        color TEXT DEFAULT '#3b82f6',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # Documents
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        page_count INTEGER DEFAULT 1,
        doc_category TEXT DEFAULT 'lecture_notes', -- 'lecture_notes', 'textbook', 'syllabus', 'exam_paper'
        summary TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )
    """)
    
    # Document Chunks for Retrieval & Citations
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS document_chunks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        page_number INTEGER NOT NULL,
        chapter_title TEXT,
        heading TEXT,
        content TEXT NOT NULL,
        keywords TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )
    """)
    
    # Conversations / Chat Sessions
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        title TEXT NOT NULL,
        mode TEXT DEFAULT 'zero', -- 'zero', 'deepdive', 'guided', 'socratic', 'exam_prep'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )
    """)
    
    # Messages
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL, -- 'user', 'assistant'
        content TEXT NOT NULL,
        mode TEXT,
        citations TEXT, -- JSON array of citation objects
        math_steps TEXT, -- JSON array of mathematical derivation steps
        pedagogical_meta TEXT, -- JSON object: { concept, prerequisites, next_check }
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )
    """)
    
    # Mathematical & Engineering Problem Solvers
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS problem_solutions (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        problem_text TEXT NOT NULL,
        image_path TEXT,
        category TEXT DEFAULT 'calculus', -- 'calculus', 'mechanics', 'thermodynamics', etc.
        given TEXT,
        to_find TEXT,
        assumptions TEXT,
        formulas_used TEXT,
        steps_json TEXT NOT NULL,
        sympy_result TEXT,
        dimension_check TEXT,
        verification_status TEXT DEFAULT 'verified',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )
    """)
    
    # Assessments & Quizzes
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS assessments (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        title TEXT NOT NULL,
        topic TEXT NOT NULL,
        difficulty TEXT DEFAULT 'intermediate', -- 'beginner', 'basic', 'intermediate', 'advanced', 'exam'
        questions_json TEXT NOT NULL,
        answers_json TEXT,
        score REAL DEFAULT 0,
        total_points REAL DEFAULT 0,
        feedback_json TEXT,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )
    """)
    
    # Knowledge Mastery Tracking (Evidence-Based)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS mastery_records (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        topic TEXT NOT NULL,
        mastery_score REAL DEFAULT 0.0, -- 0.0 to 100.0
        total_attempts INTEGER DEFAULT 0,
        correct_attempts INTEGER DEFAULT 0,
        last_practiced TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        misconceptions_json TEXT DEFAULT '[]',
        prerequisites_json TEXT DEFAULT '[]',
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        UNIQUE(course_id, topic)
    )
    """)
    
    # Study Plans & Spaced Repetition
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS study_plans (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        title TEXT NOT NULL,
        exam_date TEXT,
        target_goal TEXT,
        topics_json TEXT NOT NULL,
        schedule_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )
    """)
    
    # Notes, Bookmarks & Revision Sheets
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT DEFAULT '[]',
        is_bookmark INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )
    """)
    
    # App Settings & Provider Config
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)
    
    # Seed default sample course if empty
    cursor.execute("SELECT COUNT(*) FROM courses")
    if cursor.fetchone()[0] == 0:
        seed_sample_data(cursor)
        
    conn.commit()
    conn.close()

def seed_sample_data(cursor: sqlite3.Cursor):
    now = datetime.utcnow().isoformat()
    # 1. Engineering Mechanics & Dynamics
    cursor.execute("""
    INSERT INTO courses (id, title, description, category, subject_code, icon, color, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "course-mech-101",
        "Engineering Mechanics & Dynamics",
        "Rigid body dynamics, kinetics, work-energy principles, impulse-momentum, and Newtonian kinematics.",
        "Mechanical Engineering",
        "ME-201",
        "Cpu",
        "#2563eb",
        now
    ))
    
    # 2. Engineering Mathematics & Calculus
    cursor.execute("""
    INSERT INTO courses (id, title, description, category, subject_code, icon, color, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "course-math-201",
        "Engineering Mathematics & Calculus",
        "Differential equations, multivariate calculus, linear algebra, Laplace transforms, and vector calculus.",
        "Mathematics",
        "MATH-301",
        "Sigma",
        "#7c3aed",
        now
    ))
    
    # 3. Thermodynamics & Heat Transfer
    cursor.execute("""
    INSERT INTO courses (id, title, description, category, subject_code, icon, color, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "course-thermo-301",
        "Thermodynamics & Energy Systems",
        "First & Second laws, Carnot & Rankine cycles, entropy generation, ideal gas mixtures, and heat transfer.",
        "Thermal Engineering",
        "ME-303",
        "Flame",
        "#ea580c",
        now
    ))
    
    # Add initial mastery baselines
    topics_mech = [
        ("Newton's Laws of Motion", 85.0, 12, 10, ["Sign error in normal force components on slope"]),
        ("Kinematics of Particles", 70.0, 10, 7, ["Confusing instantaneous velocity with average speed"]),
        ("Work and Kinetic Energy", 55.0, 8, 4, ["Neglecting non-conservative friction work"]),
        ("Planar Rigid Body Motion", 35.0, 6, 2, ["Instantaneous center of zero velocity identification"])
    ]
    for topic, score, att, corr, misc in topics_mech:
        cursor.execute("""
        INSERT INTO mastery_records (id, course_id, topic, mastery_score, total_attempts, correct_attempts, misconceptions_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            f"m-{abs(hash(topic)) % 1000000}",
            "course-mech-101",
            topic,
            score,
            att,
            corr,
            json.dumps(misc)
        ))
