import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SlidersHorizontal,
  ArrowLeft,
  Save,
  HelpCircle,
  Lock,
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  User,
  Heart,
  UtensilsCrossed,
  ChefHat,
  Sofa,
  Coffee,
  Baby,
  Users,
  UserCheck,
  Landmark,
  HeartPulse,
  Clock,
  Gift,
  Award,
  Factory,
  Building2
} from 'lucide-react';
import { useCompanyStore } from '../../store/company.store';
import TopBar from '../../components/layout/TopBar';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { INDIAN_STATES } from '../../utils/constants';

// Reusable Components
import { SetupFormField } from '../../components/setup/SetupFormField';
import { SetupSection } from '../../components/setup/SetupSection';
import { YesNoSelect } from '../../components/setup/YesNoSelect';
import { ComplianceToggle } from '../../components/setup/ComplianceToggle';
import { CoverageRow } from '../../components/setup/CoverageRow';
import { TabCompletionBadge } from '../../components/setup/TabCompletionBadge';
import { SetupInfoBox } from '../../components/setup/SetupInfoBox';
import { SetupPreviewCard } from '../../components/setup/SetupPreviewCard';

const TAB_LABELS = {
  company: 'Company',
  epf: 'E.P.F.',
  esi: 'E.S.I.',
  overtime: 'Overtime',
  bonus: 'Bonus',
  gratuity: 'Gratuity',
  factory: 'Factory/Labour'
};

const TABS = [
  { key: 'company',   label: 'Company',        icon: <Building2 size={14}/> },
  { key: 'epf',       label: 'E.P.F.',         icon: <Landmark size={14}/> },
  { key: 'esi',       label: 'E.S.I.',         icon: <HeartPulse size={14}/> },
  { key: 'overtime',  label: 'Overtime',       icon: <Clock size={14}/> },
  { key: 'bonus',     label: 'Bonus',          icon: <Gift size={14}/> },
  { key: 'gratuity',  label: 'Gratuity',       icon: <Award size={14}/> },
  { key: 'factory',   label: 'Factory/Labour', icon: <Factory size={14}/> },
];


export default function CompanySetup() {
  const navigate = useNavigate();
  const activeCompany = useCompanyStore(state => state.activeCompany);

  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ type: '', text: '' });

  // Tab dirty tracking
  const [dirtyTabs, setDirtyTabs] = useState(new Set());
  const [showExitModal, setShowExitModal] = useState(false);
  
  // Field-level error validation states
  const [errors, setErrors] = useState({});

  // Save feedback state: idle | saving | saved | error
  const [saveState, setSaveState] = useState('idle');

  // ─── Tab 1: Company Setup States ──────────────────────────────
  const [companySetup, setCompanySetup] = useState({
    telephone: '',
    email: '',
    state_code: 'MH',
    logo_path: '',
    fy_start: 2026,
    fy_close: 2027,
    epf_status: 1,
    epf_coverage_date: '',
    fps_status: 1,
    fps_coverage_date: '',
    edli_status: 1,
    edli_coverage_date: '',
    esi_status: 1,
    esi_coverage_date: '',
    lwf_status: 0,
    lwf_coverage_date: '',
    pt_status: 0,
    pt_coverage_date: ''
  });

  // ─── Tab 2: EPF Setup States ──────────────────────────────────
  const [epfSetup, setEpfSetup] = useState({
    epf_state: '',
    epf_district: '',
    epf_number: '',
    epf_office: '',
    epf_office_address: '',
    fps_wage: 15000,
    fps_amount: 1250,
    edli_wage: 15000,
    epf_ac01_pct: 12.00,
    fps_ac10_pct: 8.33,
    eps_ac01_pct: 3.67,
    admin_ac02_pct: 0.50,
    edli_ac21_pct: 0.50,
    edli_ac22_pct: 0.00,
    epf_calc_on_full: 1,
    fps_calc_full: 1,
    auth_signatory: ''
  });

  // ─── Tab 3: ESI Setup States ──────────────────────────────────
  const [esiSetup, setEsiSetup] = useState({
    esic_number: '',
    esic_office: '',
    esic_office_address: '',
    esic_wage_ceiling: 21000,
    employee_pct: 0.75,
    employer_pct: 3.25,
    employer_name: '',
    employer_designation: '',
    employer_address: '',
    auth_signatory: ''
  });

  // ─── Tab 4: Overtime Setup States ─────────────────────────────
  const [otSetup, setOtSetup] = useState({
    calculation_setting: 'Grand',
    calculation_type: 'Salary',
    overtime_paid_pct: 2.00,
    hours_print_in_salary: 1,
    hours_heading: 'OT.HR',
    amount_print_in_salary: 1,
    amount_heading: 'OT.AMT',
    epf_on_ot: 0,
    esi_on_ot: 1,
    esi_limit_on_ot: 1,
    special_calculation: 0,
    time_period_calculation: 'Day',
    hours_per_day: 8.00,
    wages_calculation: 'Gross',
    epf_in_netpay: 0,
    esi_in_netpay: 0,
    lwf_in_netpay: 0,
    pt_in_netpay: 0,
    ot_allowances_json: '[]'
  });

  // ─── Tab 5: Bonus Setup States ────────────────────────────────
  const [bonusSetup, setBonusSetup] = useState({
    bonus_pct: 8.33,
    min_working_days: 30,
    bonus_limit: 7000,
    payment_limit: 21000
  });

  // ─── Tab 6: Gratuity Setup States ─────────────────────────────
  const [gratuitySetup, setGratuitySetup] = useState({
    gratuity_days: 15.00,
    gratuity_divide: 26.00,
    maximum_limit: 2000000.00
  });

  // ─── Tab 7: Factory/Labour Setup States ───────────────────────
  const [factorySetup, setFactorySetup] = useState({
    factory_license_number: '',
    district: '',
    manager_name: '',
    manager_address: '',
    nature_of_work: '',
    factory_start_date: '',
    factory_close_date: '',
    wage_for_calculation: 0.00,
    wage_limit: 0.00,
    minimum_wage: 0.00,
    safety_officer_required: 1,
    safety_officer_appointed: 0,
    ambulance_room: 0,
    canteen_provided: 0,
    canteen_managed: 0,
    rest_room_provided: 0,
    lunch_room_provided: 0,
    creches_provided: 0,
    welfare_officer_required: 1,
    welfare_officer_appointed: 0
  });

  // Active Company Salary Earning Components (allowances)
  const [allowanceComponents, setAllowanceComponents] = useState([]);
  const [selectedOtAllowances, setSelectedOtAllowances] = useState([]);

  // Helpers to update fields and track dirty states
  const updateCompany = (key, value) => {
    setCompanySetup(prev => ({ ...prev, [key]: value }));
    setDirtyTabs(prev => new Set([...prev, 'company']));
  };

  const updateEpf = (key, value) => {
    setEpfSetup(prev => ({ ...prev, [key]: value }));
    setDirtyTabs(prev => new Set([...prev, 'epf']));
  };

  const updateEsi = (key, value) => {
    setEsiSetup(prev => ({ ...prev, [key]: value }));
    setDirtyTabs(prev => new Set([...prev, 'esi']));
  };

  const updateOt = (key, value) => {
    setOtSetup(prev => ({ ...prev, [key]: value }));
    setDirtyTabs(prev => new Set([...prev, 'overtime']));
  };

  const updateBonus = (key, value) => {
    setBonusSetup(prev => ({ ...prev, [key]: value }));
    setDirtyTabs(prev => new Set([...prev, 'bonus']));
  };

  const updateGratuity = (key, value) => {
    setGratuitySetup(prev => ({ ...prev, [key]: value }));
    setDirtyTabs(prev => new Set([...prev, 'gratuity']));
  };

  const updateFactory = (key, value) => {
    setFactorySetup(prev => ({ ...prev, [key]: value }));
    setDirtyTabs(prev => new Set([...prev, 'factory']));
  };

  // Keyboard navigation listener (Ctrl + ArrowLeft/Right)
  useEffect(() => {
    const handleKey = (e) => {
      if (!e.ctrlKey) return;
      const idx = TABS.findIndex(t => t.key === activeTab);
      if (e.key === 'ArrowRight' && idx < TABS.length - 1) {
        setActiveTab(TABS[idx + 1].key);
      }
      if (e.key === 'ArrowLeft' && idx > 0) {
        setActiveTab(TABS[idx - 1].key);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeTab]);

  // Load Setup data
  useEffect(() => {
    if (!activeCompany) return;
    loadAllData();
  }, [activeCompany]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const res = await window.api.setup.getAll(activeCompany.id);
      if (res.success && res.data) {
        const d = res.data;
        if (d.company) setCompanySetup(prev => ({ ...prev, ...d.company }));
        if (d.epf) setEpfSetup(prev => ({ ...prev, ...d.epf }));
        if (d.esi) setEsiSetup(prev => ({ ...prev, ...d.esi }));
        if (d.overtime) {
          setOtSetup(prev => ({ ...prev, ...d.overtime }));
          try {
            setSelectedOtAllowances(JSON.parse(d.overtime.ot_allowances_json || '[]'));
          } catch (e) {
            setSelectedOtAllowances([]);
          }
        }
        if (d.bonus) setBonusSetup(prev => ({ ...prev, ...d.bonus }));
        if (d.gratuity) setGratuitySetup(prev => ({ ...prev, ...d.gratuity }));
        if (d.factory) setFactorySetup(prev => ({ ...prev, ...d.factory }));
      }

      // Fetch company allowances
      const structRes = await window.api.salary.getAll({ company_id: activeCompany.id });
      if (structRes.success && structRes.data && structRes.data.length > 0) {
        const firstStruct = structRes.data[0];
        const compRes = await window.api.salary.getStructureWithComponents(firstStruct.id);
        if (compRes.success && compRes.data && compRes.data.components) {
          const earnings = compRes.data.components.filter(c => c.component_type === 'earning');
          setAllowanceComponents(earnings);
        }
      }
      
      // Loaded fresh, clear dirty set
      setDirtyTabs(new Set());
    } catch (err) {
      showToast('error', `Failed to load settings: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast({ type: '', text: '' }), 5000);
  };

  // Watcher for EPF auto-compute of remainder: epf_ac01 - fps_ac10
  useEffect(() => {
    const epf = parseFloat(epfSetup.epf_ac01_pct) || 0;
    const fps = parseFloat(epfSetup.fps_ac10_pct) || 0;
    const eps = Number((epf - fps).toFixed(2));
    setEpfSetup(prev => ({
      ...prev,
      eps_ac01_pct: Math.max(0, eps)
    }));
  }, [epfSetup.epf_ac01_pct, epfSetup.fps_ac10_pct]);

  // FY Start changes close automatically
  const handleFYStartChange = (yearVal) => {
    const yrVal = parseInt(yearVal) || 0;
    updateCompany('fy_start', yrVal);
    updateCompany('fy_close', yrVal + 1);
  };

  // Logo upload handlers
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateCompany('logo_path', file.path || file.name);
    showToast('success', 'Logo selected successfully.');
  };

  const handleLogoRemove = () => {
    updateCompany('logo_path', '');
  };

  // Allowances Checklist Handler
  const handleOtAllowanceToggle = (code) => {
    setSelectedOtAllowances(prev => {
      const next = prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code];
      updateOt('ot_allowances_json', JSON.stringify(next));
      return next;
    });
  };

  // ─── BLUR VALIDATIONS ─────────────────────────────────────────
  const handleEpfNumberBlur = () => {
    if (epfSetup.epf_number && epfSetup.epf_number.length < 10) {
      setErrors(prev => ({ ...prev, epf_number: 'EPF number should be at least 10 characters' }));
    } else {
      setErrors(prev => ({ ...prev, epf_number: null }));
    }
  };

  const handleEsiNumberBlur = () => {
    if (esiSetup.esic_number && !/^\d{17}$/.test(esiSetup.esic_number)) {
      setErrors(prev => ({ ...prev, esic_number: 'ESIC number must be exactly 17 digits' }));
    } else {
      setErrors(prev => ({ ...prev, esic_number: null }));
    }
  };

  const handleBonusPctBlur = () => {
    const v = parseFloat(bonusSetup.bonus_pct);
    if (isNaN(v) || v < 8.33) {
      setErrors(prev => ({ ...prev, bonus_pct: 'Minimum statutory bonus is 8.33%' }));
    } else if (v > 20) {
      setErrors(prev => ({ ...prev, bonus_pct: 'Maximum statutory bonus is 20%' }));
    } else {
      setErrors(prev => ({ ...prev, bonus_pct: null }));
    }
  };

  // Tab completion checker
  const getTabStatus = (tabKey) => {
    if (tabKey === 'company') {
      return (companySetup.fy_start && companySetup.fy_close) ? 'complete' : 'partial';
    }
    if (tabKey === 'epf') {
      return (epfSetup.epf_number && epfSetup.epf_state) ? 'complete' : 'partial';
    }
    if (tabKey === 'esi') {
      return (esiSetup.esic_number && esiSetup.esic_office) ? 'complete' : 'partial';
    }
    if (tabKey === 'overtime') {
      return (otSetup.overtime_paid_pct > 0) ? 'complete' : 'partial';
    }
    if (tabKey === 'bonus') {
      return (bonusSetup.bonus_pct > 0) ? 'complete' : 'partial';
    }
    if (tabKey === 'gratuity') {
      return (gratuitySetup.gratuity_days > 0) ? 'complete' : 'partial';
    }
    if (tabKey === 'factory') {
      return (factorySetup.factory_license_number) ? 'complete' : 'partial';
    }
    return 'empty';
  };

  // Live previews
  const bonusPreview = useMemo(() => {
    const { bonus_pct = 8.33, bonus_limit = 7000, min_working_days = 30 } = bonusSetup;
    const annualWage = bonus_limit * 12;
    const annualBonus = Number((annualWage * bonus_pct / 100).toFixed(2));
    return [
      { label: 'Wage ceiling used',     value: `₹${bonus_limit.toLocaleString('en-IN')}/month` },
      { label: 'Annual eligible wages', value: `₹${annualWage.toLocaleString('en-IN')}` },
      { label: `Bonus @ ${bonus_pct}%`, value: `₹${annualBonus.toLocaleString('en-IN')}` },
      { label: 'Min working days',      value: `${min_working_days} days` },
    ];
  }, [bonusSetup]);

  const gratuityPreview = useMemo(() => {
    const sampleBasicDA = 15000;
    const sampleYears   = 5;
    const { gratuity_days = 15, gratuity_divide = 26, maximum_limit = 2000000 } = gratuitySetup;
    const computed = Number(((sampleBasicDA / gratuity_divide) * gratuity_days * sampleYears).toFixed(2));
    const actual   = Math.min(computed, maximum_limit);
    return [
      { label: 'Sample Basic+DA',       value: `₹${sampleBasicDA.toLocaleString('en-IN')}` },
      { label: 'Years of Service',      value: `${sampleYears} years` },
      { label: 'Formula',               value: `(${sampleBasicDA} ÷ ${gratuity_divide}) × ${gratuity_days} × ${sampleYears}` },
      { label: 'Computed Gratuity',     value: `₹${computed.toLocaleString('en-IN')}` },
      { label: 'After Statutory Cap',   value: `₹${actual.toLocaleString('en-IN')}` },
    ];
  }, [gratuitySetup]);

  // Compliance score logic
  const complianceScore = useMemo(() => {
    const flags = [
      'safety_officer_required','safety_officer_appointed','ambulance_room',
      'canteen_provided','canteen_managed','rest_room_provided',
      'lunch_room_provided','creches_provided',
      'welfare_officer_required','welfare_officer_appointed'
    ];
    const fulfilled = flags.filter(f => factorySetup[f] === 1).length;
    return { fulfilled, total: flags.length, pct: Math.round((fulfilled / flags.length) * 100) };
  }, [factorySetup]);

  const countComplianceYes = () => complianceScore.fulfilled;
  const complianceCount = countComplianceYes();
  const complianceColorClass =
    complianceCount === 10 ? 'bg-[var(--success-light)] text-[var(--success)]' :
    complianceCount >= 5 ? 'bg-[var(--warning-light)] text-[var(--warning)]' :
    'bg-[var(--danger-light)] text-[var(--danger)]';

  // ─── VALIDATION ───────────────────────────────────────────────
  const validateTab = () => {
    if (activeTab === 'company') {
      if (companySetup.fy_close !== companySetup.fy_start + 1) {
        showToast('error', 'F.Y. Close must be exactly F.Y. Start + 1.');
        return false;
      }
    }

    if (activeTab === 'epf') {
      if (epfSetup.epf_ac01_pct < 10 || epfSetup.epf_ac01_pct > 14) {
        showToast('error', 'EPF A/C-01% must be between 10% and 14%.');
        return false;
      }
      if (epfSetup.fps_ac10_pct < 8 || epfSetup.fps_ac10_pct > 9) {
        showToast('error', 'FPS A/C-10% must be between 8% and 9%.');
        return false;
      }
      if (epfSetup.admin_ac02_pct <= 0) {
        showToast('error', 'Admin % must be greater than 0.');
        return false;
      }
      if (epfSetup.edli_ac21_pct <= 0) {
        showToast('error', 'EDLI A/C-21% must be greater than 0.');
        return false;
      }
    }

    if (activeTab === 'esi') {
      const cleanEsiNum = esiSetup.esic_number?.replace(/\D/g, '');
      if (cleanEsiNum && cleanEsiNum.length !== 17) {
        showToast('error', 'ESIC Number must be exactly 17 digits.');
        return false;
      }
      if (esiSetup.esic_wage_ceiling < 10000) {
        showToast('error', 'ESIC Gross ceiling must be at least ₹10,000.');
        return false;
      }
    }

    if (activeTab === 'overtime') {
      if (otSetup.overtime_paid_pct < 1.0 || otSetup.overtime_paid_pct > 4.0) {
        showToast('error', 'OT Paid multiplier must be between 1.0x and 4.0x.');
        return false;
      }
      if (otSetup.hours_per_day < 6 || otSetup.hours_per_day > 12) {
        showToast('error', 'Standard shift hours must be between 6 and 12.');
        return false;
      }
    }

    if (activeTab === 'bonus') {
      if (bonusSetup.bonus_pct < 8.33 || bonusSetup.bonus_pct > 20.00) {
        showToast('error', 'Bonus percentage must be between statutory 8.33% and 20.00%.');
        return false;
      }
      if (bonusSetup.payment_limit <= bonusSetup.bonus_limit) {
        showToast('error', 'Payment Limit (eligibility) must be greater than Bonus Calculation Limit.');
        return false;
      }
    }

    if (activeTab === 'gratuity') {
      if (gratuitySetup.maximum_limit > 2000000) {
        showToast('error', 'Gratuity Maximum Limit cannot exceed statutory cap of ₹20,00,000.');
        return false;
      }
    }

    if (activeTab === 'factory') {
      if (factorySetup.factory_start_date && factorySetup.factory_close_date) {
        if (new Date(factorySetup.factory_start_date) > new Date(factorySetup.factory_close_date)) {
          showToast('error', 'License start date must be before close/expiry date.');
          return false;
        }
      }
    }

    return true;
  };

  // ─── Save tab data ────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!activeCompany) return;
    if (!validateTab()) return;

    setBusy(true);
    setSaveState('saving');
    let res = { success: false };

    try {
      if (activeTab === 'company') {
        res = await window.api.setup.saveCompany(activeCompany.id, companySetup);
      } else if (activeTab === 'epf') {
        res = await window.api.setup.saveEPF(activeCompany.id, epfSetup);
      } else if (activeTab === 'esi') {
        res = await window.api.setup.saveESI(activeCompany.id, esiSetup);
      } else if (activeTab === 'overtime') {
        res = await window.api.setup.saveOT(activeCompany.id, otSetup);
      } else if (activeTab === 'bonus') {
        res = await window.api.setup.saveBonus(activeCompany.id, bonusSetup);
      } else if (activeTab === 'gratuity') {
        res = await window.api.setup.saveGratuity(activeCompany.id, gratuitySetup);
      } else if (activeTab === 'factory') {
        res = await window.api.setup.saveFactory(activeCompany.id, factorySetup);
      }

      if (res.success) {
        setSaveState('saved');
        showToast('success', `Setup for "${activeTab.toUpperCase()}" updated successfully.`);
        setDirtyTabs(prev => {
          const next = new Set(prev);
          next.delete(activeTab);
          return next;
        });
        setTimeout(() => setSaveState('idle'), 2000);
      } else {
        setSaveState('error');
        showToast('error', res.error?.message || 'Update failed.');
        setTimeout(() => setSaveState('idle'), 2000);
      }
    } catch (err) {
      setSaveState('error');
      showToast('error', err.message);
      setTimeout(() => setSaveState('idle'), 2000);
    } finally {
      setBusy(false);
    }
  };

  const handleExit = () => {
    if (dirtyTabs.size > 0) {
      setShowExitModal(true);
    } else {
      navigate(-1);
    }
  };

  const updateButtonProps = {
    idle:   { label: '💾 Update',   className: 'btn-primary' },
    saving: { label: '⟳ Saving...', className: 'btn-primary btn--loading', disabled: true },
    saved:  { label: '✓ Saved',     className: 'btn-success' },
    error:  { label: '✕ Failed',    className: 'btn-danger' },
  }[saveState] || { label: '💾 Update', className: 'btn-primary' };

  if (!activeCompany) {
    return (
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[var(--bg-base)]">
        <TopBar title="Setup → Company" />
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

  const TAB_KEYS = ['company', 'epf', 'esi', 'overtime', 'bonus', 'gratuity', 'factory'];

  const form = {
    ...companySetup,
    name: activeCompany ? activeCompany.name : '',
    address: activeCompany && activeCompany.address_line1
      ? `${activeCompany.address_line1}\n${activeCompany.address_line2 || ''}\n${activeCompany.city || ''}`
      : ''
  };
  const update = updateCompany;
  const epf = epfSetup;
  const updateEPF = updateEpf;
  const esi = esiSetup;
  const updateESI = updateEsi;
  const ot = otSetup;
  const updateOT = updateOt;
  const salaryComponents = allowanceComponents;
  const toggleOTAllowance = handleOtAllowanceToggle;
  const bonus = bonusSetup;
  const gratuity = gratuitySetup;
  const factory = factorySetup;

  const bonusCalcPreview = useMemo(() => {
    const annual = (bonusSetup.bonus_limit || 7000) * 12;
    const amt = Math.round(annual * (bonusSetup.bonus_pct || 8.33) / 100);
    return [
      { label: 'Wage ceiling/month', value: `₹${(bonusSetup.bonus_limit || 7000).toLocaleString('en-IN')}` },
      { label: 'Annual eligible wages', value: `₹${annual.toLocaleString('en-IN')}` },
      { label: `Bonus @ ${bonusSetup.bonus_pct || 8.33}%`, value: `₹${amt.toLocaleString('en-IN')}` },
      { label: 'Min working days', value: `${bonusSetup.min_working_days || 30} days` },
      { label: 'Eligibility salary limit', value: `₹${(bonusSetup.payment_limit || 21000).toLocaleString('en-IN')}` }
    ];
  }, [bonusSetup]);

  const gratuityCalcPreview = useMemo(() => {
    const baseda = 15000, years = 5;
    const raw = Math.round((baseda / (gratuitySetup.gratuity_divide || 26)) * (gratuitySetup.gratuity_days || 15) * years);
    const final = Math.min(raw, gratuitySetup.maximum_limit || 2000000);
    return [
      { label: 'Sample Basic+DA', value: '₹15,000/month' },
      { label: 'Years of service', value: '5 years' },
      { label: 'Formula', value: `(15000÷${gratuitySetup.gratuity_divide || 26})×${gratuitySetup.gratuity_days || 15}×5` },
      { label: 'Computed', value: `₹${raw.toLocaleString('en-IN')}` },
      { label: 'After statutory cap', value: `₹${final.toLocaleString('en-IN')}` }
    ];
  }, [gratuitySetup]);

  function TabCompany() {
    return (
      <div className="cform-2">
        <span className="cfl req">Company Name</span>
        <input value={form.name} readOnly className="cfi" style={{gridColumn:'span 3'}}/>

        <span className="cfl">Address</span>
        <textarea value={form.address||''} onChange={e=>update('address',e.target.value)} style={{gridColumn:'span 3'}}/>

        <span className="cfl">Telephone</span>
        <input value={form.telephone||''} onChange={e=>update('telephone',e.target.value)}/>
        <span className="cfl">Email</span>
        <input value={form.email||''} onChange={e=>update('email',e.target.value)}/>

        <span className="cfl req">State</span>
        <select value={form.state_code||''} onChange={e=>update('state_code',e.target.value)}>
          {INDIAN_STATES.map(s=><option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
        <span className="cfl">FY Start</span>
        <input type="number" value={form.fy_start||2026} onChange={e=>handleFYStartChange(e.target.value)}/>

        <div className="csep" style={{gridColumn:'span 4'}}/>
        <span className="csep-label">Statutory Coverage Status</span>

        {[
          {label:'E.P.F. Status', key:'epf'},
          {label:'F.P.S. Status', key:'fps'},
          {label:'E.D.L.I. Status',key:'edli'},
          {label:'E.S.I. Status', key:'esi'},
          {label:'L.W.F. Status', key:'lwf'},
          {label:'P.T. Status',   key:'pt'},
        ].map(({label, key}) => (
          <React.Fragment key={key}>
            <span className="cfl">{label}</span>
            <select
              value={form[`${key}_status`]??1}
              onChange={e=>update(`${key}_status`,+e.target.value)}
              className={`yn ${form[`${key}_status`] ? 'yn-yes':'yn-no'}`}
            >
              <option value={1}>Yes</option>
              <option value={0}>No</option>
            </select>
            <span className="cfl" style={{fontSize:11}}>Coverage Date</span>
            <input
              type="date"
              value={form[`${key}_coverage_date`]||''}
              onChange={e=>update(`${key}_coverage_date`,e.target.value)}
              disabled={!form[`${key}_status`]}
            />
          </React.Fragment>
        ))}
      </div>
    );
  }

  function TabEPF() {
    return (
      <div className="cform-3">
        <span className="cfl">EPF State</span>
        <input value={epf.epf_state||''} onChange={e=>updateEPF('epf_state',e.target.value)}/>
        <span className="cfl">District</span>
        <input value={epf.epf_district||''} onChange={e=>updateEPF('epf_district',e.target.value)}/>
        <span className="cfl">EPF Number</span>
        <input value={epf.epf_number||''} onChange={e=>updateEPF('epf_number',e.target.value)} onBlur={handleEpfNumberBlur}/>

        <span className="cfl">EPF Office</span>
        <input value={epf.epf_office||''} onChange={e=>updateEPF('epf_office',e.target.value)} style={{gridColumn:'span 5'}}/>

        <span className="cfl">Address</span>
        <textarea value={epf.epf_office_address||''} onChange={e=>updateEPF('epf_office_address',e.target.value)} style={{gridColumn:'span 5'}}/>

        <div className="csep" style={{gridColumn:'span 6'}}/>
        <span className="csep-label" style={{gridColumn:'span 6'}}>Wage Ceilings</span>

        <span className="cfl">F.P.S. Wage</span>
        <input type="number" value={epf.fps_wage??15000} onChange={e=>updateEPF('fps_wage',+e.target.value)}/>
        <span className="cfl">F.P.S. Amount</span>
        <input type="number" value={epf.fps_amount??1250} onChange={e=>updateEPF('fps_amount',+e.target.value)}/>
        <span className="cfl">E.D.L.I. Wage</span>
        <input type="number" value={epf.edli_wage??15000} onChange={e=>updateEPF('edli_wage',+e.target.value)}/>

        <div className="csep" style={{gridColumn:'span 6'}}/>
        <span className="csep-label" style={{gridColumn:'span 6'}}>Contribution Rates</span>

        <span className="cfl">E.P.F.(A/C-01)%</span>
        <input type="number" value={epf.epf_ac01_pct??12} onChange={e=>updateEPF('epf_ac01_pct',+e.target.value)}/>
        <span className="cfl">F.P.S.(A/C-10)%</span>
        <input type="number" value={epf.fps_ac10_pct??8.33} onChange={e=>updateEPF('fps_ac10_pct',+e.target.value)}/>
        <span className="cfl" title="Auto-computed: EPF - FPS">E.P.S.(A/C-01)% ƒ</span>
        <input type="number" value={epf.eps_ac01_pct??3.67} readOnly style={{background:'var(--warning-light)',fontWeight:600}}/>

        <span className="cfl">Admin(A/C-02)%</span>
        <input type="number" value={epf.admin_ac02_pct??0.50} onChange={e=>updateEPF('admin_ac02_pct',+e.target.value)}/>
        <span className="cfl">E.D.L.I.(A/C-21)%</span>
        <input type="number" value={epf.edli_ac21_pct??0.50} onChange={e=>updateEPF('edli_ac21_pct',+e.target.value)}/>
        <span className="cfl">E.D.L.I.(A/C-22)%</span>
        <input type="number" value={epf.edli_ac22_pct??0} onChange={e=>updateEPF('edli_ac22_pct',+e.target.value)}/>

        <span className="cfl">EPF Calc. on Full</span>
        <select value={epf.epf_calc_on_full??1} onChange={e=>updateEPF('epf_calc_on_full',+e.target.value)} className={`yn ${epf.epf_calc_on_full?'yn-yes':'yn-no'}`}>
          <option value={1}>Yes</option><option value={0}>No</option>
        </select>
        <span className="cfl">FPS Calc. Full</span>
        <select value={epf.fps_calc_full??1} onChange={e=>updateEPF('fps_calc_full',+e.target.value)} className={`yn ${epf.fps_calc_full?'yn-yes':'yn-no'}`}>
          <option value={1}>Yes</option><option value={0}>No</option>
        </select>
        <span className="cfl">Auth. Signatory</span>
        <input value={epf.auth_signatory||''} onChange={e=>updateEPF('auth_signatory',e.target.value)} placeholder="Designation of Signatory"/>
      </div>
    );
  }

  function TabESI() {
    return (
      <div className="cform-3">
        <span className="cfl req">ESIC #</span>
        <input value={esi.esic_number||''} onChange={e=>updateESI('esic_number',e.target.value)} onBlur={handleEsiNumberBlur} placeholder="17-digit ESIC number" style={{gridColumn:'span 5'}}/>

        <span className="cfl">ESIC Office</span>
        <input value={esi.esic_office||''} onChange={e=>updateESI('esic_office',e.target.value)} style={{gridColumn:'span 5'}}/>

        <span className="cfl">Address</span>
        <textarea value={esi.esic_office_address||''} onChange={e=>updateESI('esic_office_address',e.target.value)} style={{gridColumn:'span 5'}}/>

        <div className="csep" style={{gridColumn:'span 6'}}/>
        <span className="csep-label" style={{gridColumn:'span 6'}}>Rates & Ceiling</span>

        <span className="cfl">ESIC Wage</span>
        <input type="number" value={esi.esic_wage_ceiling??21000} onChange={e=>updateESI('esic_wage_ceiling',+e.target.value)}/>
        <span className="cfl">Employee %</span>
        <input type="number" value={esi.employee_pct??0.75} onChange={e=>updateESI('employee_pct',+e.target.value)} step="0.01"/>
        <span className="cfl">Employer %</span>
        <input type="number" value={esi.employer_pct??3.25} onChange={e=>updateESI('employer_pct',+e.target.value)} step="0.01"/>

        <div className="csep" style={{gridColumn:'span 6'}}/>
        <span className="csep-label" style={{gridColumn:'span 6'}}>Employer / Signatory Details</span>

        <span className="cfl">Employer Name</span>
        <input value={esi.employer_name||''} onChange={e=>updateESI('employer_name',e.target.value)} style={{gridColumn:'span 5'}}/>
        <span className="cfl">Designation</span>
        <input value={esi.employer_designation||''} onChange={e=>updateESI('employer_designation',e.target.value)}/>
        <span className="cfl">Address</span>
        <textarea value={esi.employer_address||''} onChange={e=>updateESI('employer_address',e.target.value)} style={{gridColumn:'span 3'}}/>
        <span className="cfl">Auth. Signatory</span>
        <input value={esi.auth_signatory||''} onChange={e=>updateESI('auth_signatory',e.target.value)} placeholder="Designation of Signing Authority" style={{gridColumn:'span 5'}}/>

        <div className="setup-info info" style={{gridColumn:'span 6'}}>
          ℹ Employees with gross salary above ₹{(esi.esic_wage_ceiling||21000).toLocaleString('en-IN')} are automatically excluded from ESI deduction.
        </div>
      </div>
    );
  }

  function TabOvertime() {
    return (
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 24px'}}>
        <div className="cform-2" style={{gridTemplateColumns:'160px 1fr 120px 1fr'}}>
          <span className="cfl">Calc. Setting</span>
          <select value={ot.calculation_setting||'Grand'} onChange={e=>updateOT('calculation_setting',e.target.value)}>
            <option>Grand</option><option>Shift</option><option>Department</option>
          </select>
          <span className="cfl">Calc. Type</span>
          <select value={ot.calculation_type||'Salary'} onChange={e=>updateOT('calculation_type',e.target.value)}>
            <option>Salary</option><option>Daily Wage</option><option>Hourly</option>
          </select>

          <span className="cfl">OT Paid %</span>
          <input type="number" value={ot.overtime_paid_pct??2} onChange={e=>updateOT('overtime_paid_pct',+e.target.value)} step="0.5"/>
          <span className="cfl">Hours/Day</span>
          <input type="number" value={ot.hours_per_day??8} onChange={e=>updateOT('hours_per_day',+e.target.value)}/>

          <span className="cfl">Hours in Salary</span>
          <select value={ot.hours_print_in_salary??1} onChange={e=>updateOT('hours_print_in_salary',+e.target.value)} className={`yn ${ot.hours_print_in_salary?'yn-yes':'yn-no'}`}>
            <option value={1}>Yes</option><option value={0}>No</option>
          </select>
          <span className="cfl">Hours Heading</span>
          <input value={ot.hours_heading||'OT.HR'} onChange={e=>updateOT('hours_heading',e.target.value)}/>

          <span className="cfl">Amt. in Salary</span>
          <select value={ot.amount_print_in_salary??1} onChange={e=>updateOT('amount_print_in_salary',+e.target.value)} className={`yn ${ot.amount_print_in_salary?'yn-yes':'yn-no'}`}>
            <option value={1}>Yes</option><option value={0}>No</option>
          </select>
          <span className="cfl">Amt. Heading</span>
          <input value={ot.amount_heading||'OT.AMT'} onChange={e=>updateOT('amount_heading',e.target.value)}/>

          <span className="cfl">E.P.F. on OT</span>
          <select value={ot.epf_on_ot??0} onChange={e=>updateOT('epf_on_ot',+e.target.value)} className={`yn ${ot.epf_on_ot?'yn-yes':'yn-no'}`}>
            <option value={1}>Yes</option><option value={0}>No</option>
          </select>
          <span className="cfl">E.S.I. on OT</span>
          <select value={ot.esi_on_ot??1} onChange={e=>updateOT('esi_on_ot',+e.target.value)} className={`yn ${ot.esi_on_ot?'yn-yes':'yn-no'}`}>
            <option value={1}>Yes</option><option value={0}>No</option>
          </select>

          <span className="cfl">ESI Limit on OT</span>
          <select value={ot.esi_limit_on_ot??1} onChange={e=>updateOT('esi_limit_on_ot',+e.target.value)} className={`yn ${ot.esi_limit_on_ot?'yn-yes':'yn-no'}`}>
            <option value={1}>Yes</option><option value={0}>No</option>
          </select>
          <span className="cfl">Wages Basis</span>
          <select value={ot.wages_calculation||'Gross'} onChange={e=>updateOT('wages_calculation',e.target.value)}>
            <option>Gross</option><option>Basic</option><option>Basic+DA</option>
          </select>

          <span className="cfl">Time Period</span>
          <select value={ot.time_period_calculation||'Day'} onChange={e=>updateOT('time_period_calculation',e.target.value)}>
            <option>Day</option><option>Month</option>
          </select>
          <span className="cfl">Special Calc</span>
          <select value={ot.special_calculation??0} onChange={e=>updateOT('special_calculation',+e.target.value)} className={`yn ${ot.special_calculation?'yn-yes':'yn-no'}`}>
            <option value={1}>Yes</option><option value={0}>No</option>
          </select>
        </div>

        <div>
          <div className="csep-label" style={{marginBottom:6}}>Deductions in Net Pay</div>
          <div className="cform-2" style={{gridTemplateColumns:'120px 1fr 120px 1fr', marginBottom:10}}>
            <span className="cfl">EPF in Netpay</span>
            <select value={ot.epf_in_netpay??0} onChange={e=>updateOT('epf_in_netpay',+e.target.value)} className={`yn ${ot.epf_in_netpay?'yn-yes':'yn-no'}`}>
              <option value={1}>Yes</option><option value={0}>No</option>
            </select>
            <span className="cfl">ESI in Netpay</span>
            <select value={ot.esi_in_netpay??0} onChange={e=>updateOT('esi_in_netpay',+e.target.value)} className={`yn ${ot.esi_in_netpay?'yn-yes':'yn-no'}`}>
              <option value={1}>Yes</option><option value={0}>No</option>
            </select>
            <span className="cfl">LWF in Netpay</span>
            <select value={ot.lwf_in_netpay??0} onChange={e=>updateOT('lwf_in_netpay',+e.target.value)} className={`yn ${ot.lwf_in_netpay?'yn-yes':'yn-no'}`}>
              <option value={1}>Yes</option><option value={0}>No</option>
            </select>
            <span className="cfl">PT in Netpay</span>
            <select value={ot.pt_in_netpay??0} onChange={e=>updateOT('pt_in_netpay',+e.target.value)} className={`yn ${ot.pt_in_netpay?'yn-yes':'yn-no'}`}>
              <option value={1}>Yes</option><option value={0}>No</option>
            </select>
          </div>

          <div className="csep-label" style={{marginBottom:6}}>Allowances included in OT Base</div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'3px 8px'}}>
            {salaryComponents.filter(c=>c.component_type==='earning').map(comp=>{
              const checked = (JSON.parse(ot.ot_allowances_json||'[]')).includes(comp.code);
              return (
                <label key={comp.code} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,cursor:'pointer',padding:'2px 4px',borderRadius:3,background:checked?'var(--accent-light)':'transparent'}}>
                  <input type="checkbox" checked={checked} onChange={()=>toggleOTAllowance(comp.code)} style={{width:11,height:11}}/>
                  {comp.code}
                </label>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function TabBonus() {
    return (
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 24px'}}>
        <div className="cform">
          <div className="setup-info warn" style={{gridColumn:'span 2'}}>⚠ Payment of Bonus Act 1965: Minimum 8.33%, Maximum 20%</div>
          <span className="cfl req">Bonus %</span>
          <input type="number" value={bonus.bonus_pct??8.33} onChange={e=>updateBonus('bonus_pct',+e.target.value)} onBlur={handleBonusPctBlur} step="0.01" min="8.33" max="20"/>
          <span className="cfl">Min. Working Day</span>
          <input type="number" value={bonus.min_working_days??30} onChange={e=>updateBonus('min_working_days',+e.target.value)}/>
          <span className="cfl">Bonus Limit (₹)</span>
          <input type="number" value={bonus.bonus_limit??7000} onChange={e=>updateBonus('bonus_limit',+e.target.value)}/>
          <span className="cfl">Payment Limit (₹)</span>
          <input type="number" value={bonus.payment_limit??21000} onChange={e=>updateBonus('payment_limit',+e.target.value)}/>
        </div>
        <div>
          <div className="setup-preview">
            <div className="setup-preview__title">Bonus Calculation Preview</div>
            {bonusCalcPreview.map((r,i)=><div key={i} className="setup-preview__row"><span>{r.label}</span><span className="setup-preview__val">{r.value}</span></div>)}
          </div>
        </div>
      </div>
    );
  }

  function TabGratuity() {
    return (
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 24px'}}>
        <div className="cform">
          <div className="setup-info info" style={{gridColumn:'span 2'}}>ℹ Formula: (Basic+DA ÷ Gratuity Divide) × Gratuity Days × Years of Service. Eligible after 4 years 240 days.</div>
          <span className="cfl">Gratuity Days</span>
          <input type="number" value={gratuity.gratuity_days??15} onChange={e=>updateGratuity('gratuity_days',+e.target.value)}/>
          <span className="cfl">Gratuity Divide</span>
          <input type="number" value={gratuity.gratuity_divide??26} onChange={e=>updateGratuity('gratuity_divide',+e.target.value)}/>
          <span className="cfl">Maximum Limit (₹)</span>
          <input type="number" value={gratuity.maximum_limit??2000000} onChange={e=>updateGratuity('maximum_limit',+e.target.value)}/>
        </div>
        <div>
          <div className="setup-preview">
            <div className="setup-preview__title">Gratuity Calculation Preview (Sample)</div>
            {gratuityCalcPreview.map((r,i)=><div key={i} className="setup-preview__row"><span>{r.label}</span><span className="setup-preview__val">{r.value}</span></div>)}
          </div>
        </div>
      </div>
    );
  }

  function TabFactory() {
    const complianceFields = [
      {key:'safety_officer_required',  label:'Safety Officer Required',  req:true},
      {key:'safety_officer_appointed', label:'Safety Officer Appointed'},
      {key:'ambulance_room',           label:'Ambulance Room Provided'},
      {key:'canteen_provided',         label:'Canteen Facility Provided'},
      {key:'canteen_managed',          label:'Canteen Managed'},
      {key:'rest_room_provided',       label:'Rest Room Provided'},
      {key:'lunch_room_provided',      label:'Lunch Room Provided'},
      {key:'creches_provided',         label:'Crèches Provided'},
      {key:'welfare_officer_required', label:'Welfare Officer Required', req:true},
      {key:'welfare_officer_appointed',label:'Welfare Officer Appointed'},
    ];
    const score = complianceFields.filter(f=>factory[f.key]===1).length;
    const pct   = Math.round(score/complianceFields.length*100);
    const scoreColor = pct>=80?'var(--success)':pct>=50?'var(--warning)':'var(--danger)';

    return (
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 24px'}}>
        <div>
          <div className="csep-label">Registration Details</div>
          <div className="cform" style={{marginTop:4}}>
            <span className="cfl">Factory License #</span>
            <input value={factory.factory_license_number||''} onChange={e=>updateFactory('factory_license_number',e.target.value)} placeholder="License Number"/>
            <span className="cfl">Operating District</span>
            <input value={factory.district||''} onChange={e=>updateFactory('district',e.target.value)} placeholder="e.g. Pune"/>
            <span className="cfl">Manager Name</span>
            <input value={factory.manager_name||''} onChange={e=>updateFactory('manager_name',e.target.value)} placeholder="Authorized Manager under Factory Act"/>
            <span className="cfl">Manager Address</span>
            <textarea value={factory.manager_address||''} onChange={e=>updateFactory('manager_address',e.target.value)}/>
            <span className="cfl">Nature of Work</span>
            <textarea value={factory.nature_of_work||''} onChange={e=>updateFactory('nature_of_work',e.target.value)}/>
            <span className="cfl">Start Date</span>
            <input type="date" value={factory.factory_start_date||''} onChange={e=>updateFactory('factory_start_date',e.target.value)}/>
            <span className="cfl">Close Date</span>
            <input type="date" value={factory.factory_close_date||''} onChange={e=>updateFactory('factory_close_date',e.target.value)}/>
            <div className="csep" style={{gridColumn:'span 2'}}/>
            <span className="cfl">Wage for Calc.</span>
            <input type="number" value={factory.wage_for_calculation??0} onChange={e=>updateFactory('wage_for_calculation',+e.target.value)}/>
            <span className="cfl">Wage Limit</span>
            <input type="number" value={factory.wage_limit??0} onChange={e=>updateFactory('wage_limit',+e.target.value)}/>
            <span className="cfl">Minimum Wage</span>
            <input type="number" value={factory.minimum_wage??0} onChange={e=>updateFactory('minimum_wage',+e.target.value)}/>
          </div>
        </div>

        <div>
          <div className="csep-label">Statutory Compliance Facilities</div>

          <div className="comp-score" style={{marginTop:4}}>
            <span style={{color:scoreColor,fontWeight:600}}>{score}/{complianceFields.length}</span>
            <div className="comp-score__bar">
              <div className="comp-score__fill" style={{width:`${pct}%`,background:scoreColor}}/>
            </div>
            <span style={{color:scoreColor,fontWeight:600}}>{pct}%</span>
          </div>

          {complianceFields.map(f=>(
            <div key={f.key} className={`comp-row ${factory[f.key]===1?'comp-yes':''}`}>
              <span>{f.label}{f.req&&<span style={{color:'var(--warning)',marginLeft:4,fontSize:10}}>●</span>}</span>
              <select
                value={factory[f.key]??0}
                onChange={e=>{updateFactory(f.key,+e.target.value)}}
                style={{color:factory[f.key]?'var(--success)':'var(--text-secondary)',fontWeight:factory[f.key]?600:400}}
              >
                <option value={1}>Yes</option>
                <option value={0}>No</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!activeCompany) {
    return (
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[var(--bg-base)]">
        <TopBar title="Setup → Company" />
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

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[var(--bg-base)] relative">
      <TopBar title="Company Setup Settings" />

      {/* Floating Premium Toast Notifications */}
      {toast.text && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-2 border transition-all duration-300 transform translate-y-0 scale-100 ${
          toast.type === 'success'
            ? 'bg-[var(--success-light)] border-[var(--success)] text-[var(--success)]'
            : toast.type === 'error'
              ? 'bg-[var(--danger-light)] border-[var(--danger)] text-[var(--danger)]'
              : 'bg-[var(--info-light)] border-[var(--info)] text-[var(--info)]'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : (
            <HelpCircle className="w-4 h-4 shrink-0" />
          )}
          <span className="text-xs font-semibold">{toast.text}</span>
        </div>
      )}

      {loading ? (
        <div className="flex-1 p-6 space-y-4 animate-pulse">
          <div className="h-8 bg-[var(--bg-hover)] rounded w-1/4"></div>
          <div className="h-40 bg-[var(--bg-hover)] rounded"></div>
          <div className="h-40 bg-[var(--bg-hover)] rounded"></div>
        </div>
      ) : (
        <div className="setup-page">
          {/* Tab bar */}
          <div className="setup-tabbar">
            {['Company','E.P.F.','E.S.I.','Overtime','Bonus','Gratuity','Factory/Labour'].map((label, idx) => (
              <button
                key={label}
                className={`setup-tab ${activeTab === TAB_KEYS[idx] ? 'active' : ''}`}
                onClick={() => setActiveTab(TAB_KEYS[idx])}
              >
                {label}
                {dirtyTabs?.has?.(TAB_KEYS[idx]) && <span style={{width:5,height:5,borderRadius:'50%',background:'var(--warning)',display:'inline-block',marginLeft:4}}/>}
              </button>
            ))}
          </div>

          {/* Scrollable content */}
          <div className="setup-body">
            {activeTab === 'company' && TabCompany()}
            {activeTab === 'epf' && TabEPF()}
            {activeTab === 'esi' && TabESI()}
            {activeTab === 'overtime' && TabOvertime()}
            {activeTab === 'bonus' && TabBonus()}
            {activeTab === 'gratuity' && TabGratuity()}
            {activeTab === 'factory' && TabFactory()}
          </div>

          {/* Footer — always visible */}
          <div className="setup-footer">
            <button className="btn btn-danger" onClick={handleExit}>Exit</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="setup-footer__hint">Ctrl+← → to switch tabs</span>
              <button className={`btn ${updateButtonProps.className}`} onClick={handleUpdate} disabled={updateButtonProps.disabled}>
                {updateButtonProps.label}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg p-6 max-w-md w-full shadow-xl text-left">
            <h3 className="text-base font-bold text-[var(--text-primary)]">Discard Unsaved Changes?</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-2">
              You have unsaved changes in the following tabs:
            </p>
            <div className="flex flex-wrap gap-1.5 my-3">
              {[...dirtyTabs].map(t => (
                <span key={t} className="bg-[var(--warning-light)] text-[var(--warning)] text-[10px] font-bold px-2 py-0.5 rounded border border-[var(--warning)]/20">
                  {TAB_LABELS[t]}
                </span>
              ))}
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Are you sure you want to exit and discard these changes?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="px-4 py-2 rounded text-xs font-semibold bg-[var(--bg-hover)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]/80 focus:outline-none"
              >
                Stay & Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitModal(false);
                  navigate(-1);
                }}
                className="px-4 py-2 rounded text-xs font-semibold bg-[var(--danger)] text-white hover:bg-[var(--danger)]/80 focus:outline-none"
              >
                Discard & Exit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
