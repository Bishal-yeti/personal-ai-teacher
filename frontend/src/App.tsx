import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { TutorView } from './components/tutor/TutorView';
import { MaterialsView } from './components/materials/MaterialsView';
import { SolverView } from './components/solver/SolverView';
import { VisualizerView } from './components/visualizer/VisualizerView';
import { PracticeView } from './components/practice/PracticeView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { NotesView } from './components/notes/NotesView';
import { SettingsView } from './components/settings/SettingsView';
import { CreateCourseModal } from './components/common/CreateCourseModal';
import { Course } from './types';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeProvider, setActiveProvider] = useState<string>('Local Expert');
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState<boolean>(false);
  const [navigationOpts, setNavigationOpts] = useState<any>(null);

  // Initial data loading
  useEffect(() => {
    loadCourses();
    loadSystemStatus();
  }, []);

  const loadCourses = async () => {
    try {
      const res = await fetch('/api/courses');
      const data = await res.json();
      setCourses(data);
      if (data.length > 0 && !activeCourse) {
        setActiveCourse(data[0]);
      }
    } catch (e) {
      console.error('Failed to load courses', e);
    }
  };

  const loadSystemStatus = async () => {
    try {
      const res = await fetch('/api/settings/status');
      const data = await res.json();
      setActiveProvider(data.llm_providers?.active_provider || 'offline');
    } catch (e) {
      console.error(e);
    }
  };

  const handleNavigate = (tab: string, opts?: any) => {
    setCurrentTab(tab);
    setNavigationOpts(opts || null);
  };

  const handleCourseCreated = (newCourse: Course) => {
    setCourses(prev => [...prev, newCourse]);
    setActiveCourse(newCourse);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          setNavigationOpts(null);
        }}
        courses={courses}
        activeCourse={activeCourse}
        setActiveCourse={setActiveCourse}
        onOpenCreateCourse={() => setIsCreateCourseOpen(true)}
      />

      {/* Main App Canvas */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          activeCourse={activeCourse}
          onQuickAsk={() => handleNavigate('tutor', { mode: 'zero' })}
          onQuickUpload={() => handleNavigate('materials')}
          activeProvider={activeProvider}
        />

        <main className="flex-1 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              activeCourse={activeCourse}
              courses={courses}
              setActiveCourse={setActiveCourse}
              onNavigate={handleNavigate}
            />
          )}

          {currentTab === 'tutor' && (
            <TutorView
              activeCourse={activeCourse}
              initialMode={navigationOpts?.mode}
            />
          )}

          {currentTab === 'materials' && (
            <MaterialsView
              activeCourse={activeCourse}
              onMaterialsUpdated={loadCourses}
            />
          )}

          {currentTab === 'solver' && (
            <SolverView activeCourse={activeCourse} />
          )}

          {currentTab === 'visualizer' && (
            <VisualizerView activeCourse={activeCourse} />
          )}

          {currentTab === 'practice' && (
            <PracticeView
              activeCourse={activeCourse}
              initialTopic={navigationOpts?.topic}
            />
          )}

          {currentTab === 'analytics' && (
            <AnalyticsView activeCourse={activeCourse} />
          )}

          {currentTab === 'notes' && (
            <NotesView activeCourse={activeCourse} />
          )}

          {currentTab === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* Course Creation Modal */}
      <CreateCourseModal
        isOpen={isCreateCourseOpen}
        onClose={() => setIsCreateCourseOpen(false)}
        onCourseCreated={handleCourseCreated}
      />
    </div>
  );
}

export default App;
