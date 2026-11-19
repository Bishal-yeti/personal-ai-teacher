import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Cpu, 
  CheckCircle, 
  Sigma, 
  TrendingUp, 
  ArrowRight, 
  Brain, 
  Compass, 
  Sparkles,
  Layers
} from 'lucide-react';
import { Course } from '../../types';
import { MathText } from '../common/MathText';

interface SolverViewProps {
  activeCourse: Course | null;
}

export const SolverView: React.FC<SolverViewProps> = ({ activeCourse }) => {
  const [solverCategory, setSolverCategory] = useState<'calculus' | 'algebra' | 'mechanics'>('calculus');
  const [problemType, setProblemType] = useState<string>('differentiation');
  const [expression, setExpression] = useState<string>('x^3 + 4*x^2 - 7*x + 10');
  const [variable, setVariable] = useState<string>('x');
  const [order, setOrder] = useState<number>(1);
  const [lowerBound, setLowerBound] = useState<string>('0');
  const [upperBound, setUpperBound] = useState<string>('5');

  // Mechanics parameters
  const [inclineMass, setInclineMass] = useState<number>(10);
  const [inclineAngle, setInclineAngle] = useState<number>(30);
  const [inclineMu, setInclineMu] = useState<number>(0.2);
  const [inclineFApplied, setInclineFApplied] = useState<number>(0);

  const [projectileV0, setProjectileV0] = useState<number>(25);
  const [projectileAngle, setProjectileAngle] = useState<number>(45);

  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [solutionResult, setSolutionResult] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!activeCourse) return;
    loadHistory();
  }, [activeCourse]);

  const loadHistory = async () => {
    if (!activeCourse) return;
    try {
      const res = await fetch(`/api/solver/history/${activeCourse.id}`);
      const data = await res.json();
      setHistory(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse) return;
    setIsSolving(true);
    setSolutionResult(null);

    const payload: any = {
      course_id: activeCourse.id,
      problem_type: problemType,
      expression: expression,
      variable: variable,
      order: Number(order)
    };

    if (problemType === 'integration') {
      payload.lower_bound = lowerBound || null;
      payload.upper_bound = upperBound || null;
    } else if (problemType === 'mechanics_incline') {
      payload.mechanics_params = {
        m: Number(inclineMass),
        theta_deg: Number(inclineAngle),
        mu_k: Number(inclineMu),
        F_applied: Number(inclineFApplied)
      };
    } else if (problemType === 'mechanics_projectile') {
      payload.mechanics_params = {
        v0: Number(projectileV0),
        angle_deg: Number(projectileAngle),
        y0: 0.0
      };
    }

    try {
      const res = await fetch('/api/solver/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setSolutionResult(data);
        loadHistory();
      } else {
        alert(data.detail || 'Solver error');
      }
    } catch (err) {
      alert(`Error: ${err}`);
    } finally {
      setIsSolving(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-400" />
          <span>SymPy Mathematical & Engineering Rigorous Solver</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Exact symbolic derivations without LLM arithmetic errors. Evaluates calculus, algebraic systems, and kinetics with full dimension checks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Problem Input & Parameter Configuration */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          {/* Category Tabs */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Select Problem Domain
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-800/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setSolverCategory('calculus');
                  setProblemType('differentiation');
                  setExpression('x^3 + 4*x^2 - 7*x + 10');
                }}
                className={`py-1.5 text-xs font-semibold rounded-lg transition ${
                  solverCategory === 'calculus' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Calculus
              </button>
              <button
                type="button"
                onClick={() => {
                  setSolverCategory('algebra');
                  setProblemType('algebra');
                  setExpression('3*x^2 - 12 = 0');
                }}
                className={`py-1.5 text-xs font-semibold rounded-lg transition ${
                  solverCategory === 'algebra' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Algebra
              </button>
              <button
                type="button"
                onClick={() => {
                  setSolverCategory('mechanics');
                  setProblemType('mechanics_incline');
                }}
                className={`py-1.5 text-xs font-semibold rounded-lg transition ${
                  solverCategory === 'mechanics' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mechanics
              </button>
            </div>
          </div>

          <form onSubmit={handleSolve} className="space-y-4">
            {/* Specific Problem Type Selector */}
            {solverCategory === 'calculus' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Calculus Operation:</label>
                  <select
                    value={problemType}
                    onChange={(e) => setProblemType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200"
                  >
                    <option value="differentiation">Derivative (d/dx)</option>
                    <option value="integration">Integral (Indefinite & Definite ∫)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Mathematical Function f(x):</label>
                  <input
                    type="text"
                    value={expression}
                    onChange={(e) => setExpression(e.target.value)}
                    placeholder="e.g. x^3 - 4*x^2 + 5"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Independent Variable:</label>
                    <input
                      type="text"
                      value={variable}
                      onChange={(e) => setVariable(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 font-mono"
                    />
                  </div>
                  {problemType === 'differentiation' ? (
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Order (n):</label>
                      <input
                        type="number"
                        min="1"
                        max="4"
                        value={order}
                        onChange={(e) => setOrder(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Bounds [a, b] (Optional):</label>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={lowerBound}
                          onChange={(e) => setLowerBound(e.target.value)}
                          placeholder="a"
                          className="w-1/2 px-2 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 font-mono"
                        />
                        <input
                          type="text"
                          value={upperBound}
                          onChange={(e) => setUpperBound(e.target.value)}
                          placeholder="b"
                          className="w-1/2 px-2 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {solverCategory === 'algebra' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Equation to Solve:</label>
                  <input
                    type="text"
                    value={expression}
                    onChange={(e) => setExpression(e.target.value)}
                    placeholder="e.g. 3*x^2 - 12 = 0"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Variable:</label>
                  <input
                    type="text"
                    value={variable}
                    onChange={(e) => setVariable(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>
            )}

            {solverCategory === 'mechanics' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">System:</label>
                  <select
                    value={problemType}
                    onChange={(e) => setProblemType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200"
                  >
                    <option value="mechanics_incline">Incline Plane with Kinetic Friction</option>
                    <option value="mechanics_projectile">2D Projectile Kinematics</option>
                  </select>
                </div>

                {problemType === 'mechanics_incline' ? (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Mass m (kg):</label>
                      <input
                        type="number"
                        value={inclineMass}
                        onChange={(e) => setInclineMass(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Angle θ (deg):</label>
                      <input
                        type="number"
                        value={inclineAngle}
                        onChange={(e) => setInclineAngle(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Friction μ_k:</label>
                      <input
                        type="number"
                        step="0.05"
                        value={inclineMu}
                        onChange={(e) => setInclineMu(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Thrust F (N):</label>
                      <input
                        type="number"
                        value={inclineFApplied}
                        onChange={(e) => setInclineFApplied(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Launch v0 (m/s):</label>
                      <input
                        type="number"
                        value={projectileV0}
                        onChange={(e) => setProjectileV0(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Launch θ (deg):</label>
                      <input
                        type="number"
                        value={projectileAngle}
                        onChange={(e) => setProjectileAngle(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isSolving}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition"
            >
              <Cpu className="w-4 h-4" />
              <span>{isSolving ? 'Solving with SymPy...' : 'Compute Step-by-Step Derivation'}</span>
            </button>
          </form>

          {/* Quick Problem Presets */}
          <div className="pt-2 border-t border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2">Preset Problems:</span>
            <div className="space-y-1.5">
              {[
                { name: 'Polynomial Derivative: x^4 - 5x^2 + 8', cat: 'calculus', type: 'differentiation', expr: 'x^4 - 5*x^2 + 8' },
                { name: 'Definite Integral: ∫ [0, 4] (3*x^2) dx', cat: 'calculus', type: 'integration', expr: '3*x^2', low: '0', up: '4' },
                { name: 'Quadratic Roots: 2*x^2 - 8*x + 6 = 0', cat: 'algebra', type: 'algebra', expr: '2*x^2 - 8*x + 6 = 0' }
              ].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSolverCategory(p.cat as any);
                    setProblemType(p.type);
                    setExpression(p.expr);
                    if (p.low) setLowerBound(p.low);
                    if (p.up) setUpperBound(p.up);
                  }}
                  className="w-full text-left p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 font-mono transition truncate"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Formal Step-by-Step Derivation Result */}
        <div className="lg:col-span-2 space-y-6">
          {solutionResult ? (
            <div className="p-7 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl animate-in fade-in duration-200">
              {/* Header Box */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    {solutionResult.problem_type}
                  </span>
                  <h2 className="text-lg font-bold text-white mt-1">
                    Formal Analytical Derivation
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Programmatically Verified</span>
                </div>
              </div>

              {/* Exact Numerical / Symbolic Result Badge */}
              <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/40 text-blue-200 space-y-1">
                <span className="text-[11px] font-mono text-blue-400 uppercase tracking-wider">Final Result:</span>
                <div className="text-base font-bold text-white">
                  {solutionResult.result_latex ? (
                    <MathText content={`$$${solutionResult.result_latex}$$`} />
                  ) : (
                    <div className="font-mono text-sm text-emerald-300">
                      Acceleration: {solutionResult.acceleration_m_s2} m/s² ({solutionResult.direction})
                    </div>
                  )}
                </div>
              </div>

              {/* Granular Mathematical Steps */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-sky-400" />
                  <span>Granular Step Derivations</span>
                </h3>

                {solutionResult.steps?.map((step: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-200">
                        Step {step.step}: {step.title}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">Sub-goal</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{step.explanation}</p>
                    <div className="pt-1">
                      <MathText content={`$$${step.math}$$`} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Dimensional Sanity Check */}
              {solutionResult.dimension_check && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center gap-2.5">
                  <Compass className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-white">Dimensional Consistency: </span>
                    <span className="font-mono text-emerald-400">{solutionResult.dimension_check}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 mx-auto flex items-center justify-center">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Enter a Mathematical Problem</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Configure functions or mechanics variables on the left. SymPy will compute exact analytical steps, verify units, and break down every transformation.
                </p>
              </div>
            </div>
          )}

          {/* Solution History */}
          {history.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Recent Solved Problems ({history.length})
              </h3>
              <div className="space-y-2">
                {history.slice(0, 5).map((h) => (
                  <div key={h.id} className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-mono text-blue-300">{h.problem_text}</span>
                      <span className="text-[10px] text-slate-500 ml-2">({h.category})</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono">Verified</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
