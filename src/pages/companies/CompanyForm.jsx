import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Building, ChevronLeft } from 'lucide-react';
import { useCompanyStore } from '../../store/company.store';
import TopBar from '../../components/layout/TopBar';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import FlagRow from '../../components/ui/FlagRow';
import { INDIAN_STATES } from '../../utils/constants';
import { validatePAN, validateTAN, validateESICode, validatePhone, validateEmail, validatePincode, validateGSTIN, validateCIN } from '../../utils/validators';

export default function CompanyForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const createCompany = useCompanyStore(state => state.createCompany);
  const updateCompany = useCompanyStore(state => state.updateCompany);
  const companies = useCompanyStore(state => state.companies);

  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [pan, setPan] = useState('');
  const [tan, setTan] = useState('');
  const [cin, setCin] = useState('');
  const [gstin, setGstin] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('MH');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  // Settings
  const [workingDays, setWorkingDays] = useState('6');
  const [workingHours, setWorkingHours] = useState('8');

  // Statutory flags
  const [isPfRegistered, setIsPfRegistered] = useState(false);
  const [pfRegNumber, setPfRegNumber] = useState('');
  const [pfEstId, setPfEstId] = useState('');

  const [isEsiRegistered, setIsEsiRegistered] = useState(false);
  const [esiCode, setEsiCode] = useState('');

  const [isPtApplicable, setIsPtApplicable] = useState(false);
  const [ptRegNumber, setPtRegNumber] = useState('');

  const [isTdsDeductor, setIsTdsDeductor] = useState(false);

  // Error mappings
  const [errors, setErrors] = useState({});
  const [fieldSuccess, setFieldSuccess] = useState({});
  const [saveError, setSaveError] = useState('');

  // ─── Inline blur validators ───────────────────────────────────
  const validateField = (field, value) => {
    let msg = '';
    if (field === 'pan')      msg = validatePAN(value).message;
    if (field === 'tan')      msg = validateTAN(value).message;
    if (field === 'email' && value)  msg = validateEmail(value).message;
    if (field === 'phone' && value)  msg = validatePhone(value).message;
    if (field === 'pincode' && value) msg = validatePincode(value).message;
    if (field === 'gstin' && value)  msg = validateGSTIN(value).message;
    if (field === 'cin' && value)    msg = validateCIN(value).message;
    if (field === 'esiCode' && value) msg = validateESICode(value).message;
    if (field === 'name' && (!value || value.trim().length < 2)) msg = 'Company name is required.';

    setErrors(prev => ({ ...prev, [field]: msg || undefined }));
    setFieldSuccess(prev => ({ ...prev, [field]: !msg && !!value }));
  };

  // Auto-format helpers
  const toUpper = (val) => val.toUpperCase();

  useEffect(() => {
    if (isEdit) {
      const company = companies.find(c => c.id === id);
      if (company) {
        setName(company.name || '');
        setShortName(company.short_name || '');
        setPan(company.pan || '');
        setTan(company.tan || '');
        setCin(company.cin || '');
        setGstin(company.gstin || '');
        setAddressLine1(company.address_line1 || '');
        setAddressLine2(company.address_line2 || '');
        setCity(company.city || '');
        setStateCode(company.state_code || 'MH');
        setPincode(company.pincode || '');
        setPhone(company.phone || '');
        setEmail(company.email || '');
        setWorkingDays(company.working_days_per_week?.toString() || '6');
        setWorkingHours(company.working_hours_per_day?.toString() || '8');
        
        setIsPfRegistered(company.is_pf_registered === 1);
        setPfRegNumber(company.pf_reg_number || '');
        setPfEstId(company.pf_establishment_id || '');

        setIsEsiRegistered(company.is_esi_registered === 1);
        setEsiCode(company.esi_code || '');

        setIsPtApplicable(company.is_pt_applicable === 1);
        setPtRegNumber(company.pt_reg_number || '');

        setIsTdsDeductor(company.is_tds_deductor === 1);
      }
    }
  }, [id, isEdit, companies]);

  const handleSave = async (e) => {
    e.preventDefault();
    setErrors({});
    setSaveError('');

    const formErrors = {};

    // 1. Core required fields
    if (!name || name.trim().length < 2) formErrors.name = 'Company name is required (min 2 characters).';
    if (!city || city.trim().length < 2) formErrors.city = 'City is required.';

    // 2. PAN (always required)
    const panCheck = validatePAN(pan);
    if (!panCheck.valid) formErrors.pan = panCheck.message;

    // 3. Optional but format-validated fields
    if (email) {
      const emailCheck = validateEmail(email);
      if (!emailCheck.valid) formErrors.email = emailCheck.message;
    }
    if (phone) {
      const phoneCheck = validatePhone(phone);
      if (!phoneCheck.valid) formErrors.phone = phoneCheck.message;
    }
    if (pincode) {
      const pincodeCheck = validatePincode(pincode);
      if (!pincodeCheck.valid) formErrors.pincode = pincodeCheck.message;
    }
    if (gstin) {
      const gstinCheck = validateGSTIN(gstin);
      if (!gstinCheck.valid) formErrors.gstin = gstinCheck.message;
    }
    if (cin) {
      const cinCheck = validateCIN(cin);
      if (!cinCheck.valid) formErrors.cin = cinCheck.message;
    }

    // 4. TAN
    if (isTdsDeductor && !tan) {
      formErrors.tan = 'TAN is required when TDS Deductor is enabled.';
    } else if (tan) {
      const tanCheck = validateTAN(tan);
      if (!tanCheck.valid) formErrors.tan = tanCheck.message;
    }

    // 5. PF statutory
    if (isPfRegistered) {
      if (!pfRegNumber || pfRegNumber.trim().length < 10) formErrors.pfRegNumber = 'Valid PF Registration Number is required (min 10 chars).';
      if (!pfEstId) formErrors.pfEstId = 'PF Establishment ID is required.';
    }

    // 6. ESI
    if (isEsiRegistered) {
      if (!esiCode) {
        formErrors.esiCode = 'ESI code is required.';
      } else {
        const esiCheck = validateESICode(esiCode);
        if (!esiCheck.valid) formErrors.esiCode = esiCheck.message;
      }
    }

    // 7. PT registration number required when PT is enabled
    if (isPtApplicable && !ptRegNumber) {
      formErrors.ptRegNumber = 'PT Registration Number is required when PT is enabled.';
    }

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      setSaveError('Please correct the validation errors below.');
      return;
    }

    const payload = {
      name,
      short_name: shortName,
      pan: pan.toUpperCase(),
      tan: tan.toUpperCase(),
      cin,
      gstin,
      address_line1: addressLine1,
      address_line2: addressLine2,
      city,
      state_code: stateCode,
      pincode,
      phone,
      email,
      working_days_per_week: parseInt(workingDays),
      working_hours_per_day: parseInt(workingHours),
      
      is_pf_registered: isPfRegistered ? 1 : 0,
      pf_reg_number: isPfRegistered ? pfRegNumber : null,
      pf_establishment_id: isPfRegistered ? pfEstId : null,
      
      is_esi_registered: isEsiRegistered ? 1 : 0,
      esi_code: isEsiRegistered ? esiCode : null,
      
      is_pt_applicable: isPtApplicable ? 1 : 0,
      pt_reg_number: isPtApplicable ? ptRegNumber : null,
      
      is_tds_deductor: isTdsDeductor ? 1 : 0
    };

    let result;
    if (isEdit) {
      result = await updateCompany(id, payload);
    } else {
      result = await createCompany(payload);
    }

    if (result.success) {
      navigate('/companies');
    } else {
      setSaveError(result.error?.message || result.error || 'An unknown error occurred.');
    }
  };

  const stateOptions = INDIAN_STATES.map(s => ({ value: s.code, label: s.name }));
  const daysOptions = [
    { value: '5', label: '5 Days / Week' },
    { value: '6', label: '6 Days / Week' }
  ];
  const hoursOptions = [
    { value: '8', label: '8 Hours / Day' },
    { value: '9', label: '9 Hours / Day' }
  ];

  return (
    <div className="ps-page">
      <div className="ps-header">
        <div className="ps-header__left">
          <button className="ps-header__back" type="button" onClick={() => navigate('/companies')}>
            <ChevronLeft size={14}/>
          </button>
          <div>
            <h1 className="ps-header__title">{isEdit ? 'Edit Company' : 'Add New Company'}</h1>
            <p className="ps-header__sub">Legal registration, address, and statutory flags</p>
          </div>
        </div>
      </div>

      {saveError && (
        <div className="ps-alert ps-alert-error" style={{margin:'6px 20px'}}>
          ⚠ {saveError}
        </div>
      )}

      <div className="ps-body">
        <form onSubmit={handleSave} className="ps-card">
          <p className="ps-card__title">Legal Information</p>
          <div className="pf2">
            <span className="pfl req">Company Name</span>
            <div className="pf-span3">
              <input 
                value={name} 
                onChange={e => { setName(e.target.value); setFieldSuccess(s=>({...s,name:false})); }} 
                onBlur={() => validateField('name', name)}
                className={errors.name ? 'err' : ''}
              />
              {errors.name && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.name}</span>}
            </div>

            <span className="pfl">Trade Name</span>
            <input value={shortName||''} onChange={e=>setShortName(e.target.value)}/>
            
            <span className="pfl req">PAN</span>
            <div>
              <input 
                value={pan} 
                onChange={e => { setPan(toUpper(e.target.value)); setFieldSuccess(s=>({...s,pan:false})); }} 
                onBlur={() => validateField('pan', pan)}
                className={errors.pan ? 'err' : ''}
                placeholder="ABCDE1234F"
                maxLength={10}
                disabled={isEdit}
              />
              {errors.pan && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.pan}</span>}
            </div>

            <span className="pfl">CIN</span>
            <div>
              <input 
                value={cin} 
                onChange={e => { setCin(toUpper(e.target.value)); setFieldSuccess(s=>({...s,cin:false})); }} 
                onBlur={() => validateField('cin', cin)}
                className={errors.cin ? 'err' : ''}
                placeholder="U72200MH2025PTC123456"
                maxLength={21}
              />
              {errors.cin && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.cin}</span>}
            </div>

            <span className="pfl">GSTIN</span>
            <div>
              <input 
                value={gstin} 
                onChange={e => { setGstin(toUpper(e.target.value)); setFieldSuccess(s=>({...s,gstin:false})); }} 
                onBlur={() => validateField('gstin', gstin)}
                className={errors.gstin ? 'err' : ''}
                placeholder="27ABCDE1234F1Z5"
                maxLength={15}
              />
              {errors.gstin && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.gstin}</span>}
            </div>

            <div className="ps-sep"/>
            <span className="ps-sep-label">Address</span>

            <span className="pfl">Address Line 1</span>
            <input value={addressLine1||''} onChange={e=>setAddressLine1(e.target.value)} className="pf-span3"/>

            <span className="pfl">Address Line 2</span>
            <input value={addressLine2||''} onChange={e=>setAddressLine2(e.target.value)} className="pf-span3"/>

            <span className="pfl req">State</span>
            <select value={stateCode||''} onChange={e=>setStateCode(e.target.value)}>
              <option value="">Select State</option>
              {INDIAN_STATES.map(s=><option key={s.code} value={s.code}>{s.name}</option>)}
            </select>

            <span className="pfl req">City</span>
            <div>
              <input 
                value={city} 
                onChange={e=>setCity(e.target.value)}
                className={errors.city ? 'err' : ''}
              />
              {errors.city && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.city}</span>}
            </div>

            <span className="pfl">Pincode</span>
            <div>
              <input 
                value={pincode} 
                onChange={e => { const v=e.target.value.replace(/\D/g,''); setPincode(v); setFieldSuccess(s=>({...s,pincode:false})); }} 
                onBlur={() => validateField('pincode', pincode)}
                className={errors.pincode ? 'err' : ''}
                placeholder="400001"
                maxLength={6}
              />
              {errors.pincode && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.pincode}</span>}
            </div>

            <span className="pfl">Phone</span>
            <div>
              <input 
                value={phone} 
                onChange={e => { setPhone(e.target.value); setFieldSuccess(s=>({...s,phone:false})); }} 
                onBlur={() => validateField('phone', phone)}
                className={errors.phone ? 'err' : ''}
                placeholder="10-digit phone"
                maxLength={13}
              />
              {errors.phone && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.phone}</span>}
            </div>

            <span className="pfl">Email</span>
            <div>
              <input 
                value={email} 
                type="email"
                onChange={e => { setEmail(e.target.value); setFieldSuccess(s=>({...s,email:false})); }} 
                onBlur={() => validateField('email', email)}
                className={errors.email ? 'err' : ''}
                placeholder="Official Email"
              />
              {errors.email && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.email}</span>}
            </div>

            <div className="ps-sep"/>
            <span className="ps-sep-label">Operations Settings</span>

            <span className="pfl">Working Days</span>
            <select value={workingDays} onChange={e=>setWorkingDays(e.target.value)}>
              <option value="5">5 Days / Week</option>
              <option value="6">6 Days / Week</option>
            </select>

            <span className="pfl">Working Hours</span>
            <select value={workingHours} onChange={e=>setWorkingHours(e.target.value)}>
              <option value="8">8 Hours / Day</option>
              <option value="9">9 Hours / Day</option>
            </select>

            <div className="ps-sep"/>
            <span className="ps-sep-label">Statutory Registrations</span>

            <span className="pfl">EPF Status</span>
            <select value={isPfRegistered ? 1 : 0} onChange={e=>setIsPfRegistered(e.target.value === '1')} className={`yn ${isPfRegistered?'yn-yes':'yn-no'}`} style={{height:26,fontSize:12,padding:'2px 6px',borderRadius:4,border:'1px solid'}}>
              <option value={1}>Registered</option>
              <option value={0}>Not Registered</option>
            </select>
            {isPfRegistered ? (
              <>
                <span className="pfl req">PF Reg Num</span>
                <div>
                  <input value={pfRegNumber} onChange={e=>setPfRegNumber(e.target.value)} placeholder="MH/BAN/1234567/000" className={errors.pfRegNumber ? 'err' : ''}/>
                  {errors.pfRegNumber && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.pfRegNumber}</span>}
                </div>
                <span className="pfl req">PF Est ID</span>
                <div>
                  <input value={pfEstId} onChange={e=>setPfEstId(e.target.value)} placeholder="EST1234567000" className={errors.pfEstId ? 'err' : ''}/>
                  {errors.pfEstId && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.pfEstId}</span>}
                </div>
              </>
            ) : <span className="pf-span2"/>}

            <span className="pfl">ESI Status</span>
            <select value={isEsiRegistered ? 1 : 0} onChange={e=>setIsEsiRegistered(e.target.value === '1')} className={`yn ${isEsiRegistered?'yn-yes':'yn-no'}`} style={{height:26,fontSize:12,padding:'2px 6px',borderRadius:4,border:'1px solid'}}>
              <option value={1}>Registered</option>
              <option value={0}>Not Registered</option>
            </select>
            {isEsiRegistered ? (
              <>
                <span className="pfl req">ESI Code</span>
                <div>
                  <input 
                    value={esiCode} 
                    onChange={e => { const v=e.target.value.replace(/\D/g,''); setEsiCode(v); setFieldSuccess(s=>({...s,esiCode:false})); }} 
                    onBlur={() => validateField('esiCode', esiCode)}
                    className={errors.esiCode ? 'err' : ''}
                    placeholder="17-Digit Code"
                    maxLength={17}
                  />
                  {errors.esiCode && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.esiCode}</span>}
                </div>
              </>
            ) : <span/>}

            <span className="pfl">PT Status</span>
            <select value={isPtApplicable ? 1 : 0} onChange={e=>setIsPtApplicable(e.target.value === '1')} className={`yn ${isPtApplicable?'yn-yes':'yn-no'}`} style={{height:26,fontSize:12,padding:'2px 6px',borderRadius:4,border:'1px solid'}}>
              <option value={1}>Applicable</option>
              <option value={0}>Not Applicable</option>
            </select>
            {isPtApplicable ? (
              <>
                <span className="pfl req">PT Reg Num</span>
                <div>
                  <input value={ptRegNumber} onChange={e=>setPtRegNumber(e.target.value)} placeholder="MHPT123456789" className={errors.ptRegNumber ? 'err' : ''}/>
                  {errors.ptRegNumber && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.ptRegNumber}</span>}
                </div>
              </>
            ) : <span/>}

            <span className="pfl">TDS Deductor</span>
            <select value={isTdsDeductor ? 1 : 0} onChange={e=>setIsTdsDeductor(e.target.value === '1')} className={`yn ${isTdsDeductor?'yn-yes':'yn-no'}`} style={{height:26,fontSize:12,padding:'2px 6px',borderRadius:4,border:'1px solid'}}>
              <option value={1}>Yes</option>
              <option value={0}>No</option>
            </select>
            {isTdsDeductor ? (
              <>
                <span className="pfl req">TAN</span>
                <div>
                  <input 
                    value={tan} 
                    onChange={e => { setTan(toUpper(e.target.value)); setFieldSuccess(s=>({...s,tan:false})); }} 
                    onBlur={() => validateField('tan', tan)}
                    className={errors.tan ? 'err' : ''}
                    placeholder="MUMB12345C"
                    maxLength={10}
                  />
                  {errors.tan && <span style={{color: 'var(--danger)', fontSize: '9px', display: 'block', marginTop: '1px'}}>⚠ {errors.tan}</span>}
                </div>
              </>
            ) : <span/>}

          </div>

          {/* Controls */}
          <div className="ps-footer ps-footer--right" style={{marginTop: 14, padding: '7px 0 0'}}>
            <button className="psb psb-secondary" type="button" onClick={() => navigate('/companies')}>Cancel</button>
            <button className="psb psb-primary" type="submit">
              {isEdit ? '💾 Update Company' : '➕ Create Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
