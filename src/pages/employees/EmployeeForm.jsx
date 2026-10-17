import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, User, Landmark, ShieldCheck, IndianRupee, HelpCircle, ChevronLeft, Shield } from 'lucide-react';
import { useCompanyStore } from '../../store/company.store';
import TopBar from '../../components/layout/TopBar';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import FlagRow from '../../components/ui/FlagRow';
import Modal from '../../components/ui/Modal';
import { INDIAN_STATES, EMPLOYMENT_TYPES } from '../../utils/constants';
import { validatePAN, validateIFSC, validateUAN, validateAadhaar, validatePhone, validateEmail, validateBankAccount, getCurrentFinancialYear } from '../../utils/validators';

export default function EmployeeForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const activeCompany = useCompanyStore(state => state.activeCompany);

  const [activeTab, setActiveTab] = useState('personal');

  // Tab 1: Personal & Employment
  const [empCode, setEmpCode] = useState('');
  const [prefix, setPrefix] = useState('Mr');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('male');
  const [dob, setDob] = useState('');
  const [doj, setDoj] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [grade, setGrade] = useState('');
  const [location, setLocation] = useState('');
  const [employmentType, setEmploymentType] = useState('permanent');
  const [status, setStatus] = useState('active');

  // Tab 2: Identity & Bank
  const [pan, setPan] = useState('');
  const [uan, setUan] = useState('');
  const [aadhaarLast4, setAadhaarLast4] = useState('');
  const [esiNum, setEsiNum] = useState('');
  
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [accountType, setAccountType] = useState('savings');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Tab 3: Statutory Config (Layer 2 flags)
  const [isPfEnabled, setIsPfEnabled] = useState(true);
  const [pfContributionType, setPfContributionType] = useState('statutory');
  const [voluntaryPfPct, setVoluntaryPfPct] = useState('0');
  
  const [isEsiEnabled, setIsEsiEnabled] = useState(true);
  const [esiExemptionReason, setEsiExemptionReason] = useState('');
  
  const [isTdsEnabled, setIsTdsEnabled] = useState(true);
  const [tdsRegime, setTdsRegime] = useState('new');
  
  const [isPtEnabled, setIsPtEnabled] = useState(true);
  const [ptStateOverride, setPtStateOverride] = useState('');

  const [isOtApplicable, setIsOtApplicable] = useState(false);
  const [otMultiplier, setOtMultiplier] = useState('1.5');
  const [otCalcBasis, setOtCalcBasis] = useState('basic');

  const [isAdvanceRecoveryActive, setIsAdvanceRecoveryActive] = useState(false);
  const [advanceOutstanding, setAdvanceOutstanding] = useState('0');
  const [advanceMonthlyDeduction, setAdvanceMonthlyDeduction] = useState('0');

  // Tab 4: Salary Assignment
  const [availableStructures, setAvailableStructures] = useState([]);
  const [selectedStructureId, setSelectedStructureId] = useState('');
  const [annualCtc, setAnnualCtc] = useState('');
  const [salaryEffectiveFrom, setSalaryEffectiveFrom] = useState('');
  const [existingSalaryId, setExistingSalaryId] = useState(null);
  // Salary as loaded on edit, so an unchanged save doesn't re-assign (and log a revision)
  const [loadedSalary, setLoadedSalary] = useState(null);

  // CTC linkage & ESI ceiling locks
  const [monthlyCtc, setMonthlyCtc] = useState(0);
  const [esiCeilingLocked, setEsiCeilingLocked] = useState(false);

  // Investment Declarations (Old regime TDS)
  const [isDeclModalOpen, setIsDeclModalOpen] = useState(false);
  const [ppf, setPpf] = useState(0);
  const [lic, setLic] = useState(0);
  const [elss, setElss] = useState(0);
  const [homeLoanPrincipal, setHomeLoanPrincipal] = useState(0);
  const [tuitionFees, setTuitionFees] = useState(0);
  const [sukanya, setSukanya] = useState(0);
  const [other80c, setOther80c] = useState(0);
  const [total80c, setTotal80c] = useState(0);

  const [medicalSelf, setMedicalSelf] = useState(0);
  const [medicalParents, setMedicalParents] = useState(0);
  const [total80d, setTotal80d] = useState(0);

  const [rentPaid, setRentPaid] = useState(0);
  const [rentCityType, setRentCityType] = useState('non_metro');
  const [isRenting, setIsRenting] = useState(false);

  const [section24b, setSection24b] = useState(0);
  const [nps80ccd, setNps80ccd] = useState(0);

  // Errors & save feedback
  const [errors, setErrors] = useState({});
  const [fieldSuccess, setFieldSuccess] = useState({});
  const [saveError, setSaveError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ─── Inline blur validators ──────────────────────────────────
  const validateField = (field, value) => {
    let msg = '';
    if (field === 'pan' && value)        msg = validatePAN(value).message;
    if (field === 'uan' && value)        msg = validateUAN(value).message;
    if (field === 'aadhaar' && value)    msg = validateAadhaar(value).message;
    if (field === 'ifsc' && value)       msg = validateIFSC(value).message;
    if (field === 'bankAccount' && value) msg = validateBankAccount(value).message;
    if (field === 'phone' && value)      msg = validatePhone(value).message;
    if (field === 'email' && value)      msg = validateEmail(value).message;
    if (field === 'empCode' && (!value || !value.trim())) msg = 'Employee code is required.';
    if (field === 'firstName' && (!value || !value.trim())) msg = 'First name is required.';
    if (field === 'lastName' && (!value || !value.trim())) msg = 'Last name is required.';
    if (field === 'dob' && value) {
      const dobDate = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - dobDate.getFullYear() -
        (today < new Date(today.getFullYear(), dobDate.getMonth(), dobDate.getDate()) ? 1 : 0);
      if (age < 18) msg = 'Employee must be at least 18 years old.';
    }
    setErrors(prev => ({ ...prev, [field]: msg || undefined }));
    setFieldSuccess(prev => ({ ...prev, [field]: !msg && !!value }));
  };

  const toUpper = (val) => val.toUpperCase();

  // Load available structures for the active company
  useEffect(() => {
    if (activeCompany) {
      window.api.salary.getAll({ company_id: activeCompany.id }).then(res => {
        if (res.success) setAvailableStructures(res.data);
      }).catch(() => {});
    }
  }, [activeCompany]);

  // Preload package when editing
  useEffect(() => {
    if (isEdit) {
      loadEmployeePackage();
    }
  }, [id, isEdit]);

  // ── ESI ceiling check — mirrors engine esiWageBase logic exactly ─────────────
  // Computes the sum of is_esi_wage=1 components for the selected structure/CTC,
  // then locks ESI OFF if that sum exceeds ₹21,000/month.
  //
  // IMPORTANT: The ceiling check REQUIRES structure component data to be accurate.
  // Raw monthly CTC ≠ ESI wage base (CTC includes employer PF, non-ESI components,
  // etc.).  We never lock ESI based on CTC alone — we always wait for component data.
  useEffect(() => {
    const monthly = parseFloat(annualCtc) / 12;

    // Always keep monthlyCtc in sync for the UI preview
    setMonthlyCtc(isNaN(monthly) ? 0 : monthly);

    if (!selectedStructureId || !annualCtc || isNaN(monthly) || monthly <= 0) {
      // No structure yet — cannot determine ESI wage base; release any previous lock
      // so the employment-type handler can set ESI correctly once a structure is assigned.
      if (esiCeilingLocked) {
        setEsiCeilingLocked(false);
        // Do NOT auto-enable ESI here — employment_type handler owns the default state.
      }
      return;
    }

    // Fetch structure components and replicate earnings.calculator.js resolution
    window.api.salary.getStructureWithComponents(selectedStructureId).then(res => {
      if (!res.success || !res.data?.components) return;

      const sorted = [...res.data.components]
        .filter(c => c.is_active !== 0)
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

      // ── Resolve each earning component's monthly amount ───────────────────
      const resolved = {};
      for (const comp of sorted) {
        if (comp.component_type !== 'earning') continue;
        let amount = 0;
        try {
          switch (comp.calc_type) {
            case 'fixed':
              amount = parseFloat(comp.calc_value) || 0;
              break;
            case 'pct_ctc':
              amount = monthly * ((parseFloat(comp.calc_value) || 0) / 100);
              break;
            case 'pct_basic':
              amount = (resolved['BASIC'] || 0) * ((parseFloat(comp.calc_value) || 0) / 100);
              break;
            case 'pct_gross': {
              const grossSoFar = Object.values(resolved).reduce((s, v) => s + v, 0);
              amount = grossSoFar * ((parseFloat(comp.calc_value) || 0) / 100);
              break;
            }
            case 'formula': {
              let expr = (comp.calc_value || '0')
                .replace(/MONTHLY_CTC/g, monthly.toFixed(2));
              for (const [code, val] of Object.entries(resolved)) {
                expr = expr.replace(new RegExp(`\\b${code}\\b`, 'g'), val.toFixed(2));
              }
              // eslint-disable-next-line no-new-func
              amount = Math.max(0, new Function(`return (${expr})`)());
              break;
            }
            default:
              break;
          }
        } catch { amount = 0; }
        resolved[comp.code] = Math.round(amount * 100) / 100;
      }

      // ── Sum only is_esi_wage=1 components (matches engine exactly) ────────
      const esiWageBase = sorted.reduce((sum, comp) => {
        if (comp.is_esi_wage === 1 && resolved[comp.code] != null) {
          return sum + resolved[comp.code];
        }
        return sum;
      }, 0);

      const locked = esiWageBase > 21000;
      setEsiCeilingLocked(locked);

      if (locked) {
        setIsEsiEnabled(false);
        setEsiExemptionReason(
          `ESI wage base ₹${Math.round(esiWageBase).toLocaleString('en-IN')}/mo exceeds ₹21,000 ceiling`
        );
      } else if (esiCeilingLocked) {
        // Was locked before (structure/CTC changed and brought it below ceiling)
        setEsiCeilingLocked(false);
        setIsEsiEnabled(true);
        setEsiExemptionReason('');
      }
    }).catch(() => {
      // Component fetch failed — cannot determine ESI wage base reliably.
      // Do NOT lock based on CTC; leave the existing ESI flag as-is.
      console.warn('[EmployeeForm] Could not fetch structure components for ESI ceiling check.');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStructureId, annualCtc]);

  // Recalculate 80C/80D totals on declarations input
  useEffect(() => {
    const sum80c = parseFloat(ppf) + parseFloat(lic) + parseFloat(elss) + parseFloat(homeLoanPrincipal) + parseFloat(tuitionFees) + parseFloat(sukanya) + parseFloat(other80c);
    setTotal80c(Math.min(sum80c, 150000)); // Cap 80C at 1.5L in UI

    const sum80d = parseFloat(medicalSelf) + parseFloat(medicalParents);
    setTotal80d(sum80d);
  }, [ppf, lic, elss, homeLoanPrincipal, tuitionFees, sukanya, other80c, medicalSelf, medicalParents]);

  // Dynamic Bank Auto-fill based on IFSC start
  useEffect(() => {
    if (bankIfsc.length >= 4) {
      const code = bankIfsc.substring(0, 4).toUpperCase();
      const banks = {
        HDFC: 'HDFC Bank',
        ICIC: 'ICICI Bank',
        SBIN: 'State Bank of India',
        BARB: 'Bank of Baroda',
        PUNB: 'Punjab National Bank',
        UTIB: 'Axis Bank',
        KKBK: 'Kotak Mahindra Bank',
        YESB: 'Yes Bank'
      };
      if (banks[code]) {
        setBankName(banks[code]);
      }
    }
  }, [bankIfsc]);

  const loadEmployeePackage = async () => {
    try {
      const res = await window.api.employee.getPackage(id);
      if (res.success && res.data) {
        const d = res.data;
        // Tab 1
        setEmpCode(d.emp_code || '');
        setPrefix(d.prefix || 'Mr');
        setFirstName(d.first_name || '');
        setMiddleName(d.middle_name || '');
        setLastName(d.last_name || '');
        setGender(d.gender || 'male');
        setDob(d.dob || '');
        setDoj(d.doj || '');
        setDepartment(d.department || '');
        setDesignation(d.designation || '');
        setGrade(d.grade || '');
        setLocation(d.location || '');
        setEmploymentType(d.employment_type || 'permanent');
        setStatus(d.status || 'active');

        // Tab 2
        const i = d.identity || {};
        setPan(i.pan || '');
        setUan(i.uan || '');
        setAadhaarLast4(i.aadhaar_last4 || '');
        setEsiNum(i.esi_insurance_number || '');
        setBankAccount(i.bank_account_number || '');
        setBankIfsc(i.bank_ifsc || '');
        setBankName(i.bank_name || '');
        setBankBranch(i.bank_branch || '');
        setAccountType(i.account_type || 'savings');
        setPhone(i.phone_primary || '');
        setEmail(i.email_official || '');

        // Tab 3
        const s = d.statutory || {};
        setIsPfEnabled(s.is_pf_enabled === 1);
        setPfContributionType(s.pf_contribution_type || 'statutory');
        setVoluntaryPfPct(s.voluntary_pf_pct?.toString() || '0');
        
        setIsEsiEnabled(s.is_esi_enabled === 1);
        setEsiExemptionReason(s.esi_exemption_reason || '');
        
        setIsTdsEnabled(s.is_tds_enabled === 1);
        setTdsRegime(s.tds_regime || 'new');
        
        setIsPtEnabled(s.is_pt_enabled === 1);
        setPtStateOverride(s.pt_state_override || '');

        setIsOtApplicable(s.is_ot_applicable === 1);
        setOtMultiplier(s.ot_multiplier?.toString() || '1.5');
        setOtCalcBasis(s.ot_calc_basis || 'basic');

        setIsAdvanceRecoveryActive(s.is_advance_recovery_active === 1);
        setAdvanceOutstanding(s.advance_outstanding?.toString() || '0');
        setAdvanceMonthlyDeduction(s.advance_monthly_deduction?.toString() || '0');

        // Tab 4: Salary Assignment
        // Setting selectedStructureId + annualCtc triggers the ESI ceiling useEffect
        // which fetches components and computes proper esiWageBase — no manual check here.
        if (d.salary) {
          setExistingSalaryId(d.salary.id || null);
          setSelectedStructureId(d.salary.structure_id || '');
          setAnnualCtc(d.salary.ctc?.toString() || '');
          setSalaryEffectiveFrom(d.salary.effective_from || '');
          setLoadedSalary({
            structureId: d.salary.structure_id || '',
            ctc: parseFloat(d.salary.ctc),
            effectiveFrom: d.salary.effective_from || ''
          });
        }

        // Preload investment declaration
        const declRes = await window.api.employee.getDeclaration(id, getCurrentFinancialYear());
        if (declRes.success && declRes.data) {
          const dec = declRes.data;
          setPpf(dec.ppf || 0);
          setLic(dec.lic_premium || 0);
          setElss(dec.elss || 0);
          setHomeLoanPrincipal(dec.home_loan_principal || 0);
          setTuitionFees(dec.tuition_fees || 0);
          setSukanya(dec.sukanya_samriddhi || 0);
          setOther80c(dec.other_80c || 0);
          setMedicalSelf(dec.medical_insurance_self || 0);
          setMedicalParents(dec.medical_insurance_parents || 0);
          setRentPaid(dec.rent_paid_annual || 0);
          setRentCityType(dec.rent_city_type || 'non_metro');
          setIsRenting(dec.is_renting === 1);
          setSection24b(dec.section_24b || 0);
          setNps80ccd(dec.nps_80ccd || 0);
        }
      }
    } catch (error) {
      console.error('Failed to load employee package:', error);
    }
  };

  // Automation: Employment Type -> Statutory Defaults
  const handleEmploymentTypeChange = (value) => {
    setEmploymentType(value);
    
    // Auto-defaults
    if (value === 'contract') {
      setIsPfEnabled(false);
      setIsEsiEnabled(false);
      setIsTdsEnabled(true);
      setIsPtEnabled(true);
      setEsiExemptionReason('Contract worker');
    } else if (value === 'intern') {
      setIsPfEnabled(false);
      setIsEsiEnabled(false);
      setIsTdsEnabled(false);
      setIsPtEnabled(false);
      setEsiExemptionReason('Internship stipend');
    } else {
      // permanent / probation — ESI is controlled by the ceiling useEffect based on esiWageBase
      setIsPfEnabled(true);
      if (!esiCeilingLocked) setIsEsiEnabled(true); // only enable if not locked by ceiling
      setIsTdsEnabled(true);
      setIsPtEnabled(true);
      setEsiExemptionReason('');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrors({});
    setSaveError('');
    setSuccessMsg('');

    const formErrors = {};

    // --- Tab 1: Personal required fields ---
    if (!empCode || empCode.trim().length === 0) formErrors.empCode = 'Employee code is required.';
    if (!firstName || firstName.trim().length === 0) formErrors.firstName = 'First name is required.';
    if (!lastName || lastName.trim().length === 0) formErrors.lastName = 'Last name is required.';
    if (!dob) {
      formErrors.dob = 'Date of birth is required.';
    } else {
      // Employee must be at least 18 years old
      const dobDate = new Date(dob);
      const today = new Date();
      const age = today.getFullYear() - dobDate.getFullYear() -
        (today < new Date(today.getFullYear(), dobDate.getMonth(), dobDate.getDate()) ? 1 : 0);
      if (age < 18) formErrors.dob = 'Employee must be at least 18 years old.';
    }
    if (!doj) {
      formErrors.doj = 'Date of joining is required.';
    } else if (dob && new Date(doj) < new Date(dob)) {
      formErrors.doj = 'Date of joining cannot be before date of birth.';
    }

    // --- Tab 2: Identity & Bank ---
    // PAN required when TDS is enabled (needed for TDS filing)
    if (isTdsEnabled && !pan) {
      formErrors.pan = 'PAN is required when TDS is enabled.';
    } else if (pan) {
      const pCheck = validatePAN(pan);
      if (!pCheck.valid) formErrors.pan = pCheck.message;
    }
    if (uan && isPfEnabled) {
      const uCheck = validateUAN(uan);
      if (!uCheck.valid) formErrors.uan = uCheck.message;
    }
    if (aadhaarLast4) {
      const aCheck = validateAadhaar(aadhaarLast4);
      if (!aCheck.valid) formErrors.aadhaar = aCheck.message;
    }
    if (bankIfsc) {
      const iCheck = validateIFSC(bankIfsc);
      if (!iCheck.valid) formErrors.ifsc = iCheck.message;
    }
    if (bankAccount) {
      const baCheck = validateBankAccount(bankAccount);
      if (!baCheck.valid) formErrors.bankAccount = baCheck.message;
    }
    if (phone) {
      const phCheck = validatePhone(phone);
      if (!phCheck.valid) formErrors.phone = phCheck.message;
    }
    if (email) {
      const emCheck = validateEmail(email);
      if (!emCheck.valid) formErrors.email = emCheck.message;
    }

    // --- Tab 3: Statutory ---
    if (pfContributionType === 'voluntary') {
      const vpf = parseFloat(voluntaryPfPct || 0);
      if (isNaN(vpf) || vpf < 1 || vpf > 88) {
        formErrors.voluntaryPfPct = 'VPF percentage must be between 1% and 88%.';
      }
    }
    if (isOtApplicable) {
      const mult = parseFloat(otMultiplier || 0);
      if (isNaN(mult) || mult < 1.0) {
        formErrors.otMultiplier = 'OT multiplier must be 1.0 or greater.';
      }
    }
    if (isAdvanceRecoveryActive) {
      const outstanding = parseFloat(advanceOutstanding || 0);
      const monthly = parseFloat(advanceMonthlyDeduction || 0);
      if (outstanding <= 0) formErrors.advanceOutstanding = 'Outstanding advance must be greater than 0.';
      if (monthly <= 0) formErrors.advanceMonthlyDeduction = 'Monthly deduction must be greater than 0.';
      if (monthly > outstanding) formErrors.advanceMonthlyDeduction = 'Monthly deduction cannot exceed outstanding balance.';
    }

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      // Navigate to the tab that has errors
      const tab1Fields = ['empCode', 'firstName', 'lastName', 'dob', 'doj'];
      const tab2Fields = ['pan', 'uan', 'aadhaar', 'ifsc', 'bankAccount', 'phone', 'email'];
      const tab3Fields = ['voluntaryPfPct', 'otMultiplier', 'advanceOutstanding', 'advanceMonthlyDeduction'];
      if (tab1Fields.some(f => formErrors[f])) setActiveTab('personal');
      else if (tab2Fields.some(f => formErrors[f])) setActiveTab('identity');
      else if (tab3Fields.some(f => formErrors[f])) setActiveTab('statutory');
      setSaveError('Please correct the validation errors before saving.');
      return;
    }

    const employeeData = {
      company_id: activeCompany.id,
      emp_code: empCode,
      prefix,
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      gender,
      dob,
      doj,
      department,
      designation,
      grade,
      location,
      employment_type: employmentType,
      status
    };

    const identityData = {
      pan: pan.toUpperCase(),
      uan,
      aadhaar_last4: aadhaarLast4,
      esi_insurance_number: esiNum,
      bank_account_number: bankAccount,
      bank_ifsc: bankIfsc.toUpperCase(),
      bank_name: bankName,
      bank_branch: bankBranch,
      account_type: accountType,
      phone_primary: phone,
      email_official: email
    };

    const statutoryData = {
      is_pf_enabled: isPfEnabled ? 1 : 0,
      pf_contribution_type: pfContributionType,
      voluntary_pf_pct: parseFloat(voluntaryPfPct || 0),
      is_esi_enabled: isEsiEnabled ? 1 : 0,
      esi_exemption_reason: isEsiEnabled ? null : esiExemptionReason,
      is_tds_enabled: isTdsEnabled ? 1 : 0,
      tds_regime: tdsRegime,
      is_pt_enabled: isPtEnabled ? 1 : 0,
      pt_state_override: ptStateOverride || null,
      is_ot_applicable: isOtApplicable ? 1 : 0,
      ot_multiplier: parseFloat(otMultiplier || 1.5),
      ot_calc_basis: otCalcBasis,
      is_advance_recovery_active: isAdvanceRecoveryActive ? 1 : 0,
      advance_outstanding: parseFloat(advanceOutstanding || 0),
      advance_monthly_deduction: parseFloat(advanceMonthlyDeduction || 0)
    };

    let result;
    if (isEdit) {
      result = await window.api.employee.update(id, employeeData, identityData, statutoryData);
    } else {
      result = await window.api.employee.create(employeeData, identityData, statutoryData);
    }

    if (result.success) {
      const empId = isEdit ? id : result.data.id;

      // Save salary assignment if a structure was selected
      if (selectedStructureId && annualCtc) {
        const ctcVal = parseFloat(annualCtc);
        const salaryChanged = !loadedSalary
          || loadedSalary.structureId !== selectedStructureId
          || loadedSalary.ctc !== ctcVal
          || loadedSalary.effectiveFrom !== (salaryEffectiveFrom || '');
        if (!isNaN(ctcVal) && ctcVal > 0 && salaryChanged) {
          // overrides = null keeps existing component_overrides (Data Maintenance > Emoluments)
          await window.api.salary.assignStructure(
            empId,
            selectedStructureId,
            ctcVal,
            null,
            salaryEffectiveFrom || null
          );
        }
      }

      // If Old Tax Regime active, also save investment declarations
      if (isTdsEnabled && tdsRegime === 'old') {
        const declaration = {
          emp_id: empId,
          company_id: activeCompany.id,
          fin_year: getCurrentFinancialYear(),
          declaration_date: new Date().toISOString().substring(0, 10),
          is_final: 0,
          ppf,
          lic_premium: lic,
          elss,
          home_loan_principal: homeLoanPrincipal,
          tuition_fees: tuitionFees,
          sukanya_samriddhi: sukanya,
          other_80c: other80c,
          total_80c: total80c,
          medical_insurance_self: medicalSelf,
          medical_insurance_parents: medicalParents,
          total_80d: total80d,
          rent_paid_annual: rentPaid,
          rent_city_type: rentCityType,
          is_renting: isRenting ? 1 : 0,
          section_24b: section24b,
          nps_80ccd: nps80ccd
        };
        await window.api.employee.saveDeclaration(declaration);
      }

      setSuccessMsg('Employee profile packages updated successfully!');
      setTimeout(() => navigate('/employees'), 1500);
    } else {
      setSaveError(result.error?.message || result.error || 'An unknown error occurred.');
    }
  };

  const handleOpenDecl = () => {
    setIsDeclModalOpen(true);
  };

  const stateOptions = [{ value: '', label: 'Use Company Default' }, ...INDIAN_STATES.map(s => ({ value: s.code, label: s.name }))];

  const EmpTabPersonal = () => (
    <div className="ps-card">
      <p className="ps-card__title">Personal Registers</p>
      <p className="ps-card__sub">Employment types, department routes, and profiles</p>
      <div className="pf2">
        <span className="pfl req">Employee Code</span>
        <div>
          <input 
            value={empCode} 
            onChange={e => { setEmpCode(toUpper(e.target.value)); setFieldSuccess(s=>({...s,empCode:false})); }} 
            onBlur={() => validateField('empCode', empCode)} 
            className={errors.empCode ? 'err' : ''} 
            disabled={isEdit} 
            placeholder="EMP001"
          />
          {errors.empCode && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.empCode}</span>}
        </div>

        <span className="pfl req">Prefix</span>
        <select value={prefix} onChange={e=>setPrefix(e.target.value)}>
          <option value="Mr">Mr.</option>
          <option value="Ms">Ms.</option>
          <option value="Dr">Dr.</option>
          <option value="Prof">Prof.</option>
        </select>

        <span className="pfl req">First Name</span>
        <div>
          <input 
            value={firstName} 
            onChange={e => { setFirstName(e.target.value); setFieldSuccess(s=>({...s,firstName:false})); }} 
            onBlur={() => validateField('firstName', firstName)} 
            className={errors.firstName ? 'err' : ''}
          />
          {errors.firstName && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.firstName}</span>}
        </div>

        <span className="pfl">Middle Name</span>
        <input value={middleName||''} onChange={e=>setMiddleName(e.target.value)}/>

        <span className="pfl req">Last Name</span>
        <div>
          <input 
            value={lastName} 
            onChange={e => { setLastName(e.target.value); setFieldSuccess(s=>({...s,lastName:false})); }} 
            onBlur={() => validateField('lastName', lastName)} 
            className={errors.lastName ? 'err' : ''}
          />
          {errors.lastName && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.lastName}</span>}
        </div>

        <span className="pfl req">Gender</span>
        <select value={gender||'male'} onChange={e=>setGender(e.target.value)}>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>

        <span className="pfl req">Date of Birth</span>
        <div>
          <input 
            type="date" 
            value={dob||''} 
            onChange={e => { setDob(e.target.value); setFieldSuccess(s=>({...s,dob:false})); }} 
            onBlur={() => validateField('dob', dob)} 
            className={errors.dob ? 'err' : ''}
          />
          {errors.dob && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.dob}</span>}
        </div>

        <span className="pfl req">Date of Joining</span>
        <div>
          <input 
            type="date" 
            value={doj||''} 
            onChange={e => { setDoj(e.target.value); setFieldSuccess(s=>({...s,doj:false})); }} 
            onBlur={() => validateField('doj', doj)} 
            className={errors.doj ? 'err' : ''}
          />
          {errors.doj && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.doj}</span>}
        </div>

        <span className="pfl">Department</span>
        <input value={department||''} onChange={e=>setDepartment(e.target.value)} placeholder="e.g. Production"/>

        <span className="pfl">Designation</span>
        <input value={designation||''} onChange={e=>setDesignation(e.target.value)} placeholder="e.g. Machine Operator"/>

        <span className="pfl">Grade</span>
        <input value={grade||''} onChange={e=>setGrade(e.target.value)} placeholder="e.g. Grade A"/>

        <span className="pfl">Location</span>
        <input value={location||''} onChange={e=>setLocation(e.target.value)} placeholder="e.g. Factory Floor A"/>

        <span className="pfl req">Employment Type</span>
        <select value={employmentType||'permanent'} onChange={e=>handleEmploymentTypeChange(e.target.value)}>
          <option value="permanent">Permanent</option>
          <option value="contract">Contract</option>
          <option value="intern">Intern</option>
          <option value="probation">Probation</option>
          <option value="part_time">Part Time</option>
        </select>

        <span className="pfl req">Status</span>
        <select value={status||'active'} onChange={e=>setStatus(e.target.value)}>
          <option value="active">Active</option>
          <option value="on_notice">On Notice</option>
          <option value="separated">Separated</option>
        </select>
      </div>
    </div>
  );

  const EmpTabIdentity = () => (
    <div className="ps-card">
      <p className="ps-card__title">Identity & Banking</p>
      <div className="pf2">
        <span className="pfl req">PAN</span>
        <div>
          <input 
            value={pan||''} 
            onChange={e => { setPan(toUpper(e.target.value)); setFieldSuccess(s=>({...s,pan:false})); }} 
            onBlur={() => validateField('pan', pan)} 
            className={errors.pan?'err':''} 
            placeholder="ABCDE1234F" 
            maxLength={10}
          />
          {errors.pan && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.pan}</span>}
        </div>

        <span className="pfl">UAN</span>
        <div>
          <input 
            value={uan||''} 
            onChange={e => { const v=e.target.value.replace(/\D/g,''); setUan(v); setFieldSuccess(s=>({...s,uan:false})); }} 
            onBlur={() => validateField('uan', uan)} 
            className={errors.uan?'err':''} 
            placeholder="12-digit UAN" 
            maxLength={12} 
            disabled={!isPfEnabled}
          />
          {errors.uan && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.uan}</span>}
        </div>

        <span className="pfl">Aadhaar (Last 4)</span>
        <div>
          <input 
            value={aadhaarLast4||''} 
            onChange={e => { const v=e.target.value.replace(/\D/g,''); setAadhaarLast4(v); setFieldSuccess(s=>({...s,aadhaar:false})); }} 
            onBlur={() => validateField('aadhaar', aadhaarLast4)} 
            className={errors.aadhaar?'err':''} 
            placeholder="Last 4 digits only" 
            maxLength={4}
          />
          {errors.aadhaar && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.aadhaar}</span>}
        </div>

        <span className="pfl">ESI IP Number</span>
        <input value={esiNum||''} onChange={e=>setEsiNum(e.target.value)} disabled={!isEsiEnabled} placeholder="17-digit ESI number"/>

        <div className="ps-sep" />
        <span className="ps-sep-label">Bank Details</span>

        <span className="pfl">Account Number</span>
        <div>
          <input 
            value={bankAccount||''} 
            onChange={e => { const v=e.target.value.replace(/\D/g,''); setBankAccount(v); setFieldSuccess(s=>({...s,bankAccount:false})); }} 
            onBlur={() => validateField('bankAccount', bankAccount)} 
            className={errors.bankAccount?'err':''} 
            placeholder="Account Number" 
            maxLength={18}
          />
          {errors.bankAccount && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.bankAccount}</span>}
        </div>

        <span className="pfl">IFSC Code</span>
        <div>
          <input 
            value={bankIfsc||''} 
            onChange={e => { setBankIfsc(toUpper(e.target.value)); setFieldSuccess(s=>({...s,ifsc:false})); }} 
            onBlur={() => validateField('ifsc', bankIfsc)} 
            className={errors.ifsc?'err':''} 
            placeholder="SBIN0001234" 
            maxLength={11}
          />
          {errors.ifsc && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.ifsc}</span>}
        </div>

        <span className="pfl">Bank Name</span>
        <input value={bankName||''} onChange={e=>setBankName(e.target.value)} placeholder="Auto-filled from IFSC" disabled/>

        <span className="pfl">Branch</span>
        <input value={bankBranch||''} onChange={e=>setBankBranch(e.target.value)}/>

        <div className="ps-sep" />
        <span className="ps-sep-label">Contact</span>

        <span className="pfl">Mobile</span>
        <div>
          <input 
            value={phone||''} 
            onChange={e => { setPhone(e.target.value); setFieldSuccess(s=>({...s,phone:false})); }} 
            onBlur={() => validateField('phone', phone)} 
            className={errors.phone?'err':''} 
            placeholder="10-digit mobile" 
            maxLength={13}
          />
          {errors.phone && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.phone}</span>}
        </div>

        <span className="pfl">Official Email</span>
        <div>
          <input 
            value={email||''} 
            onChange={e => { setEmail(e.target.value); setFieldSuccess(s=>({...s,email:false})); }} 
            onBlur={() => validateField('email', email)} 
            className={errors.email?'err':''} 
            placeholder="Official Email"
          />
          {errors.email && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.email}</span>}
        </div>
      </div>
    </div>
  );

  const EmpTabStatutory = () => (
    <div className="ps-2panel">
      {/* LEFT: PF + ESI + TDS */}
      <div className="ps-card">
        <p className="ps-card__title">Statutory Flags</p>
        <div className="pf2" style={{gridTemplateColumns:'1fr 1fr'}}>
          {/* PF */}
          <span className="ps-sep-label pf-full">Provident Fund</span>
          <label style={{fontSize:12,display:'flex',alignItems:'center',gap:6}}>
            <input type="checkbox" checked={isPfEnabled} onChange={e=>setIsPfEnabled(e.target.checked)}/>
            PF Enabled
          </label>
          {isPfEnabled ? (
            <select value={pfContributionType} onChange={e=>setPfContributionType(e.target.value)} style={{height:26,fontSize:12,padding:'2px 6px',border:'1px solid var(--border-strong)',borderRadius:4}}>
              <option value="statutory">Statutory</option>
              <option value="voluntary">Voluntary (VPF)</option>
            </select>
          ) : <span/>}
          
          {isPfEnabled && pfContributionType==='voluntary' && <>
            <span className="pfl">VPF %</span>
            <div>
              <input type="number" value={voluntaryPfPct||0} onChange={e=>setVoluntaryPfPct(e.target.value)} step="0.5"/>
              {errors.voluntaryPfPct && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.voluntaryPfPct}</span>}
            </div>
          </>}

          {/* ESI */}
          <span className="ps-sep-label pf-full">ESI</span>
          <label style={{fontSize:12,display:'flex',alignItems:'center',gap:6}}>
            <input type="checkbox" checked={isEsiEnabled} onChange={e=>setIsEsiEnabled(e.target.checked)} disabled={esiCeilingLocked}/>
            ESI Enabled
          </label>
          {esiCeilingLocked ? (
            <span style={{fontSize:11,color:'var(--warning)',fontWeight:600}}>Above Ceiling</span>
          ) : (
            !isEsiEnabled ? <input value={esiExemptionReason||''} onChange={e=>setEsiExemptionReason(e.target.value)} placeholder="Exemption reason"/> : <span/>
          )}

          {/* TDS */}
          <span className="ps-sep-label pf-full">TDS</span>
          <label style={{fontSize:12,display:'flex',alignItems:'center',gap:6}}>
            <input type="checkbox" checked={isTdsEnabled} onChange={e=>setIsTdsEnabled(e.target.checked)}/>
            TDS Enabled
          </label>
          {isTdsEnabled ? (
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <select value={tdsRegime||'new'} onChange={e=>setTdsRegime(e.target.value)} style={{height:26,fontSize:12,padding:'2px 6px',border:'1px solid var(--border-strong)',borderRadius:4,flex:1}}>
                <option value="new">New Regime</option>
                <option value="old">Old Regime</option>
              </select>
              {tdsRegime === 'old' && (
                <button type="button" className="psb psb-secondary psb-sm" onClick={handleOpenDecl}>Decl.</button>
              )}
            </div>
          ) : <span/>}
        </div>
      </div>

      {/* RIGHT: PT + OT + Advance */}
      <div className="ps-card">
        <p className="ps-card__title">Other Config</p>
        <div className="pf2" style={{gridTemplateColumns:'1fr 1fr'}}>
          {/* PT */}
          <span className="ps-sep-label pf-full">Professional Tax</span>
          <label style={{fontSize:12,display:'flex',alignItems:'center',gap:6}}>
            <input type="checkbox" checked={isPtEnabled} onChange={e=>setIsPtEnabled(e.target.checked)}/>
            PT Enabled
          </label>
          {isPtEnabled ? (
            <select value={ptStateOverride} onChange={e=>setPtStateOverride(e.target.value)} style={{height:26,fontSize:12,padding:'2px 6px',border:'1px solid var(--border-strong)',borderRadius:4}}>
              {stateOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          ) : <span/>}

          {/* OT */}
          <span className="ps-sep-label pf-full">Overtime</span>
          <label style={{fontSize:12,display:'flex',alignItems:'center',gap:6}}>
            <input type="checkbox" checked={isOtApplicable} onChange={e=>setIsOtApplicable(e.target.checked)}/>
            OT Applicable
          </label>
          {isOtApplicable ? (
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <input type="number" value={otMultiplier} onChange={e=>setOtMultiplier(e.target.value)} step="0.5" style={{width:50}}/>
              <select value={otCalcBasis} onChange={e=>setOtCalcBasis(e.target.value)} style={{height:26,fontSize:12,padding:'2px 6px',border:'1px solid var(--border-strong)',borderRadius:4,flex:1}}>
                <option value="basic">On Basic</option>
                <option value="gross">On Gross</option>
              </select>
            </div>
          ) : <span/>}

          {/* Advance Recovery */}
          <span className="ps-sep-label pf-full">Advance Recovery</span>
          <label style={{fontSize:12,display:'flex',alignItems:'center',gap:6}}>
            <input type="checkbox" checked={isAdvanceRecoveryActive} onChange={e=>setIsAdvanceRecoveryActive(e.target.checked)}/>
            Active
          </label>
          {isAdvanceRecoveryActive ? (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
              <div>
                <input type="number" value={advanceOutstanding} onChange={e=>setAdvanceOutstanding(e.target.value)} placeholder="Outstanding" style={{height:26}}/>
                {errors.advanceOutstanding && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.advanceOutstanding}</span>}
              </div>
              <div>
                <input type="number" value={advanceMonthlyDeduction} onChange={e=>setAdvanceMonthlyDeduction(e.target.value)} placeholder="Monthly" style={{height:26}}/>
                {errors.advanceMonthlyDeduction && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.advanceMonthlyDeduction}</span>}
              </div>
            </div>
          ) : <span/>}
        </div>
      </div>
    </div>
  );

  const EmpTabSalary = () => (
    <div className="ps-card">
      <p className="ps-card__title">Salary Structure Assignment</p>
      <div className="pf2">
        <span className="pfl req">Salary Structure</span>
        <div>
          <select value={selectedStructureId} onChange={e=>setSelectedStructureId(e.target.value)}>
            <option value="">— Select a structure —</option>
            {availableStructures.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <span className="pfl req">Annual CTC (₹)</span>
        <div>
          <input type="number" value={annualCtc} onChange={e=>setAnnualCtc(e.target.value)} placeholder="e.g. 600000"/>
          {annualCtc && <span style={{fontSize:10,color:'var(--text-secondary)',display:'block',marginTop:2}}>Monthly: ₹{Math.round(parseFloat(annualCtc)/12).toLocaleString('en-IN')}</span>}
        </div>

        <span className="pfl">Effective From</span>
        <div>
          <input type="date" value={salaryEffectiveFrom} onChange={e=>setSalaryEffectiveFrom(e.target.value)}/>
        </div>

        {selectedStructureId && (() => {
          const s = availableStructures.find(x => x.id === selectedStructureId);
          return s ? (
            <div className="ps-sep pf-full" style={{marginTop: 10}}>
              <div className="ps-alert ps-alert-info">
                <span>Selected: <strong>{s.name}</strong> · Default CTC: ₹{(s.default_ctc || 0).toLocaleString('en-IN')} · {s.is_ctc_based ? 'CTC Based' : 'Fixed'}</span>
              </div>
            </div>
          ) : null;
        })()}

        {existingSalaryId && (
          <div className="ps-alert ps-alert-ok pf-full" style={{marginTop: 10}}>
            ✓ This employee already has a salary assignment. Saving will update it.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="ps-page">
      {/* Header */}
      <div className="ps-header">
        <div className="ps-header__left">
          <button className="ps-header__back" type="button" onClick={() => navigate('/employees')}>
            <ChevronLeft size={14}/>
          </button>
          <div>
            <h1 className="ps-header__title">Employee Profile Package</h1>
            <p className="ps-header__sub">Structure profiles, identities, banking, and active statutory parameters</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="ps-tabs">
        {[
          { id: 'personal',  label: '1. Personal & Employment', icon: <User size={13}/> },
          { id: 'identity',  label: '2. Identity & Bank',       icon: <Landmark size={13}/> },
          { id: 'statutory', label: '3. Statutory Config',      icon: <Shield size={13}/> },
          { id: 'salary',    label: '4. Salary Assignment',     icon: <IndianRupee size={13}/> },
        ].map((t) => (
          <button key={t.id} type="button" className={`ps-tab ${activeTab===t.id?'active':''}`} onClick={() => setActiveTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {saveError && (
        <div className="ps-alert ps-alert-error" style={{margin:'6px 20px'}}>
          ⚠ {saveError}
        </div>
      )}

      {successMsg && (
        <div className="ps-alert ps-alert-ok" style={{margin:'6px 20px'}}>
          {successMsg}
        </div>
      )}

      {/* Body */}
      <div className="ps-body">
        {activeTab === 'personal' && EmpTabPersonal()}
        {activeTab === 'identity' && EmpTabIdentity()}
        {activeTab === 'statutory' && EmpTabStatutory()}
        {activeTab === 'salary' && EmpTabSalary()}
      </div>

      {/* Footer */}
      <div className="ps-footer ps-footer--right">
        <button className="psb psb-secondary" type="button" onClick={() => navigate('/employees')}>Cancel</button>
        
        {activeTab !== 'salary' ? (
          <button
            type="button"
            className="psb psb-primary"
            onClick={() => {
              if (activeTab === 'personal') setActiveTab('identity');
              else if (activeTab === 'identity') setActiveTab('statutory');
              else if (activeTab === 'statutory') setActiveTab('salary');
            }}
          >
            Next Tab
          </button>
        ) : (
          <button className="psb psb-primary" type="button" onClick={handleSave}>
            {isEdit ? '💾 Update Employee' : '➕ Add Employee'}
          </button>
        )}
      </div>

      {/* Investment Declarations Modal (Old Tax Regime only) */}
      <Modal
        isOpen={isDeclModalOpen}
        onClose={() => setIsDeclModalOpen(false)}
        title="Section 80C & 80D Investment Declarations"
        size="lg"
        footer={
          <Button 
            onClick={() => setIsDeclModalOpen(false)}
            variant="primary"
          >
            Close & Lock in Declarations
          </Button>
        }
      >
        <div className="space-y-6 text-left">
          <div className="p-3 bg-[var(--info-light)] text-[var(--info)] text-xs font-semibold rounded-md border border-[var(--info-light)]">
            Deductions declared below are applied dynamically to calculate tax reductions under the Old Tax Regime.
          </div>

          {/* Section 80C */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-1.5 flex items-center justify-between">
              <span>Section 80C Slabs (EPF/LIC/ELSS/PPF)</span>
              <span className="text-xs font-mono text-[var(--accent)] font-bold">Capped at ₹1,50,000 Max</span>
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Public Provident Fund (PPF)"
                type="number"
                value={ppf}
                onChange={e => setPpf(e.target.value)}
              />
              <Input
                label="LIC Premium Paid"
                type="number"
                value={lic}
                onChange={e => setLic(e.target.value)}
              />
              <Input
                label="Equity Linked Savings (ELSS)"
                type="number"
                value={elss}
                onChange={e => setElss(e.target.value)}
              />
              <Input
                label="Home Loan Principal Repaid"
                type="number"
                value={homeLoanPrincipal}
                onChange={e => setHomeLoanPrincipal(e.target.value)}
              />
              <Input
                label="Children Tuition Fees"
                type="number"
                value={tuitionFees}
                onChange={e => setTuitionFees(e.target.value)}
              />
              <Input
                label="Sukanya Samriddhi Scheme"
                type="number"
                value={sukanya}
                onChange={e => setSukanya(e.target.value)}
              />
              <Input
                label="Other Eligible 80C Slabs"
                type="number"
                value={other80c}
                onChange={e => setOther80c(e.target.value)}
              />
              <Input
                label="Net 80C Allowed"
                value={total80c}
                disabled
                className="font-mono"
              />
            </div>
          </div>

          {/* Section 80D */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-1.5">
              Section 80D Slabs (Medical Insurances)
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Medical Premium (Self/Spouse/Kids)"
                type="number"
                value={medicalSelf}
                onChange={e => setMedicalSelf(e.target.value)}
              />
              <Input
                label="Medical Premium (Parents)"
                type="number"
                value={medicalParents}
                onChange={e => setMedicalParents(e.target.value)}
              />
              <Input
                label="Total 80D Allowed"
                value={total80d}
                disabled
                className="font-mono"
              />
            </div>
          </div>

          {/* Rent & House parameters */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-1.5">
              Rent Payments &amp; HRA Exemption
            </h4>
            <FlagRow
              label="Paying Rent?"
              helperText="Enable to enter annual rent paid for HRA exemption calculation"
              checked={isRenting}
              onChange={setIsRenting}
            />
            
            {isRenting && (
              <div className="grid grid-cols-2 gap-4 bg-[var(--bg-surface-2)] p-4 rounded border border-[var(--border)]">
                <Input
                  label="Annual Rent Paid (₹)"
                  type="number"
                  value={rentPaid}
                  onChange={e => setRentPaid(e.target.value)}
                />
                <Select
                  label="City Type for Metro Exemption"
                  options={[
                    { value: 'non_metro', label: 'Non-Metro City (40% Basic)' },
                    { value: 'metro', label: 'Metro City (50% Basic)' }
                  ]}
                  value={rentCityType}
                  onChange={e => setRentCityType(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Home Loans Interest */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-1.5">
              Home Loan Interest & NPS
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Home Loan Interest (Section 24b)"
                type="number"
                value={section24b}
                onChange={e => setSection24b(Math.min(200000, parseFloat(e.target.value) || 0))}
                helperText="Maximum deduction: ₹2,00,000"
                max="200000"
              />
              <Input
                label="National Pension Scheme (80CCD)"
                type="number"
                value={nps80ccd}
                onChange={e => setNps80ccd(e.target.value)}
              />
            </div>
          </div>

        </div>
      </Modal>

    </div>
  );
}
