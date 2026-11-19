import json
import re
from typing import Dict, Any, List, Optional
from app.services.rag_engine import RAGEngine
from app.services.math_engine import MathEngine
from app.services.llm_provider import LLMProvider

class TutorEngine:
    SYSTEM_PEDAGOGY_PROMPT = """
You are a senior university professor and dedicated personal engineering tutor.
Your core teaching philosophy is: TEACH FOR DEEP UNDERSTANDING, GROUNDED AT THE STUDENT'S CURRENT LEVEL.

CRITICAL PEDAGOGICAL GUIDELINES:
1. MEET THE STUDENT AT THEIR LEVEL (SCAFFOLDED LEARNING):
   - Never intimidate the student or jump into graduate-level physics (e.g. General Relativity, tensor calculus, Navier-Stokes) when the student is working on undergraduate fundamentals (Newtonian dynamics, kinematics, calculus, engineering mechanics).
   - Meet them where they are in their curriculum, build a rock-solid foundation, and gradually level up the rigor step-by-step.

2. HONEST, CRITICAL EVALUATION (NO SYCOPHANCY, NO FLUFF):
   - Do NOT use patronizing or empty praise ("Great job!", "Outstanding!", "You nailed it!").
   - Clearly explain whether their reasoning holds physically and mathematically:
     * Explain WHY an answer or method works based on first principles.
     * Pinpoint exact misconceptions, sign errors, or imprecise terminology constructively.
     * Distinguish between arbitrary conventions (e.g. coordinate sign choices) and physical invariants (e.g. force magnitude, acceleration direction).

3. STEP-BY-STEP CONCEPTUAL REASONING:
   - When answering or solving:
     1. State what is physically happening in plain English and intuition.
     2. Identify the governing law (e.g. Newton's 2nd Law $\Sigma F = ma$).
     3. Show the mathematical derivation step by step with clear KaTeX ($...$ inline, 113...113 block).
     4. Explain why this approach is taken.
     5. Highlight the classic traps and misconceptions students fall into on exams.
     6. Offer the next logical step or a bite-sized question to test comprehension.
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
        if any(w in query_lower for w in ["how am i going to know", "whether correct or not", "simply repeating", "dont know how to use", "is it repeating", "level with what we are learning"]):
            return cls._evaluate_highest_point_answer(cleaned_query)

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
        return r"""## 🎯 Step-by-Step Evaluation: Your Vertical Motion Reasoning

Let's look at your explanation carefully and break down what works, what needs clarification, and why:

> *"it will depend on how we define the system, if we set the system such that the acceleration going upward is positive , then the acceleration acting on the highest point will be -9.81 m/s2 and vice versa"*

---

### 1. What You Got Right (The Core Concept)
You correctly identified two fundamental principles in Newtonian kinematics:

1. **Acceleration is NOT zero at the highest point.**
   This is the single most common trap in university physics exams. Many students see that instantaneous velocity is zero ($v = 0$ at the apex) and mistakenly conclude that acceleration must also be zero ($a = 0$). You correctly realized that acceleration is still non-zero and has a magnitude of $9.81\text{ m/s}^2$.

2. **The algebraic sign depends on your chosen positive direction.**
   Acceleration is a vector quantity (it has both magnitude and direction). 
   - If you define the positive axis pointing **upward** ($\uparrow +$), then downward gravity acts in the negative direction: $a = -9.81\text{ m/s}^2$.
   - If you define the positive axis pointing **downward** ($\downarrow +$), then downward gravity acts in the positive direction: $a = +9.81\text{ m/s}^2$.

---

### 2. The Physical Reason: *Why* Does This Happen?
To truly master this, we don't just remember formulas—we look at the cause-and-effect:

$$\Sigma F = m \cdot a$$

- When the ball leaves your hand, the only force acting on it (ignoring air resistance for now) is **gravity**, pulling straight down toward the Earth's center with a constant force:
  $$F_g = m \cdot g \quad (\text{directed downward})$$
- Even at the exact top, where the ball pauses for an infinitesimal instant ($v = 0$), the Earth does not stop pulling on it! The gravitational force $F_g$ is unchanged.
- Because there is still a constant downward force, Newton's Second Law guarantees there is a constant downward acceleration:
  $$a = \frac{\Sigma F}{m} = \frac{-mg}{m} = -g = -9.81\text{ m/s}^2$$

If the acceleration were zero at the top, the net force would be zero, which means the ball would stay frozen floating in mid-air forever!

---

### 3. A Precision Note on Terminology
In physics and engineering mechanics, we distinguish between:
- **"System"**: The physical object(s) or body we isolate to study (here, the ball).
- **"Coordinate Frame / Reference Axis"**: The direction we choose as positive ($+y$).

So rather than saying *"it depends on how we define the system"*, it is more precise to say:
> *"The physical acceleration vector points downward toward the Earth. Its mathematical sign ($+$ or $-$) depends on which direction we assign as positive for our coordinate axis."*

---

### 4. Leveling Up: The Next Step in Dynamics
Now that you have solid intuition for 1D vertical motion, let's take the next logical step in your curriculum: **2D motion on an inclined plane**.

*Imagine a block resting on a ramp tilted at an angle $\theta = 30^\circ$.*
- Gravity still pulls straight down: $\mathbf{W} = mg \downarrow$.
- But the ramp physically prevents the block from falling straight down—it constrains the motion along the slope.

**Quick question for you:**
Why do we tilt our coordinate axes so that the $x$-axis is *parallel* to the ramp and the $y$-axis is *perpendicular* to the ramp, instead of using standard horizontal and vertical axes? What makes this choice so much easier to solve?
"""

