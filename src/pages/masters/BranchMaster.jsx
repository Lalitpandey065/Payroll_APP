import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Plus, Trash2, Save, X, Search } from 'lucide-react';
import { useCompanyStore } from '../../store/company.store';

const YES_NO = ['Yes', 'No'];

const BLANK = {
  name: '', address: '',
  epf_status: 'No', epf_coverage_date: '', epf_state: '', epf_district: '', epf_number: '', epf_office_address: '',
  esi_status: 'No', esi_coverage_date: '', esic_number: '', esic_office_address: '',
  lwf_status: 'No', lwf_coverage_date: '',
  prof_tax_status: 'No', prof_tax_coverage_date: '',
  state: '', ot_percentage: 0, ot_allowances: [],
};

export default function BranchMaster() {
  const activeCompany = useCompanyStore(s => s.activeCompany);
  const [list, setList]           = useState([]);
  const [allowances, setAllowances] = useState([]);
  const [selected, setSelected]   = useState(null);
  const [form, setForm]           = useState(BLANK);
  const [mode, setMode]           = useState('view');
  const [activeTab, setActiveTab] = useState('general');
  const [search, setSearch]       = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const companyId = activeCompany?.id;

  const load = useCallback(async () => {
    if (!companyId) return;
    const res = await window.api.masters.getBranches(companyId);
    if (res.success) setList(res.data);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!companyId) return;
    window.api.setup.getAllowances(companyId).then(res => {
      if (res.success) setAllowances(res.data.filter(a => a.is_active));
    });
  }, [companyId]);

  const selectRecord = (rec) => {
    setSelected(rec);
    setForm({
      ...BLANK, ...rec,
      ot_allowances: typeof rec.ot_allowances === 'string' ? JSON.parse(rec.ot_allowances) : (rec.ot_allowances || []),
    });
    setMode('view');
    setActiveTab('general');
    setError('');
  };

  const handleNew   = () => { setSelected(null); setForm(BLANK); setMode('new'); setActiveTab('general'); setError(''); };
  const handleEdit  = () => { if (selected) setMode('edit'); };
  const handleCancel = () => { if (selected) { selectRecord(selected); } else { setMode('view'); setForm(BLANK); } };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true); setError('');
    const payload = { ...form, company_id: companyId };
    const res = mode === 'new'
      ? await window.api.masters.createBranch(payload)
      : await window.api.masters.updateBranch(selected.id, payload);
    setSaving(false);
    if (res.success) { await load(); selectRecord(res.data); }
    else setError(res.error?.message || 'Save failed.');
  };

  const handleDelete = async () => {
    if (!selected || !window.confirm(`Delete branch "${selected.name}"?`)) return;
    await window.api.masters.deleteBranch(selected.id);
    setSelected(null); setForm(BLANK); setMode('view');
    await load();
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleAllowance = (code) => {
    setForm(f => {
      const arr = f.ot_allowances || [];
      return { ...f, ot_allowances: arr.includes(code) ? arr.filter(c => c !== code) : [...arr, code] };
    });
  };

  const readOnly = mode === 'view';
  const filtered = list.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  const inputCls = `w-full px-2 py-1.5 text-sm rounded border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-60`;
  const selectCls = `w-full px-2 py-1.5 text-sm rounded border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none disabled:opacity-60`;
  const labelCls = `text-right text-xs font-medium text-[var(--text-muted)] pr-3 pt-2`;
  const sectionHead = `text-xs font-bold text-[var(--accent)] mb-2 mt-4`;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex items-center space-x-3 px-6 py-4 border-b border-[var(--border)] shrink-0">
        <MapPin className="w-5 h-5 text-[var(--accent)]" />
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Master → Branch</h1>
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
            {filtered.length === 0 && <p className="text-xs text-[var(--text-muted)] p-3">No branches found.</p>}
            {filtered.map(b => (
              <div
                key={b.id}
                onClick={() => selectRecord(b)}
                className={`px-3 py-2.5 text-sm cursor-pointer border-b border-[var(--border)] transition-colors
                  ${selected?.id === b.id ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}`}
              >
                <div className="font-medium text-xs truncate">{b.name}</div>
                {b.state && <div className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">{b.state}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Right form */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-[var(--border)] px-4 pt-2 shrink-0">
            {['General', 'Overtime'].map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t.toLowerCase())}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors mr-1
                  ${activeTab === t.toLowerCase()
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {/* ── GENERAL ── */}
            {activeTab === 'general' && (
              <div className="max-w-2xl space-y-2">
                {selected && (
                  <div className="grid grid-cols-[160px_1fr] items-center">
                    <span className={labelCls}>Id #</span>
                    <input className={inputCls} value={selected.id?.slice(0,8).toUpperCase() || ''} disabled />
                  </div>
                )}
                <div className="grid grid-cols-[160px_1fr] items-center">
                  <span className={labelCls}>Name</span>
                  <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} disabled={readOnly} placeholder="Branch / Location name" />
                </div>
                <div className="grid grid-cols-[160px_1fr] items-start">
                  <span className={labelCls}>Address</span>
                  <textarea rows={3} className={`${inputCls} resize-none`} value={form.address} onChange={e => set('address', e.target.value)} disabled={readOnly} />
                </div>

                {/* EPF */}
                <p className={sectionHead}>E.P.F. Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid grid-cols-[130px_1fr] items-center">
                    <span className={labelCls}>E.P.F. Status</span>
                    <select className={selectCls} value={form.epf_status} onChange={e => set('epf_status', e.target.value)} disabled={readOnly}>
                      {YES_NO.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-[100px_1fr] items-center">
                    <span className={labelCls}>Coverage Date</span>
                    <input type="date" className={inputCls} value={form.epf_coverage_date} onChange={e => set('epf_coverage_date', e.target.value)} disabled={readOnly} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[['epf_state','EPF State'],['epf_district','EPF District'],['epf_number','EPF Number']].map(([k,l]) => (
                    <div key={k}>
                      <label className="block text-xs text-[var(--text-muted)] mb-1">{l}</label>
                      <input className={inputCls} value={form[k]} onChange={e => set(k, e.target.value)} disabled={readOnly} />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">EPF Office Address</label>
                  <textarea rows={2} className={`${inputCls} resize-none`} value={form.epf_office_address} onChange={e => set('epf_office_address', e.target.value)} disabled={readOnly} />
                </div>

                {/* ESI */}
                <p className={sectionHead}>E.S.I. Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid grid-cols-[130px_1fr] items-center">
                    <span className={labelCls}>E.S.I. Status</span>
                    <select className={selectCls} value={form.esi_status} onChange={e => set('esi_status', e.target.value)} disabled={readOnly}>
                      {YES_NO.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-[100px_1fr] items-center">
                    <span className={labelCls}>Coverage Date</span>
                    <input type="date" className={inputCls} value={form.esi_coverage_date} onChange={e => set('esi_coverage_date', e.target.value)} disabled={readOnly} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[var(--text-muted)] mb-1">ESIC Number</label>
                    <input className={inputCls} value={form.esic_number} onChange={e => set('esic_number', e.target.value)} disabled={readOnly} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">ESIC Office Address</label>
                  <textarea rows={2} className={`${inputCls} resize-none`} value={form.esic_office_address} onChange={e => set('esic_office_address', e.target.value)} disabled={readOnly} />
                </div>

                {/* LWF */}
                <p className={sectionHead}>L.W.F. &amp; Prof. Tax</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid grid-cols-[130px_1fr] items-center">
                    <span className={labelCls}>L.W.F. Status</span>
                    <select className={selectCls} value={form.lwf_status} onChange={e => set('lwf_status', e.target.value)} disabled={readOnly}>
                      {YES_NO.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-[100px_1fr] items-center">
                    <span className={labelCls}>LWF Date</span>
                    <input type="date" className={inputCls} value={form.lwf_coverage_date} onChange={e => set('lwf_coverage_date', e.target.value)} disabled={readOnly} />
                  </div>
                  <div className="grid grid-cols-[130px_1fr] items-center">
                    <span className={labelCls}>Prof. Tax Status</span>
                    <select className={selectCls} value={form.prof_tax_status} onChange={e => set('prof_tax_status', e.target.value)} disabled={readOnly}>
                      {YES_NO.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-[100px_1fr] items-center">
                    <span className={labelCls}>P.Tax Date</span>
                    <input type="date" className={inputCls} value={form.prof_tax_coverage_date} onChange={e => set('prof_tax_coverage_date', e.target.value)} disabled={readOnly} />
                  </div>
                </div>

                {/* State */}
                <div className="grid grid-cols-[160px_1fr] items-center mt-2">
                  <span className={labelCls}>State</span>
                  <input className={inputCls} value={form.state} onChange={e => set('state', e.target.value)} disabled={readOnly} placeholder="State name" />
                </div>
              </div>
            )}

            {/* ── OVERTIME ── */}
            {activeTab === 'overtime' && (
              <div className="max-w-2xl">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="grid grid-cols-[160px_1fr] items-center">
                      <span className="text-xs font-medium text-[var(--text-muted)] pr-3">Overtime Percentage</span>
                      <input type="number" className={inputCls} value={form.ot_percentage} onChange={e => set('ot_percentage', +e.target.value)} disabled={readOnly} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--accent)] mb-2">Allowances for OT</p>
                    <div className="grid grid-cols-2 gap-1">
                      {allowances.map(a => (
                        <label key={a.code} className="flex items-center space-x-1.5 text-xs text-[var(--text-secondary)] cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="w-3.5 h-3.5 accent-[var(--accent)]"
                            checked={(form.ot_allowances || []).includes(a.code)}
                            onChange={() => !readOnly && toggleAllowance(a.code)}
                            disabled={readOnly}
                          />
                          <span>{a.heading || a.code}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
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
