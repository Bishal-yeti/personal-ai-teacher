import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Sparkles, 
  BookOpen, 
  Calculator, 
  Eye, 
  Award, 
  BarChart3, 
  FileText, 
  Settings, 
  PlusCircle, 
  GraduationCap, 
  ChevronDown, 
  Cpu, 
  Flame, 
  Sigma,
  FolderOpen
} from 'lucide-react';
import { Course } from '../../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  courses: Course[];
  activeCourse: Course | null;
  setActiveCourse: (course: Course) => void;
  onOpenCreateCourse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  courses,
  activeCourse,
  setActiveCourse,
  onOpenCreateCourse
}) => {
  const [courseDropdownOpen, setCourseDropdownOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tutor', label: 'AI Professor Tutor', icon: Sparkles, badge: '5 Modes' },
    { id: 'materials', label: 'Study Materials & Vault', icon: BookOpen },
    { id: 'solver', label: 'Math & Physics Solver', icon: Calculator, badge: 'SymPy' },
    { id: 'visualizer', label: 'Interactive Visuals', icon: Eye, badge: 'Live' },
    { id: 'practice', label: 'Practice & Exam Engine', icon: Award },
    { id: 'analytics', label: 'Mastery & Study Planner', icon: BarChart3 },
    { id: 'notes', label: 'Notes & Revision Sheets', icon: FileText },
    { id: 'settings', label: 'Settings & AI Keys', icon: Settings },
  ];

  const getCourseIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Cpu': return <Cpu className="w-4 h-4 text-blue-400" />;
      case 'Flame': return <Flame className="w-4 h-4 text-amber-500" />;
      case 'Sigma': return <Sigma className="w-4 h-4 text-purple-400" />;
      default: return <GraduationCap className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen select-none flex-shrink-0">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
            Personal AI Teacher
          </h1>
          <p className="text-[11px] text-slate-400 font-mono">Autonomous Study Assist</p>
        </div>
      </div>

      {/* Course Context Selector */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/40">
        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 px-1">
          Active Subject & Knowledge Base
        </label>
        
        <div className="relative">
          <button
            onClick={() => setCourseDropdownOpen(!courseDropdownOpen)}
            className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-left transition"
          >
            <div className="flex items-center gap-2 min-w-0">
              {getCourseIcon(activeCourse?.icon)}
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {activeCourse?.title || 'Select Subject'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {activeCourse?.category || 'General'} • {activeCourse?.subject_code || 'CODE'}
                </p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-1" />
          </button>

          {/* Dropdown Menu */}
          {courseDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl py-1 z-50">
              <div className="max-h-48 overflow-y-auto">
                {courses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveCourse(c);
                      setCourseDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-700/60 transition ${
                      activeCourse?.id === c.id ? 'bg-blue-600/20 text-blue-300 font-semibold' : 'text-slate-300'
                    }`}
                  >
                    {getCourseIcon(c.icon)}
                    <span className="truncate">{c.title}</span>
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-700 mt-1 pt-1">
                <button
                  onClick={() => {
                    setCourseDropdownOpen(false);
                    onOpenCreateCourse();
                  }}
                  className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-blue-400 hover:bg-slate-700/60 transition font-medium"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Create New Course</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  isActive ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-300 border border-slate-700/50'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Course Knowledge Base Stats in Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 text-slate-400 text-[11px] space-y-1">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
            <span>Vault Materials:</span>
          </span>
          <span className="font-semibold text-slate-300">{activeCourse?.document_count || 0} files</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Active Mode:</span>
          <span className="text-emerald-400 font-mono text-[10px]">Understanding First</span>
        </div>
      </div>
    </aside>
  );
};
