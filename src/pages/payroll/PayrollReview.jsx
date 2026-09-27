import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  ArrowLeft, 
  IndianRupee, 
  Plus, 
  CheckSquare, 
  Lock, 
  Search,
  ChevronRight,
  Terminal,
  HelpCircle
} from 'lucide-react';
import { useCompanyStore } from '../../store/company.store';
import { usePayrollStore } from '../../store/payroll.store';
import { useAuthStore } from '../../store/auth.store';
import TopBar from '../../components/layout/TopBar';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { formatCurrency } from '../../utils/formatters';

export default function PayrollReview() {
  const navigate = useNavigate();
  const activeCompany = useCompanyStore(state => state.activeCompany);
  const user = useAuthStore(state => state.user);

  // Zustand period
  const month = usePayrollStore(state => state.month);
  const year = usePayrollStore(state => state.year);
  
  const activeRun = usePayrollStore(state => state.activeRun);
  const runDetails = usePayrollStore(state => state.runDetails);
  const loadRun = usePayrollStore(state => state.loadRun);
  const updateRunStatus = usePayrollStore(state => state.updateRunStatus);
  const addOverrideStore = usePayrollStore(state => state.addOverride);
  const loading = usePayrollStore(state => state.loading);

  const [search, setSearch] = useState('');
  
  // Selected employee for side-panel payslip check
  const [selectedEmpDetail, setSelectedEmpDetail] = useState(null);
  const [showDebugLog, setShowDebugLog] = useState(false);

  // Overrides modal states
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [overrideEmpId, setOverrideEmpId] = useState('');
  const [overrideType, setOverrideType] = useState('incentive');
  const [overrideLabel, setOverrideLabel] = useState('Performance Incentive');
  const [overrideAmount, setOverrideAmount] = useState('5000');
  const [overrideRemarks, setOverrideRemarks] = useState('');
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideError, setOverrideError] = useState('');

  useEffect(() => {
    if (activeCompany) {
      loadRun(activeCompany.id);
    }
  }, [activeCompany, month, year]);

  const handleSelectEmployee = (detail) => {
    // Parse components JSON
    const parsed = typeof detail.components_json === 'string' ? JSON.parse(detail.components_json) : detail.components_json;
    setSelectedEmpDetail({
      ...detail,
      parsed_components: parsed
    });
    setShowDebugLog(false);
  };

  const handleOpenOverride = () => {
    if (runDetails.length > 0) {
      setOverrideEmpId(runDetails[0].emp_id);
      setIsOverrideOpen(true);
    }
  };

  const handleSaveOverride = async (e) => {
    e.preventDefault();
    if (!overrideEmpId || !overrideAmount) return;

    try {
      const response = await addOverrideStore({
        run_id: activeRun.id,
        emp_id: overrideEmpId,
        override_type: overrideType,
        label: overrideLabel,
        amount: parseFloat(overrideAmount),
        is_taxable: 1,
        is_pf_wage: 0,
        is_esi_wage: 0,
        remarks: overrideRemarks,
        added_by: user.name
      });

      if (response.success) {
        setIsOverrideOpen(false);
        setOverrideRemarks('');

        // Re-execute payroll so the engine recomputes totals including the new override
        await window.api.payroll.executeRun(activeCompany.id, month, year, user.name);
        // Then reload to pull the freshly computed results into the store
        await loadRun(activeCompany.id);
        setSelectedEmpDetail(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleApprove = async () => {
    if (activeRun) {
      const res = await updateRunStatus(activeRun.id, 'approved', user);
      if (res.success) {
        await loadRun(activeCompany.id);
      }
    }
  };

  const handleLock = async () => {
    if (activeRun) {
      const res = await updateRunStatus(activeRun.id, 'locked', user);
      if (res.success) {
        await loadRun(activeCompany.id);
      }
    }
  };

  const filtered = runDetails.filter(d => {
    const term = search.toLowerCase();
    return d.emp_name.toLowerCase().includes(term) || d.emp_code.toLowerCase().includes(term);
  });

  const headers = [
    'Code',
    'Employee Name',
    'Gross salary',
    'PF (12%)',
    'ESI (0.75%)',
    'TDS (IT)',
    'PT Slabs',
    'Net Payout',
    'Audit Flags',
    { label: 'Audits', align: 'right' }
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[var(--bg-base)]">
      <TopBar title="Statutory Ledger Audit" />

      {/* Main Review Body */}
      <div className="flex-1 p-6 space-y-6 min-h-0 overflow-y-scroll text-left">
        
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between text-left">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/payroll')}
              className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus:outline-none"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                Payroll Run Transaction Ledger
              </h2>
              <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">
                Perform professional audits on pro-rata breakdowns and compliance parameters.
              </p>
            </div>
          </div>
          
          {activeRun && (
            <div className="flex items-center space-x-2">
              
              {activeRun.status === 'draft' && (
                <Button
                  onClick={handleOpenOverride}
                  variant="secondary"
                  size="sm"
                  icon={Plus}
                >
                  Add Override
                </Button>
              )}

              {/* Status workflow */}
              {activeRun.status === 'draft' && (user.role === 'admin' || user.role === 'manager') ? (
                <Button
                  onClick={handleApprove}
                  variant="success"
                  size="sm"
                  icon={CheckSquare}
                >
                  Approve Payout Run
                </Button>
              ) : null}

              {activeRun.status === 'approved' && user.role === 'admin' ? (
                <Button
                  onClick={handleLock}
                  variant="primary"
                  size="sm"
                  icon={Lock}
                >
                  Lock Compliance Run
                </Button>
              ) : null}

              {activeRun.status === 'locked' && (
                <Badge status="locked">Locked & Synced</Badge>
              )}
            </div>
          )}
        </div>

        {!activeRun ? (
          <Card className="text-center py-16">
            <ShieldCheck className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-base font-bold text-[var(--text-primary)]">No Calculations Run Found</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-sm mx-auto">
              Please calculate payroll first under the Payroll Run page before auditing transaction ledgers!
            </p>
            <Button 
              onClick={() => navigate('/payroll')} 
              variant="primary" 
              className="mt-6"
              size="sm"
            >
              Go to Calculations page
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            
            {/* Top Summaries Header Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-[var(--bg-surface)] p-4 rounded-lg border border-[var(--border)] text-left">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Total Gross Payout</span>
                <span className="block text-lg font-bold font-mono text-[var(--text-primary)] mt-1">{formatCurrency(activeRun.total_gross)}</span>
              </div>
              <div className="bg-[var(--bg-surface)] p-4 rounded-lg border border-[var(--border)] text-left">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Net Salaries Paid</span>
                <span className="block text-lg font-bold font-mono text-[var(--success)] mt-1">{formatCurrency(activeRun.total_net)}</span>
              </div>
              <div className="bg-[var(--bg-surface)] p-4 rounded-lg border border-[var(--border)] text-left">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">EPF Matching Fund</span>
                <span className="block text-lg font-bold font-mono text-[var(--accent)] mt-1">{formatCurrency(activeRun.total_pf_employee + activeRun.total_pf_employer)}</span>
              </div>
              <div className="bg-[var(--bg-surface)] p-4 rounded-lg border border(--border)] text-left">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">ESIC Medical Fund</span>
                <span className="block text-lg font-bold font-mono text-[var(--info)] mt-1">{formatCurrency(activeRun.total_esi_employee + activeRun.total_esi_employer)}</span>
              </div>
              <div className="bg-[var(--bg-surface)] p-4 rounded-lg border border-[var(--border)] text-left">
                <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">TDS Tax Reserve</span>
                <span className="block text-lg font-bold font-mono text-[var(--warning)] mt-1">{formatCurrency(activeRun.total_tds)}</span>
              </div>
            </div>

            {/* Audit Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
              
              {/* Employee table ledger list */}
              <div className="lg:col-span-3 space-y-4">
                <div className="flex items-center space-x-2 max-w-xs bg-[var(--bg-surface)] p-2 rounded-md border border-[var(--border-strong)]">
                  <Search className="w-4 h-4 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    placeholder="Search ledger by name, code..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full text-xs bg-transparent text-[var(--text-primary)] border-none focus:outline-none focus:ring-0"
                  />
                </div>

                <Table headers={headers} className="text-left font-mono text-xs">
                  {filtered.map(d => {
                    const hasEsiCeiling = d.esi_ceiling_crossed === 1;
                    const isSelected = selectedEmpDetail?.emp_id === d.emp_id;

                    return (
                      <tr 
                        key={d.id} 
                        onClick={() => handleSelectEmployee(d)}
                        className={`cursor-pointer hover:bg-[var(--bg-hover)] transition-colors duration-150
                          ${isSelected ? 'bg-[var(--accent-light)]/30 font-semibold border-l-4 border-[var(--accent)]' : ''}`}
                      >
                        {/* Code */}
                        <td className="px-4 py-3 font-bold">{d.emp_code}</td>
                        
                        {/* Name */}
                        <td className="px-4 py-3 font-sans font-semibold text-sm">{d.emp_name}</td>
                        
                        {/* Gross */}
                        <td className="px-4 py-3 text-right">{d.gross_salary.toFixed(2)}</td>
                        
                        {/* PF */}
                        <td className="px-4 py-3 text-right">{d.pf_employee.toFixed(2)}</td>
                        
                        {/* ESI */}
                        <td className="px-4 py-3 text-right">{d.esi_employee.toFixed(2)}</td>
                        
                        {/* TDS */}
                        <td className="px-4 py-3 text-right">{d.tds.toFixed(2)}</td>
                        
                        {/* PT */}
                        <td className="px-4 py-3 text-right">{d.pt.toFixed(2)}</td>
                        
                        {/* Net */}
                        <td className="px-4 py-3 text-right font-bold text-[var(--success)]">{d.net_salary.toFixed(2)}</td>
                        
                        {/* Audit Flags */}
                        <td className="px-4 py-3 font-sans">
                          {hasEsiCeiling ? (
                            <Badge status="draft" className="text-[10px]">ESI Capped</Badge>
                          ) : d.esi_employee === 0 ? (
                            <Badge status="inactive" className="text-[10px]">No ESI</Badge>
                          ) : (
                            <span className="text-xs text-[var(--text-muted)] font-medium">OK</span>
                          )}
                        </td>

                        {/* Audit Details click */}
                        <td className="px-4 py-3 text-right">
                          <ChevronRight className="w-4 h-4 text-[var(--text-muted)] inline-block" />
                        </td>

                      </tr>
                    );
                  })}
                </Table>
              </div>

              {/* Right Side: Collapsible Audit Console Slips */}
              <div>
                {selectedEmpDetail ? (
                  <Card 
                    title="Employee Calculations Sheet"
                    subTitle={`[${selectedEmpDetail.emp_code}] ${selectedEmpDetail.emp_name}`}
                  >
                    <div className="space-y-4 text-xs text-left leading-relaxed">
                      
                      {/* Structure snapshots */}
                      <div className="grid grid-cols-2 gap-3 border-b border-[var(--border)] pb-3 font-medium">
                        <div>
                          <span className="text-[10px] text-[var(--text-secondary)] block">Monthly CTC</span>
                          <span className="font-mono font-bold text-[var(--text-primary)]">{(selectedEmpDetail.ctc / 12).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--text-secondary)] block">Days worked</span>
                          <span className="font-mono font-bold text-[var(--text-primary)]">{selectedEmpDetail.present_days}/{selectedEmpDetail.working_days} Days</span>
                        </div>
                      </div>

                      {/* Earnings list */}
                      <div className="space-y-1.5 border-b border-[var(--border)] pb-3">
                        <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">Earnings Breakdowns</span>
                        <div className="space-y-1 font-mono">
                          <div className="flex justify-between">
                            <span>Basic Salary</span>
                            <span>{selectedEmpDetail.basic.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>House Rent (HRA)</span>
                            <span>{selectedEmpDetail.hra.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Dearness (DA)</span>
                            <span>{selectedEmpDetail.da.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Conveyance Allow</span>
                            <span>{selectedEmpDetail.conveyance.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Medical Allowance</span>
                            <span>{selectedEmpDetail.medical_allowance.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Special Allowance</span>
                            <span>{selectedEmpDetail.special_allowance.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Deductions list */}
                      <div className="space-y-1.5 border-b border-[var(--border)] pb-3">
                        <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">Compliance Deductions</span>
                        <div className="space-y-1 font-mono text-[var(--danger)]">
                          <div className="flex justify-between">
                            <span>EPF Employee Share</span>
                            <span>{selectedEmpDetail.pf_employee.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>ESIC Employee Share</span>
                            <span>{selectedEmpDetail.esi_employee.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>TDS Tax Deduction</span>
                            <span>{selectedEmpDetail.tds.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Professional Tax (PT)</span>
                            <span>{selectedEmpDetail.pt.toFixed(2)}</span>
                          </div>
                          {selectedEmpDetail.lop_deduction > 0 && (
                            <div className="flex justify-between font-bold">
                              <span>LOP Pro-rata Loss</span>
                              <span>{selectedEmpDetail.lop_deduction.toFixed(2)}</span>
                            </div>
                          )}
                          {selectedEmpDetail.advance_recovery > 0 && (
                            <div className="flex justify-between">
                              <span>Advance Recovery</span>
                              <span>{selectedEmpDetail.advance_recovery.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Net salary */}
                      <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
                        <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Simulated Net Pay</span>
                        <span className="font-mono font-bold text-base text-[var(--success)]">{selectedEmpDetail.net_salary.toFixed(2)}</span>
                      </div>

                      {/* Collapsible calculations debug console */}
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setShowDebugLog(!showDebugLog)}
                          className="w-full flex items-center justify-between p-2 rounded bg-slate-800 text-slate-300 font-mono text-xs focus:outline-none hover:bg-slate-750 transition-colors"
                        >
                          <span className="flex items-center space-x-1.5">
                            <Terminal className="w-3.5 h-3.5" />
                            <span>Statutory Computation Logs</span>
                          </span>
                          <span>{showDebugLog ? 'Hide' : 'Expand'}</span>
                        </button>

                        {showDebugLog && (
                          <div className="bg-slate-900 border border-slate-700 text-emerald-400 p-3 rounded font-mono text-[10px] leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap text-left select-text">
                            {selectedEmpDetail.computation_log || 'No calculation log captured.'}
                          </div>
                        )}
                      </div>

                    </div>
                  </Card>
                ) : (
                  <div className="p-10 border-2 border-dashed border-[var(--border-strong)] rounded-lg text-center text-[var(--text-muted)]">
                    <IndianRupee className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-xs font-semibold">Select an employee row to audit their compliance computation sheet and debugging log logs.</p>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </div>

      {/* Manual Overrides Modal */}
      {activeRun && (
        <Modal
          isOpen={isOverrideOpen}
          onClose={() => setIsOverrideOpen(false)}
          title="Manual Override Adjustment"
          footer={
            <div className="flex items-center space-x-2">
              <Button onClick={() => setIsOverrideOpen(false)} variant="secondary">Cancel</Button>
              <Button onClick={handleSaveOverride} variant="primary">Apply Override</Button>
            </div>
          }
        >
          <form onSubmit={handleSaveOverride} className="space-y-4 text-left">
            <Select
              label="Select Employee"
              options={runDetails.map(d => ({ value: d.emp_id, label: `[${d.emp_code}] ${d.emp_name}` }))}
              value={overrideEmpId}
              onChange={e => setOverrideEmpId(e.target.value)}
              required
            />
            <Select
              label="Adjustment Category Type"
              options={[
                { value: 'bonus', label: 'Bonus / Reward (Positive)' },
                { value: 'incentive', label: 'Performance Incentive (Positive)' },
                { value: 'arrear', label: 'Arrear Payout (Positive)' },
                { value: 'loan_deduction', label: 'Manual Loan Deduction (Negative)' },
                { value: 'custom_deduction', label: 'Custom Compliance Deduction (Negative)' }
              ]}
              value={overrideType}
              onChange={e => {
                setOverrideType(e.target.value);
                // Pre-fill standard descriptions
                if (e.target.value === 'bonus') {
                  setOverrideLabel('Festive Reward');
                  setOverrideAmount('5000');
                } else if (e.target.value === 'loan_deduction') {
                  setOverrideLabel('Loan Recovery');
                  setOverrideAmount('-3000');
                }
              }}
              required
            />
            <Input
              label="Description Label"
              value={overrideLabel}
              onChange={e => setOverrideLabel(e.target.value)}
              required
            />
            <Input
              label="Amount (₹) (Use negative for deductions)"
              value={overrideAmount}
              onChange={e => setOverrideAmount(e.target.value)}
              required
            />
            <Input
              label="Remarks / Audit Note"
              value={overrideRemarks}
              onChange={e => setOverrideRemarks(e.target.value)}
            />
          </form>
        </Modal>
      )}

    </div>
  );
}
