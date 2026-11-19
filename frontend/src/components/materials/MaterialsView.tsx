import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  BookOpen, 
  Search, 
  Trash2, 
  Layers, 
  CheckCircle, 
  ArrowRight,
  GitCompare,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { Course, DocumentRecord } from '../../types';

interface MaterialsViewProps {
  activeCourse: Course | null;
  onMaterialsUpdated?: () => void;
}

export const MaterialsView: React.FC<MaterialsViewProps> = ({ activeCourse, onMaterialsUpdated }) => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<'lecture_notes' | 'textbook' | 'syllabus' | 'exam_paper'>('lecture_notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Cross-reference state
  const [crossTopic, setCrossTopic] = useState('friction');
  const [crossResults, setCrossResults] = useState<any | null>(null);
  const [isCrossComparing, setIsCrossComparing] = useState(false);

  useEffect(() => {
    if (!activeCourse) return;
    loadDocuments();
  }, [activeCourse]);

  const loadDocuments = async () => {
    if (!activeCourse) return;
    try {
      const res = await fetch(`/api/documents/course/${activeCourse.id}`);
      const data = await res.json();
      setDocuments(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCourse) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('course_id', activeCourse.id);
    formData.append('doc_category', uploadCategory);
    formData.append('file', file);

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        await loadDocuments();
        onMaterialsUpdated?.();
      } else {
        const err = await res.json();
        alert(`Upload error: ${err.detail || 'Failed to upload'}`);
      }
    } catch (err) {
      alert(`Upload error: ${err}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document from the knowledge base?')) return;
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.id !== docId));
        onMaterialsUpdated?.();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !activeCourse) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/documents/search?course_id=${activeCourse.id}&query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.hits || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCrossReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crossTopic.trim() || !activeCourse) return;
    setIsCrossComparing(true);
    try {
      const res = await fetch(`/api/documents/cross-reference?course_id=${activeCourse.id}&topic=${encodeURIComponent(crossTopic)}`);
      const data = await res.json();
      setCrossResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCrossComparing(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header & Upload Box */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <span>Course Knowledge Vault: {activeCourse?.title}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Upload lecture notes, textbooks, and problem sheets. The AI indexes pages, formulas, and headings with zero hallucinations.
          </p>
        </div>

        {/* Upload Trigger Form */}
        <div className="flex items-center gap-3">
          <select
            value={uploadCategory}
            onChange={(e: any) => setUploadCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none"
          >
            <option value="lecture_notes">Lecture Notes</option>
            <option value="textbook">Reference Textbook</option>
            <option value="syllabus">Syllabus / Curriculum</option>
            <option value="exam_paper">Past Exam Papers</option>
          </select>

          <label className={`px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer transition shadow-md shadow-blue-600/20 ${
            isUploading ? 'opacity-50 pointer-events-none' : ''
          }`}>
            <Upload className="w-4 h-4" />
            <span>{isUploading ? 'Extracting Pages...' : 'Upload File'}</span>
            <input
              type="file"
              accept=".pdf,.docx,.doc,.pptx,.txt,.md,.xlsx,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 2 Tabs/Panels: Documents List & Cross-Referencer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Uploaded Materials & In-Vault Semantic Search */}
        <div className="lg:col-span-2 space-y-6">
          {/* Documents Table */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Ingested Course Documents ({documents.length})</span>
              <span className="text-[11px] text-slate-400 font-normal">PDF • DOCX • PPTX • TXT • Excel</span>
            </h2>

            {documents.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
                <FileText className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-300 font-semibold">Vault is Empty for this Course</p>
                <p className="text-[11px] text-slate-500">Upload your PDF textbook or lecture slides above to build the knowledge base.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-800 flex items-center justify-between gap-3 hover:bg-slate-800/80 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                        <FileCheck className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-200 truncate">{doc.filename}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span className="px-1.5 py-0.2 rounded bg-slate-700/60 text-slate-300 uppercase">
                            {doc.doc_category.replace('_', ' ')}
                          </span>
                          <span>• {doc.page_count} Pages</span>
                          <span>• {doc.chunk_count} Chunks</span>
                          <span>• {(doc.file_size / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                      title="Delete from Vault"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Searchable Knowledge Index Inspector */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-400" />
              <span>Semantic Knowledge Search</span>
            </h2>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search formulas, concepts, or page sections..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="space-y-3 pt-2">
                {searchResults.map((hit, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-blue-300 font-semibold">
                      <span>{hit.filename} (Page {hit.page_number})</span>
                      <span className="text-[10px] font-mono text-slate-500">BM25: {hit.score}</span>
                    </div>
                    {hit.heading && <p className="text-[11px] font-medium text-slate-300">Heading: {hit.heading}</p>}
                    <p className="text-slate-400 leading-relaxed text-[11px] bg-slate-950/60 p-2 rounded border border-slate-800/80">
                      "{hit.content}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Cross-Reference & Source Comparator */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-emerald-400" />
              <span>Cross-Source Comparison</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Compare explanations between student lecture notes vs official textbooks to spot convention differences.
            </p>
          </div>

          <form onSubmit={handleCrossReference} className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Topic to Compare:</label>
              <input
                type="text"
                value={crossTopic}
                onChange={(e) => setCrossTopic(e.target.value)}
                placeholder="e.g. friction, work, newton"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={isCrossComparing}
              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition"
            >
              {isCrossComparing ? 'Comparing Sources...' : 'Compare Notes vs Textbook'}
            </button>
          </form>

          {crossResults && (
            <div className="space-y-4 pt-3 border-t border-slate-800 text-xs">
              <div>
                <p className="font-semibold text-blue-300 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Course Lecture Notes ({crossResults.lecture_notes?.length || 0})</span>
                </p>
                {crossResults.lecture_notes?.map((n: any, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 mb-2">
                    <p className="font-mono text-[10px] text-blue-400">{n.filename} - p. {n.page_number}</p>
                    <p className="text-slate-300 text-[11px] mt-1 line-clamp-3">{n.content}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="font-semibold text-amber-300 mb-1 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Reference Textbooks ({crossResults.reference_textbooks?.length || 0})</span>
                </p>
                {crossResults.reference_textbooks?.map((t: any, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 mb-2">
                    <p className="font-mono text-[10px] text-amber-400">{t.filename} - p. {t.page_number}</p>
                    <p className="text-slate-300 text-[11px] mt-1 line-clamp-3">{t.content}</p>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] leading-relaxed">
                <strong>Pedagogical Insight:</strong> {crossResults.recommendation}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
