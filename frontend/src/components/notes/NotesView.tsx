import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Bookmark, 
  Plus, 
  Trash2, 
  Download, 
  Sparkles, 
  Tag, 
  Clock, 
  Save,
  Check
} from 'lucide-react';
import { Course, Note } from '../../types';
import { MathText } from '../common/MathText';

interface NotesViewProps {
  activeCourse: Course | null;
}

export const NotesView: React.FC<NotesViewProps> = ({ activeCourse }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isBookmark, setIsBookmark] = useState(false);
  const [isGeneratingSheet, setIsGeneratingSheet] = useState(false);

  useEffect(() => {
    if (!activeCourse) return;
    loadNotes();
  }, [activeCourse]);

  const loadNotes = async () => {
    if (!activeCourse) return;
    try {
      const res = await fetch(`/api/notes/course/${activeCourse.id}`);
      const data = await res.json();
      setNotes(data);
      if (data.length > 0 && !selectedNote) {
        setSelectedNote(data[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateNew = () => {
    setSelectedNote(null);
    setNoteTitle('');
    setNoteContent('');
    setIsBookmark(false);
    setIsEditing(true);
  };

  const handleSaveNote = async () => {
    if (!activeCourse || !noteTitle.trim()) return;
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: activeCourse.id,
          title: noteTitle,
          content: noteContent,
          tags: ['Personal Note'],
          is_bookmark: isBookmark
        })
      });
      if (res.ok) {
        const saved = await res.json();
        setIsEditing(false);
        await loadNotes();
        setSelectedNote(saved);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
      setNotes(prev => prev.filter(n => n.id !== noteId));
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateRevisionSheet = async () => {
    if (!activeCourse) return;
    setIsGeneratingSheet(true);
    try {
      const res = await fetch('/api/notes/generate-revision-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: activeCourse.id,
          title: `${activeCourse.title} - High-Yield Formula Sheet`,
          topics: ["Newton's Laws of Motion", "Kinematics of Particles", "Work and Kinetic Energy"]
        })
      });
      if (res.ok) {
        await loadNotes();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingSheet(false);
    }
  };

  const handleExportMarkdown = () => {
    if (!selectedNote) return;
    const blob = new Blob([selectedNote.content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedNote.title.replace(/\s+/g, '_')}.md`;
    a.click();
  };

  return (
    <div className="flex h-full overflow-hidden bg-slate-950">
      {/* Left List Pane */}
      <div className="w-80 border-r border-slate-800 bg-slate-900/60 flex flex-col h-full flex-shrink-0">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Notes & Revision Sheets</span>
            </h2>
            <p className="text-[10px] text-slate-400">{notes.length} saved documents</p>
          </div>
          <button
            onClick={handleCreateNew}
            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition"
            title="Create Note"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Generate Revision Sheet Quick Button */}
        <div className="p-3 border-b border-slate-800 bg-slate-900/40">
          <button
            onClick={handleGenerateRevisionSheet}
            disabled={isGeneratingSheet}
            className="w-full py-2 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isGeneratingSheet ? 'Synthesizing...' : 'Generate Revision Formula Sheet'}</span>
          </button>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {notes.map((n) => {
            const isSelected = selectedNote?.id === n.id;
            return (
              <div
                key={n.id}
                onClick={() => {
                  setSelectedNote(n);
                  setIsEditing(false);
                }}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500/40 text-blue-200'
                    : 'bg-slate-800/40 border-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold truncate max-w-[190px]">{n.title}</span>
                  {n.is_bookmark && <Bookmark className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 fill-amber-400" />}
                </div>
                <p className="text-slate-400 text-[11px] line-clamp-2 leading-relaxed">
                  {n.content}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 font-mono">
                  <span>{new Date(n.updated_at).toLocaleDateString()}</span>
                  <span>{n.tags?.[0] || 'Note'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Note Preview / Editor Pane */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 p-6">
        {isEditing ? (
          <div className="flex-1 flex flex-col space-y-4 max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Note Title or Topic..."
                className="text-lg font-bold bg-transparent text-white focus:outline-none placeholder:text-slate-500 flex-1 mr-4"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBookmark(!isBookmark)}
                  className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition ${
                    isBookmark ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Bookmark</span>
                </button>
                <button
                  onClick={handleSaveNote}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Note</span>
                </button>
              </div>
            </div>

            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write your study notes here. Supports KaTeX math ($...$ or $$...$$) and Markdown..."
              className="flex-1 w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 text-sm text-slate-100 font-mono focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
            />
          </div>
        ) : selectedNote ? (
          <div className="flex-1 flex flex-col space-y-6 max-w-4xl mx-auto w-full overflow-y-auto">
            {/* Note Header Bar */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h1 className="text-xl font-bold text-white">{selectedNote.title}</h1>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Last updated: {new Date(selectedNote.updated_at).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportMarkdown}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Markdown</span>
                </button>
                <button
                  onClick={() => handleDelete(selectedNote.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-800 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Note Content View */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <MathText content={selectedNote.content} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
            Select a note or create a new one to begin studying.
          </div>
        )}
      </div>
    </div>
  );
};
