import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Plus, Search, Edit2, ShieldAlert, X,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { useCompanyStore } from '../../store/company.store';
import TopBar from '../../components/layout/TopBar';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { formatDate } from '../../utils/formatters';

const SALARY_KEYS = [
  { code: 'BASIC',    label: 'BASIC'    },
  { code: 'HRA',      label: 'H.R.A.'  },
  { code: 'CONVEY',   label: 'CONVEY.' },
  { code: 'HEA',      label: 'HEA'     },
  { code: 'SPL_ALL',  label: 'SPL.ALL' },
  { code: 'LUNCH_AL', label: 'LUNCH AL'},
  { code: 'CCA',      label: 'CCA'     },
  { code: 'MEDICAL',  label: 'MEDICAL' },
  { code: 'INCENTIV', label: 'INCENTIV'},
  { code: 'ARREAR2',  label: 'ARREAR2' },
  { code: 'ARREAR3',  label: 'ARREAR3' },
  { code: 'ARREAR4',  label: 'ARREAR4' },
  { code: 'D_WAGE1',  label: 'D.Wage-1'},
  { code: 'D_WAGE2',  label: 'D.Wage-2'},
];

function fmt(v) {
  const n = parseFloat(v);
  if (!v && v !== 0) return '—';
  if (isNaN(n)) return String(v);
  return n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** Compact two-line cell: tiny label + value */
function IC({ label, value, green, red }) {
  const valCls = green
    ? 'text-emerald-500'
    : red
    ? 'text-rose-500'
    : 'text-[var(--text-primary)]';
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] leading-tight">{label}</div>
      <div className={`text-[11px] font-semibold truncate leading-snug mt-0.5 ${valCls}`}>
        {value || '—'}
      </div>
    </div>
  );
}

/** Salary row */
function SR({ label, value, total }) {
  if (!total && (!value || parseFloat(value) === 0)) return null;
  return (
    <div className={`flex justify-between items-center px-2 py-[3px] rounded ${total ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/25 mt-1' : 'hover:bg-[var(--bg-hover)]'}`}>
      <span className={`text-[10px] font-${total ? 'bold' : 'medium'} ${total ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>{label}</span>
      <span className={`text-[11px] font-bold tabular-nums ${total ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>{fmt(value)}</span>
    </div>
  );
}

export default function EmployeeList() {
  const navigate = useNavigate();
  const activeCompany = useCompanyStore(state => state.activeCompany);

  const [employees, setEmployees]         = useState([]);
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState('active');
  const [loading, setLoading]             = useState(false);
  const [selectedId, setSelectedId]       = useState(null);
  const [detail, setDetail]               = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [panelOpen, setPanelOpen]         = useState(true);

  const loadEmployees = useCallback(async () => {
    if (!activeCompany) return;
    setLoading(true);
    try {
      const filters = { company_id: activeCompany.id };
      if (statusFilter !== 'all') filters.status = statusFilter;
      const res = await window.api.employee.getAll(filters);
      if (res.success) setEmployees(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [activeCompany, statusFilter]);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  const selectEmployee = async (emp) => {
    if (selectedId === emp.id) { setSelectedId(null); setDetail(null); return; }
    setSelectedId(emp.id);
    setPanelOpen(true);
    setLoadingDetail(true);
    try {
      const [pkgRes, salRes] = await Promise.all([
        window.api.employee.getPackage(emp.id),
        window.api.salary.getEmployeeSalary(emp.id),
      ]);
      setDetail({
        core:      pkgRes.success ? pkgRes.data          : emp,
        salary:    pkgRes.success ? pkgRes.data?.salary    : null,
        statutory: pkgRes.success ? pkgRes.data?.statutory : null,
        identity:  pkgRes.success ? pkgRes.data?.identity  : null,
        salDetail: salRes.success  ? salRes.data           : null,
      });
    } catch (e) {
      setDetail({ core: emp, salary: null, statutory: null, identity: null, salDetail: null });
    } finally { setLoadingDetail(false); }
  };

  const filtered = employees.filter(e => {
    const t = search.toLowerCase();
    return `${e.first_name} ${e.last_name}`.toLowerCase().includes(t)
      || e.emp_code.toLowerCase().includes(t)
      || (e.department || '').toLowerCase().includes(t);
  });

  const getComponents = () => {
    if (!detail) return {};
    const raw = detail?.salary?.component_overrides || detail?.salDetail?.component_overrides;
    if (!raw) return {};
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return {}; }
  };

  const components = getComponents();
  const gross = detail?.salary?.monthly_ctc || detail?.salDetail?.monthly_ctc || detail?.salary?.ctc || 0;
  const d = detail;
  const st = d?.statutory;
  const id = d?.identity;

  // Visible salary rows (non-zero)
  const salaryRows = SALARY_KEYS.filter(({ code, label }) => {
    const v = components[code] ?? components[label];
    return v && parseFloat(v) > 0;
  });
  // Extra keys not in SALARY_KEYS
  const extraRows = Object.entries(components).filter(([k, v]) =>
    parseFloat(v) > 0 && !SALARY_KEYS.some(sk => sk.code === k || sk.label === k)
  );

  return (
    <div className="ps-page" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TopBar title="Employee Directory" />

      {/* Filter bar */}
      <div className="ps-filterbar" style={{ flexShrink: 0 }}>
        <div className="ps-filterbar__search-wrap">
          <Search size={14} className="ps-filterbar__search-icon" />
          <input type="text" className="ps-search" placeholder="Search by name, code or dept..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="yn" style={{ width: '120px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="active">Active</option>
          <option value="on_notice">On Notice</option>
          <option value="separated">Separated</option>
          <option value="all">All Statuses</option>
        </select>
        <div className="flex-1" />
        <Button onClick={() => navigate('/employees/new')} variant="primary" size="sm" icon={Plus}>Add Employee</Button>
      </div>

      {/* Body: table + panel, no outer scroll */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>

        {/* Table */}
        <div
          className="ps-body ps-body--no-pad"
          style={{ flex: selectedId && panelOpen ? '0 0 auto' : 1, overflow: 'auto', minHeight: 0, maxHeight: selectedId && panelOpen ? '55%' : '100%' }}
        >
          {!activeCompany ? (
            <div className="p-6 text-center">
              <ShieldAlert className="w-12 h-12 text-[var(--danger)] mx-auto mb-2" />
              <p className="text-xs text-[var(--text-secondary)] font-medium">Please select a client company first.</p>
            </div>
          ) : loading ? (
            <div className="p-4 text-xs text-[var(--text-secondary)] font-medium">Loading employee register...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center">
              <Users className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-2" />
              <p className="text-xs text-[var(--text-secondary)] font-medium">No employees found.</p>
            </div>
          ) : (
            <table className="ps-table">
              <thead>
                <tr>
                  <th>Code</th><th>Employee Name</th><th>Department &amp; Designation</th>
                  <th>Employment Type</th><th>Date of Joining</th><th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr
                    key={e.id}
                    onClick={() => selectEmployee(e)}
                    style={{ cursor: 'pointer' }}
                    className={selectedId === e.id
                      ? 'bg-[var(--accent)]/10 border-l-2 border-[var(--accent)]'
                      : 'hover:bg-[var(--bg-hover)]'}
                  >
                    <td className="font-mono text-xs font-semibold text-[var(--text-secondary)]">{e.emp_code}</td>
                    <td className={`font-medium ${selectedId === e.id ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
                      {e.first_name} {e.last_name}
                    </td>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-semibold text-[var(--text-primary)]">{e.designation || 'Staff Member'}</span>
                        <span className="text-[10px] text-[var(--text-secondary)]">{e.department || 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="capitalize px-1.5 py-0.5 rounded bg-[var(--bg-surface-2)] border border-[var(--border-strong)] text-[10px] text-[var(--text-secondary)] font-semibold">
                        {e.employment_type}
                      </span>
                    </td>
                    <td className="text-xs font-mono text-[var(--text-secondary)] font-semibold">{formatDate(e.doj)}</td>
                    <td><Badge status={e.status}>{e.status}</Badge></td>
                    <td style={{ textAlign: 'right' }} onClick={ev => ev.stopPropagation()}>
                      <Button onClick={() => navigate(`/employees/edit/${e.id}`)} variant="secondary" size="sm" icon={Edit2}>Profile</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── DETAIL PANEL (no scroll, all visible) ── */}
        {selectedId && (
          <div
            className="border-t border-[var(--border)] bg-[var(--bg-card)] shrink-0"
            style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-surface-2)] shrink-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-[var(--text-primary)]">
                  {d?.core ? `${d.core.first_name || ''} ${d.core.last_name || ''}`.trim() : '…'}
                </span>
                {d?.core?.emp_code && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] font-bold">
                    {d.core.emp_code}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-1.5">
                <button onClick={() => setPanelOpen(p => !p)}
                  className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
                  {panelOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => { setSelectedId(null); setDetail(null); }}
                  className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-rose-500">
                  <X className="w-3.5 h-3.5" />
                </button>
                <Button onClick={() => navigate(`/employees/edit/${selectedId}`)} variant="primary" size="sm" icon={Edit2}>
                  Edit Profile
                </Button>
              </div>
            </div>

            {/* Panel body — fixed height, no scroll */}
            {panelOpen && (
              <div className="px-5 py-3" style={{ overflow: 'hidden' }}>
                {loadingDetail ? (
                  <p className="text-xs text-[var(--text-muted)]">Loading…</p>
                ) : d ? (
                  <div className="flex gap-5" style={{ minHeight: 0 }}>

                    {/* ── LEFT: all info in 4-column grid ── */}
                    <div className="flex-1 min-w-0">
                      {/* Row 1: basic identity */}
                      <div className="grid grid-cols-4 gap-x-5 gap-y-2">
                        <IC label="Code"           value={d.core?.emp_code} />
                        <IC label="Branch"         value={d.core?.location || d.core?.cost_centre} />
                        <IC label="Department"     value={d.core?.department} />
                        <IC label="Designation"    value={d.core?.designation} />

                        <IC label="Date of Joining" value={formatDate(d.core?.doj)} />
                        <IC label="Left Date"       value={d.core?.dol ? formatDate(d.core.dol) : '—'} />
                        <IC label="Employment"      value={d.core?.employment_type} />
                        <IC label="Salary Type"     value={d.salary?.structure_name} />
                      </div>

                      {/* Divider */}
                      <div className="border-t border-dashed border-[var(--border)] my-2" />

                      {/* Row 2: statutory */}
                      <div className="grid grid-cols-4 gap-x-5 gap-y-2">
                        <IC label="PF Status"
                          value={st?.is_pf_enabled ? 'Yes' : 'No'}
                          green={!!st?.is_pf_enabled} red={!st?.is_pf_enabled} />
                        <IC label="UAN / PF No."  value={id?.uan_number || id?.pf_number} />
                        <IC label="ESI Status"
                          value={st?.is_esi_enabled ? 'Yes' : 'No'}
                          green={!!st?.is_esi_enabled} red={!st?.is_esi_enabled} />
                        <IC label="ESIC No."      value={id?.esic_number} />

                        <IC label="LWF / PT"
                          value={st?.is_pt_enabled ? 'Yes' : 'No'}
                          green={!!st?.is_pt_enabled} />
                        <IC label="Aadhaar"       value={id?.aadhar_number} />
                        <IC label="PAN"            value={id?.pan_number} />
                        <IC label="Status"
                          value={d.core?.status}
                          green={d.core?.status === 'active'}
                          red={d.core?.status === 'separated'} />

                        <IC label="Bank A/C"       value={id?.bank_account_number} />
                        <IC label="IFSC"            value={id?.ifsc_code} />
                        <IC label="Bank Name"       value={id?.bank_name} />
                        <IC label="OT Applicable"
                          value={st?.is_ot_applicable ? 'Yes' : 'No'}
                          green={!!st?.is_ot_applicable} />
                      </div>
                    </div>

                    {/* Vertical divider */}
                    <div className="w-px bg-[var(--border)] shrink-0" />

                    {/* ── RIGHT: salary components ── */}
                    <div className="w-44 shrink-0" style={{ overflow: 'hidden' }}>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">Salary Components</div>
                      <div style={{ overflow: 'hidden' }}>
                        {salaryRows.map(({ code, label }) => (
                          <SR key={code} label={label} value={components[code] ?? components[label]} />
                        ))}
                        {extraRows.map(([k, v]) => (
                          <SR key={k} label={k} value={v} />
                        ))}
                        {(salaryRows.length === 0 && extraRows.length === 0) && (
                          <p className="text-[10px] text-[var(--text-muted)] px-2">No components set.</p>
                        )}
                        <SR label="Gross Total" value={gross} total />
                      </div>
                    </div>

                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
