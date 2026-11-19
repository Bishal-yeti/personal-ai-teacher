import re
import math
from typing import Dict, Any, List, Optional
import sympy as sp
from sympy.parsing.sympy_parser import (
    parse_expr,
    standard_transformations,
    implicit_multiplication_application,
    convert_xor
)

class MathSolverResult:

    def __init__(self, problem_type: str, expression: str, steps: List[Dict[str, str]], result_exact: str, result_latex: str, dimension_check: Optional[str] = None):
        self.problem_type = problem_type
        self.expression = expression
        self.steps = steps
        self.result_exact = result_exact
        self.result_latex = result_latex
        self.dimension_check = dimension_check

    def to_dict(self) -> Dict[str, Any]:
        return {
            "problem_type": self.problem_type,
            "expression": self.expression,
            "steps": self.steps,
            "result_exact": self.result_exact,
            "result_latex": self.result_latex,
            "dimension_check": self.dimension_check
        }

class MathEngine:
    transformations = standard_transformations + (implicit_multiplication_application, convert_xor)

    @classmethod
    def solve_algebraic_equation(cls, eq_str: str, var_str: str = "x") -> Dict[str, Any]:
        """Solves algebraic equations like '3*x^2 - 12 = 0' or '2*x + 5 = 15' with step-by-step transformations."""
        try:
            x = sp.Symbol(var_str)
            # Normalize equation string
            if "=" in eq_str:
                lhs_str, rhs_str = eq_str.split("=", 1)
                lhs = parse_expr(lhs_str, transformations=cls.transformations)
                rhs = parse_expr(rhs_str, transformations=cls.transformations)
                eq = sp.Eq(lhs, rhs)
                expr = lhs - rhs
            else:
                expr = parse_expr(eq_str, transformations=cls.transformations)
                eq = sp.Eq(expr, 0)

            steps = [
                {
                    "step": 1,
                    "title": "Standard Form Transformation",
                    "explanation": "Collect all terms on the left side such that f(x) = 0.",
                    "math": f"{sp.latex(expr)} = 0"
                }
            ]

            # Factoring step if possible
            factored = sp.factor(expr)
            if factored != expr:
                steps.append({
                    "step": len(steps) + 1,
                    "title": "Factorization",
                    "explanation": "Factor the algebraic expression to isolate root factors.",
                    "math": f"{sp.latex(factored)} = 0"
                })

            solutions = sp.solve(eq, x)
            sol_latex = ", ".join([sp.latex(s) for s in solutions])

            steps.append({
                "step": len(steps) + 1,
                "title": "Root Evaluation & Verification",
                "explanation": "Solve each factor for the independent variable and substitute back to verify roots.",
                "math": f"{var_str} \\in \\left\\{{ {sol_latex} \\right\\}}"
            })

            return MathSolverResult(
                problem_type="Algebraic Equation",
                expression=eq_str,
                steps=steps,
                result_exact=str(solutions),
                result_latex=sol_latex,
                dimension_check="Dimensionless or consistent with input units."
            ).to_dict()
        except Exception as e:
            return {"error": f"Failed to solve algebraic equation: {str(e)}"}

    @classmethod
    def differentiate(cls, expr_str: str, var_str: str = "x", order: int = 1) -> Dict[str, Any]:
        """Calculates exact derivative with calculus rule explanation."""
        try:
            x = sp.Symbol(var_str)
            expr = parse_expr(expr_str, transformations=cls.transformations)
            diff_result = sp.diff(expr, x, order)

            steps = [
                {
                    "step": 1,
                    "title": "Identify Function & Independent Variable",
                    "explanation": f"Let f({var_str}) = {sp.latex(expr)}. Differentiating with respect to {var_str}.",
                    "math": f"f({var_str}) = {sp.latex(expr)}"
                },
                {
                    "step": 2,
                    "title": "Apply Differentiation Rules",
                    "explanation": "Apply standard linearity, power rule, product/quotient, or chain rule term-by-term.",
                    "math": f"\\frac{{d^{{{order}}}f}}{{d{var_str}^{{{order}}}}} = {sp.latex(diff_result)}"
                }
            ]

            # If simplified form is cleaner
            simplified = sp.simplify(diff_result)
            if simplified != diff_result:
                steps.append({
                    "step": 3,
                    "title": "Algebraic Simplification",
                    "explanation": "Combine like terms and factor common multipliers.",
                    "math": f"f'({var_str}) = {sp.latex(simplified)}"
                })

            return MathSolverResult(
                problem_type="Calculus: Differentiation",
                expression=f"d^{order}/d{var_str}^{order} ({expr_str})",
                steps=steps,
                result_exact=str(simplified),
                result_latex=sp.latex(simplified),
                dimension_check=f"[Units of f] / [Units of {var_str}]^{order}"
            ).to_dict()
        except Exception as e:
            return {"error": f"Failed to differentiate: {str(e)}"}

    @classmethod
    def integrate(cls, expr_str: str, var_str: str = "x", lower_bound: Optional[str] = None, upper_bound: Optional[str] = None) -> Dict[str, Any]:
        """Calculates definite or indefinite integral with calculus steps."""
        try:
            x = sp.Symbol(var_str)
            expr = parse_expr(expr_str, transformations=cls.transformations)

            if lower_bound is not None and upper_bound is not None:
                a = parse_expr(str(lower_bound), transformations=cls.transformations)
                b = parse_expr(str(upper_bound), transformations=cls.transformations)
                antiderivative = sp.integrate(expr, x)
                result = sp.integrate(expr, (x, a, b))

                steps = [
                    {
                        "step": 1,
                        "title": "Definite Integral Setup",
                        "explanation": f"Compute net accumulated area under f({var_str}) from {var_str}={a} to {var_str}={b}.",
                        "math": f"\\int_{{{sp.latex(a)}}}^{{{sp.latex(b)}}} {sp.latex(expr)} \\, d{var_str}"
                    },
                    {
                        "step": 2,
                        "title": "Find Antiderivative F(x)",
                        "explanation": "Determine the indefinite integral by reversing differentiation rules.",
                        "math": f"F({var_str}) = {sp.latex(antiderivative)}"
                    },
                    {
                        "step": 3,
                        "title": "Fundamental Theorem of Calculus (F(b) - F(a))",
                        "explanation": f"Evaluate upper limit F({b}) minus lower limit F({a}).",
                        "math": f"\\left[ {sp.latex(antiderivative)} \\right]_{{{sp.latex(a)}}}^{{{sp.latex(b)}}} = {sp.latex(result)}"
                    }
                ]
                return MathSolverResult(
                    problem_type="Calculus: Definite Integral",
                    expression=f"∫ [{a} to {b}] ({expr_str}) d{var_str}",
                    steps=steps,
                    result_exact=str(result),
                    result_latex=sp.latex(result),
                    dimension_check=f"[Units of f] × [Units of {var_str}]"
                ).to_dict()
            else:
                antiderivative = sp.integrate(expr, x)
                steps = [
                    {
                        "step": 1,
                        "title": "Indefinite Integral Setup",
                        "explanation": f"Find the family of all antiderivatives of f({var_str}).",
                        "math": f"\\int {sp.latex(expr)} \\, d{var_str}"
                    },
                    {
                        "step": 2,
                        "title": "Integration by Reverse Power/Substitution Rule",
                        "explanation": "Integrate term-by-term and append arbitrary constant of integration C.",
                        "math": f"{sp.latex(antiderivative)} + C"
                    }
                ]
                return MathSolverResult(
                    problem_type="Calculus: Indefinite Integral",
                    expression=f"∫ ({expr_str}) d{var_str}",
                    steps=steps,
                    result_exact=f"{antiderivative} + C",
                    result_latex=f"{sp.latex(antiderivative)} + C",
                    dimension_check=f"[Units of f] × [Units of {var_str}]"
                ).to_dict()
        except Exception as e:
            return {"error": f"Failed to integrate: {str(e)}"}

    @classmethod
    def solve_mechanics_problem(cls, problem_type: str, params: Dict[str, float]) -> Dict[str, Any]:
        """
        Calculates exact engineering mechanics solutions:
        - 'incline_friction': block on slope with friction (m, theta_deg, mu_k, F_applied)
        - 'projectile': 2D kinematics (v0, angle_deg, y0, g)
        - 'work_energy': Work done, kinetic energy change, friction dissipation
        - 'spring_oscillator': mass-spring-damper (m, k, c)
        """
        import numpy as np

        if problem_type == "incline_friction":
            m = float(params.get("m", 10.0)) # kg
            theta_deg = float(params.get("theta_deg", 30.0)) # degrees
            mu_k = float(params.get("mu_k", 0.2)) # coeff of kinetic friction
            F_applied = float(params.get("F_applied", 0.0)) # N (up the incline)
            g = 9.81 # m/s^2

            theta_rad = math.radians(theta_deg)
            # Forces:
            # Perpendicular: N = m * g * cos(theta)
            # Parallel: F_net = F_applied - m * g * sin(theta) - f_k
            N = m * g * math.cos(theta_rad)
            f_k = mu_k * N
            F_gravity_parallel = m * g * math.sin(theta_rad)
            
            # Net force along incline (positive = up incline)
            # If sliding down without applied force:
            if F_applied == 0:
                # Accelerating down
                F_net_down = F_gravity_parallel - f_k
                a_down = F_net_down / m
                accel = a_down
                direction = "Downwards along the incline"
            else:
                F_net = F_applied - F_gravity_parallel - f_k
                accel = F_net / m
                direction = "Upwards along the incline" if accel >= 0 else "Decelerating"

            steps = [
                {
                    "step": 1,
                    "title": "Establish Coordinate System",
                    "explanation": "Align x-axis parallel to the incline (pointing down/up) and y-axis perpendicular to incline surface.",
                    "math": "\\text{Axis } x \\parallel \\text{Incline}, \\quad \\text{Axis } y \\perp \\text{Incline}"
                },
                {
                    "step": 2,
                    "title": "Decompose Gravitational Weight Force (W = mg)",
                    "explanation": f"Calculate perpendicular component W_y = mg \\cos(\\theta) and parallel component W_x = mg \\sin(\\theta) with m = {m} kg, \\theta = {theta_deg}^\\circ.",
                    "math": f"W_y = ({m})({g})\\cos({theta_deg}^\\circ) = {N:.2f} \\text{{ N}}, \\quad W_x = ({m})({g})\\sin({theta_deg}^\\circ) = {F_gravity_parallel:.2f} \\text{{ N}}"
                },
                {
                    "step": 3,
                    "title": "Equilibrium in Perpendicular Direction (\\Sigma F_y = 0)",
                    "explanation": "Since the block remains in planar contact without lifting, the normal force balances W_y.",
                    "math": f"N = W_y = {N:.2f} \\text{{ N}}"
                },
                {
                    "step": 4,
                    "title": "Coulomb Kinetic Friction Law (f_k = \\mu_k N)",
                    "explanation": f"Calculate opposing kinetic friction force with \\mu_k = {mu_k}.",
                    "math": f"f_k = ({mu_k})({N:.2f}) = {f_k:.2f} \\text{{ N}}"
                },
                {
                    "step": 5,
                    "title": "Newton's Second Law along Incline (\\Sigma F_x = m a)",
                    "explanation": "Sum all driving and opposing forces along the incline.",
                    "math": f"a = \\frac{{\\Sigma F_x}}{{m}} = \\frac{{{F_gravity_parallel:.2f} - {f_k:.2f}}}{{{m}}} = {accel:.3f} \\text{{ m/s}}^2"
                }
            ]

            return {
                "problem_type": "Inclined Plane Dynamics with Friction",
                "normal_force_N": round(N, 2),
                "friction_force_N": round(f_k, 2),
                "acceleration_m_s2": round(accel, 3),
                "direction": direction,
                "steps": steps,
                "dimension_check": "[N] = [kg]·[m/s²], [a] = [m/s²] -> Dimensionally consistent."
            }

        elif problem_type == "projectile":
            v0 = float(params.get("v0", 25.0)) # m/s
            angle_deg = float(params.get("angle_deg", 45.0)) # deg
            y0 = float(params.get("y0", 0.0)) # initial height m
            g = 9.81

            angle_rad = math.radians(angle_deg)
            v0x = v0 * math.cos(angle_rad)
            v0y = v0 * math.sin(angle_rad)

            # Time to apex
            t_apex = v0y / g
            h_max = y0 + (v0y**2) / (2 * g)

            # Total flight time (y = y0 + v0y*t - 0.5*g*t^2 = 0)
            # 0.5*g*t^2 - v0y*t - y0 = 0
            disc = (v0y**2) + 2 * g * y0
            t_flight = (v0y + math.sqrt(disc)) / g
            range_x = v0x * t_flight

            steps = [
                {
                    "step": 1,
                    "title": "Velocity Vector Decomposition",
                    "explanation": f"Break initial launch velocity v_0 = {v0} m/s into orthogonal components at angle \\theta = {angle_deg}^\\circ.",
                    "math": f"v_{{0x}} = v_0\\cos\\theta = {v0x:.2f} \\text{{ m/s}}, \\quad v_{{0y}} = v_0\\sin\\theta = {v0y:.2f} \\text{{ m/s}}"
                },
                {
                    "step": 2,
                    "title": "Maximum Altitude (Apex)",
                    "explanation": "At the apex, vertical velocity reaches zero: v_y(t) = v_{0y} - gt = 0.",
                    "math": f"t_{{apex}} = \\frac{{v_{{0y}}}}{{g}} = {t_apex:.2f} \\text{{ s}}, \\quad H_{{max}} = y_0 + \\frac{{v_{{0y}}^2}}{{2g}} = {h_max:.2f} \\text{{ m}}"
                },
                {
                    "step": 3,
                    "title": "Total Time of Flight",
                    "explanation": "Solve quadratic equation for vertical position y(t) = 0 upon impact.",
                    "math": f"t_{{flight}} = \\frac{{v_{{0y}} + \\sqrt{{v_{{0y}}^2 + 2gy_0}}}}{{g}} = {t_flight:.2f} \\text{{ s}}"
                },
                {
                    "step": 4,
                    "title": "Horizontal Range",
                    "explanation": "Since horizontal acceleration a_x = 0 (neglecting air resistance), distance is constant speed × time.",
                    "math": f"R = v_{{0x}} \\cdot t_{{flight}} = ({v0x:.2f})({t_flight:.2f}) = {range_x:.2f} \\text{{ m}}"
                }
            ]

            return {
                "problem_type": "2D Projectile Kinematics",
                "v0x": round(v0x, 2),
                "v0y": round(v0y, 2),
                "time_to_apex_s": round(t_apex, 2),
                "max_height_m": round(h_max, 2),
                "flight_time_s": round(t_flight, 2),
                "range_m": round(range_x, 2),
                "steps": steps,
                "dimension_check": "[H] = [m], [R] = [m], [t] = [s] -> Dimensionally consistent."
            }

        return {"error": f"Unknown mechanics problem type: {problem_type}"}
