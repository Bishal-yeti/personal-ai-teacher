# Personal AI Teacher — Intelligent Learning & Study Assistant

An intelligent, full-stack personal academic learning assistant engineered to teach students **WHY** concepts work rather than just giving answers. Functioning like a patient 24/7 university professor, the platform combines retrieval-augmented generation (RAG) across uploaded textbooks and lecture notes, symbolic and numerical mathematics via SymPy, dynamic interactive visual simulators, and evidence-based mastery tracking.

---

## 🌟 Key Features & Pedagogical Capabilities

### 1. The 10-Stage Pedagogy Loop ("Teach, Don't Just Answer")
Whenever a question or problem is submitted, the AI professor executes:
1. **Student Intent Parsing**: Identifies target academic level and inquiry goals.
2. **Concept Identification**: Maps inquiry to canonical subject taxonomy.
3. **Prerequisite Analysis**: Highlights required foundation concepts before proceeding.
4. **Intuitive Grounding**: Plain-English physical intuition and historical context.
5. **Method Selection Rationale**: Explains why a specific method/theorem is chosen.
6. **Detailed Step-by-Step Derivation**: Full algebraic transformations with KaTeX rendering.
7. **Step Reasoning**: Justifies every non-trivial transformation.
8. **Common Misconceptions**: Highlights frequent student traps and sign errors.
9. **Isomorphic Practice Problem**: Similar problem testing the exact same theorem.
10. **Comprehension Verification**: Targeted Socratic checks.

### 2. Five Dedicated Teaching Modes
- **Mode 1: Learn From Zero** — Assumes no prior knowledge. Builds from simple analogies to mathematical representations and engineering applications.
- **Mode 2: Concept Deep Dive** — Formal academic definition, derivations, boundary assumptions, and physical interpretations.
- **Mode 3: Guided Problem Solving** — Structured breakdown: Given $\to$ Find $\to$ Assumptions $\to$ Equations $\to$ Steps $\to$ Units & Dimension Check.
- **Mode 4: Socratic Teaching** — Asks guiding questions rather than immediately revealing the solution.
- **Mode 5: Exam Preparation** — University final exam level problems, marking rubrics, and point breakdowns.

### 3. Document Intelligence & Knowledge Vault
- **Multi-Format Extraction**: PDF (PyMuPDF `fitz`), DOCX (`python-docx`), PPTX (`python-pptx`), TXT, Markdown, and CSV/Excel (`openpyxl`).
- **Course Isolation**: Notes and textbooks are strictly isolated per course to prevent cross-subject contamination.
- **Provenance & Citations**: Verifiable citations with original filenames, page numbers, and chapter headings. Zero hallucinated pages.
- **Cross-Source Comparator**: Compares lecture notes against primary reference textbooks to highlight terminology and convention differences.

### 4. Mathematical & Engineering Problem Solver
- **SymPy Symbolic Engine**: Solves algebraic systems, calculus (derivatives, definite/indefinite integrals), differential equations, and kinetics.
- **No LLM Arithmetic Guessing**: All mathematical derivations are verified programmatically.
- **Dimensional Consistency**: Performs dimensional analysis checks (e.g. $[N] = [kg]\cdot[m/s^2]$).

### 5. Interactive Visual Learning
- **Free-Body Diagram (FBD)**: Real-time HTML5 Canvas rendering of inclined plane with adjustable angle, mass, friction coefficient $\mu_k$, and applied thrust.
- **2D Projectile Kinematics**: Dynamic trajectory simulation ($x(t), y(t)$) with apex, time of flight, and range calculations.
- **Thermodynamic Carnot Cycle**: Interactive P-V state calculations and theoretical thermal efficiency.

### 6. Evidence-Based Mastery Profile & Memory
- Mastery percentages ($0-100\%$) calculated exclusively from actual student quiz submissions and solved problem steps.
- Misconceptions inventory tracking recurring student traps.
- Spaced repetition study planner (1-day, 3-day, 7-day, 14-day intervals).
- Full profile inspection and reset capability.

### 7. AI Model Abstraction
- Supports **Google Gemini**, **OpenAI GPT-4o**, **Groq (Llama 3.3)**, and **Anthropic Claude**.
- Built-in **Offline Educational Tutor Engine** powered by SymPy and BM25 RAG for instant out-of-the-box operation without requiring an external API key.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.11, FastAPI, Uvicorn, SQLite, SymPy, PyMuPDF, python-docx, python-pptx, openpyxl, httpx, pydantic.
- **Frontend**: Vite, React 18, TypeScript, Tailwind CSS, KaTeX (mathematical rendering), Lucide Icons, Recharts, HTML5 Canvas.
- **Storage**: Persistent SQLite (`data/teacher.db`) and secure uploaded files vault (`data/uploads/`).

---

## 🚀 Running the Application

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 2. Start the Backend & Frontend
Both servers run seamlessly:

```bash
# Activate virtual environment
source /home/antigravity/venv/bin/activate

# 1. Start FastAPI Backend (with static frontend bundle mounted)
PYTHONPATH=/home/antigravity/backend uvicorn app.main:app --host 0.0.0.0 --port 8000

# 2. (Optional) Run Vite Dev Server for frontend development
cd /home/antigravity/frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

- Web Application URL: `http://localhost:8000` (or `http://localhost:5173`)
- API Documentation (Swagger / OpenAPI): `http://localhost:8000/docs`

---

## 🔒 Security & Privacy

1. Uploaded student materials are stored locally in isolated course directories.
2. Document text is sanitized before indexing and treated as untrusted academic data.
3. API keys are stored securely in local SQLite database settings and never exposed to the client.
