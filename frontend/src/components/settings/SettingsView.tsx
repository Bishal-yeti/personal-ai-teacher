import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Key, 
  ShieldCheck, 
  Server, 
  Database, 
  CheckCircle2, 
  AlertCircle,
  Save,
  Lock,
  Cpu
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<any | null>(null);
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'groq' | 'anthropic'>('gemini');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/settings/status');
      const data = await res.json();
      setSystemStatus(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    setIsSavingKey(true);
    setSaveMessage('');

    try {
      const res = await fetch('/api/settings/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: provider,
          api_key: apiKeyInput.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSaveMessage(`${provider.toUpperCase()} API Key saved successfully!`);
        setApiKeyInput('');
        loadStatus();
      } else {
        alert(data.detail || 'Failed to save key');
      }
    } catch (err) {
      alert(`Error saving key: ${err}`);
    } finally {
      setIsSavingKey(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-blue-400" />
          <span>System Settings & Model Provider Configuration</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure external LLM providers (Gemini, OpenAI, Groq, Anthropic) or use the built-in offline educational tutor.
        </p>
      </div>

      {/* Provider API Key Form */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              <span>Configure AI Provider API Key</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Keys are stored securely in your private local SQLite database.
            </p>
          </div>
          <span className="text-[10px] font-mono uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Active: {systemStatus?.llm_providers?.active_provider || 'Local Expert'}
          </span>
        </div>

        <form onSubmit={handleSaveKey} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Provider:</label>
              <select
                value={provider}
                onChange={(e: any) => setProvider(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200"
              >
                <option value="gemini">Google Gemini (Recommended)</option>
                <option value="openai">OpenAI GPT-4o</option>
                <option value="groq">Groq (Ultra-Fast Llama 3)</option>
                <option value="anthropic">Anthropic Claude</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Enter {provider.toUpperCase()} API Key:
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={`AIza... or sk-...`}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={isSavingKey || !apiKeyInput.trim()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition flex-shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingKey ? 'Saving...' : 'Save Key'}</span>
                </button>
              </div>
            </div>
          </div>

          {saveMessage && (
            <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{saveMessage}</span>
            </p>
          )}
        </form>

        {/* Current Keys Status Grid */}
        <div className="pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {systemStatus?.llm_providers?.providers && Object.entries(systemStatus.llm_providers.providers).map(([pName, pData]: [string, any]) => (
            <div key={pName} className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs space-y-1">
              <span className="font-bold uppercase text-slate-300 font-mono text-[11px]">{pName}</span>
              <p className={`text-[10px] font-mono flex items-center gap-1 ${pData.configured ? 'text-emerald-400' : 'text-slate-500'}`}>
                {pData.configured ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                <span>{pData.configured ? (pData.masked_key || 'Configured') : 'Not Configured'}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* System Diagnostic Status */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-400" />
          <span>System & Database Diagnostics</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-slate-400">Total Courses</span>
            <p className="text-xl font-bold text-white mt-1">
              {systemStatus?.database_stats?.total_courses || 0}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-slate-400">Ingested Documents</span>
            <p className="text-xl font-bold text-white mt-1">
              {systemStatus?.database_stats?.total_documents || 0}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-slate-400">Indexed Chunks</span>
            <p className="text-xl font-bold text-white mt-1">
              {systemStatus?.database_stats?.indexed_chunks || 0}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-slate-400">Study Messages</span>
            <p className="text-xl font-bold text-white mt-1">
              {systemStatus?.database_stats?.total_messages || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Security & Data Privacy Notice */}
      <div className="p-5 rounded-2xl bg-blue-950/20 border border-blue-900/40 text-xs text-slate-300 space-y-2">
        <div className="flex items-center gap-2 text-blue-400 font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>Security & Educational Privacy Architecture</span>
        </div>
        <p className="leading-relaxed text-[11px] text-slate-400">
          • All uploaded files are sandboxed locally. Document content is treated strictly as untrusted academic data and sanitized against prompt injections.<br />
          • Course materials never bleed across subjects: each course maintains its own isolated searchable knowledge base.<br />
          • Citations reference exact page numbers and chapter headings verified through local token matching.
        </p>
      </div>
    </div>
  );
};
