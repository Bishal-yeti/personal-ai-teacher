import React, { useEffect, useState } from 'react';
import { 
  GraduationCap, 
  Sparkles, 
  Calculator, 
  Eye, 
  Award, 
  AlertTriangle, 
  ArrowRight, 
  BookOpen, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { Course, MasteryRecord } from '../../types';

interface DashboardViewProps {
  activeCourse: Course | null;
  courses: Course[];
  setActiveCourse: (course: Course) => void;
  onNavigate: (tab: string, opts?: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activeCourse,
  courses,
  setActiveCourse,
  onNavigate
}) => {
  const [masteryData, setMasteryData] = useState<{ overall_mastery: number; weak_topics: MasteryRecord[]; records: MasteryRecord[] }>({
    overall_mastery: 0,
    weak_topics: [],
    records: []
  });

  useEffect(() => {
    if (!activeCourse) return;
    fetch(`/api/analytics/mastery/${activeCourse.id}`)
      .then(res => res.json())
      .then(data => {
        setMasteryData({
          overall_mastery: data.overall_mastery || 0,
          weak_topics: data.weak_topics || [],
          records: data.records || []
        });
      })
      .catch(() => {});
  }, [activeCourse]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Welcome & Philosophy Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-900/40 p-7 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>24/7 University Professor Study Assistant</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Prioritize Deep Understanding Over Just Answering.
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Your personal AI professor breaks down physical principles, derives mathematics step by step, and ensures you understand <em>why</em> formulas work before testing your intuition.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('tutor', { mode: 'zero' })}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 flex items-center gap-2 transition"
            >
              <span>Start "Learn From Zero" Session</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('solver')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-2 transition"
            >
              <Calculator className="w-3.5 h-3.5 text-blue-400" />
              <span>Solve Math / Physics Problem</span>
            </button>
            <button
              onClick={() => onNavigate('visualizer')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-2 transition"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>Interactive Simulators</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Current Subject</p>
            <h3 className="text-sm font-bold text-slate-100 mt-1 truncate max-w-[180px]">
              {activeCourse?.title || 'Select Subject'}
            </h3>
            <p className="text-[11px] text-blue-400 mt-0.5">{activeCourse?.category || 'Engineering'}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Subject Mastery</p>
            <h3 className="text-2xl font-extrabold text-white mt-1">
              {masteryData.overall_mastery}%
            </h3>
            <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>Evidence-based score</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Course Materials</p>
            <h3 className="text-2xl font-extrabold text-white mt-1">
              {activeCourse?.document_count || 0}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Indexed notes & books</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Weak Topics for Revision</p>
            <h3 className="text-2xl font-extrabold text-amber-400 mt-1">
              {masteryData.weak_topics.length}
            </h3>
            <p className="text-[11px] text-amber-400/80 mt-0.5">Below 65% proficiency</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main 2-Column Split: Mastery Breakdown & Weak Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Topic Mastery Matrix */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Knowledge Mastery Matrix</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculated strictly from your quiz performance and problem steps (not arbitrary estimates).
              </p>
            </div>
            <button
              onClick={() => onNavigate('analytics')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              <span>Full Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {masteryData.records.length > 0 ? (
              masteryData.records.map((rec) => (
                <div key={rec.id} className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{rec.topic}</span>
                    <span className={`font-mono font-bold ${
                      rec.mastery_score >= 80 ? 'text-emerald-400' : (rec.mastery_score >= 60 ? 'text-blue-400' : 'text-amber-400')
                    }`}>
                      {rec.mastery_score}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        rec.mastery_score >= 80 ? 'bg-emerald-500' : (rec.mastery_score >= 60 ? 'bg-blue-500' : 'bg-amber-500')
                      }`}
                      style={{ width: `${rec.mastery_score}%` }}
                    />
                  </div>
                  {rec.misconceptions && rec.misconceptions.length > 0 && (
                    <p className="text-[11px] text-amber-300/80 flex items-center gap-1.5 pt-1">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      <span>Identified trap: {rec.misconceptions[0]}</span>
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">No assessment history recorded for this course yet.</p>
            )}
          </div>
        </div>

        {/* Right 1 Col: Weak Topics & Revision Recommendations */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Revision Focus</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Priority areas before your next exam.</p>
            </div>

            {masteryData.weak_topics.length > 0 ? (
              <div className="space-y-3">
                {masteryData.weak_topics.map((t) => (
                  <div key={t.id} className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-semibold text-slate-200">
                      <span>{t.topic}</span>
                      <span className="text-amber-400 font-mono">{t.mastery_score}%</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Review fundamentals or practice targeted numerical problems.
                    </p>
                    <button
                      onClick={() => onNavigate('practice', { topic: t.topic })}
                      className="mt-1 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-medium flex items-center gap-1 transition"
                    >
                      <span>Take Practice Quiz</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-200">All Topics in Good Standing</p>
                <p className="text-[11px]">No critical prerequisite deficits detected.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={() => onNavigate('practice')}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-2 transition"
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>Generate Comprehensive Exam</span>
            </button>
          </div>
        </div>
      </div>

      {/* Course Switcher Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white">Your Registered Courses</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {courses.map((c) => {
            const isSelected = activeCourse?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setActiveCourse(c)}
                className={`p-5 rounded-2xl border transition cursor-pointer relative ${
                  isSelected
                    ? 'bg-slate-800/90 border-blue-500 shadow-lg shadow-blue-500/10'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Active
                  </span>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{c.title}</h3>
                    <p className="text-[11px] text-slate-400 font-mono">{c.subject_code} • {c.category}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                  {c.description}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/80 pt-3">
                  <span>{c.document_count || 0} Documents</span>
                  <span>{c.conversation_count || 0} Study Sessions</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
