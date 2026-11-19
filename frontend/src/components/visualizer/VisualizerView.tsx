import React, { useState, useEffect, useRef } from 'react';
import { 
  Eye, 
  RotateCcw, 
  Play, 
  Pause, 
  Layers, 
  Flame, 
  Compass, 
  Activity,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { Course } from '../../types';

interface VisualizerViewProps {
  activeCourse: Course | null;
}

export const VisualizerView: React.FC<VisualizerViewProps> = ({ activeCourse }) => {
  const [activeTab, setActiveTab] = useState<'fbd' | 'projectile' | 'carnot'>('fbd');

  // 1. FBD State
  const [fbdMass, setFbdMass] = useState<number>(10);
  const [fbdAngle, setFbdAngle] = useState<number>(30);
  const [fbdMu, setFbdMu] = useState<number>(0.25);
  const [fbdApplied, setFbdApplied] = useState<number>(0);
  const [fbdData, setFbdData] = useState<any | null>(null);
  const fbdCanvasRef = useRef<HTMLCanvasElement>(null);

  // 2. Projectile State
  const [projV0, setProjV0] = useState<number>(25);
  const [projAngle, setProjAngle] = useState<number>(45);
  const [projData, setProjData] = useState<any | null>(null);
  const projCanvasRef = useRef<HTMLCanvasElement>(null);

  // 3. Carnot Cycle State
  const [carnotTH, setCarnotTH] = useState<number>(600);
  const [carnotTC, setCarnotTC] = useState<number>(300);
  const [carnotData, setCarnotData] = useState<any | null>(null);
  const carnotCanvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch FBD data
  useEffect(() => {
    fetch('/api/visualizer/fbd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mass: fbdMass,
        angle_deg: fbdAngle,
        mu_k: fbdMu,
        applied_force: fbdApplied
      })
    })
      .then(res => res.json())
      .then(data => setFbdData(data))
      .catch(() => {});
  }, [fbdMass, fbdAngle, fbdMu, fbdApplied]);

  // Fetch Projectile data
  useEffect(() => {
    fetch('/api/visualizer/projectile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        v0: projV0,
        angle_deg: projAngle,
        height: 0.0,
        g: 9.81
      })
    })
      .then(res => res.json())
      .then(data => setProjData(data))
      .catch(() => {});
  }, [projV0, projAngle]);

  // Fetch Carnot data
  useEffect(() => {
    fetch('/api/visualizer/carnot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        th: carnotTH,
        tc: carnotTC,
        v1: 1.0,
        v2: 2.0,
        gamma: 1.4
      })
    })
      .then(res => res.json())
      .then(data => setCarnotData(data))
      .catch(() => {});
  }, [carnotTH, carnotTC]);

  // Draw FBD Canvas
  useEffect(() => {
    const canvas = fbdCanvasRef.current;
    if (!canvas || !fbdData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const h = canvas.height;

    // Draw incline surface
    const thetaRad = (fbdAngle * Math.PI) / 180;
    const originX = 100;
    const originY = h - 100;
    const rampLength = 320;

    const endX = originX + rampLength * Math.cos(thetaRad);
    const endY = originY - rampLength * Math.sin(thetaRad);

    // Ramp surface
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(originX - 30, originY);
    ctx.lineTo(originX, originY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Fill ground triangle
    ctx.fillStyle = 'rgba(51, 65, 85, 0.2)';
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(endX, endY);
    ctx.lineTo(endX, originY);
    ctx.closePath();
    ctx.fill();

    // Incline angle arc
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(originX, originY, 40, -thetaRad, 0);
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText(`${fbdAngle}°`, originX + 45, originY - 10);

    // Block position (halfway up ramp)
    const blockDist = 160;
    const blockCenterX = originX + blockDist * Math.cos(thetaRad);
    const blockCenterY = originY - blockDist * Math.sin(thetaRad);

    ctx.save();
    ctx.translate(blockCenterX, blockCenterY);
    ctx.rotate(-thetaRad);

    // Draw Block
    const bw = 50;
    const bh = 35;
    ctx.fillStyle = '#3b82f6';
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.fillRect(-bw / 2, -bh, bw, bh);
    ctx.strokeRect(-bw / 2, -bh, bw, bh);

    // Draw Mass label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${fbdMass} kg`, 0, -bh / 2 + 4);

    // Local coordinates:
    // Normal force vector (perpendicular, up)
    const normalScale = Math.min(100, Math.max(20, fbdData.normal_force_N * 0.7));
    drawArrow(ctx, 0, -bh / 2, 0, -bh / 2 - normalScale, '#10b981', `N = ${fbdData.normal_force_N} N`);

    // Friction force vector (along incline, opposing motion)
    const frictionScale = Math.min(80, Math.max(15, fbdData.friction_force_N * 1.2));
    drawArrow(ctx, 0, -bh / 2, frictionScale, -bh / 2, '#f59e0b', `f_k = ${fbdData.friction_force_N} N`);

    // Applied force if any
    if (fbdApplied > 0) {
      const appScale = Math.min(80, fbdApplied * 1.0);
      drawArrow(ctx, 0, -bh / 2, -appScale, -bh / 2, '#60a5fa', `F = ${fbdApplied} N`);
    }

    ctx.restore();

    // Gravity vector (straight down in global coords)
    const weightScale = Math.min(110, Math.max(25, fbdData.weight_total_N * 0.7));
    drawArrow(ctx, blockCenterX, blockCenterY - 15, blockCenterX, blockCenterY - 15 + weightScale, '#ef4444', `W = mg = ${fbdData.weight_total_N} N`);

  }, [fbdData, fbdAngle, fbdMass, fbdApplied]);

  // Draw Projectile Canvas
  useEffect(() => {
    const canvas = projCanvasRef.current;
    if (!canvas || !projData || !projData.trajectory) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const h = canvas.height;

    const padLeft = 60;
    const padBottom = 40;
    const plotW = w - padLeft - 30;
    const plotH = h - padBottom - 30;

    const maxR = Math.max(50, projData.range_m * 1.1);
    const maxH = Math.max(20, projData.max_height_m * 1.3);

    // Axes
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padLeft, h - padBottom);
    ctx.lineTo(w - 20, h - padBottom);
    ctx.moveTo(padLeft, h - padBottom);
    ctx.lineTo(padLeft, 20);
    ctx.stroke();

    // Ticks & labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText('0 m', padLeft - 25, h - padBottom + 15);
    ctx.fillText(`${projData.range_m.toFixed(1)} m`, padLeft + (projData.range_m / maxR) * plotW - 15, h - padBottom + 15);
    ctx.fillText(`${projData.max_height_m.toFixed(1)} m`, padLeft - 45, h - padBottom - (projData.max_height_m / maxH) * plotH);

    // Trajectory curve
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    projData.trajectory.forEach((pt: any, i: number) => {
      const cx = padLeft + (pt.x / maxR) * plotW;
      const cy = h - padBottom - (pt.y / maxH) * plotH;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.stroke();

    // Apex point
    const apexX = padLeft + (projData.range_m / 2 / maxR) * plotW;
    const apexY = h - padBottom - (projData.max_height_m / maxH) * plotH;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(apexX, apexY, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillText(`Apex: ${projData.max_height_m}m`, apexX - 25, apexY - 10);

  }, [projData]);

  // Helper function to draw clean vectors
  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, color: string, label?: string) => {
    const headLen = 8;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    if (label) {
      ctx.font = '10px monospace';
      ctx.fillText(label, toX + 5, toY - 5);
    }
    ctx.restore();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Eye className="w-5 h-5 text-emerald-400" />
          <span>Interactive Visual Learning & Physics Simulators</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manipulate variables in real-time. Understand how forces, vector projections, and thermodynamic boundaries react dynamically.
        </p>
      </div>

      {/* Simulator Switcher */}
      <div className="flex gap-2 border-b border-slate-800 pb-4">
        {[
          { id: 'fbd', label: 'Free-Body Diagram (Inclined Plane)', icon: Compass },
          { id: 'projectile', label: '2D Projectile Kinematics', icon: Activity },
          { id: 'carnot', label: 'Carnot Thermodynamic Cycle (P-V)', icon: Flame }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                active
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Simulator 1: Free-Body Diagram */}
      {activeTab === 'fbd' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Incline System Controls</span>
            </h2>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Incline Angle (θ):</span>
                  <span className="font-mono font-bold text-emerald-400">{fbdAngle}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={fbdAngle}
                  onChange={(e) => setFbdAngle(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Mass (m):</span>
                  <span className="font-mono font-bold text-blue-400">{fbdMass} kg</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={fbdMass}
                  onChange={(e) => setFbdMass(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Friction Coefficient (μ_k):</span>
                  <span className="font-mono font-bold text-amber-400">{fbdMu}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.05"
                  value={fbdMu}
                  onChange={(e) => setFbdMu(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Applied Force (Up Incline):</span>
                  <span className="font-mono font-bold text-purple-400">{fbdApplied} N</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="5"
                  value={fbdApplied}
                  onChange={(e) => setFbdApplied(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Calculated Values */}
            {fbdData && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <p className="font-bold text-white mb-2">Dynamic State Calculations:</p>
                <div className="flex justify-between text-slate-400">
                  <span>Normal Force (N):</span>
                  <span className="font-mono text-emerald-400">{fbdData.normal_force_N} N</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Friction Force (f_k):</span>
                  <span className="font-mono text-amber-400">{fbdData.friction_force_N} N</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Parallel Weight (W_x):</span>
                  <span className="font-mono text-red-400">{fbdData.weight_parallel_N} N</span>
                </div>
                <div className="flex justify-between text-slate-300 font-bold pt-2 border-t border-slate-800">
                  <span>Acceleration (a):</span>
                  <span className="font-mono text-blue-400">{fbdData.acceleration_m_s2} m/s²</span>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Canvas */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center">
            <div className="w-full flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-300">Free-Body Diagram (Planar Vector Balance)</span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-emerald-400 font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Normal
                </span>
                <span className="flex items-center gap-1 text-red-400 font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Weight
                </span>
                <span className="flex items-center gap-1 text-amber-400 font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Friction
                </span>
              </div>
            </div>

            <canvas
              ref={fbdCanvasRef}
              width={560}
              height={360}
              className="bg-slate-950 rounded-xl border border-slate-800 w-full max-w-[560px]"
            />
          </div>
        </div>
      )}

      {/* Simulator 2: Projectile Kinematics */}
      {activeTab === 'projectile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>Launch Parameters</span>
            </h2>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Initial Speed (v0):</span>
                  <span className="font-mono font-bold text-sky-400">{projV0} m/s</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={projV0}
                  onChange={(e) => setProjV0(Number(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Launch Angle (θ):</span>
                  <span className="font-mono font-bold text-amber-400">{projAngle}°</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="85"
                  value={projAngle}
                  onChange={(e) => setProjAngle(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>

            {projData && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <p className="font-bold text-white mb-2">Analytical Kinematics:</p>
                <div className="flex justify-between text-slate-400">
                  <span>Total Range (R):</span>
                  <span className="font-mono text-emerald-400">{projData.range_m} m</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Maximum Height (H_max):</span>
                  <span className="font-mono text-amber-400">{projData.max_height_m} m</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Flight Duration (t_flight):</span>
                  <span className="font-mono text-sky-400">{projData.flight_time_s} s</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>v0x (Horizontal):</span>
                  <span className="font-mono text-purple-400">{projData.v0x} m/s</span>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center">
            <div className="w-full flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-300">2D Trajectory Profile y(x)</span>
              <span className="text-xs text-slate-400 font-mono">Constant a_y = -9.81 m/s²</span>
            </div>

            <canvas
              ref={projCanvasRef}
              width={560}
              height={360}
              className="bg-slate-950 rounded-xl border border-slate-800 w-full max-w-[560px]"
            />
          </div>
        </div>
      )}

      {/* Simulator 3: Carnot Thermodynamic Cycle */}
      {activeTab === 'carnot' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Thermal Reservoirs</span>
            </h2>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Hot Reservoir (T_H):</span>
                  <span className="font-mono font-bold text-red-400">{carnotTH} K</span>
                </div>
                <input
                  type="range"
                  min="400"
                  max="1200"
                  step="20"
                  value={carnotTH}
                  onChange={(e) => setCarnotTH(Number(e.target.value))}
                  className="w-full accent-red-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Cold Reservoir (T_C):</span>
                  <span className="font-mono font-bold text-blue-400">{carnotTC} K</span>
                </div>
                <input
                  type="range"
                  min="200"
                  max="400"
                  step="10"
                  value={carnotTC}
                  onChange={(e) => setCarnotTC(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>
            </div>

            {carnotData && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-3">
                <p className="font-bold text-white">Carnot Efficiency (η):</p>
                <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                  {carnotData.thermal_efficiency_percent}%
                </div>
                <p className="text-[11px] text-slate-400">
                  Maximum theoretical thermal efficiency governed by Second Law of Thermodynamics: η = 1 - T_C / T_H.
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white">Carnot State Table (P-V-T)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-800 text-slate-300 font-mono">
                  <tr>
                    <th className="p-3 rounded-l-lg">State Point</th>
                    <th className="p-3">Volume V (m³)</th>
                    <th className="p-3">Pressure P (kPa)</th>
                    <th className="p-3 rounded-r-lg">Temperature T (K)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                  {carnotData?.states?.map((st: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="p-3 font-semibold text-white">{st.state}</td>
                      <td className="p-3">{st.V}</td>
                      <td className="p-3 text-emerald-400">{st.P}</td>
                      <td className="p-3 text-red-400">{st.T}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
