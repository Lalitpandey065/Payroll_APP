import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IndianRupee, AlertTriangle, CheckCircle2, Save,
  PlayCircle, RefreshCw, Users, ChevronRight
} from 'lucide-react';
import { useCompanyStore } from '../../store/company.store';
import TopBar from '../../components/layout/TopBar';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

const fmt = (n) =>
  n != null ? '₹' + Number(n).toLocaleString('en-IN') : '—';

export default function SalaryMapping() {
  const navigate = useNavigate();
  const activeCompany = useCompanyStore(s => s.activeCompany);

  const [rows, setRows]         = useState([]);    // all employees + their current mapping
  const [structures, setStructures] = useState([]); // available salary structures
  const [edits, setEdits]       = useState({});    // { [emp_id]: { structure_id, ctc, effectiveFrom } }
  const [saving, setSaving]     = useState({});    // { [emp_id]: true }
  const [saved, setSaved]       = useState({});    // { [emp_id]: true } — flash
  const [errors, setErrors]     = useState({});    // { [emp_id]: string }
  const [loading, setLoading]   = useState(false);

  // ── Load data ───────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!activeCompany) return;
    setLoading(true);
    try {
      const [mapRes, strRes] = await Promise.all([
        window.api.salary.getSalaryMappings(activeCompany.id),
        window.api.salary.getAll({ company_id: activeCompany.id })
      ]);
      if (mapRes.success) setRows(mapRes.data || []);
      if (strRes.success) setStructures(strRes.data || []);
    } finally {
      setLoading(false);
    }
  }, [activeCompany]);

  useEffect(() => { load(); }, [load]);

  // ── Edit helpers ─────────────────────────────────────────────────────────────
  const getEdit = (row) => edits[row.emp_id] ?? {
    structure_id: row.structure_id || '',
    ctc:          row.ctc != null ? String(row.ctc) : '',
    effectiveFrom: row.effective_from || ''
  };

  const setField = (empId, field, value) =>
    setEdits(prev => ({
      ...prev,
      [empId]: { ...getEdit({ emp_id: empId, ...rows.find(r => r.emp_id === empId) }), [field]: value }
    }));

  const isDirty = (row) => {
    const e = edits[row.emp_id];
    if (!e) return false;
    return (
      e.structure_id   !== (row.structure_id || '') ||
      e.ctc            !== (row.ctc != null ? String(row.ctc) : '') ||
      e.effectiveFrom  !== (row.effective_from || '')
    );
  };

  // ── Save single row ──────────────────────────────────────────────────────────
  const saveRow = async (row) => {
    const e = getEdit(row);
    if (!e.structure_id) {
      setErrors(prev => ({ ...prev, [row.emp_id]: 'Please select a salary structure.' }));
      return;
    }
    const ctcNum = parseFloat(e.ctc);
    if (!ctcNum || ctcNum <= 0) {
      setErrors(prev => ({ ...prev, [row.emp_id]: 'Enter a valid Annual CTC.' }));
      return;
    }

    setSaving(prev => ({ ...prev, [row.emp_id]: true }));
    setErrors(prev => ({ ...prev, [row.emp_id]: null }));

    try {
      const res = await window.api.salary.assignStructure(
        row.emp_id, e.structure_id, ctcNum, {}, e.effectiveFrom || null
      );
      if (res.success) {
        setSaved(prev => ({ ...prev, [row.emp_id]: true }));
        setTimeout(() => setSaved(prev => ({ ...prev, [row.emp_id]: false })), 2000);
        setEdits(prev => { const n = { ...prev }; delete n[row.emp_id]; return n; });
        await load(); // refresh the row from DB
      } else {
        setErrors(prev => ({ ...prev, [row.emp_id]: res.error?.message || 'Save failed.' }));
      }
    } catch (err) {
      setErrors(prev => ({ ...prev, [row.emp_id]: err.message }));
    } finally {
      setSaving(prev => ({ ...prev, [row.emp_id]: false }));
    }
  };

  // ── Stats ────────────────────────────────────────────────────────────────────
  const unmapped = rows.filter(r => !r.structure_id).length;
  const mapped   = rows.length - unmapped;

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[var(--bg-base)]">
      <TopBar title="Salary Structure Mapping" />

      <div className="flex-1 p-6 space-y-5 min-h-0 overflow-y-scroll text-left">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Employee → Salary Structure</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">
              Assign or change each employee's salary structure and CTC before running payroll.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/payroll')}
              disabled={unmapped > 0}
              title={unmapped > 0 ? `${unmapped} employee(s) still need a structure assigned` : 'Go to Payroll Run'}
            >
              <PlayCircle className="w-3.5 h-3.5 mr-1.5" />
              Run Payroll
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        {activeCompany && (
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)] font-medium">Total Employees</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{rows.length}</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)] font-medium">Structure Assigned</p>
                <p className="text-2xl font-bold text-emerald-600">{mapped}</p>
              </div>
            </Card>
            <Card className={`p-4 flex items-center gap-4 ${unmapped > 0 ? 'border border-amber-400' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${unmapped > 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                <AlertTriangle className={`w-5 h-5 ${unmapped > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)] font-medium">Needs Assignment</p>
                <p className={`text-2xl font-bold ${unmapped > 0 ? 'text-amber-500' : 'text-[var(--text-primary)]'}`}>{unmapped}</p>
              </div>
            </Card>
          </div>
        )}

        {/* No company */}
        {!activeCompany && (
          <Card className="text-center py-16">
            <IndianRupee className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-3" />
            <p className="font-semibold text-[var(--text-primary)]">No Active Company</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Select a company from the sidebar to manage salary mappings.</p>
          </Card>
        )}

        {/* No structures */}
        {activeCompany && !loading && structures.length === 0 && (
          <Card className="text-center py-12">
            <IndianRupee className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <p className="font-semibold text-[var(--text-primary)]">No Salary Structures Found</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1 mb-4">Create at least one salary structure before mapping employees.</p>
            <Button variant="primary" size="sm" onClick={() => navigate('/salary/new')}>
              Create Structure
            </Button>
          </Card>
        )}

        {/* Main table */}
        {activeCompany && structures.length > 0 && (
          <Card className="overflow-hidden p-0">
            {unmapped > 0 && (
              <div className="px-5 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                  {unmapped} employee{unmapped > 1 ? 's' : ''} without a salary structure — payroll cannot run until all are assigned.
                </p>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-card)]">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider w-28">Code</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Employee</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Department</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider min-w-[200px]">Salary Structure</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider w-36">Annual CTC (₹)</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider w-36">Monthly CTC</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider w-36">Effective From</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-[var(--text-secondary)] text-sm">
                        <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />Loading...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-[var(--text-secondary)] text-sm">
                        No active employees found.
                      </td>
                    </tr>
                  ) : rows.map(row => {
                    const e = getEdit(row);
                    const dirty     = isDirty(row);
                    const isSaving  = saving[row.emp_id];
                    const isSaved   = saved[row.emp_id];
                    const rowError  = errors[row.emp_id];
                    const hasAssignment = !!row.structure_id;
                    const monthlyCtc = e.ctc ? (parseFloat(e.ctc) / 12) : (row.monthly_ctc || null);

                    return (
                      <tr
                        key={row.emp_id}
                        className={`transition-colors ${
                          !hasAssignment && !e.structure_id
                            ? 'bg-amber-50/50 dark:bg-amber-900/10'
                            : 'bg-[var(--bg-card)] hover:bg-[var(--bg-hover)]'
                        }`}
                      >
                        {/* Code */}
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-base)] px-2 py-0.5 rounded">
                            {row.emp_code}
                          </span>
                        </td>

                        {/* Name */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[var(--text-primary)] text-sm">
                            {row.first_name} {row.last_name}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)]">{row.designation}</div>
                        </td>

                        {/* Department */}
                        <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                          {row.department || '—'}
                        </td>

                        {/* Structure selector */}
                        <td className="px-4 py-3">
                          <select
                            value={e.structure_id}
                            onChange={ev => setField(row.emp_id, 'structure_id', ev.target.value)}
                            className={`w-full text-sm rounded-md border px-2.5 py-1.5 bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition ${
                              !e.structure_id
                                ? 'border-amber-400 dark:border-amber-600'
                                : dirty ? 'border-sky-400' : 'border-[var(--border)]'
                            }`}
                          >
                            <option value="">— Select structure —</option>
                            {structures.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                          {rowError && (
                            <p className="text-xs text-red-500 mt-1">{rowError}</p>
                          )}
                        </td>

                        {/* Annual CTC input */}
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            step={1000}
                            value={e.ctc}
                            onChange={ev => setField(row.emp_id, 'ctc', ev.target.value)}
                            placeholder="e.g. 600000"
                            className={`w-full text-sm rounded-md border px-2.5 py-1.5 bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition ${
                              dirty ? 'border-sky-400' : 'border-[var(--border)]'
                            }`}
                          />
                        </td>

                        {/* Monthly CTC (computed, read-only) */}
                        <td className="px-4 py-3 text-sm font-semibold text-emerald-600">
                          {monthlyCtc ? fmt(Math.round(monthlyCtc)) : '—'}
                        </td>

                        {/* Effective From */}
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={e.effectiveFrom}
                            onChange={ev => setField(row.emp_id, 'effectiveFrom', ev.target.value)}
                            className={`w-full text-sm rounded-md border px-2.5 py-1.5 bg-[var(--bg-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition ${
                              dirty ? 'border-sky-400' : 'border-[var(--border)]'
                            }`}
                          />
                        </td>

                        {/* Save / status */}
                        <td className="px-4 py-3 text-center">
                          {isSaved ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />Saved
                            </span>
                          ) : (
                            <button
                              onClick={() => saveRow(row)}
                              disabled={isSaving || (!dirty && hasAssignment)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all focus:outline-none ${
                                dirty || !hasAssignment
                                  ? 'bg-[var(--accent)] text-white hover:opacity-90'
                                  : 'bg-[var(--bg-base)] text-[var(--text-secondary)] border border-[var(--border)] cursor-default opacity-50'
                              }`}
                              title={!dirty && hasAssignment ? 'No changes' : 'Save assignment'}
                            >
                              {isSaving ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Save className="w-3 h-3" />
                              )}
                              {dirty || !hasAssignment ? 'Save' : 'Saved'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer action */}
            {rows.length > 0 && (
              <div className="px-5 py-4 border-t border-[var(--border)] flex items-center justify-between bg-[var(--bg-card)]">
                <p className="text-xs text-[var(--text-secondary)]">
                  {mapped} of {rows.length} employees have a salary structure assigned.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/payroll')}
                  disabled={unmapped > 0}
                  title={unmapped > 0 ? `Assign structures to all ${unmapped} remaining employee(s) first` : ''}
                >
                  <PlayCircle className="w-4 h-4 mr-1.5" />
                  Proceed to Payroll Run
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
