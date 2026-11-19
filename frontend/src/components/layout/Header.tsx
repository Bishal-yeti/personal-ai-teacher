import React from 'react';
import { Sparkles, ShieldCheck, HelpCircle, Upload, Plus } from 'lucide-react';
import { Course } from '../../types';

interface HeaderProps {
  activeCourse: Course | null;
  onQuickAsk: () => void;
  onQuickUpload: () => void;
  activeProvider: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeCourse,
  onQuickAsk,
  onQuickUpload,
  activeProvider
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 flex items-center justify-between z-10 flex-shrink-0">
      {/* Course Context & Philosophy Badge */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <span>{activeCourse?.title || 'Personal AI Teacher'}</span>
        </h2>
        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="w-3 h-3" />
          <span>Understanding &gt; Answers</span>
        </span>
      </div>

      {/* Right Actions & Status */}
      <div className="flex items-center gap-3">
        {/* Provider Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>AI Engine:</span>
          <span className="font-mono text-blue-400 uppercase font-semibold">
            {activeProvider || 'Local Expert'}
          </span>
        </div>

        {/* Action Buttons */}
        <button
          onClick={onQuickUpload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Material</span>
        </button>

        <button
          onClick={onQuickAsk}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-600/30 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Ask AI Professor</span>
        </button>
      </div>
    </header>
  );
};
