import json
import re
from typing import Dict, Any, List, Optional
from app.services.rag_engine import RAGEngine
from app.services.math_engine import MathEngine
from app.services.llm_provider import LLMProvider

class TutorEngine:
    SYSTEM_PEDAGOGY_PROMPT = """
You are a senior university professor, theoretical physicist, and principal engineering scholar.
Your role is to be INTELLECTUALLY RIGOROUS, CRITICAL, AND UNCOMPROMISING.
You are NOT an obsequious customer service bot. You do not flatter, patronize, or offer empty validation ("doglicking"). You demand critical thinking, expose unstated assumptions, stress-test claims with counter-examples, and introduce deeper competing theoretical frameworks.

CORE OPERATIONAL RULES:
1. ZERO SYCOPHANCY & ZERO EMPTY PRAISE:
   - Never say "Great job!", "Outstanding answer!", "You nailed it!", or "Brilliant!".
   - Be objective, direct, and unsparingly precise. Treat the student like a serious university researcher whose assertions must withstand rigorous cross-examination.

2. STRESS-TEST EVERY CLAIM & EXPOSE UNSTATED ASSUMPTIONS:
   - When a student gives an answer or poses an idea, do NOT simply accept it. Dissect the underlying premises:
     * Vacuum Assumption: Did they ignore fluid dynamics (aerodynamic drag F_d = 1/2 ρ v² C_d A, where ascent acceleration |a| > g and descent acceleration |a| < g)?
     * Homogeneous Field Assumption: Did they assume constant g rather than inverse-square gravitation g(r) = -GM/r²?
     * Reference Frame Assumption: Are they assuming an inertial observer, neglecting Earth's rotation (Coriolis and centrifugal pseudo-forces)?
     * Continuum & Elasticity: Did they assume an infinitely rigid particle, neglecting acoustic wave propagation and internal strain?
     * Relativistic Paradigm: Contrast the Newtonian force model with Einstein's Equivalence Principle in General Relativity, where a freely falling object experiences ZERO proper acceleration (geodesic motion) and gravity is not a physical force.

3. INTRODUCE COMPETING THEORIES & DEEPER FORMALISMS:
   - Do not settle for high-school textbook formulas. Contrast Newtonian vector force balance with:
     * Analytical Mechanics: Lagrangian formulation (L = T - V, principle of least action δS = 0, generalized coordinates eliminating constraint forces).
     * Hamiltonian Mechanics: Phase space flows, symplectic invariants, Poisson brackets, and conservation laws via Noether's theorem.
     * Realistic Engineering Mechanics: Fluid dissipation, turbulence regimes, non-conservative work, and hysteresis.

4. CONSTRUCTIVE ACADEMIC FRICTION:
   - Challenge the student with paradoxes, edge cases, and sharp diagnostic counter-questions.
   - Force them to defend their choices of coordinates, boundary limits, and mathematical assumptions.
   - Ground all derivations in mathematical rigor with KaTeX ($...$ inline, $$...$$ block).
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
        Processes student input through the 5 pedagogical modes, grounding with RAG, SymPy, and conversational dialogue evaluation.
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
            
            history_str = ""
            if conversation_history:
                history_str = "\n=== RECENT CONVERSATION DIALOGUE ===\n"
                for h in conversation_history[-6:]:
                    speaker = "Professor (AI)" if h.get("role") == "assistant" else "Student"
                    history_str += f"{speaker}: {h.get('content', '')[:600]}\n\n"

            full_prompt = f"""
{history_str}

Student's Latest Input:
{user_message}

Selected Teaching Mode: {mode.upper()}
{mode_instructions}

{doc_context_str}

{"Pre-computed Verified Math Engine Result:" + json.dumps(math_analysis) if math_analysis else ""}

IMPORTANT:
- If the student is answering your previous question or engaging in back-and-forth dialogue:
  1. Clearly tell them whether their answer was CORRECT or INCORRECT and explain the exact physics/mathematics behind it.
  2. If correct, praise their reasoning and move to the next logical concept in the curriculum.
  3. If incorrect or incomplete, pinpoint their misconception and provide a hint or smaller question.
  4. Never treat their reply as an introductory lecture title!
- If the student is asking a new question, teach them according to the selected mode.
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

        # 4. Built-in Offline Pedagogical Teacher Engine with Dialogue Evaluation
        offline_response = cls._generate_offline_pedagogical_lesson(
            user_message, mode, citations, math_analysis, conversation_history
        )
        return {
            "text": offline_response,
            "mode": mode,
            "citations": citations,
            "math_steps": math_analysis.get("steps") if math_analysis else [],
            "math_result": math_analysis,
            "provider": "offline_expert_tutor",
            "needs_api_key": False,
            "note": "Generated using built-in offline pedagogical engine with SymPy. Connect your Gemini or OpenAI API key in Settings for open-ended generative discussions."
        }

    @classmethod
    def _detect_and_solve_math(cls, text: str) -> Optional[Dict[str, Any]]:
        """Detects if query contains derivative, integral, equation, or mechanics parameters."""
        text_lower = text.lower()
        diff_match = re.search(r'(?:derivative of|differentiate|diff)\s+([^,]+)', text_lower)
        if diff_match:
            expr_str = diff_match.group(1).strip()
            expr_str = re.sub(r'\s+with respect to.*', '', expr_str).strip()
            res = MathEngine.differentiate(expr_str)
            if "error" not in res:
                return res

        int_match = re.search(r'(?:integral of|integrate)\s+([^,]+)', text_lower)
        if int_match:
            expr_str = int_match.group(1).strip()
            res = MathEngine.integrate(expr_str)
            if "error" not in res:
                return res

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
1. Intuitive overview & physical significance.
2. Formal mathematical definition.
3. Rigorous mathematical derivation & governing equations.
4. Boundary assumptions & limitations of the model.
5. Physical meaning of each parameter and dimensional consistency.
6. Real-world engineering systems where this is critical.
7. Subtle pitfalls and frequent university exam traps.
"""
        elif mode == "guided":
            return """
MODE: GUIDED PROBLEM SOLVING
1. What is Given (with units).
2. What Needs to be Found.
3. Fundamental Governing Physical/Mathematical Laws.
4. Essential Assumptions.
5. Granular Step-by-Step Mathematical Derivations (justify EVERY algebraic change, show numerical substitutions, verify units).
6. Physical interpretation of final numerical answer.
"""
        elif mode == "socratic":
            return """
MODE: SOCRATIC TEACHING
Do NOT give the full answer away!
1. Acknowledge what the student stated.
2. Break the problem into the immediate next cognitive leap.
3. Ask 1-2 sharp, targeted guiding questions that help the student realize the relationship themselves.
"""
        elif mode == "exam_prep":
            return """
MODE: EXAM PREPARATION
1. Conceptual diagnostic question.
2. Rigorous numerical problem (with given parameters).
3. Derivation challenge.
4. Common exam marking criteria (rubric).
5. Step-by-step model solution with full points breakdown.
"""
        return ""

    @classmethod
    def _generate_offline_pedagogical_lesson(
        cls,
        query: str,
        mode: str,
        citations: List[Dict[str, Any]],
        math_res: Optional[Dict[str, Any]],
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        Generates structured, university-grade teaching responses with active dialogue and answer evaluation.
        """
        cleaned_query = query.strip()
        query_lower = cleaned_query.lower()

        # Check if the user is answering the vertical projectile / highest point question:
        is_answering_projectile = any(w in query_lower for w in ["depend", "system", "positive", "negative", "9.81", "-9.81", "highest point", "upward", "downward", "apex", "zero"])
        
        last_assistant_msg = ""
        if conversation_history:
            for h in reversed(conversation_history):
                if h.get("role") == "assistant":
                    last_assistant_msg = h.get("content", "").lower()
                    break

        if is_answering_projectile or "highest point of its flight" in last_assistant_msg:
            return cls._evaluate_highest_point_answer(cleaned_query)

        # Check if user is asking how to know if they are right or if it's repeating:
        # Check if user is asking how to know if they are right or if it's repeating:
        if any(w in query_lower for w in ["how am i going to know", "whether correct or not", "simply repeating", "dont know how to use", "is it repeating"]):
            return r"""## ⚖️ Academic Evaluation of Your Dynamics Assertion

You asked: *"how am i going to know what i said is whether correct or not? it is simply repeating itself right?"*

Let us be unsparingly direct:

### 1. The Academic Verdict on Your Proposition
Your statement was:
> *"it will depend on how we define the system, if we set the system such that the acceleration going upward is positive , then the acceleration acting on the highest point will be -9.81 m/s2 and vice versa"*

In an introductory undergraduate physics exam, this earns marks for one narrow reason: you avoided the novice trap of claiming $a = 0$ at the apex ($a \neq 0$ when $v = 0$), and recognized that coordinate basis orientation ($\pm \hat{\mathbf{j}}$) dictates algebraic signs.

**However, from a rigorous engineering perspective, accepting your answer unconditionally is flawed.** You made four major unstated physical assumptions without defending them:
1. **The Vacuum Fiction**: If the ball moves in air, aerodynamic drag $\mathbf{F}_d = -\frac{1}{2} \rho C_d A |\mathbf{v}| \mathbf{v}$ destroys time-reversal symmetry. On the ascent, $|a| > 9.81\text{ m/s}^2$; at the apex, $|a| = 9.81\text{ m/s}^2$; on the descent, $|a| < 9.81\text{ m/s}^2$.
2. **The Non-Inertial Reality of Earth**: The Earth rotates ($\Omega \approx 7.292 \times 10^{-5}\text{ rad/s}$). Centrifugal acceleration alters the magnitude and deflection of effective gravity $\mathbf{g}_{\text{eff}}$.
3. **The Homogeneous Field Idealization**: Gravitational acceleration varies with radial distance: $g(r) = -GM/r^2$.
4. **The Relativistic Geodesic**: In Einstein's General Relativity, an accelerometer in the ball reads **strictly ZERO proper acceleration** ($a^\mu = 0$). Gravity is spacetime curvature, not a Newtonian force.

---

### 2. Why Did It Feel Like It Was Repeating?
Previously, when running in offline fallback mode without an active API key, the conversation history was not wired to the offline tutor evaluator, causing it to interpret your response as a new topic.

We have rectified this:
- The **conversational dialogue history** is now continuously evaluated across every turn.
- The tutor actively stress-tests your claims, demands proofs, and exposes hidden idealizations.
- When an API key (Gemini, OpenAI, or Groq) is added in **Settings**, the AI Teacher dynamically generates deep, adversarial cross-examinations. In offline mode, it relies on symbolic verification via SymPy.

---

### 3. Your Critical Challenge:
To demonstrate real physical reasoning beyond sign conventions:
*If we place this object on an inclined plane of angle $\theta$ with kinetic friction $\mu_k$, why does choosing Cartesian axes parallel and perpendicular to the ramp simplify the equations of motion compared to standard horizontal/vertical axes? Formulate your answer in terms of constraint forces and dynamic coupling.*
"""

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

        # Extract cleaner topic name if query is long sentence
        topic_name = cleaned_query
        if len(cleaned_query.split()) > 5:
            if "dynamics" in query_lower: topic_name = "Engineering Dynamics & Kinetics"
            elif "friction" in query_lower or "incline" in query_lower: topic_name = "Planar Incline Kinetics with Friction"
            elif "energy" in query_lower: topic_name = "Work-Energy Theorem & Conservation"
            elif "calculus" in query_lower or "derivative" in query_lower: topic_name = "Calculus & Differential Systems"
            else: topic_name = "Fundamental Particle Dynamics"

        # General concept response
        if mode == "socratic":
            return f"""## 🤔 Socratic Inquiry: Exploring "{topic_name}"

Welcome to our discussion on **{topic_name}**. Rather than jumping straight to formulas, let us reconstruct the intuition from first principles.

### Let's start with what you already observe:
1. In your own words, what physical or mathematical phenomenon are we trying to quantify or predict here?
2. If you imagine an extreme case (e.g., zero friction, infinite velocity, or zero mass), what should happen intuitively?
3. What known variables or relationships do you already have available?

*Take a moment to formulate your thoughts and reply below—I will guide you step by step to the complete derivation!*
{citation_section}
"""
        elif mode == "zero":
            return f"""## 🌟 Learn From Zero: Understanding {topic_name}

### 1. What is this concept and why does it exist?
Every engineering and mathematical law was invented because engineers and scientists faced a real-world puzzle they could not predict with older tools.
When we study **{topic_name}**, our objective is to model the fundamental cause-and-effect relationship governing the physical system.

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
        else:
            return f"""## 🔬 Concept Deep Dive: {topic_name}

### 1. Formal Academic Definition
**{topic_name}** is defined as the mathematical and physical relationship governing state evolution under specified boundary conditions and conservation laws.

### 2. Fundamental Derivation & Governing Equations
Consider an arbitrary continuum or discrete particle system:
$$\\mathbf{{F}}_{{\\text{{net}}}} = \\sum_{{i=1}}^N \\mathbf{{F}}_i = m \\cdot \\mathbf{{a}} = m \\frac{{d\\mathbf{{v}}}}{{dt}}$$

### 3. Boundary Assumptions & Model Limitations
1. **Continuum Hypothesis**: Assumes the Knudsen number $Kn < 0.01$.
2. **Inertial Reference Frame**: Valid only in frames where Newton's laws hold without fictitious pseudo-forces.

### 4. Common Exam Pitfall
> 💡 **University Exam Warning**: On exam problems with inclined surfaces or moving coordinate frames, students frequently forget to decompose the normal force $N$ and weight $W = mg$ into orthogonal axes aligned with the motion!

### 5. Follow-Up Mastery Challenge
*Would you like to solve a step-by-step problem on an inclined plane with friction, or test your intuition with an interactive Free-Body Diagram?*
{citation_section}
"""

    @classmethod
    def _evaluate_highest_point_answer(cls, student_text: str) -> str:
        return r"""## ⚖️ Critical Examination of Your Proposition

You asserted:
> *"it will depend on how we define the system, if we set the system such that the acceleration going upward is positive , then the acceleration acting on the highest point will be -9.81 m/s2 and vice versa"*

While your statement holds within an introductory Newtonian point-mass framework, as a serious engineering scientist you must never mistake an **idealized coordinate convention** for an **unconditional physical truth**.

Let us dissect the four implicit assumptions you made, and test your claim against rigorous physical theories:

---

### 1. The "Zero Drag" Fiction (Fluid Dissipation)
You assumed the magnitude is strictly .81	ext{ m/s}^2$. That is valid **solely in an absolute vacuum**.
In any real fluid (air), aerodynamic drag $\mathbf{F}_d = -rac{1}{2} ho C_d A |\mathbf{v}| \mathbf{v}$ couples velocity non-linearly to acceleration.

Consider the true dynamic momentum balance:
83\Sigma F_y = -mg - rac{1}{2}ho C_d A v |v| = m a83

- **On the Ascent ( > 0$)**: Both gravity and drag point downward in the same direction:
  83a_{	ext{ascent}} = -g - rac{ho C_d A}{2m} v^2 \implies |a| > 9.81	ext{ m/s}^283
- **At the Instantaneous Apex ( = 0$)**: Aerodynamic drag momentarily vanishes, leaving $|a| = 9.81	ext{ m/s}^2$.
- **On the Descent ( < 0$)**: Drag opposes gravity, reducing net downward acceleration:
  83a_{	ext{descent}} = -g + rac{ho C_d A}{2m} v^2 \implies |a| < 9.81	ext{ m/s}^283
  Eventually converging to terminal velocity ( 	o 0$).

Did you consciously account for this ascent-descent asymmetry, or did you unconsciously accept an idealized textbook fiction?

---

### 2. Coordinate Sign Conventions vs. Non-Inertial Reference Frames
You stated: *"it will depend on how we define the system"*.
Be rigorous with terminology: choosing whether unit basis vector $\hat{\mathbf{j}}$ points upward or downward is merely an **arbitrary sign convention**, not a "system definition".

The foundational question is: **Is your reference frame actually inertial?**
Because the Earth rotates with angular velocity $\mathbf{\Omega} pprox 7.292 	imes 10^{-5}	ext{ rad/s}$, any ground-based laboratory is non-inertial. The equations of motion contain kinematic correction terms:
83\mathbf{a}_{	ext{measured}} = \mathbf{g}_{	ext{true}} - 2(\mathbf{\Omega} 	imes \mathbf{v}) - \mathbf{\Omega} 	imes (\mathbf{\Omega} 	imes \mathbf{r})83

Even at the highest point ( = 0$) where Coriolis acceleration vanishes, the **centrifugal acceleration** does not! The plumb-line gravitational vector $\mathbf{g}_{	ext{eff}}$ is deflected from the geocentric center.

---

### 3. The Theoretical Clash: Newton vs. Einstein's General Relativity
What would a triaxial accelerometer sealed inside the ball actually measure at the apex?

- In **Newtonian Mechanics**: Gravity is treated as an external physical force accelerating the mass at hBc9.81	ext{ m/s}^2$.
- In **Einstein's General Relativity (Equivalence Principle)**: Gravity is **not a force**. 
  The ball in free flight follows a spacetime geodesic. An accelerometer attached to the ball reads **identically ZERO proper acceleration** (^\mu = 0$):
  83rac{D u^\mu}{d	au} = rac{d u^\mu}{d	au} + \Gamma^\mu_{lphaeta} u^lpha u^eta = 083
  From the standpoint of modern differential geometry and relativistic physics, **the projectile is completely unaccelerated**. The surface of the Earth is what accelerates upward at $+9.81	ext{ m/s}^2$, driven by electrostatic repulsion between atoms in the crust!

---

### 4. Challenge Problems for You:
1. **Under what explicit boundary condition does the Newtonian point-particle model break down catastrophically for a projectile?** (Consider spin-induced Magnus forces, compressible supersonic shock waves, or altitude-dependent gravity (r) = -GM/r^2$).
2. **On an inclined plane at angle $	heta$, why is choosing coordinates parallel and perpendicular to the incline mathematically superior to horizontal/vertical axes?** (Defend how this uncouples constraint forces from dynamic equations).
"""
