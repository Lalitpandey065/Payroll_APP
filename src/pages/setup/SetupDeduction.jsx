import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { useCompanyStore } from '../../store/company.store';
import TopBar from '../../components/layout/TopBar';
import Button from '../../components/ui/Button';
import { YesNoSelect } from '../../components/setup/YesNoSelect';

export default function SetupDeduction() {
  const navigate = useNavigate();
  const activeCompany = useCompanyStore(state => state.activeCompany);

  const [deductions, setDeductions] = useState([]);
  const [namedAllowances, setNamedAllowances] = useState([]);
  const [namedDWages, setNamedDWages] = useState([]);
  const [activeCode, setActiveCode] = useState('TDS');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState('idle');
  const [error, setError] = useState('');
  const switchingRef = useRef(false);
  const toastTimeoutRef = useRef(null);

  const [form, setForm] = useState({
    heading: '',
    hindi_heading: '',
    calculation: 'Fixed',
    shown_in_print: 1,
    shown_in_screen: 1,
    carry_forward: 0,
    is_taxable: 0,
    mode: 'Salary',
    percentage: 0,
    pct_bases: [],
  });

  useEffect(() => {
    if (activeCompany) {
      loadAll();
    }
  }, [activeCompany]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [deductionData, allowanceData] = await Promise.all([
        window.api.setup.getAllDeductions(activeCompany.id),
        window.api.setup.getAllowances(activeCompany.id),
      ]);
      
      if (deductionData.success) {
        setDeductions(deductionData.data);
        loadForm('TDS', deductionData.data);
      } else {
        showToast('error', deductionData.error?.message || 'Failed to load deductions.');
      }

      if (allowanceData.success) {
        setNamedAllowances(allowanceData.data.filter(a => a.component_type === 'allowance' && a.heading));
        setNamedDWages(allowanceData.data.filter(a => a.component_type === 'dwage' && a.heading));
      }
    } catch (err) {
      showToast('error', err.message || 'Error loading data.');
    } finally {
      setLoading(false);
    }
  };

  const loadForm = (code, data) => {
    const row = (data || deductions).find(d => d.code === code);
    if (!row) return;
    setForm({
      heading:         row.heading || '',
      hindi_heading:   row.hindi_heading || '',
      calculation:     row.calculation || 'Fixed',
      shown_in_print:  row.shown_in_print ?? 1,
      shown_in_screen: row.shown_in_screen ?? 1,
      carry_forward:   row.carry_forward ?? 0,
      is_taxable:      row.is_taxable ?? 0,
      mode:            row.mode || 'Salary',
      percentage:      row.percentage || 0,
      pct_bases:       JSON.parse(row.pct_bases || '[]'),
    });
  };

  const showToast = (type, text) => {
    if (type === 'error') {
      setError(text);
    } else {
      setError('');
    }
  };

  const handleFieldChange = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }));
  };

  const toggleBase = (code) => {
    setForm(prev => ({
      ...prev,
      pct_bases: prev.pct_bases.includes(code)
        ? prev.pct_bases.filter(c => c !== code)
        : [...prev.pct_bases, code],
    }));
  };

  const handleSwitch = async (code) => {
    if (switchingRef.current || code === activeCode) return;
    switchingRef.current = true;
    try {
      await handleSave(true); // silent save
      setActiveCode(code);
      loadForm(code);
    } finally {
      switchingRef.current = false;
    }
  };

  const handleSave = async (silent = false) => {
    if (!activeCompany) return;
    
    // Front-end validation
    if (!form.heading?.trim()) {
      if (!silent) setError('Heading is required');
      return;
    }
    if (form.pct_bases.length > 0) {
      if (form.percentage !== undefined && (form.percentage < 0 || form.percentage > 100)) {
        if (!silent) setError('Percentage must be between 0 and 100');
        return;
      }
    }
    setError('');

    if (!silent) {
      setBusy(true);
      setSaveState('saving');
    }
    
    const payload = {
      ...form,
      pct_bases: JSON.stringify(form.pct_bases),
    };
    
    try {
      const result = await window.api.setup.saveDeduction(activeCompany.id, activeCode, payload);
      
      if (result.success) {
        setDeductions(prev => prev.map(d => d.code === activeCode ? { ...d, ...payload } : d));
        if (!silent) {
          setSaveState('saved');
          setTimeout(() => setSaveState('idle'), 1500);
        }
      } else {
        if (!silent) {
          setSaveState('error');
          setError(result.error?.message || 'Save failed.');
          setTimeout(() => setSaveState('idle'), 1500);
        }
      }
    } catch (err) {
      if (!silent) {
        setSaveState('error');
        setError(err.message || 'Save failed.');
        setTimeout(() => setSaveState('idle'), 1500);
      }
    } finally {
      if (!silent) setBusy(false);
    }
  };

  if (!activeCompany) {
    return (
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[var(--bg-base)]">
        <TopBar title="Setup → Deduction Setup" />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-[var(--warning)] mb-3" />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">No Company Selected</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm">
            Please select an active client company from the sidebar before accessing calculations setup parameters.
          </p>
          <Button onClick={() => navigate('/companies')} className="mt-4" variant="primary">
            Go to Companies
          </Button>
        </div>
      </div>
    );
  }

  const currentDeduction = deductions.find(d => d.code === activeCode);

  const updateButtonProps = {
    idle:   { label: '💾 Update',   className: 'psb psb-primary' },
    saving: { label: '⟳ Saving...', className: 'psb psb-primary psb-disabled', disabled: true },
    saved:  { label: '✓ Saved',     className: 'psb psb-success' },
    error:  { label: '✕ Failed',    className: 'psb psb-danger' },
  }[saveState] || { label: '💾 Update', className: 'psb psb-primary' };
  const fixedDeductions = deductions
    .filter(d => d.deduction_type === 'fixed')
    .sort((a, b) => {
      const FIXED_ORDER = ['TDS', 'ADVANCE', 'LOAN', 'LWF', 'PROFTAX'];
      return FIXED_ORDER.indexOf(a.code) - FIXED_ORDER.indexOf(b.code);
    });
    
  const customDeductions = deductions
    .filter(d => d.deduction_type === 'custom')
    .sort((a, b) => a.slot_number - b.slot_number);

  const isFixed = currentDeduction?.deduction_type === 'fixed';

  return (
    <div className="ps-page">
      {/* Header */}
      <div className="ps-header sd-header">
        <button className="sd-back-btn" onClick={() => navigate('/setup')}>
          <ChevronLeft size={14} />
        </button>

        <div className="sd-header-title">
          <span className="sd-header-main">Setup Deduction</span>
          <span className="sd-header-sub">Define component modes and statutory participation criteria</span>
        </div>

        {/* Active name pill — red tint */}
        {currentDeduction?.heading && (
          <span className="sd-active-pill">
            <AlertTriangle size={11} style={{ marginRight: 2 }} />
            {currentDeduction.heading}
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
          <button className="psb" onClick={() => navigate('/setup')}>Exit</button>
          <button className="psb sd-update-btn" onClick={() => handleSave(false)}>
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? '✓ Saved' : 'Update'}
          </button>
        </div>
      </div>

      {/* Selector Section */}
      <div className="sd-selector">
        {/* Fixed system pills */}
        <div>
          <div className="sd-sel-label">System Deductions</div>
          <div className="sd-fixed-row">
            {fixedDeductions.map(d => (
              <div
                key={d.code}
                className={`sd-fpill ${activeCode === d.code ? 'active' : ''}`}
                onClick={() => handleSwitch(d.code)}
                title={d.heading}
              >
                {d.heading || d.code}
              </div>
            ))}
          </div>
        </div>

        <div className="sd-group-sep" />

        {/* Custom slots grid */}
        <div style={{ paddingLeft: 8 }}>
          <div className="sd-sel-label sd-sel-label-custom">Custom Deductions</div>
          <div className="sd-custom-grid">
            {customDeductions.map(d => (
              <div
                key={d.code}
                className={[
                  'sd-cslot',
                  activeCode === d.code ? 'active' : '',
                  !d.heading ? 'empty' : 'named',
                ].join(' ')}
                onClick={() => handleSwitch(d.code)}
                title={d.heading ? `${d.code} — ${d.heading}` : `${d.code} — empty`}
              >
                {d.heading && <span className="sd-cslot-dot" />}
                <span className="sd-cslot-code">{d.code}</span>
                {d.heading && <span className="sd-cslot-name">{d.heading}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alert strip */}
      {error && (
        <div 
          className="ps-alert-error" 
          style={{ margin: '6px 20px', padding: '6px 10px', fontSize: 11, flexShrink: 0 }}
        >
          ⚠ {error}
        </div>
      )}

      {/* Body Section */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-xs text-[var(--text-muted)]">
          Loading component setups...
        </div>
      ) : !currentDeduction ? (
        <div className="flex-1 flex items-center justify-center text-xs text-[var(--text-muted)]">
          Component slot not found.
        </div>
      ) : (
        <div className="ps-body">
          <div className="sd-body-grid">
            {/* Left — Deduction Settings */}
            <div className="sa-card">
              <div className="sd-card-header-red">
                <AlertTriangle size={13} /> Deduction Settings
                <span className="sd-slot-badge">{activeCode}</span>
              </div>
              <div className="sa-card-body">
                <div className="sd-field-row">
                  <span className="sd-field-label req">Heading</span>
                  <input 
                    className="sd-field-input" 
                    value={form.heading} 
                    onChange={e => handleFieldChange('heading', e.target.value.toUpperCase())} 
                    placeholder="Component Heading"
                  />
                </div>
                <div className="sd-field-row">
                  <span className="sd-field-label">Hindi Heading</span>
                  <input 
                    className="sd-field-input" 
                    value={form.hindi_heading} 
                    onChange={e => handleFieldChange('hindi_heading', e.target.value)} 
                    placeholder="Hindi representation" 
                  />
                </div>
                <div className="sd-field-row">
                  <span className="sd-field-label">Calculation</span>
                  <select 
                    className="sd-field-select" 
                    value={form.calculation} 
                    onChange={e => handleFieldChange('calculation', e.target.value)}
                  >
                    <option value="Fixed">Fixed</option>
                    <option value="Percentage">Percentage</option>
                  </select>
                </div>
                <div className="sd-field-row">
                  <span className="sd-field-label">Shown in Print</span>
                  <div className={form.shown_in_print ? "sd-yn-yes" : "sd-yn-no"} onClick={() => handleFieldChange('shown_in_print', !form.shown_in_print)}>
                    {form.shown_in_print ? 'Yes' : 'No'}
                  </div>
                </div>
                <div className="sd-field-row">
                  <span className="sd-field-label">Shown on Screen</span>
                  <div className={form.shown_in_screen ? "sd-yn-yes" : "sd-yn-no"} onClick={() => handleFieldChange('shown_in_screen', !form.shown_in_screen)}>
                    {form.shown_in_screen ? 'Yes' : 'No'}
                  </div>
                </div>
                <div className="sd-field-row">
                  <span className="sd-field-label">Carried Forward Next Month</span>
                  <div className={form.carry_forward ? "sd-yn-yes" : "sd-yn-no"} onClick={() => handleFieldChange('carry_forward', !form.carry_forward)}>
                    {form.carry_forward ? 'Yes' : 'No'}
                  </div>
                </div>
                <div className="sd-field-row">
                  <span className="sd-field-label">Taxable</span>
                  <div className={form.is_taxable ? "sd-yn-yes" : "sd-yn-no"} onClick={() => handleFieldChange('is_taxable', !form.is_taxable)}>
                    {form.is_taxable ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>
            </div>

            {/* Right — System Managed (fixed) OR Percent Calculation (custom) */}
            <div className="sa-card">
              {isFixed ? (
                <>
                  <div className="sd-card-header-gray">
                    <AlertTriangle size={13} /> System Managed
                  </div>
                  <div className="sa-card-body">
                    <div className="sd-info-box">
                      <p>This is a <strong>system deduction</strong>. Its calculation logic is managed automatically by the payroll engine based on statutory rules.</p>
                      <ul>
                        <li><strong>T.D.S.</strong> — Computed from annual taxable income via TDS engine (old/new regime)</li>
                        <li><strong>Advance</strong> — Recovered from employee advance outstanding balance</li>
                        <li><strong>Loan</strong> — Monthly EMI deducted from loan outstanding</li>
                        <li><strong>L.W.F.</strong> — State-wise Labour Welfare Fund slab lookup</li>
                        <li><strong>Prof.Tax</strong> — State-wise Professional Tax slab lookup</li>
                      </ul>
                      <div className="sd-info-note">You can still configure the display heading and payslip visibility above.</div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="sd-card-header-red">
                    <AlertTriangle size={13} /> Percent Calculation
                  </div>
                  <div className="sa-card-body">
                    <p className="sd-pct-hint">
                      Check allowance/wage bases below. If any are checked, this deduction
                      resolves dynamically as a percentage of their sum.
                    </p>

                    <div className="sd-pct-cols">
                      {/* Allowances */}
                      <div>
                        <div className="sd-pct-col-header">Allowances</div>
                        {namedAllowances.length === 0 && <div className="text-[10px] italic text-[var(--text-muted)] py-1">No named allowances</div>}
                        {namedAllowances.map(a => (
                          <label key={a.code} className="sd-pct-row">
                            <input
                              type="checkbox"
                              checked={form.pct_bases.includes(a.code)}
                              onChange={() => toggleBase(a.code)}
                            />
                            <span className="sd-pct-label">
                              {a.heading} <span className="sd-pct-code">({a.code})</span>
                            </span>
                          </label>
                        ))}
                      </div>

                      {/* Daily Wages */}
                      <div>
                        <div className="sd-pct-col-header">Daily Wages</div>
                        {namedDWages.length === 0 && <div className="text-[10px] italic text-[var(--text-muted)] py-1">No named daily wages</div>}
                        {namedDWages.map(a => (
                          <label key={a.code} className="sd-pct-row">
                            <input
                              type="checkbox"
                              checked={form.pct_bases.includes(a.code)}
                              onChange={() => toggleBase(a.code)}
                            />
                            <span className="sd-pct-label">
                              {a.heading} <span className="sd-pct-code">({a.code})</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Mode + Percentage */}
                    {form.pct_bases.length > 0 && (
                      <div className="sd-pct-calc-row">
                        <div>
                          <div className="sd-pct-calc-label">Mode</div>
                          <select 
                            value={form.mode} 
                            onChange={e => handleFieldChange('mode', e.target.value)}
                            className="sd-field-select"
                          >
                            <option value="Salary">Salary</option>
                            <option value="Fixed">Fixed</option>
                          </select>
                        </div>
                        <div>
                          <div className="sd-pct-calc-label">Percentage</div>
                          <input
                            type="number"
                            step="0.01"
                            value={form.percentage}
                            onChange={e => handleFieldChange('percentage', parseFloat(e.target.value) || 0)}
                            className="sd-pct-calc-input"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

