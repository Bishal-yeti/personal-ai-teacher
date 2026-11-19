import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  Plus,
  BookOpen
} from 'lucide-react';
import { Course, MasteryRecord, StudyPlan } from '../../types';

interface AnalyticsViewProps {
  activeCourse: Course | null;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ activeCourse }) => {
  const [masteryRecords, setMasteryRecords] = useState<MasteryRecord[]>([]);
  const [overallMastery, setOverallMastery] = useState<number>(0);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);

  // New plan form
  const [planTitle, setPlanTitle] = useState('Final Exam Spaced Repetition');
  const [examDate, setExamDate] = useState('2026-12-15');
  const [planGoal, setPlanGoal] = useState('Achieve > 90% on Final University Examination');

  useEffect(() => {
    if (!activeCourse) return;
    loadMastery();
    loadStudyPlans();
  }, [activeCourse]);

  const loadMastery = async () => {
    if (!activeCourse) return;
    try {
      const res = await fetch(`/api/analytics/mastery/${activeCourse.id}`);
      const data = await res.json();
      setMasteryRecords(data.records || []);
      setOverallMastery(data.overall_mastery || 0);
    } catch (e) {
      console.error(e);
    }
  };

  const loadStudyPlans = async () => {
    if (!activeCourse) return;
    try {
      const res = await fetch(`/api/analytics/study-plans/${activeCourse.id}`);
      const data = await res.json();
      setStudyPlans(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetProfile = async () => {
    if (!activeCourse) return;
    if (!confirm('Are you sure you want to reset all mastery evaluation data for this course?')) return;
    try {
      await fetch(`/api/analytics/mastery/reset/${activeCourse.id}`, { method: 'POST' });
      loadMastery();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse) return;
    const selectedTopics = masteryRecords.map(r => r.topic);
    if (selectedTopics.length === 0) {
      selectedTopics.push("Newton's Laws of Motion", "Kinematics of Particles");
    }

    try {
      const res = await fetch('/api/analytics/study-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: activeCourse.id,
          title: planTitle,
          exam_date: examDate,
          target_goal: planGoal,
          selected_topics: selectedTopics
        })
      });
      if (res.ok) {
        setIsCreatingPlan(false);
        loadStudyPlans();
      }
    } catch (err) {
      alert(`Error: ${err}`);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <span>Mastery Analytics & Spaced Repetition Planner: {activeCourse?.title}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Student profile persistent memory: tracked through genuine practice attempts and diagnostic scoring.
          </p>
        </div>

        <button
          onClick={handleResetProfile}
          className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/20 text-xs flex items-center gap-1.5 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Course Profile</span>
        </button>
      </div>

      {/* Top Mastery Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <p className="text-xs font-semibold text-slate-400">Calculated Subject Proficiency</p>
          <div className="text-4xl font-black text-white">{overallMastery}%</div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${overallMastery}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Formulated from actual student assessments & solved problem steps.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <p className="text-xs font-semibold text-slate-400">Total Tracked Topics</p>
          <div className="text-4xl font-black text-white">{masteryRecords.length}</div>
          <div className="flex items-center gap-3 text-xs pt-1">
            <span className="text-emerald-400 font-semibold font-mono">
              {masteryRecords.filter(r => r.mastery_score >= 80).length} Mastered
            </span>
            <span className="text-amber-400 font-semibold font-mono">
              {masteryRecords.filter(r => r.mastery_score < 65).length} Need Revision
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Targeting 80%+ across all foundational concepts before university exams.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">Active Study Schedules</p>
            <div className="text-4xl font-black text-sky-400">{studyPlans.length}</div>
            <p className="text-[11px] text-slate-400 mt-1">Spaced repetition schedules</p>
          </div>
          <button
            onClick={() => setIsCreatingPlan(true)}
            className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Study Plan</span>
          </button>
        </div>
      </div>

      {/* Topics Detail & Misconception Log */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <span>Topic Mastery Breakdown & Cognitive Misconceptions</span>
        </h2>

        <div className="space-y-4">
          {masteryRecords.map((r) => (
            <div key={r.id} className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-100">{r.topic}</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {r.correct_attempts} / {r.total_attempts} successful attempts • Last practiced: {new Date(r.last_practiced).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-base font-extrabold font-mono ${
                    r.mastery_score >= 80 ? 'text-emerald-400' : (r.mastery_score >= 60 ? 'text-blue-400' : 'text-amber-400')
                  }`}>
                    {r.mastery_score}%
                  </span>
                </div>
              </div>

              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    r.mastery_score >= 80 ? 'bg-emerald-500' : (r.mastery_score >= 60 ? 'bg-blue-500' : 'bg-amber-500')
                  }`}
                  style={{ width: `${r.mastery_score}%` }}
                />
              </div>

              {/* Misconceptions list */}
              {r.misconceptions && r.misconceptions.length > 0 && (
                <div className="pt-1">
                  <p className="text-[11px] font-semibold text-amber-400 flex items-center gap-1 mb-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Logged Student Misconceptions:</span>
                  </p>
                  <div className="space-y-1 pl-4">
                    {r.misconceptions.map((m, mIdx) => (
                      <p key={mIdx} className="text-[11px] text-slate-300 italic">
                        • {m}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Spaced Repetition Study Planner */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>Spaced Repetition Study Schedules</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Prioritizes topics automatically according to the forgetting curve (1-day, 3-day, 7-day, 14-day intervals).
            </p>
          </div>
        </div>

        {isCreatingPlan && (
          <form onSubmit={handleCreatePlan} className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-white">Create Exam Study Schedule</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Plan Title:</label>
                <input
                  type="text"
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Target Exam Date:</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Target Goal:</label>
                <input
                  type="text"
                  value={planGoal}
                  onChange={(e) => setPlanGoal(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreatingPlan(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
              >
                Generate Spaced Schedule
              </button>
            </div>
          </form>
        )}

        {studyPlans.length > 0 ? (
          <div className="space-y-4">
            {studyPlans.map((plan) => (
              <div key={plan.id} className="p-5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">{plan.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Exam Date: {plan.exam_date} • {plan.target_goal}</p>
                  </div>
                  <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded border border-blue-500/20">
                    {plan.schedule.length} Sessions
                  </span>
                </div>

                {/* Schedule timeline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2">
                  {plan.schedule.slice(0, 8).map((session, sIdx) => (
                    <div key={sIdx} className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                        <span>{session.date}</span>
                        <span className="text-blue-400">Rep {session.repetition}</span>
                      </div>
                      <p className="font-semibold text-slate-200 truncate">{session.topic}</p>
                      <p className="text-[10px] text-emerald-400">{session.session_type}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No study schedules generated yet.</p>
        )}
      </div>
    </div>
  );
};
