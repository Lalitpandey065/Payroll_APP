import React, { useState, useEffect, useCallback } from 'react';
import { Briefcase, Plus, Trash2, Save, X, Search } from 'lucide-react';
import { useCompanyStore } from '../../store/company.store';

const BLANK = { name: '', profile: '', category: '' };

export default function DesignationMaster() {
  const activeCompany = useCompanyStore(s => s.activeCompany);
  const [list, setList]       = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm]       = useState(BLANK);
  const [mode, setMode]       = useState('view');
  const [search, setSearch]   = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const companyId = activeCompany?.id;

  const load = useCallback(async () => {
    if (!companyId) return;
    const res = await window.api.masters.getDesignations(companyId);
    if (res.success) setList(res.data);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const selectRecord = (rec) => {
    setSelected(rec);
    setForm({ name: rec.name || '', profile: rec.profile || '', category: rec.category || '' });
    setMode('view');
    setError('');
  };

  const handleNew = () => {
    setSelected(null); setForm(BLANK); setMode('new'); setError('');
  };

  const handleEdit = () => { if (selected) setMode('edit'); };

  const handleCancel = () => {
    if (selected) { selectRecord(selected); } else { setMode('view'); setForm(BLANK); }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true); setError('');
    const payload = { ...form, company_id: companyId };
    const res = mode === 'new'
      ? await window.api.masters.createDesignation(payload)
      : await window.api.masters.updateDesignation(selected.id, payload);
    setSaving(false);
    if (res.success) { await load(); selectRecord(res.data); }
    else setError(res.error?.message || 'Save failed.');
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm(`Delete designation "${selected.name}"?`)) return;
    await window.api.masters.deleteDesignation(selected.id);
    setSelected(null); setForm(BLANK); setMode('view');
    await load();
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const readOnly = mode === 'view';
  const filtered = list.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  const inputCls = `w-full px-2 py-1.5 text-sm rounded border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-60`;
  const labelCls = `text-right text-xs font-medium text-[var(--text-muted)] pr-3 pt-2`;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center space-x-3 px-6 py-4 border-b border-[var(--border)] shrink-0">
        <Briefcase className="w-5 h-5 text-[var(--accent)]" />
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Master → Designation</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left list */}
        <div className="w-56 border-r border-[var(--border)] flex flex-col shrink-0 bg-[var(--bg-card)]">
          <div className="p-2 border-b border-[var(--border)]">
            <div className="relative">
              <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                className="w-full pl-6 pr-2 py-1.5 text-xs rounded border border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] p-3">No designations found.</p>
            )}
            {filtered.map(d => (
              <div
                key={d.id}
                onClick={() => selectRecord(d)}
                className={`px-3 py-2.5 text-sm cursor-pointer border-b border-[var(--border)] transition-colors
                  ${selected?.id === d.id
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                  }`}
              >
                <div className="font-medium text-xs truncate">{d.name}</div>
                {d.category && <div className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">{d.category}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Right form */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-lg space-y-4">
              {selected && (
                <div className="grid grid-cols-[140px_1fr] items-center">
                  <span className={labelCls}>Id #</span>
                  <input className={inputCls} value={selected.id?.slice(0,8).toUpperCase() || ''} disabled />
                </div>
              )}
              <div className="grid grid-cols-[140px_1fr] items-center">
                <span className={labelCls}>Name</span>
                <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} disabled={readOnly} placeholder="Designation name" />
              </div>
              <div className="grid grid-cols-[140px_1fr] items-start">
                <span className={labelCls}>Profile</span>
                <textarea
                  rows={4}
                  className={`${inputCls} resize-none`}
                  value={form.profile}
                  onChange={e => set('profile', e.target.value)}
                  disabled={readOnly}
                  placeholder="Job profile / description"
                />
              </div>
              <div className="grid grid-cols-[140px_1fr] items-center">
                <span className={labelCls}>Category</span>
                <input className={inputCls} value={form.category} onChange={e => set('category', e.target.value)} disabled={readOnly} placeholder="e.g. Staff, Worker" />
              </div>
            </div>
          </div>

          {error && (
            <div className="mx-6 mb-2 px-3 py-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</div>
          )}

          {/* Action bar */}
          <div className="border-t border-[var(--border)] px-6 py-3 flex space-x-2 shrink-0 bg-[var(--bg-card)]">
            <button onClick={handleNew} className="px-5 py-2 rounded text-sm font-semibold bg-sky-500 text-white hover:bg-sky-600 transition-colors flex items-center space-x-1.5">
              <Plus className="w-4 h-4" /><span>New</span>
            </button>
            <button onClick={handleEdit} disabled={!selected || mode !== 'view'} className="px-5 py-2 rounded text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 transition-colors">
              Edit
            </button>
            <button onClick={handleSave} disabled={readOnly || saving} className="px-5 py-2 rounded text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors flex items-center space-x-1.5">
              <Save className="w-4 h-4" /><span>{saving ? 'Saving…' : 'Save'}</span>
            </button>
            <button onClick={handleCancel} disabled={readOnly} className="px-5 py-2 rounded text-sm font-semibold bg-slate-500 text-white hover:bg-slate-600 disabled:opacity-40 transition-colors flex items-center space-x-1.5">
              <X className="w-4 h-4" /><span>Cancel</span>
            </button>
            <button onClick={handleDelete} disabled={!selected || mode !== 'view'} className="px-5 py-2 rounded text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 transition-colors flex items-center space-x-1.5">
              <Trash2 className="w-4 h-4" /><span>Delete</span>
            </button>
          </div>
        </div>
      </div>

      {!companyId && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-[var(--text-muted)]">Please select a company first.</p>
        </div>
      )}
    </div>
  );
}
