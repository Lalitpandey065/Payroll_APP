import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Plus, Trash2, Save, X, Search } from 'lucide-react';
import { useCompanyStore } from '../../store/company.store';

const YES_NO = ['Yes', 'No'];
const WAGE_BASES = ['Gross', 'Basic', 'Basic+DA'];

const BLANK = {
  name: '', principal_name: '', address: '', location_nature: '',
  main_contractor: '', main_contractor_address: '',
  contractor: '', contractor_address: '',
  sub_contractor: '', sub_contractor_address: '', state: '',
  ot_percentage: 0, esic_on_ot: 'No', esi_limit_on_ot: 'No', epf_on_ot: 'No',
  calculate_on_hours: 'No', per_day_hours: 0, wages_to_calculate: 'Gross',
  ot_allowances: [],
  epf_in_netpay: 'No', esi_in_netpay: 'No', lwf_in_netpay: 'No', prof_tax_in_netpay: 'No',
  lwf_calculate: 'Gross', lwf_allowances: [],
};

export default function DepartmentMaster() {
  const activeCompany = useCompanyStore(s => s.activeCompany);
  const [list, setList]           = useState([]);
  const [allowances, setAllowances] = useState([]);
  const [selected, setSelected]   = useState(null);   // record from list
  const [form, setForm]           = useState(BLANK);
  const [mode, setMode]           = useState('view'); // view | new | edit
  const [activeTab, setActiveTab] = useState('general');
  const [search, setSearch]       = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const companyId = activeCompany?.id;

  const load = useCallback(async () => {
    if (!companyId) return;
    const res = await window.api.masters.getDepartments(companyId);
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
      ot_allowances:  typeof rec.ot_allowances  === 'string' ? JSON.parse(rec.ot_allowances)  : (rec.ot_allowances  || []),
      lwf_allowances: typeof rec.lwf_allowances === 'string' ? JSON.parse(rec.lwf_allowances) : (rec.lwf_allowances || []),
    });
    setMode('view');
    setActiveTab('general');
    setError('');
  };

  const handleNew = () => {
    setSelected(null);
    setForm(BLANK);
    setMode('new');
    setActiveTab('general');
    setError('');
  };

  const handleEdit = () => {
    if (!selected) return;
    setMode('edit');
  };

  const handleCancel = () => {
    if (selected) { selectRecord(selected); } else { setMode('view'); setForm(BLANK); }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true); setError('');
    const payload = { ...form, company_id: companyId };
    let res;
    if (mode === 'new') {
      res = await window.api.masters.createDepartment(payload);
    } else {
      res = await window.api.masters.updateDepartment(selected.id, payload);
    }
    setSaving(false);
    if (res.success) {
      await load();
      selectRecord(res.data);
    } else {
      setError(res.error?.message || 'Save failed.');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm(`Delete department "${selected.name}"?`)) return;
    await window.api.masters.deleteDepartment(selected.id);
    setSelected(null); setForm(BLANK); setMode('view');
    await load();
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleAllowance = (arr_key, code) => {
    setForm(f => {
      const arr = f[arr_key] || [];
      return { ...f, [arr_key]: arr.includes(code) ? arr.filter(c => c !== code) : [...arr, code] };
    });
  };

  const readOnly = mode === 'view';
  const filtered = list.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  const inputCls = `w-full px-2 py-1.5 text-sm rounded border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-60`;
  const selectCls = `w-full px-2 py-1.5 text-sm rounded border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none disabled:opacity-60`;
  const labelCls = `text-right text-xs font-medium text-[var(--text-muted)] pr-3 pt-2 self-start`;
  const tabs = ['General', 'Overtime', 'LWF', 'Setting'];

  // Allowance checkbox grid
  const AllowanceGrid = ({ arrKey }) => (
    <div className="grid grid-cols-3 gap-1 mt-2">
      {allowances.map(a => (
        <label key={a.code} className="flex items-center space-x-1.5 text-xs text-[var(--text-secondary)] cursor-pointer select-none">
          <input
            type="checkbox"
            className="w-3.5 h-3.5 accent-[var(--accent)]"
            checked={(form[arrKey] || []).includes(a.code)}
            onChange={() => !readOnly && toggleAllowance(arrKey, a.code)}
            disabled={readOnly}
          />
          <span>{a.heading || a.code}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center space-x-3 px-6 py-4 border-b border-[var(--border)] shrink-0">
        <Layers className="w-5 h-5 text-[var(--accent)]" />
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Master → Department</h1>
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
              <p className="text-xs text-[var(--text-muted)] p-3">No departments found.</p>
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
              </div>
            ))}
          </div>
        </div>

        {/* Right form */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-[var(--border)] px-4 pt-2 shrink-0">
            {tabs.map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t.toLowerCase())}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors mr-1
                  ${activeTab === t.toLowerCase()
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* ── GENERAL ── */}
            {activeTab === 'general' && (
              <div className="max-w-2xl space-y-3">
                {selected && (
                  <div className="grid grid-cols-[160px_1fr] items-center">
                    <span className={labelCls}>Id #</span>
                    <input className={inputCls} value={selected.id?.slice(0,8).toUpperCase() || ''} disabled />
                  </div>
                )}
                {[
                  ['name',                    'Name',                 false],
                  ['principal_name',          'Principal Name',       false],
                  ['location_nature',         'Location / Nature',    false],
                  ['main_contractor',         'Main Contractor',      false],
                  ['contractor',              'Contractor',           false],
                  ['sub_contractor',          'Sub Contractor',       false],
                  ['state',                   'State',                false],
                ].map(([key, label]) => (
                  <div key={key} className="grid grid-cols-[160px_1fr] items-center">
                    <span className={labelCls}>{label}</span>
                    <input
                      className={inputCls}
                      value={form[key] || ''}
                      onChange={e => set(key, e.target.value)}
                      disabled={readOnly}
                    />
                  </div>
                ))}
                {[
                  ['address',                 'Address'],
                  ['main_contractor_address', 'Main Contractor Address'],
                  ['contractor_address',      'Contractor Address'],
                  ['sub_contractor_address',  'Sub Contractor Address'],
                ].map(([key, label]) => (
                  <div key={key} className="grid grid-cols-[160px_1fr] items-start">
                    <span className={labelCls}>{label}</span>
                    <textarea
                      rows={3}
                      className={`${inputCls} resize-none`}
                      value={form[key] || ''}
                      onChange={e => set(key, e.target.value)}
                      disabled={readOnly}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* ── OVERTIME ── */}
            {activeTab === 'overtime' && (
              <div className="max-w-2xl space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="space-y-2">
                      {[
                        ['esic_on_ot',        'ESIC on Overtime',     YES_NO],
                        ['esi_limit_on_ot',   'E.S.I. Limit on OT',   YES_NO],
                        ['epf_on_ot',         'EPF on Overtime',      YES_NO],
                        ['calculate_on_hours','Calculate on Hours',   YES_NO],
                        ['wages_to_calculate','Wages to Calculate',   WAGE_BASES],
                      ].map(([key, label, opts]) => (
                        <div key={key} className="grid grid-cols-[180px_1fr] items-center">
                          <span className="text-xs font-medium text-[var(--text-muted)] pr-3">{label}</span>
                          <select className={selectCls} value={form[key]} onChange={e => set(key, e.target.value)} disabled={readOnly}>
                            {opts.map(o => <option key={o}>{o}</option>)}
                          </select>
                        </div>
                      ))}
                      <div className="grid grid-cols-[180px_1fr] items-center">
                        <span className="text-xs font-medium text-[var(--text-muted)] pr-3">Overtime Percentage</span>
                        <input type="number" className={inputCls} value={form.ot_percentage} onChange={e => set('ot_percentage', +e.target.value)} disabled={readOnly} />
                      </div>
                      <div className="grid grid-cols-[180px_1fr] items-center">
                        <span className="text-xs font-medium text-[var(--text-muted)] pr-3">Per Day Hours</span>
                        <input type="number" className={inputCls} value={form.per_day_hours} onChange={e => set('per_day_hours', +e.target.value)} disabled={readOnly} />
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold text-[var(--accent)] mb-2">Deductions Netpay</p>
                      {[
                        ['epf_in_netpay',      'EPF in Netpay'],
                        ['esi_in_netpay',       'ESI in Netpay'],
                        ['lwf_in_netpay',       'LWF in Netpay'],
                        ['prof_tax_in_netpay',  'Prof.Tax in Netpay'],
                      ].map(([key, label]) => (
                        <div key={key} className="grid grid-cols-[180px_1fr] items-center mb-1.5">
                          <span className="text-xs font-medium text-[var(--text-muted)] pr-3">{label}</span>
                          <select className={selectCls} value={form[key]} onChange={e => set(key, e.target.value)} disabled={readOnly}>
                            {YES_NO.map(o => <option key={o}>{o}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-[var(--accent)] mb-2">Allowances</p>
                    <AllowanceGrid arrKey="ot_allowances" />
                  </div>
                </div>
              </div>
            )}

            {/* ── LWF ── */}
            {activeTab === 'lwf' && (
              <div className="max-w-2xl">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="grid grid-cols-[120px_1fr] items-center mb-3">
                      <span className="text-xs font-medium text-[var(--text-muted)] pr-3">Calculate</span>
                      <select className={selectCls} value={form.lwf_calculate} onChange={e => set('lwf_calculate', e.target.value)} disabled={readOnly}>
                        {WAGE_BASES.map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[var(--accent)] mb-2">Labour Welfare Fund</p>
                    <AllowanceGrid arrKey="lwf_allowances" />
                  </div>
                </div>
              </div>
            )}

            {/* ── SETTING ── */}
            {activeTab === 'setting' && (
              <div className="max-w-lg">
                <p className="text-sm text-[var(--text-muted)]">Department-level payroll settings can be configured here in a future update.</p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mx-6 mb-2 px-3 py-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</div>
          )}

          {/* Action bar */}
          <div className="border-t border-[var(--border)] px-6 py-3 flex space-x-2 shrink-0 bg-[var(--bg-card)]">
            <button
              onClick={handleNew}
              className="px-5 py-2 rounded text-sm font-semibold bg-sky-500 text-white hover:bg-sky-600 transition-colors flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" /><span>New</span>
            </button>
            <button
              onClick={handleEdit}
              disabled={!selected || mode !== 'view'}
              className="px-5 py-2 rounded text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleSave}
              disabled={readOnly || saving}
              className="px-5 py-2 rounded text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" /><span>{saving ? 'Saving…' : 'Save'}</span>
            </button>
            <button
              onClick={handleCancel}
              disabled={readOnly}
              className="px-5 py-2 rounded text-sm font-semibold bg-slate-500 text-white hover:bg-slate-600 disabled:opacity-40 transition-colors flex items-center space-x-1.5"
            >
              <X className="w-4 h-4" /><span>Cancel</span>
            </button>
            <button
              onClick={handleDelete}
              disabled={!selected || mode !== 'view'}
              className="px-5 py-2 rounded text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 transition-colors flex items-center space-x-1.5"
            >
              <Trash2 className="w-4 h-4" /><span>Delete</span>
            </button>
          </div>
        </div>
      </div>

      {!companyId && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-[var(--text-muted)]">Please select a company first.</p>
        </div>
      )}
    </div>
  );
}
