import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { useCompanyStore } from '../../store/company.store';
import TopBar from '../../components/layout/TopBar';
import Button from '../../components/ui/Button';
import { formatCurrency } from '../../utils/formatters';

export default function StructureBuilder() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const activeCompany = useCompanyStore(state => state.activeCompany);

  const [name, setName] = useState('Standard Structure');
  const [description, setDescription] = useState('Custom CTC-based breakdown template');
  const [ctc, setCtc] = useState('600000'); // Default ₹6L CTC
  const [components, setComponents] = useState([]);
  
  // Real-time calculations states
  const [estGross, setEstGross] = useState(0);
  const [estDeductions, setEstDeductions] = useState(0);
  const [estNet, setEstNet] = useState(0);
  const [estPfLiab, setEstPfLiab] = useState(0);
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // Load default components or existing components on mount
  useEffect(() => {
    if (isEdit) {
      loadStructure();
    } else {
      seedDefaultComponents();
    }
  }, [id, isEdit]);

  const seedDefaultComponents = () => {
    // Scaffold default 12 components structure
    setComponents([
      { code: 'BASIC', name: 'Basic Salary', component_type: 'earning', calc_type: 'pct_ctc', calc_value: '40', is_pf_wage: 1, is_esi_wage: 1, is_taxable: 1, is_pro_rated: 1, display_order: 1 },
      { code: 'HRA', name: 'House Rent Allowance', component_type: 'earning', calc_type: 'pct_basic', calc_value: '50', is_pf_wage: 0, is_esi_wage: 1, is_taxable: 1, is_pro_rated: 1, display_order: 2 },
      { code: 'DA', name: 'Dearness Allowance', component_type: 'earning', calc_type: 'pct_basic', calc_value: '10', is_pf_wage: 1, is_esi_wage: 1, is_taxable: 1, is_pro_rated: 1, display_order: 3 },
      { code: 'CONV', name: 'Conveyance Allowance', component_type: 'earning', calc_type: 'fixed', calc_value: '1600', is_pf_wage: 0, is_esi_wage: 1, is_taxable: 1, is_pro_rated: 0, display_order: 4 },
      { code: 'MED', name: 'Medical Allowance', component_type: 'earning', calc_type: 'fixed', calc_value: '1250', is_pf_wage: 0, is_esi_wage: 1, is_taxable: 1, is_pro_rated: 0, display_order: 5 },
      { code: 'SA', name: 'Special Allowance', component_type: 'earning', calc_type: 'formula', calc_value: 'MONTHLY_CTC-BASIC-HRA-DA-CONV-MED', is_pf_wage: 0, is_esi_wage: 1, is_taxable: 1, is_pro_rated: 1, display_order: 6 },
      { code: 'PF_EMP', name: 'PF Employee', component_type: 'deduction', calc_type: 'statutory', calc_value: 'pf_employee', is_pf_wage: 0, is_esi_wage: 0, is_taxable: 0, is_pro_rated: 0, display_order: 7 },
      { code: 'PF_ER', name: 'PF Employer', component_type: 'employer_contribution', calc_type: 'statutory', calc_value: 'pf_employer', is_pf_wage: 0, is_esi_wage: 0, is_taxable: 0, is_pro_rated: 0, display_order: 8 },
      { code: 'ESI_EMP', name: 'ESI Employee', component_type: 'deduction', calc_type: 'statutory', calc_value: 'esi_employee', is_pf_wage: 0, is_esi_wage: 0, is_taxable: 0, is_pro_rated: 0, display_order: 9 },
      { code: 'ESI_ER', name: 'ESI Employer', component_type: 'employer_contribution', calc_type: 'statutory', calc_value: 'esi_employer', is_pf_wage: 0, is_esi_wage: 0, is_taxable: 0, is_pro_rated: 0, display_order: 10 },
      { code: 'PT', name: 'Professional Tax', component_type: 'deduction', calc_type: 'statutory', calc_value: 'pt', is_pf_wage: 0, is_esi_wage: 0, is_taxable: 0, is_pro_rated: 0, display_order: 11 },
      { code: 'TDS', name: 'TDS (Estimated)', component_type: 'deduction', calc_type: 'statutory', calc_value: 'tds', is_pf_wage: 0, is_esi_wage: 0, is_taxable: 0, is_pro_rated: 0, display_order: 12 }
    ]);
  };

  const loadStructure = async () => {
    try {
      const res = await window.api.salary.getStructureWithComponents(id);
      if (res.success && res.data) {
        setName(res.data.name);
        setDescription(res.data.description);
        setCtc(res.data.default_ctc?.toString() || '600000');
        setComponents(res.data.components);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Run live calculations when CTC or components change
  useEffect(() => {
    runLiveCalculations();
  }, [ctc, components]);

  const runLiveCalculations = () => {
    const monthlyCtc = parseFloat(ctc || 0) / 12;
    if (monthlyCtc <= 0 || components.length === 0) return;

    const values = {};
    let totalEarning = 0;
    let totalDeduct = 0;
    let pfER = 0;
    
    // Sort components by display order to guarantee sequential dependent resolves
    const sorted = [...components].sort((a, b) => a.display_order - b.display_order);

    for (const c of sorted) {
      if (c.component_type !== 'earning') continue;

      let amount = 0;
      if (c.calc_type === 'fixed') {
        amount = parseFloat(c.calc_value || 0);
      } else if (c.calc_type === 'pct_ctc') {
        amount = monthlyCtc * (parseFloat(c.calc_value || 0) / 100);
      } else if (c.calc_type === 'pct_basic') {
        const basic = values['BASIC'] || 0;
        amount = basic * (parseFloat(c.calc_value || 0) / 100);
      } else if (c.calc_type === 'formula') {
        // Mock special formula resolve
        amount = monthlyCtc - (values['BASIC'] || 0) - (values['HRA'] || 0) - (values['DA'] || 0) - (values['CONV'] || 0) - (values['MED'] || 0);
      }

      values[c.code] = Math.max(0, amount);
      totalEarning += Math.max(0, amount);
    }

    // Process Deductions
    const pfWage = Math.min(15000, (values['BASIC'] || 0) + (values['DA'] || 0)); // cap at 15k
    const pfDeduction = pfWage * 0.12;

    const gross = totalEarning;
    const esiDeduction = gross <= 21000 ? (gross * 0.0075) : 0;
    const ptDeduction = gross > 10000 ? 200 : gross > 7500 ? 175 : 0;
    
    // Loose estimated TDS (assume 5% average)
    const tdsDeduction = gross > 50000 ? (gross - 50000) * 0.10 : 0;

    totalDeduct = pfDeduction + esiDeduction + ptDeduction + tdsDeduction;
    pfER = pfWage * 0.12;

    setEstGross(round2(gross));
    setEstDeductions(round2(totalDeduct));
    setEstNet(round2(Math.max(0, gross - totalDeduct)));
    setEstPfLiab(round2(pfDeduction + pfER));
  };

  const round2 = (v) => Math.round(v * 100) / 100;

  const handleAddComponent = () => {
    const nextOrder = components.length + 1;
    setComponents([
      ...components,
      {
        code: `CUSTOM_${nextOrder}`,
        name: `Custom Allowance ${nextOrder}`,
        component_type: 'earning',
        calc_type: 'fixed',
        calc_value: '0',
        is_pf_wage: 0,
        is_esi_wage: 1,
        is_taxable: 1,
        is_pro_rated: 1,
        display_order: nextOrder
      }
    ]);
  };

  const handleUpdateComponent = (index, field, value) => {
    const updated = [...components];
    updated[index][field] = value;
    setComponents(updated);
  };

  const handleRemoveComponent = (index) => {
    const updated = [...components];
    updated.splice(index, 1);
    setComponents(updated);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!activeCompany) return;
    setErrors({});
    setSaveError('');
    setSaveSuccess('');

    // Validate
    const formErrors = {};
    if (!name || name.trim().length < 2) formErrors.name = 'Name is required (min 2 chars).';
    const ctcVal = parseFloat(ctc || 0);
    if (!ctc || isNaN(ctcVal) || ctcVal <= 0) {
      formErrors.ctc = 'Annual CTC must be greater than 0.';
    } else if (ctcVal < 12000) {
      formErrors.ctc = 'Minimum ₹12,000 per year.';
    } else if (ctcVal > 100000000) {
      formErrors.ctc = 'Annual CTC exceeds ₹10 Crore limit.';
    }
    // Validate component codes are unique and non-empty
    const codes = components.map(c => c.code.trim().toUpperCase());
    const uniqueCodes = new Set(codes);
    if (uniqueCodes.size !== codes.length) formErrors.components = 'Duplicate component codes detected.';
    if (codes.some(c => !c)) formErrors.components = 'All components must have a code.';
    if (components.filter(c => c.component_type === 'earning').length === 0) {
      formErrors.components = 'At least one earning component is required.';
    }

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      setSaveError('Please correct errors before saving.');
      return;
    }

    setSaving(true);
    try {
      if (isEdit && id) {
        // Edit mode
        const result = await window.api.salary.saveStructure(id, components, parseFloat(ctc), name.trim(), description.trim());
        if (result.success) {
          setSaveSuccess('Salary structure updated successfully!');
          setTimeout(() => navigate('/salary'), 1200);
        } else {
          setSaveError(result.error?.message || 'Failed to save structure.');
        }
      } else {
        // Create mode
        const created = await window.api.salary.createStructure(
          activeCompany.id,
          name.trim(),
          description.trim(),
          parseFloat(ctc)
        );
        if (!created.success) {
          setSaveError(created.error?.message || 'Failed to create salary structure.');
          return;
        }
        const newStructureId = created.data.id;
        const result = await window.api.salary.saveStructure(newStructureId, components, parseFloat(ctc), name.trim(), description.trim());
        if (result.success) {
          setSaveSuccess('Salary structure created successfully!');
          setTimeout(() => navigate('/salary'), 1200);
        } else {
          setSaveError(result.error?.message || 'Failed to save structure components.');
        }
      }
    } catch (err) {
      setSaveError(err.message || 'Failed to save salary structure.');
    } finally {
      setSaving(false);
    }
  };

  const headers = [
    'Code',
    'Component Name',
    'Calculation Type',
    'Value / Formula',
    'PF Wage',
    'ESI Wage',
    'Taxable',
    'Pro-rated',
    { label: 'Actions', align: 'right' }
  ];

  return (
    <div className="ps-page">
      <TopBar title={isEdit ? 'Breakdown Config' : 'Salary Template Builder'} />

      <div className="ps-filterbar">
        <button 
          type="button"
          onClick={() => navigate('/salary')}
          className="ps-header__back"
          style={{ marginRight: '6px' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 w-full">
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Template Name</span>
            <input
              type="text"
              className={`cfi ${errors.name ? 'err' : ''}`}
              style={{ width: '180px', height: '24px', fontSize: '11.5px' }}
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Description</span>
            <input
              type="text"
              className="cfi"
              style={{ width: '260px', height: '24px', fontSize: '11.5px' }}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Annual CTC (₹)</span>
            <input
              type="number"
              className={`cfi ${errors.ctc ? 'err' : ''}`}
              style={{ width: '130px', height: '24px', fontSize: '11.5px' }}
              value={ctc}
              onChange={e => setCtc(e.target.value)}
              required
            />
          </div>
        </div>
      </div>

      <div className="ps-body">
        {saveError && (
          <div className="ps-alert ps-alert-error mb-3">{saveError}</div>
        )}
        {saveSuccess && (
          <div className="ps-alert ps-alert-ok mb-3">✓ {saveSuccess}</div>
        )}

        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
          
          {/* Left Columns: Config and Component Matrix */}
          <div className="lg:col-span-3 space-y-3">
            
            {/* Components Grid Matrix */}
            <div className="ps-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Component Breakdowns Matrix</span>
                  <span className="text-[10px] text-[var(--text-secondary)]">Define allocations, ratios, and statutory wage bases indicators</span>
                </div>
                <Button 
                  onClick={handleAddComponent}
                  variant="secondary"
                  size="sm"
                  icon={Plus}
                >
                  Add Component
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="ps-table">
                  <thead>
                    <tr>
                      {headers.map((h, idx) => (
                        <th key={idx} style={{ textAlign: h.align || 'left' }}>
                          {typeof h === 'string' ? h : h.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {components.map((c, i) => {
                      const isStatutory = c.calc_type === 'statutory';
                      return (
                        <tr key={i}>
                          
                          {/* Code */}
                          <td>
                            {isStatutory || c.id ? (
                              <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{c.code}</span>
                            ) : (
                              <input
                                type="text"
                                value={c.code}
                                onChange={e => handleUpdateComponent(i, 'code', e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g,''))}
                                placeholder="CODE"
                                maxLength={20}
                                className="font-mono font-bold"
                                style={{ height: '22px', padding: '1px 4px', fontSize: '11px', width: '90px' }}
                              />
                            )}
                          </td>

                          {/* Name */}
                          <td>
                            <input
                              type="text"
                              value={c.name}
                              onChange={e => handleUpdateComponent(i, 'name', e.target.value)}
                              style={{ height: '22px', padding: '1px 4px', fontSize: '11px', width: '150px' }}
                            />
                          </td>

                          {/* Calc Type */}
                          <td>
                            <select
                              value={c.calc_type}
                              onChange={e => handleUpdateComponent(i, 'calc_type', e.target.value)}
                              disabled={isStatutory}
                              style={{ height: '22px', padding: '1px 4px', fontSize: '11px', width: '100px' }}
                            >
                              <option value="fixed">Fixed</option>
                              <option value="pct_ctc">% of CTC</option>
                              <option value="pct_basic">% of Basic</option>
                              <option value="formula">Formula</option>
                              <option value="statutory">Statutory</option>
                            </select>
                          </td>

                          {/* Value */}
                          <td>
                            <input
                              type="text"
                              value={c.calc_value}
                              onChange={e => handleUpdateComponent(i, 'calc_value', e.target.value)}
                              disabled={isStatutory}
                              style={{ height: '22px', padding: '1px 4px', fontSize: '11px', width: '120px' }}
                            />
                          </td>

                          {/* PF Wage */}
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={c.is_pf_wage === 1}
                              onChange={e => handleUpdateComponent(i, 'is_pf_wage', e.target.checked ? 1 : 0)}
                              disabled={isStatutory}
                              className="rounded text-[var(--accent)] border-[var(--border-strong)] focus:ring-[var(--accent)]"
                            />
                          </td>

                          {/* ESI Wage */}
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={c.is_esi_wage === 1}
                              onChange={e => handleUpdateComponent(i, 'is_esi_wage', e.target.checked ? 1 : 0)}
                              disabled={isStatutory}
                              className="rounded text-[var(--accent)] border-[var(--border-strong)] focus:ring-[var(--accent)]"
                            />
                          </td>

                          {/* Taxable */}
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={c.is_taxable === 1}
                              onChange={e => handleUpdateComponent(i, 'is_taxable', e.target.checked ? 1 : 0)}
                              disabled={isStatutory}
                              className="rounded text-[var(--accent)] border-[var(--border-strong)] focus:ring-[var(--accent)]"
                            />
                          </td>

                          {/* Pro-rated */}
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={c.is_pro_rated === 1}
                              onChange={e => handleUpdateComponent(i, 'is_pro_rated', e.target.checked ? 1 : 0)}
                              disabled={isStatutory}
                              className="rounded text-[var(--accent)] border-[var(--border-strong)] focus:ring-[var(--accent)]"
                            />
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveComponent(i)}
                              disabled={isStatutory}
                              className="p-1 rounded text-red-500 hover:bg-red-50 hover:dark:bg-red-950/20 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {errors.components && (
              <p className="text-xs text-[var(--danger)] font-medium mt-1">⚠ {errors.components}</p>
            )}

          </div>

          {/* Right Column: Real-Time Payroll Simulator */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider text-left">
              Real-Time Simulated Monthly Payout
            </h3>

            <div className="ps-card bg-[var(--accent-light)]/20 border-[var(--accent)]/30 p-3">
              <div className="space-y-3 text-left">
                
                {/* Gross */}
                <div className="flex flex-col border-b border-[var(--border)] pb-2">
                  <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Simulated Monthly Gross
                  </span>
                  <span className="text-xl font-bold font-mono text-[var(--text-primary)] mt-0.5">
                    {formatCurrency(estGross)}
                  </span>
                </div>

                {/* Deductions */}
                <div className="flex flex-col border-b border-[var(--border)] pb-2">
                  <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Est. Monthly Deductions
                  </span>
                  <span className="text-base font-bold font-mono text-[var(--danger)] mt-0.5">
                    {formatCurrency(estDeductions)}
                  </span>
                  <span className="text-[9px] text-[var(--text-muted)] mt-0.5">
                    Includes EPF, ESIC, PT, and loose TDS
                  </span>
                </div>

                {/* Net Payout */}
                <div className="flex flex-col border-b border-[var(--border)] pb-2">
                  <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Simulated Net Payout
                  </span>
                  <span className="text-xl font-bold font-mono text-[var(--success)] mt-0.5">
                    {formatCurrency(estNet)}
                  </span>
                </div>

                {/* PF Liab */}
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Corporate PF Liability
                  </span>
                  <span className="text-xs font-bold font-mono text-[var(--text-primary)] mt-0.5">
                    {formatCurrency(estPfLiab)}
                  </span>
                </div>

              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col space-y-2">
              <Button
                type="submit"
                variant="primary"
                icon={Save}
                className="w-full py-2"
              >
                {saving ? 'Saving…' : isEdit ? 'Update Salary Breakdown' : 'Save Salary Structure'}
              </Button>
              <Button
                onClick={() => navigate('/salary')}
                variant="secondary"
                className="w-full"
              >
                Cancel
              </Button>
            </div>

          </div>

        </form>

      </div>
    </div>
  );
}
