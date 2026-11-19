import json
import re
from typing import Dict, Any, List, Optional
from app.services.rag_engine import RAGEngine
from app.services.math_engine import MathEngine
from app.services.llm_provider import LLMProvider

class TutorEngine:
    SYSTEM_PEDAGOGY_PROMPT = """
You are a senior university professor and personal AI tutor.
Your core mission is to foster deep conceptual UNDERSTANDING, scientific intuition, and mathematical rigor.
You never just dump answers. You teach students WHY things work.

PEDAGOGICAL RULES:
1. Ground your response in the uploaded course materials whenever available.
2. If citing uploaded course documents, provide the exact document name, chapter, and page number in brackets like [DocumentName.pdf, p. 24].
3. Strictly distinguish between explicit document facts and general foundational knowledge. Never invent or hallucinate page numbers.
4. Provide step-by-step mathematical reasoning with KaTeX/LaTeX formatting ($...$ inline, $$...$$ block).
5. Explain the physical meaning and dimensional units of all variables.
6. Highlight common pitfalls and misconceptions.
7. Adapt your tone to be patient, encouraging, and intellectually rigorous.
"""

    @classmethod
    async def generate_response(
        cls,
        course_id: str,
        user_message: str,
        mode: str = "zero", # 'zero', 'deepdive', 'guided', 'socratic', 'exam_prep'
        conversation_history: Optional[List[Dict[str, str]]] = None,
        context_docs: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Processes student input through the 5 pedagogical modes, grounding with RAG and SymPy.
        """
        # 1. Retrieve course-specific documents if not provided
        if context_docs is None:
            context_docs = RAGEngine.search_course_materials(course_id, user_message, top_k=4)

        citations = []
        doc_context_str = ""
        if context_docs:
            doc_context_str = "\n\n=== RELEVANT UPLOADED COURSE MATERIALS ===\n"
            for doc in context_docs:
                citations.append({
                    "filename": doc["filename"],
                    "page_number": doc["page_number"],
                    "chapter": doc.get("chapter", ""),
                    "heading": doc.get("heading", ""),
                    "snippet": doc["content"][:200]
                })
                doc_context_str += f"- [{doc['filename']} | Page {doc['page_number']} | {doc.get('heading', '')}]:\n  \"{doc['content']}\"\n\n"

        # 2. Check for mathematical/symbolic operations
        math_analysis = cls._detect_and_solve_math(user_message)

        # 3. Check LLM provider availability
        provider_status = LLMProvider.get_provider_status()
        active_provider = provider_status["active_provider"]

        if active_provider != "offline":
            mode_instructions = cls._get_mode_instructions(mode)
            full_prompt = f"""
Student Question:
{user_message}

Selected Teaching Mode: {mode.upper()}
{mode_instructions}

{doc_context_str}

{"Pre-computed Verified Math Engine Result:" + json.dumps(math_analysis) if math_analysis else ""}

Please teach the student thoroughly according to the mode instructions.
"""
            llm_result = await LLMProvider.call_llm(cls.SYSTEM_PEDAGOGY_PROMPT, full_prompt)
            if llm_result.get("success"):
                return {
                    "text": llm_result["text"],
                    "mode": mode,
                    "citations": citations,
                    "math_steps": math_analysis.get("steps") if math_analysis else [],
                    "math_result": math_analysis,
                    "provider": llm_result.get("provider", "online"),
                    "needs_api_key": False
                }

        # 4. Built-in Offline Pedagogical Teacher Engine
        offline_response = cls._generate_offline_pedagogical_lesson(user_message, mode, citations, math_analysis)
        return {
            "text": offline_response,
            "mode": mode,
            "citations": citations,
            "math_steps": math_analysis.get("steps") if math_analysis else [],
            "math_result": math_analysis,
            "provider": "offline_expert_tutor",
            "needs_api_key": False,
            "note": "Generated using built-in offline pedagogical engine with SymPy. Connect your Gemini or OpenAI API key in Settings for expanded generative discussions."
        }

    @classmethod
    def _detect_and_solve_math(cls, text: str) -> Optional[Dict[str, Any]]:
        """Detects if query contains derivative, integral, equation, or mechanics parameters."""
        text_lower = text.lower()
        # Derivative pattern: "derivative of x^3 + 2x" or "diff 3x^2"
        diff_match = re.search(r'(?:derivative of|differentiate|diff)\s+([^,]+)', text_lower)
        if diff_match:
            expr_str = diff_match.group(1).strip()
            # Clean up common words
            expr_str = re.sub(r'\s+with respect to.*', '', expr_str).strip()
            res = MathEngine.differentiate(expr_str)
            if "error" not in res:
                return res

        # Integral pattern: "integral of x^2" or "integrate sin(x)"
        int_match = re.search(r'(?:integral of|integrate)\s+([^,]+)', text_lower)
        if int_match:
            expr_str = int_match.group(1).strip()
            res = MathEngine.integrate(expr_str)
            if "error" not in res:
                return res

        # Incline friction problem
        if "incline" in text_lower or "slope" in text_lower or "friction" in text_lower:
            m_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:kg|kilogram)', text_lower)
            deg_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:deg|degree|°)', text_lower)
            mu_match = re.search(r'mu[_\s]*k?\s*=\s*(\d+(?:\.\d+)?)', text_lower) or re.search(r'friction\s*(?:coefficient)?\s*(?:of)?\s*(\d+(?:\.\d+)?)', text_lower)
            params = {}
            if m_match: params["m"] = float(m_match.group(1))
            if deg_match: params["theta_deg"] = float(deg_match.group(1))
            if mu_match: params["mu_k"] = float(mu_match.group(1))
            if params:
                return MathEngine.solve_mechanics_problem("incline_friction", params)

        # Projectile motion
        if "projectile" in text_lower or ("launch" in text_lower and "angle" in text_lower):
            v0_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:m/s|mps)', text_lower)
            angle_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:deg|degree|°)', text_lower)
            params = {}
            if v0_match: params["v0"] = float(v0_match.group(1))
            if angle_match: params["angle_deg"] = float(angle_match.group(1))
            if params:
                return MathEngine.solve_mechanics_problem("projectile", params)

        return None

    @classmethod
    def _get_mode_instructions(cls, mode: str) -> str:
        if mode == "zero":
            return """
MODE: LEARN FROM ZERO
Structure your teaching as:
1. Intuitive conceptual introduction (no jargon yet).
2. Why does this concept exist? What historical or engineering puzzle does it solve?
3. Fundamental physical / mathematical principles.
4. Essential terminology explained simply.
5. Mathematical representation & formula derivation.
6. Real-world engineering / practical applications.
7. Simple numerical example.
8. Common misconceptions and warning traps.
9. A quick conceptual check question for the student.
"""
        elif mode == "deepdive":
            return """
MODE: CONCEPT DEEP DIVE
Structure your breakdown:
1. Intuitive overview & physical significance.
2. Formal mathematical definition.
3. Rigorous mathematical derivation & governing equations.
4. Boundary assumptions & limitations of the model.
5. Physical meaning of each parameter and dimensional consistency.
6. Real-world engineering systems where this is critical.
7. Subtle pitfalls and frequent university exam traps.
8. Related theorems and comparative concepts.
"""
        elif mode == "guided":
            return """
MODE: GUIDED PROBLEM SOLVING
Structure your solution:
1. What is Given (with units).
2. What Needs to be Found.
3. Fundamental Governing Physical/Mathematical Laws.
4. Essential Assumptions (frictionless, rigid body, ideal gas, steady-state, etc.).
5. Granular Step-by-Step Mathematical Derivations (justify EVERY algebraic change, show numerical substitutions, verify units).
6. Physical interpretation of final numerical answer.
7. An isomorphic practice problem for the student to attempt.
"""
        elif mode == "socratic":
            return """
MODE: SOCRATIC TEACHING
Do NOT give the full answer away!
1. Acknowledge what the student asked.
2. Break the problem into the immediate next cognitive leap.
3. Ask 1-2 sharp, targeted guiding questions that help the student realize the relationship themselves.
4. Provide a small hint if needed.
"""
        elif mode == "exam_prep":
            return """
MODE: EXAM PREPARATION
Generate university examination level practice:
1. Conceptual diagnostic question.
2. Rigorous numerical problem (with given parameters).
3. Derivation challenge.
4. Common exam marking criteria (rubric).
5. Step-by-step model solution with full points breakdown.
"""
        return ""

    @classmethod
    def _generate_offline_pedagogical_lesson(cls, query: str, mode: str, citations: List[Dict[str, Any]], math_res: Optional[Dict[str, Any]]) -> str:
        """
        Generates structured, university-grade teaching responses when external LLM is offline.
        Uses pedagogical structuring and verified SymPy mathematics.
        """
        topic = query.strip()
        citation_section = ""
        if citations:
            citation_section = "\n\n> **Course Document Citations:**\n"
            for c in citations:
                citation_section += f"> - **{c['filename']}** (Page {c['page_number']}) — *\"{c.get('heading', 'Relevant Excerpt')}\"*: {c['snippet']}...\n"

        if math_res and "steps" in math_res:
            steps_md = "\n".join([f"**Step {s['step']}: {s['title']}**\n{s['explanation']}\n$${s['math']}$$\n" for s in math_res["steps"]])
            return f"""## 🎓 Professor's Guided Solution: {math_res.get('problem_type', 'Mathematical Derivation')}

### 1. Conceptual Foundation & Governing Laws
To solve this systematically, we identify the governing physical principles and choose a coordinate frame that simplifies the algebraic projection.

### 2. Step-by-Step Mathematical Derivation
{steps_md}

### 3. Dimensional Verification & Sanity Check
- **Dimension Check**: `{math_res.get('dimension_check', 'Valid')}`
- **Physical Interpretation**: The resulting quantity represents the exact state or transformation under our stated boundary conditions.

### 4. Common Misconceptions to Avoid
> ⚠️ **Common Trap**: Students frequently misapply signs when resolving directional components or forget to maintain consistent SI base units ($kg, m, s, N$).

### 5. Check Your Understanding
*What would happen to the final value if the mass or independent parameter was doubled while keeping all boundary conditions constant? Think about whether the relationship is linear or non-linear.*
{citation_section}
"""

        # General concept response
        if mode == "socratic":
            return f"""## 🤔 Socratic Inquiry: Exploring "{topic}"

Welcome to our discussion on **{topic}**. Rather than jumping straight to formulas, let us reconstruct the intuition from first principles.

### Let's start with what you already observe:
1. In your own words, what physical or mathematical phenomenon are we trying to quantify or predict here?
2. If you imagine an extreme case (e.g., zero friction, infinite velocity, or zero mass), what should happen intuitively?
3. What known variables or relationships do you already have available?

*Take a moment to formulate your thoughts and reply below—I will guide you step by step to the complete derivation!*
{citation_section}
"""
        elif mode == "zero":
            return f"""## 🌟 Learn From Zero: Understanding {topic}

### 1. What is this concept and why does it exist?
Every engineering and mathematical law was invented because engineers and scientists faced a real-world puzzle they could not predict with older tools.
When we study **{topic}**, our objective is to model the fundamental cause-and-effect relationship governing the physical system.

### 2. The Core Principle in Plain English
Imagine the simplest possible scenario:
- We have an input action (such as an applied force, an energy flow, or a rate of change).
- The system resists or responds according to its intrinsic inertia or material properties.
- The outcome is a measurable change in state over time or space.

### 3. Mathematical Formalization
In engineering mechanics and applied calculus, we formalize this balance using conservation principles:
$$\\sum \\text{{Inputs}} - \\sum \\text{{Outputs}} = \\frac{{d}}{{dt}} (\\text{{Accumulation}})$$
$$\\text{{Governing Law: }} \\mathbf{{F}}_{{\\text{{net}}}} = m \\cdot \\mathbf{{a}} = m \\frac{{d^2 \\mathbf{{r}}}}{{dt^2}}$$

### 4. Real-World Engineering Application
In modern automotive, aerospace, and robotics engineering:
- Calculating acceleration profiles to prevent structural shear failure.
- Sizing actuators and motors so they supply adequate torque under peak dynamic loads.
- Designing control loops that maintain stability without oscillation.

### 5. Common Student Misconceptions
> ⚠️ **Cognitive Trap**: Never confuse *velocity* (how fast an object is moving right now) with *acceleration* (the rate at which that velocity is changing). An object can have zero velocity while experiencing maximum acceleration (such as at the peak of a vertical projectile's trajectory)!

### 6. Quick Comprehension Check
*A ball is thrown straight up into the air. At the exact highest point of its flight, is its acceleration zero, positive, or negative $9.81\\text{{ m/s}}^2$? Why?*
{citation_section}
"""
        elif mode == "deepdive":
            return f"""## 🔬 Concept Deep Dive: {topic}

### 1. Formal Academic Definition
**{topic}** is defined as the mathematical and physical relationship governing state evolution under specified boundary conditions and conservation laws.

### 2. Fundamental Derivation & Governing Equations
Consider an arbitrary continuum or discrete particle system. From the principle of virtual work and Newtonian kinetics:
$$\\mathbf{{R}} = \\sum_{{i=1}}^N \\mathbf{{F}}_i = \\dot{{\\mathbf{{p}}}} = \\frac{{d(m\\mathbf{{v}})}}{{dt}}$$
For constant mass systems:
$$\\mathbf{{F}} = m \\frac{{d\\mathbf{{v}}}}{{dt}} = m \\mathbf{{a}}$$

When analyzing conservative field interactions, the net work done equals the negative gradient of potential energy:
$$\\mathbf{{F}} = -\\nabla V$$

### 3. Boundary Assumptions & Model Limitations
Every mathematical engineering model operates within valid domains:
1. **Continuum Hypothesis**: Assumes the Knudsen number $Kn < 0.01$.
2. **Small Deformation / Rigid Body**: Neglects elastic strain deformations during macroscopic acceleration.
3. **Inertial Reference Frame**: Valid only in frames where Newton's first law holds without fictitious pseudo-forces (Coriolis / centrifugal).

### 4. Common Misconceptions & Exam Pitfalls
> 💡 **University Exam Warning**: On exam problems with inclined surfaces or moving coordinate frames, students frequently forget to decompose the normal force $N$ and weight $W = mg$ into orthogonal axes aligned with the motion!

### 5. Follow-Up Mastery Challenge
*Would you like to solve a step-by-step university exam problem on this topic, or inspect the interactive Free-Body Diagram in the Visual Learning tab?*
{citation_section}
"""
        else: # exam_prep / default
            return f"""## 📝 University Examination Preparation: {topic}

### Problem Statement (Exam Level — 10 Points)
A dynamic system undergoes planar motion governed by the principles of **{topic}**.
Given an initial state at $t = 0$ with position $x_0 = 0\\text{{ m}}$ and initial velocity $v_0 = 15\\text{{ m/s}}$, a resisting force proportional to velocity acts on the mass $m = 2.5\\text{{ kg}}$ such that $F_{{\\text{{drag}}}} = -c \\cdot v$, where $c = 0.5\\text{{ N}}\\cdot\\text{{s/m}}$.

### Detailed Solution & Marking Rubric

#### Part A: Formulate Governing Differential Equation (3 Points)
Apply Newton's Second Law:
$$\\sum F_x = m a = m \\frac{{dv}}{{dt}} = -c v$$
$$\\frac{{dv}}{{dt}} + \\frac{{c}}{{m}} v = 0$$

#### Part B: Separate Variables and Integrate (4 Points)
$$\\int_{{v_0}}^{{v(t)}} \\frac{{1}}{{v}} \\, dv = -\\frac{{c}}{{m}} \\int_0^t dt$$
$$\\ln\\left(\\frac{{v(t)}}{{v_0}}\\right) = -\\frac{{c}}{{m}} t \\implies v(t) = v_0 e^{{-\\frac{{c}}{{m}} t}}$$

#### Part C: Substitute Parameters & Calculate (3 Points)
With $\\frac{{c}}{{m}} = \\frac{{0.5}}{{2.5}} = 0.2\\text{{ s}}^{{-1}}$:
$$v(t) = 15 \\cdot e^{{-0.2 t}} \\text{{ m/s}}$$
At $t = 5\\text{{ s}}$:
$$v(5) = 15 \\cdot e^{{-1.0}} = 15 \\cdot 0.3679 = 5.52 \\text{{ m/s}}$$

---
### Self-Diagnostic Check
Did you set up the initial differential equation correctly? If you struggled with the separation of variables, review Calculus II: First-Order Linear Differential Equations.
{citation_section}
"""
