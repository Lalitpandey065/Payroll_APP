import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, ChevronLeft, Building2, AlertTriangle } from 'lucide-react';
import { useCompanyStore } from '../../store/company.store';
import TopBar from '../../components/layout/TopBar';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { YesNoSelect } from '../../components/setup/YesNoSelect';

export default function SetupAllowance() {
  const navigate = useNavigate();
  const activeCompany = useCompanyStore(state => state.activeCompany);

  const [allowances, setAllowances] = useState([]);
  const [activeCode, setActiveCode] = useState('All-01');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const [error, setError] = useState('');
  const switchingRef = useRef(false);

  // Load all allowances for active company
  useEffect(() => {
    if (activeCompany) {
      setLoading(true);
      window.api.setup.getAllowances(activeCompany.id)
        .then(res => {
          if (res.success && res.data) {
            setAllowances(res.data);
          } else {
            showToast('error', res.error?.message || 'Failed to load allowances.');
          }
        })
        .catch(err => {
          showToast('error', err.message || 'Error loading allowances.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [activeCompany]);

  const showToast = (type, text) => {
    if (type === 'error') {
      setError(text);
    } else {
      setError('');
    }
  };

  const currentAllowance = allowances.find(a => a.code === activeCode);

  const handleFieldChange = (field, val) => {
    setAllowances(prev => prev.map(a => {
      if (a.code === activeCode) {
        return { ...a, [field]: val };
      }
      return a;
    }));
  };

  const handlePctBaseToggle = (baseCode, checked) => {
    if (!currentAllowance) return;
    let bases = [];
    try {
      bases = typeof currentAllowance.pct_bases === 'string' 
        ? JSON.parse(currentAllowance.pct_bases) 
        : (currentAllowance.pct_bases || []);
    } catch {
      bases = [];
    }

    if (checked) {
      if (!bases.includes(baseCode)) {
        bases = [...bases, baseCode];
      }
    } else {
      bases = bases.filter(b => b !== baseCode);
    }

    handleFieldChange('pct_bases', JSON.stringify(bases));
  };

  // Perform save of specific allowance component (silent mode for tab switch)
  const saveAllowanceData = async (code, record) => {
    if (!activeCompany || !record) return { success: false };
    try {
      const res = await window.api.setup.saveAllowance(activeCompany.id, code, record);
      return res;
    } catch (err) {
      return { success: false, error: { message: err.message } };
    }
  };

  // Switch tab and auto-save current
  const handleTabChange = async (targetCode) => {
    if (switchingRef.current || targetCode === activeCode) return;
    switchingRef.current = true;
    
    try {
      // Auto-save current active tab data before switching
      if (currentAllowance) {
        const prevRecord = { 
          ...currentAllowance, 
          pct_bases: typeof currentAllowance.pct_bases === 'string' 
            ? currentAllowance.pct_bases 
            : JSON.stringify(currentAllowance.pct_bases || [])
        };
        await saveAllowanceData(activeCode, prevRecord);
      }
      setActiveCode(targetCode);
    } finally {
      switchingRef.current = false;
    }
  };

  const handleSave = async () => {
    if (!activeCompany || !currentAllowance) return;
    
    // Front-end validation
    if (!currentAllowance.heading?.trim()) {
      setError('Heading is required');
      return;
    }
    setError('');
    
    setBusy(true);
    setSaveState('saving');
    
    const res = await saveAllowanceData(activeCode, currentAllowance);
    if (res.success) {
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1500);
    } else {
      setSaveState('error');
      setError(res.error?.message || 'Save failed.');
      setTimeout(() => setSaveState('idle'), 1500);
    }
    setBusy(false);
  };

  if (!activeCompany) {
    return (
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[var(--bg-base)]">
        <TopBar title="Setup → Allowance Setup" />
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

  // Pre-generate component codes lists
  const row1Codes = Array.from({ length: 25 }, (_, i) => `All-${(i + 1).toString().padStart(2, '0')}`);
  const row2AllCodes = Array.from({ length: 5 }, (_, i) => `All-${(i + 26).toString().padStart(2, '0')}`);
  const row2DWCodes = Array.from({ length: 6 }, (_, i) => `DW-${(i + 1).toString().padStart(2, '0')}`);

  // Helpers to check if named
  const getAllowanceHeading = (code) => {
    const found = allowances.find(a => a.code === code);
    return found?.heading || '';
  };

  // Filter named allowances and dwages for percentage check list
  const namedAllowancesList = allowances.filter(
    a => a.component_type === 'allowance' && a.heading && a.heading.trim() !== '' && a.code !== activeCode
  );

  const namedDWList = allowances.filter(
    a => a.component_type === 'dwage' && a.heading && a.heading.trim() !== '' && a.code !== activeCode
  );

  // Check pct bases status
  let parsedPctBases = [];
  if (currentAllowance) {
    try {
      parsedPctBases = typeof currentAllowance.pct_bases === 'string'
        ? JSON.parse(currentAllowance.pct_bases || '[]')
        : (currentAllowance.pct_bases || []);
    } catch {
      parsedPctBases = [];
    }
  }
  const isPctBasesActive = parsedPctBases.length > 0;

  const updateButtonProps = {
    idle:   { label: '💾 Update',   className: 'psb psb-primary' },
    saving: { label: '⟳ Saving...', className: 'psb psb-primary psb-disabled', disabled: true },
    saved:  { label: '✓ Saved',     className: 'psb psb-success' },
    error:  { label: '✕ Failed',    className: 'psb psb-danger' },
  }[saveState] || { label: '💾 Update', className: 'psb psb-primary' };

  return (
    <div className="ps-page">
      {/* Header */}
      <div className="ps-header">
        <div className="ps-header__left">
          <button className="ps-header__back" type="button" onClick={() => navigate('/setup')}>
            <ChevronLeft size={14}/>
          </button>
          <div>
            <h1 className="ps-header__title">Setup Allowance</h1>
            <p className="ps-header__sub">Define component modes and statutory participation criteria</p>
          </div>
        </div>
        <div className="ps-header__actions">
          <button 
            type="button" 
            className={updateButtonProps.className} 
            onClick={handleSave}
            disabled={updateButtonProps.disabled || busy}
          >
            {updateButtonProps.label}
          </button>
          <button type="button" className="psb psb-secondary" onClick={() => navigate('/setup')}>
            Exit
          </button>
        </div>
      </div>

      {/* Tab Section */}
      <div className="allowance-tab-section">
        {/* Row 1: All-01 to All-25 */}
        <div className="allowance-tab-row">
          {allowances
            .filter(a => a.component_type === 'allowance' && a.slot_number <= 25)
            .map(a => (
              <button
                key={a.code}
                type="button"
                className={`allowance-tab ${activeCode === a.code ? 'active' : ''}`}
                onClick={() => handleTabChange(a.code)}
                title={a.heading ? `${a.code}: ${a.heading}` : a.code}
              >
                {a.code}
              </button>
            ))
          }
        </div>

        {/* Row 2: All-26 to All-30 | DW-01 to DW-06 */}
        <div className="allowance-tab-row" style={{ borderTop: '1px solid var(--border)' }}>
          {allowances
            .filter(a => a.component_type === 'allowance' && a.slot_number >= 26)
            .map(a => (
              <button
                key={a.code}
                type="button"
                className={`allowance-tab ${activeCode === a.code ? 'active' : ''}`}
                onClick={() => handleTabChange(a.code)}
                title={a.heading ? `${a.code}: ${a.heading}` : a.code}
              >
                {a.code}
              </button>
            ))
          }

          {/* Visual separator between All and DW */}
          <div className="allowance-tab-dw-sep" />

          {allowances
            .filter(a => a.component_type === 'dwage')
            .map(a => (
              <button
                key={a.code}
                type="button"
                className={`allowance-tab ${activeCode === a.code ? 'active' : ''}`}
                onClick={() => handleTabChange(a.code)}
                title={a.heading ? `${a.code}: ${a.heading}` : a.code}
              >
                {a.code}
              </button>
            ))
          }
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

      {/* Body container split into 55% Left / 45% Right */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-xs text-[var(--text-muted)]">
          Loading component setups...
        </div>
      ) : !currentAllowance ? (
        <div className="flex-1 flex items-center justify-center text-xs text-[var(--text-muted)]">
          Component slot not found.
        </div>
      ) : (
        <div className="setup-body" style={{ display: 'grid', gridTemplateColumns: '55% 45%', gap: '0 24px', overflowY: 'auto' }}>
          
          {/* LEFT PANEL (55%): Form Fields */}
          <div className="space-y-4">
            <div className="cform">
              <span className="cfl req">Heading</span>
              <input 
                type="text" 
                value={currentAllowance.heading} 
                onChange={e => handleFieldChange('heading', e.target.value.toUpperCase())}
                placeholder="Component Heading (e.g. BASIC)"
              />

              <span className="cfl">Hindi Heading</span>
              <input 
                type="text" 
                value={currentAllowance.hindi_heading || ''} 
                onChange={e => handleFieldChange('hindi_heading', e.target.value)}
                placeholder="Hindi representation"
              />

              <span className="cfl">Gross Salary</span>
              <YesNoSelect 
                value={currentAllowance.is_gross_salary ?? 1} 
                onChange={val => handleFieldChange('is_gross_salary', val)}
                size="sm"
              />

              <span className="cfl">Calculation Basis</span>
              <select 
                value={currentAllowance.calculation || 'Month'} 
                onChange={e => handleFieldChange('calculation', e.target.value)}
              >
                <option value="Month">Month</option>
                <option value="Day">Day</option>
                <option value="Hour">Hour</option>
              </select>

              <span className="cfl">E.P.F. Status</span>
              <YesNoSelect 
                value={currentAllowance.epf_status ?? 0} 
                onChange={val => handleFieldChange('epf_status', val)}
                size="sm"
              />

              <span className="cfl">E.S.I. Status</span>
              <YesNoSelect 
                value={currentAllowance.esi_status ?? 1} 
                onChange={val => handleFieldChange('esi_status', val)}
                size="sm"
              />

              <span className="cfl">Bonus Status</span>
              <YesNoSelect 
                value={currentAllowance.bonus_status ?? 1} 
                onChange={val => handleFieldChange('bonus_status', val)}
                size="sm"
              />

              <span className="cfl">Leave Encashment</span>
              <YesNoSelect 
                value={currentAllowance.leave_encashment ?? 0} 
                onChange={val => handleFieldChange('leave_encashment', val)}
                size="sm"
              />

              <span className="cfl">Overtime Status</span>
              <YesNoSelect 
                value={currentAllowance.overtime_status ?? 1} 
                onChange={val => handleFieldChange('overtime_status', val)}
                size="sm"
              />

              <span className="cfl">Gratuity Status</span>
              <YesNoSelect 
                value={currentAllowance.gratuity_status ?? 0} 
                onChange={val => handleFieldChange('gratuity_status', val)}
                size="sm"
              />

              <span className="cfl">Shown in Print</span>
              <YesNoSelect 
                value={currentAllowance.shown_in_print ?? 1} 
                onChange={val => handleFieldChange('shown_in_print', val)}
                size="sm"
              />

              <span className="cfl">Shown in Screen</span>
              <YesNoSelect 
                value={currentAllowance.shown_in_screen ?? 1} 
                onChange={val => handleFieldChange('shown_in_screen', val)}
                size="sm"
              />
            </div>
          </div>

          {/* RIGHT PANEL (45%): Secondary Fields & Percent Calculators */}
          <div className="space-y-4">
            <div className="cform" style={{ gridTemplateColumns: '130px 1fr' }}>
              <span className="cfl">Carry Forward</span>
              <YesNoSelect 
                value={currentAllowance.carry_forward ?? 1} 
                onChange={val => handleFieldChange('carry_forward', val)}
                size="sm"
              />

              <span className="cfl">Taxable Component</span>
              <YesNoSelect 
                value={currentAllowance.is_taxable ?? 1} 
                onChange={val => handleFieldChange('is_taxable', val)}
                size="sm"
              />

              {isPctBasesActive && (
                <>
                  <span className="cfl">Percentage Mode</span>
                  <select 
                    value={currentAllowance.mode || 'Salary'} 
                    onChange={e => handleFieldChange('mode', e.target.value)}
                  >
                    <option value="Salary">Salary</option>
                    <option value="Fixed">Fixed</option>
                  </select>

                  <span className="cfl">Percentage Value</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={currentAllowance.percentage ?? 0} 
                    onChange={e => handleFieldChange('percentage', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}
                  />
                </>
              )}
            </div>

            {/* Checkbox matrix panel */}
            {currentAllowance?.component_type === 'allowance' && (
            <div className="p-3 border rounded border-amber-300 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-950/10">
              <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#e67e22' }}>
                Percent Calculation
              </h4>
              <p className="text-[10px] text-[var(--text-muted)] mb-3 leading-normal">
                Check component boxes below to define the bases. If any are checked, the component resolves dynamically as a percentage of their sum.
              </p>

              <div className="grid grid-cols-2 gap-x-4 max-h-[170px] overflow-y-auto pr-1">
                {/* Column 1: Named Allowances */}
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase border-b border-slate-200 dark:border-slate-800 pb-0.5 mb-1">
                    Allowances
                  </div>
                  {namedAllowancesList.length === 0 ? (
                    <div className="text-[10px] italic text-[var(--text-muted)] py-1">No other named allowances</div>
                  ) : (
                    namedAllowancesList.map(allow => (
                      <label 
                        key={allow.code} 
                        className="flex items-center space-x-2 text-[11px] text-[var(--text-primary)] cursor-pointer py-0.5"
                      >
                        <input
                          type="checkbox"
                          checked={parsedPctBases.includes(allow.code)}
                          onChange={e => handlePctBaseToggle(allow.code, e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-[var(--border-strong)] text-[var(--accent)]"
                        />
                        <span className="truncate">{allow.heading} ({allow.code})</span>
                      </label>
                    ))
                  )}
                </div>

                {/* Column 2: Named Daily Wages */}
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase border-b border-slate-200 dark:border-slate-800 pb-0.5 mb-1">
                    Daily Wages
                  </div>
                  {namedDWList.length === 0 ? (
                    <div className="text-[10px] italic text-[var(--text-muted)] py-1">No named daily wages</div>
                  ) : (
                    namedDWList.map(dw => (
                      <label 
                        key={dw.code} 
                        className="flex items-center space-x-2 text-[11px] text-[var(--text-primary)] cursor-pointer py-0.5"
                      >
                        <input
                          type="checkbox"
                          checked={parsedPctBases.includes(dw.code)}
                          onChange={e => handlePctBaseToggle(dw.code, e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-[var(--border-strong)] text-[var(--accent)]"
                        />
                        <span className="truncate">{dw.heading} ({dw.code})</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="ps-footer ps-footer--right">
        <button className="psb psb-secondary" type="button" onClick={() => navigate('/setup')}>
          Cancel
        </button>
        <button 
          className={updateButtonProps.className} 
          type="button" 
          onClick={handleSave}
          disabled={updateButtonProps.disabled || busy}
        >
          {updateButtonProps.label}
        </button>
      </div>
    </div>
  );
}
