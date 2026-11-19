import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  BookOpen, 
  HelpCircle, 
  Plus, 
  ChevronRight, 
  ExternalLink, 
  AlertCircle,
  FileText,
  Lightbulb,
  Cpu,
  Brain,
  Layers,
  ArrowRight,
  GraduationCap
} from 'lucide-react';
import { Course, Conversation, Message, Citation } from '../../types';
import { MathText } from '../common/MathText';

interface TutorViewProps {
  activeCourse: Course | null;
  initialMode?: string;
}

export const TutorView: React.FC<TutorViewProps> = ({ activeCourse, initialMode }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [mode, setMode] = useState<string>(initialMode || 'zero');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const MODES = [
    { id: 'zero', label: 'Learn From Zero', desc: 'No prior assumptions. Intuition -> Principles -> Math -> Applications.' },
    { id: 'deepdive', label: 'Concept Deep Dive', desc: 'Formal definition, derivation, boundary limits, and physical meaning.' },
    { id: 'guided', label: 'Guided Problem Solving', desc: 'Given, Find, Assumptions, Granular steps with dimension checks.' },
    { id: 'socratic', label: 'Socratic Teaching', desc: 'Guiding reflective questions so you discover the principles yourself.' },
    { id: 'exam_prep', label: 'Exam Preparation', desc: 'University examination problems, marking rubrics, and traps.' },
  ];

  // Load conversations when active course changes
  useEffect(() => {
    if (!activeCourse) return;
    loadConversations();
  }, [activeCourse]);

  const loadConversations = async () => {
    if (!activeCourse) return;
    try {
      const res = await fetch(`/api/tutor/conversations/${activeCourse.id}`);
      const data = await res.json();
      setConversations(data);
      if (data.length > 0) {
        setActiveConv(data[0]);
        loadMessages(data[0].id);
      } else {
        // Create initial conversation
        createNewConversation();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const createNewConversation = async (forcedMode?: string) => {
    if (!activeCourse) return;
    try {
      const res = await fetch('/api/tutor/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: activeCourse.id,
          title: 'New Study Session',
          mode: forcedMode || mode
        })
      });
      const newConv = await res.json();
      setConversations(prev => [newConv, ...prev]);
      setActiveConv(newConv);
      setMessages([]);
    } catch (e) {
      console.error(e);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/tutor/conversations/${convId}/messages`);
      const data = await res.json();
      setMessages(data);
      scrollToBottom();
    } catch (e) {
      console.error(e);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || !activeConv || isLoading) return;

    const userTempMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConv.id,
      role: 'user',
      content: textToSend,
      mode: mode,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userTempMsg]);
    setInputText('');
    setIsLoading(true);
    scrollToBottom();

    try {
      const res = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: activeConv.id,
          content: textToSend,
          mode: mode
        })
      });
      const assistantMsg = await res.json();
      setMessages(prev => [...prev, assistantMsg]);
      scrollToBottom();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const insertMathSnippet = (snippet: string) => {
    setInputText(prev => prev + snippet);
  };

  return (
    <div className="flex h-full overflow-hidden bg-slate-950">
      {/* Left Chat History Pane */}
      <div className="w-64 border-r border-slate-800 bg-slate-900/60 flex flex-col h-full flex-shrink-0">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300">Study Sessions</span>
          <button
            onClick={() => createNewConversation()}
            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm"
            title="Start New Session"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map(c => {
            const isSelected = activeConv?.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setActiveConv(c);
                  setMode(c.mode || 'zero');
                  loadMessages(c.id);
                }}
                className={`w-full text-left p-2.5 rounded-xl text-xs transition flex flex-col gap-1 ${
                  isSelected
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <span className="font-semibold truncate">{c.title}</span>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span className="capitalize">{c.mode}</span>
                  <span>{new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Current Knowledge Base Scope */}
        <div className="p-3 border-t border-slate-800 bg-slate-900 text-slate-400 text-[11px] space-y-1">
          <p className="font-semibold text-slate-300 truncate">{activeCourse?.title}</p>
          <p className="text-[10px] text-slate-500">Grounded in course docs only</p>
        </div>
      </div>

      {/* Main Conversation Canvas */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mode Selector Header Bar */}
        <div className="p-3 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between gap-4 overflow-x-auto flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-400">Teaching Mode:</span>
            {MODES.map(m => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  title={m.desc}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/50'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-slate-500 hidden xl:block font-mono">
            {MODES.find(m => m.id === mode)?.desc}
          </div>
        </div>

        {/* Chat Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 mx-auto flex items-center justify-center shadow-lg">
                <Sparkles className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  University Professor Ready: {activeCourse?.title}
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Ask any question, request a full theoretical derivation, or submit an exam problem.
                </p>
              </div>

              {/* Sample Prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {[
                  "Explain Newton's Second Law from zero with real physical intuition",
                  "Why does a block on an incline experience a normal force N = mg*cos(θ)?",
                  "Calculate the derivative of x^3 + 4*x^2 - 7*x + 10 step-by-step",
                  "Test my understanding of dynamic equilibrium Socratically"
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(sample)}
                    className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/60 transition text-xs text-slate-300 flex items-start gap-2.5 group"
                  >
                    <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5 group-hover:scale-110 transition" />
                    <span className="leading-relaxed">{sample}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex gap-4 max-w-4xl ${isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0 mt-1">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                  )}

                  <div className={`space-y-3 rounded-2xl p-5 text-sm ${
                    isUser
                      ? 'bg-blue-600 text-white max-w-xl shadow-md shadow-blue-600/10'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 flex-1 shadow-md'
                  }`}>
                    {/* Header Tag for Mode */}
                    {m.mode && !isUser && (
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                          {m.mode} Pedagogy Mode
                        </span>
                        {m.pedagogical_meta?.provider && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {m.pedagogical_meta.provider}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div className="leading-relaxed">
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      ) : (
                        <MathText content={m.content} />
                      )}
                    </div>

                    {/* Step-by-Step Math Derivations Accordion */}
                    {m.math_steps && m.math_steps.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                        <p className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                          <Brain className="w-3.5 h-3.5" />
                          <span>Formal Mathematical Step Derivations</span>
                        </p>
                        <div className="space-y-2">
                          {m.math_steps.map((step, sIdx) => (
                            <div key={sIdx} className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1">
                              <span className="font-semibold text-slate-300">
                                Step {step.step}: {step.title}
                              </span>
                              <p className="text-slate-400 text-[11px]">{step.explanation}</p>
                              <div className="pt-1">
                                <MathText content={`$$${step.math}$$`} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Citations Badges */}
                    {m.citations && m.citations.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-800/80">
                        <p className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                          <span>Verified Course Provenance Citations:</span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {m.citations.map((c, cIdx) => (
                            <button
                              key={cIdx}
                              onClick={() => setSelectedCitation(c)}
                              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs text-blue-300 flex items-center gap-1.5 transition"
                            >
                              <FileText className="w-3 h-3 text-blue-400" />
                              <span>{c.filename}</span>
                              <span className="text-[10px] text-slate-400 font-mono">p. {c.page_number}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {isLoading && (
            <div className="flex gap-4 max-w-4xl mr-auto">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0 animate-pulse">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce delay-100" />
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce delay-200" />
                <span>Professor is formulating 10-step pedagogical lesson...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Math Quick Symbols & Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 space-y-2">
          {/* Math toolbar buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-slate-400">
            <span className="text-[10px] font-mono uppercase text-slate-500 pr-1">Insert:</span>
            {[
              { label: '∫ dx', snippet: ' \\int f(x) \\, dx ' },
              { label: 'd/dx', snippet: ' \\frac{d}{dx} ' },
              { label: 'Σ F', snippet: ' \\sum F ' },
              { label: '√x', snippet: ' \\sqrt{x} ' },
              { label: 'x²', snippet: '^2' },
              { label: 'θ', snippet: '\\theta' },
              { label: 'μ', snippet: '\\mu' },
              { label: 'm·a', snippet: ' m \\cdot a ' }
            ].map((btn, bIdx) => (
              <button
                key={bIdx}
                type="button"
                onClick={() => insertMathSnippet(btn.snippet)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700/60 transition"
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Text Input Row */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask anything, e.g. 'Derive kinetic energy equation' or 'Explain Chapter 3'..."
              className="flex-1 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-blue-500 transition placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center gap-2 shadow-md shadow-blue-600/30 transition flex-shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>Ask</span>
            </button>
          </form>
        </div>
      </div>

      {/* Citation Inspector Slide-over Drawer */}
      {selectedCitation && (
        <div className="w-80 border-l border-slate-800 bg-slate-900 p-5 flex flex-col justify-between flex-shrink-0 animate-in slide-in-from-right duration-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span>Citation Provenance</span>
              </span>
              <button
                onClick={() => setSelectedCitation(null)}
                className="text-slate-400 hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-200">{selectedCitation.filename}</p>
              <div className="flex items-center gap-2 text-[11px] text-blue-400 font-mono">
                <span>Page {selectedCitation.page_number}</span>
                {selectedCitation.chapter && <span>• {selectedCitation.chapter}</span>}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed max-h-96 overflow-y-auto">
              <p className="font-semibold text-slate-200 mb-1">{selectedCitation.heading || 'Excerpt'}:</p>
              <p className="text-slate-400 italic">"{selectedCitation.snippet}"</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500">
            Ground-truth academic citation extracted directly from uploaded file.
          </div>
        </div>
      )}
    </div>
  );
};
