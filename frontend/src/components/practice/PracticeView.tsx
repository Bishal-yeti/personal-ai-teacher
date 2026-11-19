import React, { useState } from 'react';
import { 
  Award, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  HelpCircle, 
  ArrowRight, 
  RotateCcw, 
  Sparkles,
  CheckCircle2,
  ListFilter
} from 'lucide-react';
import { Course, QuizQuestion, QuizFeedback } from '../../types';

interface PracticeViewProps {
  activeCourse: Course | null;
  initialTopic?: string;
}

export const PracticeView: React.FC<PracticeViewProps> = ({ activeCourse, initialTopic }) => {
  const [topic, setTopic] = useState<string>(initialTopic || "Newton's Laws of Motion");
  const [difficulty, setDifficulty] = useState<string>('intermediate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<{ score: number; total_points: number; percentage: number; feedback: QuizFeedback[] } | null>(null);

  const TOPICS = [
    "Newton's Laws of Motion",
    "Kinematics of Particles",
    "Work and Kinetic Energy",
    "Planar Rigid Body Motion"
  ];

  const handleGenerateQuiz = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeCourse) return;

    setIsGenerating(true);
    setQuizResult(null);
    setAnswers({});

    try {
      const res = await fetch('/api/practice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: activeCourse.id,
          topic: topic,
          difficulty: difficulty
        })
      });
      const data = await res.json();
      setAssessmentId(data.assessment_id);
      setQuestions(data.questions);
    } catch (err) {
      alert(`Error generating quiz: ${err}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!assessmentId || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/practice/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment_id: assessmentId,
          answers: answers
        })
      });
      const data = await res.json();
      setQuizResult(data);
    } catch (err) {
      alert(`Error submitting quiz: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          <span>Practice & Assessment Engine: {activeCourse?.title}</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Assessments directly update your mastery profile. Diagnostic feedback pinpoints prerequisite gaps and specific cognitive traps.
        </p>
      </div>

      {/* Quiz Generation Bar */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-blue-400" />
          <span>Configure Practice Assessment</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">Select Topic:</label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200"
            >
              {TOPICS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">Difficulty Tier:</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200"
            >
              <option value="beginner">Beginner Fundamentals</option>
              <option value="intermediate">Intermediate Application</option>
              <option value="advanced">Advanced Derivation</option>
              <option value="exam">University Final Exam</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => handleGenerateQuiz()}
              disabled={isGenerating}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Generating...' : 'Start Assessment'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quiz Questionnaire */}
      {questions.length > 0 && !quizResult && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Assessment in progress • Answer all questions before submitting</span>
            <span className="font-mono">{questions.length} Questions</span>
          </div>

          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div key={q.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 font-mono text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-sm font-semibold text-slate-100 leading-relaxed">
                    {q.question}
                  </p>
                </div>

                {/* Multiple Choice Options */}
                {q.type === 'multiple_choice' && q.options && (
                  <div className="space-y-2 pl-9">
                    {q.options.map((opt) => {
                      const isSelected = answers[q.id] === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.key }))}
                          className={`w-full text-left p-3 rounded-xl border text-xs flex items-center gap-3 transition ${
                            isSelected
                              ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                              : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-md font-mono text-[11px] font-bold flex items-center justify-center ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
                          }`}>
                            {opt.key}
                          </span>
                          <span className="leading-relaxed">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Numerical Input */}
                {q.type === 'numerical' && (
                  <div className="pl-9 space-y-2">
                    <div className="flex items-center gap-2 max-w-xs">
                      <input
                        type="number"
                        step="any"
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder="Enter numerical answer"
                        className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500 flex-1"
                      />
                      {q.unit && <span className="text-xs text-slate-400 font-mono">{q.unit}</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSubmitQuiz}
              disabled={isSubmitting || Object.keys(answers).length < questions.length}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Grading Responses...' : 'Submit Assessment for Diagnostic Grading'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Quiz Diagnostic Results */}
      {quizResult && (
        <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
          {/* Summary Score Banner */}
          <div className={`p-7 rounded-2xl border text-center space-y-3 ${
            quizResult.percentage >= 70
              ? 'bg-gradient-to-b from-emerald-950/60 to-slate-900 border-emerald-500/40 text-emerald-200'
              : 'bg-gradient-to-b from-amber-950/60 to-slate-900 border-amber-500/40 text-amber-200'
          }`}>
            <h2 className="text-2xl font-black text-white">
              Assessment Score: {quizResult.percentage}% ({quizResult.score} / {quizResult.total_points})
            </h2>
            <p className="text-xs max-w-lg mx-auto leading-relaxed text-slate-300">
              {quizResult.percentage >= 70
                ? 'Strong conceptual understanding demonstrated. Your genuine mastery score has been updated.'
                : 'Key prerequisite misconceptions identified. Review the detailed feedback and explanations below.'}
            </p>
            <div className="pt-2">
              <button
                onClick={() => handleGenerateQuiz()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-2 transition border border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Practice Similar Problem Set</span>
              </button>
            </div>
          </div>

          {/* Diagnostic Breakdown per Question */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white">Detailed Diagnostic Breakdown</h3>
            {quizResult.feedback.map((fb, idx) => (
              <div
                key={idx}
                className={`p-5 rounded-2xl border space-y-3 ${
                  fb.is_correct ? 'bg-slate-900/80 border-slate-800' : 'bg-red-950/10 border-red-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    Question {idx + 1}
                  </span>
                  <span className={`text-xs font-bold flex items-center gap-1 ${
                    fb.is_correct ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {fb.is_correct ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    <span>{fb.is_correct ? 'Correct' : 'Needs Review'}</span>
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <p className="text-slate-400">
                    Your answer: <span className="font-mono text-slate-200">{String(fb.user_answer)}</span>
                    {!fb.is_correct && (
                      <span className="ml-3 text-emerald-400">
                        Correct: <span className="font-mono">{String(fb.correct_answer)}</span>
                      </span>
                    )}
                  </p>
                  <p className="text-slate-300 leading-relaxed pt-1">{fb.explanation}</p>
                </div>

                {fb.misconception && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <span className="font-bold">Identified Misconception: </span>
                      <span>{fb.misconception}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
