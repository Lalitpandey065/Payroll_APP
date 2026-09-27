import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCompanyStore } from '../../store/company.store';
import { usePayrollStore } from '../../store/payroll.store';
import { useAuthStore } from '../../store/auth.store';
import TopBar from '../../components/layout/TopBar';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { MONTH_NAMES } from '../../utils/constants';

export default function PayrollRun() {
  const navigate = useNavigate();
  const activeCompany = useCompanyStore(state => state.activeCompany);
  const user = useAuthStore(state => state.user);

  // Zustand period
  const month = usePayrollStore(state => state.month);
  const year = usePayrollStore(state => state.year);
  const setPeriod = usePayrollStore(state => state.setPeriod);
  
  const preRunIssues = usePayrollStore(state => state.preRunIssues);
  const loadPreRunFlags = usePayrollStore(state => state.loadPreRunFlags);
  const executeRun = usePayrollStore(state => state.executeRun);
  const loadRun = usePayrollStore(state => state.loadRun);
  
  const activeRun = usePayrollStore(state => state.activeRun);
  const loading = usePayrollStore(state => state.loading);

  const [runSuccess, setRunSuccess] = useState(false);

  useEffect(() => {
    if (activeCompany) {
      loadPreRunFlags(activeCompany.id);
      loadRun(activeCompany.id);
    }
  }, [activeCompany, month, year]);

  const handleRunPayroll = async () => {
    setRunSuccess(false);
    try {
      const res = await executeRun(activeCompany.id, user.name);
      if (res.success) {
        setRunSuccess(true);
        setTimeout(() => navigate('/payroll/review'), 1500);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Guard against uninitialised preRunIssues (API may return partial data)
  const hasErrors   = Array.isArray(preRunIssues?.errors)   && preRunIssues.errors.length > 0;
  const hasWarnings = Array.isArray(preRunIssues?.warnings) && preRunIssues.warnings.length > 0;

  return (
    <div className="ps-page">
      <TopBar title="Statutory Payroll Run" />

      {activeCompany && (
        <div className="ps-filterbar">
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-[var(--text-primary)]">Statutory Payroll Calculations</span>
            <span className="text-[10px] text-[var(--text-secondary)]">Scan active configurations and compute monthly payouts</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Select
              options={MONTH_NAMES}
              value={month}
              onChange={e => setPeriod(parseInt(e.target.value), year)}
              className="w-28"
              style={{ height: '26px', padding: '2px 6px', fontSize: '12px' }}
              disabled={loading}
            />
            <Select
              options={[{ value: '2024', label: '2024' }, { value: '2025', label: '2025' }, { value: '2026', label: '2026' }, { value: '2027', label: '2027' }]}
              value={year}
              onChange={e => setPeriod(month, parseInt(e.target.value))}
              className="w-20"
              style={{ height: '26px', padding: '2px 6px', fontSize: '12px' }}
              disabled={loading}
            />
          </div>
        </div>
      )}

      <div className="ps-body">
        {!activeCompany ? (
          <div className="p-12 text-center bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg">
            <ShieldAlert className="w-12 h-12 text-[var(--warning)] mx-auto mb-2" />
            <h3 className="text-xs font-bold text-[var(--text-primary)]">No Active Company Context</h3>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1 max-w-sm mx-auto">
              Please select or create an operating client company first on the Executive Dashboard before managing payroll runs!
            </p>
            <Button 
              onClick={() => navigate('/')} 
              variant="primary" 
              className="mt-4"
              size="sm"
            >
              Select Active Company
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            
            {/* Left Columns: Audits checks */}
            <div className="lg:col-span-2 space-y-3">
              
              {/* Active Period Status Card */}
              {activeRun && (
                <div className="ps-card">
                  <div className="ps-card__title">Run Status: {activeRun.status.toUpperCase()}</div>
                  <div className="ps-card__sub">Calculations already computed for this period</div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        Staff processed: {activeRun.total_employees} | Net: {activeRun.total_net.toFixed(2)}
                      </span>
                    </div>
                    
                    <Button
                      onClick={() => navigate('/payroll/review')}
                      variant="secondary"
                      size="sm"
                      icon={ArrowRight}
                    >
                      Audit Payout Slips
                    </Button>
                  </div>
                </div>
              )}

              {/* Pre-Run flag check panel */}
              <div className="ps-card">
                <div className="ps-card__title">Pre-Run Flag Compliance Audits</div>
                <div className="ps-card__sub">Scans active structures, statutory configs, and identity codes</div>
                
                {/* Status Indicator */}
                <div className={`ps-alert ${
                  hasErrors 
                    ? 'ps-alert-error' 
                    : hasWarnings 
                      ? 'ps-alert-warn' 
                      : 'ps-alert-ok'
                } mb-3`}>
                  {hasErrors ? (
                    <>
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <div className="flex flex-col text-left">
                        <span className="font-bold">Calculations Blocked!</span>
                        <span className="text-[10px] mt-0.5">
                          You have {preRunIssues.errors.length} critical errors. Resolve in Employee Profiles before execution.
                        </span>
                      </div>
                    </>
                  ) : hasWarnings ? (
                    <>
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <div className="flex flex-col text-left">
                        <span className="font-bold">Warning: Compliance Incomplete</span>
                        <span className="text-[10px] mt-0.5">
                          You have {preRunIssues.warnings.length} warnings. Payroll can proceed with statutory defaults.
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <div className="flex flex-col text-left">
                        <span className="font-bold">Compliance Audit Cleared</span>
                        <span className="text-[10px] mt-0.5">
                          All active employees are configured with correct salary structures, identities, and statutory locks.
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Core Errors List */}
                {hasErrors && (
                  <div className="space-y-1.5 mb-3">
                    <h4 className="text-[10px] font-bold text-[var(--danger)] uppercase tracking-wider flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger)]" />
                      <span>Errors ({preRunIssues.errors.length})</span>
                    </h4>
                    <div className="bg-[var(--bg-surface-2)] p-2 rounded border border-[var(--border-strong)] space-y-1 max-h-32 overflow-y-auto">
                      {preRunIssues.errors.map((err, i) => (
                        <div key={i} className="text-[11px] font-semibold text-[var(--text-primary)] flex items-start space-x-1.5">
                          <span className="text-[var(--danger)] font-bold">•</span>
                          <span>{err}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings List */}
                {hasWarnings && (
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-bold text-[var(--warning)] uppercase tracking-wider flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning)]" />
                      <span>Warnings ({preRunIssues.warnings.length})</span>
                    </h4>
                    <div className="bg-[var(--bg-surface-2)] p-2 rounded border border-[var(--border-strong)] space-y-1 max-h-32 overflow-y-auto">
                      {preRunIssues.warnings.map((warn, i) => (
                        <div key={i} className="text-[11px] font-semibold text-[var(--text-primary)] flex items-start space-x-1.5">
                          <span className="text-[var(--warning)] font-bold">•</span>
                          <span>{warn}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>

            {/* Right Column: Execution Card */}
            <div>
              <div className="ps-card">
                <div className="ps-card__title">Run Payroll Engine</div>
                <div className="ps-card__sub">Compute statutory registers</div>
                
                {runSuccess && (
                  <div className="p-2 bg-[var(--success-light)] border border-[var(--success)]/20 rounded text-[11px] font-semibold text-[var(--success)] mb-3">
                    Payroll Run calculated and committed successfully!
                  </div>
                )}

                <div className="space-y-3 text-[11px] font-medium text-[var(--text-secondary)] leading-relaxed">
                  <p>
                    Launching the PaySmart Pro Statutory engine will:
                  </p>
                  <ul className="list-disc pl-3.5 space-y-1">
                    <li>Evaluate CTC component breaks.</li>
                    <li>Pro-rate Basic and HRA for LOP days.</li>
                    <li>Apportion employee and employer EPF/ESIC matches.</li>
                    <li>Calculate State PT deductions and February MH overrides.</li>
                    <li>Project annual gross and deduct monthly TDS.</li>
                  </ul>

                  <Button
                    onClick={handleRunPayroll}
                    variant="primary"
                    className="w-full py-2.5 mt-3"
                    disabled={hasErrors || loading}
                    icon={PlayCircle}
                  >
                    {loading ? 'Processing Calculations...' : 'Execute Calculations'}
                  </Button>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
