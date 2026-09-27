import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileClock,
  Clock
} from 'lucide-react';
import { useCompanyStore } from '../store/company.store';
import TopBar from '../components/layout/TopBar';
import Badge from '../components/ui/Badge';

// ── Derive the payroll period to check (previous calendar month) ──────────────
function getCurrentPeriod() {
  const today = new Date();
  let month = today.getMonth(); // 0-indexed → previous month (today=May(4) → April(3))
  let year  = today.getFullYear();
  if (month === 0) { month = 12; year -= 1; }
  return { month, year };
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Format a raw ISO timestamp as a human-friendly "X min/hr/day ago" string
function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} day ago`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const companies      = useCompanyStore(s => s.companies);
  const activeCompany  = useCompanyStore(s => s.activeCompany);
  const setActiveCompany = useCompanyStore(s => s.setActiveCompany);
  const loadCompanies  = useCompanyStore(s => s.loadCompanies);

  const { month, year } = getCurrentPeriod();

  const [totalEmployees,  setTotalEmployees]  = useState(0);
  const [payrollStatus,   setPayrollStatus]   = useState('idle');
  const [pendingApprovals,setPendingApprovals] = useState(0);
  const [activities,      setActivities]      = useState([]);

  useEffect(() => { loadCompanies(); }, []);
  useEffect(() => { fetchStats(); }, [activeCompany]);

  const fetchStats = useCallback(async () => {
    try {
      const api = window.api;
      if (!api) return;

      // 1. Employee count — scoped to active company if set, otherwise all
      if (activeCompany) {
        const empRes = await api.employee.getAll({ company_id: activeCompany.id });
        if (empRes.success) setTotalEmployees(empRes.data.length);
      } else {
        const empRes = await api.employee.getAll();
        if (empRes.success) setTotalEmployees(empRes.data.length);
      }

      // 2. Current-period payroll run (dynamic month/year)
      if (activeCompany) {
        const runRes = await api.payroll.getRun(activeCompany.id, month, year);
        if (runRes.success && runRes.data) {
          setPayrollStatus(runRes.data.status);
        } else {
          setPayrollStatus('idle');
        }
      }

      // 3. Pending approvals — runs in draft or under_review
      if (api.audit?.getPendingApprovals) {
        const paRes = await api.audit.getPendingApprovals(activeCompany?.id || null);
        if (paRes.success) setPendingApprovals(paRes.data.count);
      }

      // 4. Real audit log entries (limited to 5 for compact view)
      if (api.audit?.getLast) {
        const auditRes = await api.audit.getLast(5, activeCompany?.id || null);
        if (auditRes.success && Array.isArray(auditRes.data)) {
          setActivities(auditRes.data);
        }
      }
    } catch (e) {
      console.error('[Dashboard] fetchStats error:', e);
    }
  }, [activeCompany, month, year]);

  const handleCompanySelect = (comp) => {
    setActiveCompany(comp);
  };

  const periodLabel = `${MONTH_NAMES[month]} ${year}`;

  const runStatusClass = (s) => {
    if (s === 'approved' || s === 'locked') return 'ps-stat--success';
    if (s === 'under_review') return 'ps-stat--warning';
    if (s === 'draft') return 'ps-stat--warning';
    return 'ps-stat--accent';
  };

  return (
    <div className="ps-page">
      <TopBar title="Executive Dashboard" />

      <div className="ps-body space-y-4">

        {/* ── Stat Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="ps-stat ps-stat--accent">
            <span className="ps-stat__label">Total Employee Register</span>
            <span className="ps-stat__value">{totalEmployees}</span>
            <span className="ps-stat__sub">{activeCompany ? `Active in ${activeCompany.name}` : 'All companies'}</span>
          </div>
          <div className={`ps-stat ${runStatusClass(payrollStatus)}`}>
            <span className="ps-stat__label">Current Run Status</span>
            <span className="ps-stat__value">{payrollStatus.replace('_', ' ').toUpperCase()}</span>
            <span className="ps-stat__sub">{activeCompany ? `Period: ${periodLabel}` : 'Select a company'}</span>
          </div>
          <div className={`ps-stat ${pendingApprovals > 0 ? 'ps-stat--danger' : 'ps-stat--success'}`}>
            <span className="ps-stat__label">Pending Approvals</span>
            <span className="ps-stat__value">{pendingApprovals}</span>
            <span className="ps-stat__sub">Runs in draft / under review</span>
          </div>
        </div>

        {/* ── Main Grid ──────────────────────────────────────────────────── */}
        <div className="ps-2panel">

          {/* Company selector cards */}
          <div className="flex flex-col text-left">
            <h3 className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Select Operating Client Company
            </h3>

            {companies.length === 0 ? (
              <div className="p-8 text-center bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg">
                <Building2 className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-xs text-[var(--text-secondary)] font-medium">No client companies created yet.</p>
                <button
                  onClick={() => navigate('/companies')}
                  className="psb psb-primary psb-sm mt-3"
                >
                  Create Your First Company
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                {companies.map(c => {
                  const isActive = activeCompany?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleCompanySelect(c)}
                      className={`ps-card cursor-pointer flex flex-col justify-between transition-all duration-150 border-2 select-none h-28 hover:translate-y-[-1px] hover:shadow-sm ${
                        isActive ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-[var(--border)]'
                      } m-0 p-3`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-8 h-8 rounded bg-[var(--accent-light)] text-[var(--accent)] font-bold flex items-center justify-center text-xs uppercase shrink-0">
                          {c.name.substring(0, 2)}
                        </div>
                        {isActive && <Badge status="active">Active Focus</Badge>}
                      </div>
                      <div className="mt-2">
                        <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">{c.name}</h4>
                        <p className="text-[9px] text-[var(--text-secondary)] font-mono uppercase mt-0.5 truncate">
                          PAN: {c.pan} | State: {c.state_code}
                        </p>
                      </div>
                      <div className="flex items-center justify-between border-t border-[var(--border)] pt-1.5 mt-1.5">
                        <span className="text-[10px] text-[var(--text-secondary)] font-medium">Select to operate</span>
                        <ArrowRight className={`w-3.5 h-3.5 transition-transform duration-150 ${
                          isActive ? 'text-[var(--accent)] translate-x-0.5' : 'text-[var(--text-muted)]'
                        }`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right column: audit log + shortcuts */}
          <div className="flex flex-col text-left justify-between space-y-4">
            <div>
              <h3 className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Recent Audited Actions
              </h3>

              <div className="ps-card p-0">
                {activities.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-[var(--text-secondary)] font-medium">
                    No audit entries yet.
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border)] max-h-56 overflow-y-auto">
                    {activities.map((a, i) => (
                      <div key={a.id || i} className="px-3 py-2 flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />
                        <div className="flex flex-col flex-1 overflow-hidden">
                          <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                            {a.action}
                          </span>
                          <div className="flex items-center justify-between mt-0.5 text-[9px] text-[var(--text-secondary)] font-medium">
                            <span>By: {a.user_id || 'System'}</span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {timeAgo(a.created_at)}
                            </span>
                          </div>
                          {a.notes && (
                            <span className="text-[9px] text-[var(--text-muted)] mt-0.5 truncate">{a.notes}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Quick Shortcuts
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate('/employees')}
                  className="ps-card p-2 flex flex-col items-center justify-center text-center hover:bg-[var(--bg-surface-2)] transition-colors focus:outline-none cursor-pointer m-0"
                >
                  <Users className="w-4 h-4 text-[var(--accent)] mb-1" />
                  <span className="text-[10px] font-bold text-[var(--text-primary)]">Add Employee</span>
                </button>
                <button
                  onClick={() => navigate('/payroll')}
                  className="ps-card p-2 flex flex-col items-center justify-center text-center hover:bg-[var(--bg-surface-2)] transition-colors focus:outline-none cursor-pointer m-0"
                >
                  <TrendingUp className="w-4 h-4 text-[var(--success)] mb-1" />
                  <span className="text-[10px] font-bold text-[var(--text-primary)]">Run Payroll</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
