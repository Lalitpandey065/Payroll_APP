import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarRange, ShieldAlert, Save, Lock, Unlock, Zap, Copy } from 'lucide-react';
import { useCompanyStore } from '../../store/company.store';
import { useAuthStore } from '../../store/auth.store';
import TopBar from '../../components/layout/TopBar';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import { calcWorkingDays, daysInMonth, validateAttendanceRow } from '../../utils/formatters';
import { MONTH_NAMES } from '../../utils/constants';

export default function AttendanceEntry() {
  const navigate = useNavigate();
  const activeCompany = useCompanyStore(state => state.activeCompany);
  const user = useAuthStore(state => state.user);

  // Period Selector (default to previous month)
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() || 12);
  const [year, setYear] = useState(today.getFullYear());

  const [employees, setEmployees] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [rowErrors, setRowErrors] = useState({});

  // Auto-calculated working days for current selection
  const [workingDays, setWorkingDays] = useState(26);
  const [attSetup, setAttSetup] = useState({});

  useEffect(() => {
    if (activeCompany) {
      const days = calcWorkingDays(month, year, activeCompany.working_days_per_week);
      setWorkingDays(days);
      loadAttendance();
    }
  }, [activeCompany, month, year]);

  useEffect(() => {
    if (activeCompany?.id) {
      window.api.setup.getAttendanceSetup(activeCompany.id).then(rows => {
        const map = {};
        rows.forEach(r => { map[r.code] = r.heading || r.field_label; });
        setAttSetup(map);
      });
    }
  }, [activeCompany?.id]);

  const loadAttendance = async () => {
    setLoading(true);
    setSaveSuccess('');
    try {
      const response = await window.api.attendance.getCompany(activeCompany.id, month, year);
      if (response.success && response.data) {
        setEmployees(response.data);
        
        // Map attendance details
        const map = {};
        let lockedState = false;

        response.data.forEach(emp => {
          // emp_id comes from al.emp_id (NULL if no log yet); employee_id is always e.id
          const empId = emp.emp_id || emp.employee_id;
          
          if (emp.is_attendance_locked === 1) {
            lockedState = true;
          }

          map[empId] = {
            present_days: emp.present_days !== null && emp.present_days !== undefined ? emp.present_days : workingDays,
            paid_leave_days: emp.paid_leave_days || 0,
            unpaid_leave_days: emp.unpaid_leave_days || 0,
            ot_hours: emp.ot_hours || 0,
            notes: emp.notes || ''
          };
        });

        setAttendanceMap(map);
        setIsLocked(lockedState);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const validateRow = (empId, present, paidLeave) => {
    const errors = {};
    const calDays = daysInMonth(month, year);
    const working = workingDays;

    const p = present === '' ? '' : Number(present);
    const pl = paidLeave === '' ? '' : Number(paidLeave);

    if (present === '' || isNaN(p) || p < 0) {
      errors.present = 'Cannot be negative';
    } else if (p > calDays) {
      errors.present = `Cannot exceed ${calDays} calendar days`;
    } else if (p > working) {
      errors.present = `Cannot exceed ${working} working days`;
    }

    if (paidLeave === '' || isNaN(pl) || pl < 0) {
      errors.paidLeave = 'Cannot be negative';
    } else if (pl > working) {
      errors.paidLeave = `Cannot exceed ${working} working days`;
    }

    if (present !== '' && paidLeave !== '' && !errors.present && !errors.paidLeave) {
      if (p + pl > working) {
        errors.present = `Present + Paid Leave (${p + pl}) exceeds working days (${working})`;
        errors.paidLeave = `Present + Paid Leave (${p + pl}) exceeds working days (${working})`;
      }
    }

    setRowErrors(prev => ({
      ...prev,
      [empId]: errors
    }));

    return Object.keys(errors).length === 0;
  };

  const handleValueChange = (empId, field, val) => {
    if (isLocked) return;
    let parsedVal = val === '' ? '' : parseFloat(val);
    if (parsedVal !== '' && isNaN(parsedVal)) parsedVal = 0;

    const data = attendanceMap[empId] || { present_days: workingDays, paid_leave_days: 0, ot_hours: 0, notes: '' };
    const nextData = { ...data, [field]: parsedVal };

    setAttendanceMap(prev => ({
      ...prev,
      [empId]: nextData
    }));

    const targetPresent = field === 'present_days' ? parsedVal : data.present_days;
    const targetPaidLeave = field === 'paid_leave_days' ? parsedVal : data.paid_leave_days;
    validateRow(empId, targetPresent, targetPaidLeave);
  };

  const calculateLop = (empId) => {
    const data = attendanceMap[empId];
    if (!data) return 0;
    const p = Number(data.present_days) || 0;
    const pl = Number(data.paid_leave_days) || 0;
    const lop = Math.max(0, workingDays - p - pl);
    return Math.round(lop * 100) / 100;
  };

  // Automation: Set full attendance for everyone
  const handleBulkSetFull = () => {
    if (isLocked) return;
    const map = { ...attendanceMap };
    Object.keys(map).forEach(empId => {
      map[empId].present_days = workingDays;
      map[empId].paid_leave_days = 0;
      map[empId].unpaid_leave_days = 0;
    });
    setAttendanceMap(map);
    setRowErrors({});
  };

  // Automation: Copy attendance from previous month
  const handleCopyPrevious = async () => {
    if (isLocked) return;
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }

    try {
      const response = await window.api.attendance.getCompany(activeCompany.id, prevMonth, prevYear);
      if (response.success && response.data.length > 0) {
        const map = { ...attendanceMap };
        const newErrors = { ...rowErrors };
        
        response.data.forEach(prevLog => {
          const empId = prevLog.emp_id || prevLog.employee_id;
          if (map[empId]) {
            const copiedPresent = prevLog.present_days !== null && prevLog.present_days !== undefined ? prevLog.present_days : workingDays;
            const copiedPaidLeave = prevLog.paid_leave_days || 0;

            const present = Math.min(copiedPresent, workingDays);
            const paidLeave = Math.min(copiedPaidLeave, workingDays - present);

            map[empId].present_days = present;
            map[empId].paid_leave_days = paidLeave;
            map[empId].ot_hours = prevLog.ot_hours || 0;
            delete newErrors[empId];
          }
        });
        
        setAttendanceMap(map);
        setRowErrors(newErrors);

        // Run validation over all rows
        Object.keys(map).forEach(empId => {
          validateRow(empId, map[empId].present_days, map[empId].paid_leave_days);
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (isLocked) return;
    setSaveSuccess('');

    let hasErrors = false;
    employees.forEach(emp => {
      const empId = emp.emp_id || emp.employee_id;
      const data = attendanceMap[empId] || { present_days: workingDays, paid_leave_days: 0 };
      const isValid = validateRow(empId, data.present_days, data.paid_leave_days);
      if (!isValid) {
        hasErrors = true;
      }
    });

    if (hasErrors) {
      setSaveSuccess('⚠ Cannot save: please resolve validation errors (highlighted in red) first.');
      return;
    }

    let hasHighOT = false;
    employees.forEach(emp => {
      const empId = emp.emp_id || emp.employee_id;
      const data = attendanceMap[empId];
      if (data && Number(data.ot_hours) > workingDays * 4) {
        hasHighOT = true;
      }
    });

    if (hasHighOT) {
      const confirm = window.confirm(
        'Some employee(s) have unusually high OT hours (exceeding working days × 4). Save anyway?'
      );
      if (!confirm) return;
    }

    let hasZeroAttendance = false;
    employees.forEach(emp => {
      const empId = emp.emp_id || emp.employee_id;
      const data = attendanceMap[empId];
      if (data && Number(data.present_days) === 0 && Number(data.paid_leave_days) === 0) {
        hasZeroAttendance = true;
      }
    });

    if (hasZeroAttendance) {
      const confirm = window.confirm(
        'Some employee(s) have 0 attendance. Save anyway?'
      );
      if (!confirm) return;
    }

    try {
      const calDays = daysInMonth(month, year);
      const promises = employees.map(emp => {
        const empId = emp.emp_id || emp.employee_id;
        const data = attendanceMap[empId];
        return window.api.attendance.save({
          emp_id: empId,
          company_id: activeCompany.id,
          month, year,
          total_calendar_days: calDays,
          total_working_days: workingDays,
          present_days: Number(data.present_days) || 0,
          paid_leave_days: Number(data.paid_leave_days) || 0,
          unpaid_leave_days: Number(data.unpaid_leave_days) || 0,
          ot_hours: Number(data.ot_hours) || 0,
          notes: data.notes || ''
        });
      });

      const results = await Promise.all(promises);
      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        const errMsg = failed[0].error?.message || 'Some records failed to save. Please try again.';
        setSaveSuccess(`⚠ Save failed: ${errMsg}`);
      } else {
        setSaveSuccess('Attendance records saved successfully!');
        setRowErrors({});
        loadAttendance();
      }
    } catch (e) {
      console.error('[Attendance] Save error:', e);
      setSaveSuccess('Error saving attendance: ' + (e.message || 'Unknown error'));
    }
  };

  const handleToggleLock = async () => {
    const nextState = !isLocked;
    const action = nextState ? window.api.attendance.lock : window.api.attendance.unlock;
    
    try {
      await action(activeCompany.id, month, year, user.name);
      setIsLocked(nextState);
      loadAttendance();
    } catch (e) {
      console.error(e);
    }
  };

  const totalErrorsCount = Object.values(rowErrors).reduce((acc, errors) => {
    return acc + (errors ? Object.keys(errors).length : 0);
  }, 0);

  return (
    <div className="ps-page">
      <div className="ps-header">
        <div className="ps-header__left">
          <h1 className="ps-header__title">Attendance Entry</h1>
          {totalErrorsCount > 0 && (
            <span className="att-error-badge">
              <ShieldAlert size={12} /> {totalErrorsCount} Error{totalErrorsCount > 1 ? 's' : ''}
            </span>
          )}
          <p className="ps-header__sub">{activeCompany ? `${activeCompany.name} · ${employees.length} employees` : 'Select a company'}</p>
        </div>
        {activeCompany && (
          <div className="ps-header__actions">
            <select value={month} onChange={e=>setMonth(parseInt(e.target.value))} style={{height:28,fontSize:12,padding:'2px 6px',border:'1px solid var(--border-strong)',borderRadius:4}}>
              {MONTH_NAMES.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select value={year} onChange={e=>setYear(parseInt(e.target.value))} style={{width:80,height:28,padding:'2px 6px',fontSize:12,border:'1px solid var(--border-strong)',borderRadius:4}}>
              {['2024','2025','2026','2027'].map(y=><option key={y} value={y}>{y}</option>)}
            </select>
            <button className="psb psb-secondary psb-sm" type="button" onClick={handleCopyPrevious} disabled={isLocked||loading}>Copy Prev Month</button>
            <button className="psb psb-secondary psb-sm" type="button" onClick={handleBulkSetFull} disabled={isLocked||loading}>Set Full Month</button>
            
            {(user.role === 'admin' || user.role === 'manager') && (
              <button 
                className={`psb psb-sm ${isLocked ? 'psb-secondary' : 'psb-danger'}`} 
                type="button" 
                onClick={handleToggleLock} 
                disabled={loading}
              >
                {isLocked ? 'Unlock Sheet' : 'Lock Sheet'}
              </button>
            )}
            
            <button className="psb psb-primary psb-sm" type="button" onClick={handleSave} disabled={isLocked||loading}>💾 Save Attendance</button>
          </div>
        )}
      </div>

      {saveSuccess && (
        <div className={`ps-alert ${saveSuccess.startsWith('⚠') ? 'ps-alert-error' : 'ps-alert-ok'}`} style={{margin:'6px 20px'}}>
          {saveSuccess}
        </div>
      )}

      <div className="ps-body ps-body--no-pad">
        {!activeCompany ? (
          <div style={{padding:20}}>
            <div className="ps-alert ps-alert-warn">
              ⚠ Please select or create an operating client company first on the Executive Dashboard before managing attendance!
            </div>
          </div>
        ) : employees.length === 0 ? (
          <div style={{padding:20}}>
            <div className="ps-alert ps-alert-info">
              ℹ No active employees found. Register employees under the Employee page first.
            </div>
          </div>
        ) : (
          <table className="ps-table">
            <thead>
              <tr>
                <th style={{width:100}}>Emp Code</th>
                <th>Employee Name</th>
                <th style={{width:70,textAlign:'right'}}>{attSetup['WORKING_DAYS'] || 'Work Days'}</th>
                <th style={{width:90,textAlign:'right'}}>{attSetup['PAID_DAYS'] || 'Present'}</th>
                <th style={{width:90,textAlign:'right'}}>{attSetup['EARNED_LEAVE'] || 'Paid Leave'}</th>
                <th style={{width:80,textAlign:'right'}}>{attSetup['LOP'] || 'LOP'}</th>
                <th style={{width:90,textAlign:'right'}}>OT Hrs</th>
                <th style={{width:200}}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                const empId = emp.emp_id || emp.employee_id;
                const data = attendanceMap[empId] || { present_days: workingDays, paid_leave_days: 0, ot_hours: 0, notes: '' };
                const lop = calculateLop(empId);
                const hasRowError = rowErrors[empId] && Object.keys(rowErrors[empId]).length > 0;

                return (
                  <tr key={empId} className={hasRowError ? 'att-row-error' : ''} style={{background: isLocked?'var(--bg-surface-2)':''}}>
                    <td style={{fontFamily:'JetBrains Mono',fontSize:11}}>{emp.emp_code}</td>
                    <td style={{fontWeight:500}}>{emp.first_name} {emp.last_name}</td>
                    <td className="num">
                      <span className="att-wd-badge">{workingDays}</span>
                    </td>
                    <td>
                      <input 
                        type="number" 
                        min="0" 
                        max={workingDays} 
                        step="0.5" 
                        value={data.present_days} 
                        onChange={e => handleValueChange(empId, 'present_days', e.target.value)} 
                        disabled={isLocked}
                        className={`att-input ${rowErrors[empId]?.present ? 'att-input-error' : ''}`}
                      />
                      {rowErrors[empId]?.present && (
                        <span className="att-err-tip">{rowErrors[empId].present}</span>
                      )}
                    </td>
                    <td>
                      <input 
                        type="number" 
                        min="0" 
                        max={workingDays} 
                        step="0.5" 
                        value={data.paid_leave_days} 
                        onChange={e => handleValueChange(empId, 'paid_leave_days', e.target.value)} 
                        disabled={isLocked}
                        className={`att-input ${rowErrors[empId]?.paidLeave ? 'att-input-error' : ''}`}
                      />
                      {rowErrors[empId]?.paidLeave && (
                        <span className="att-err-tip">{rowErrors[empId].paidLeave}</span>
                      )}
                    </td>
                    <td className="num">
                      <span className={`att-lop-cell ${lop > 0 ? 'att-lop-neg' : ''}`}>{lop}</span>
                    </td>
                    <td>
                      <input 
                        type="number" 
                        min="0" 
                        step="1" 
                        value={data.ot_hours} 
                        onChange={e => handleValueChange(empId, 'ot_hours', e.target.value)} 
                        disabled={isLocked || emp.is_ot_applicable !== 1}
                        style={{
                          height:22,fontSize:11,padding:'1px 4px',border:'1px solid var(--border-strong)',borderRadius:3,fontFamily:'JetBrains Mono',textAlign:'right',
                          background: emp.is_ot_applicable === 1 ? 'var(--bg-surface)' : 'var(--bg-surface-2)',
                          cursor: emp.is_ot_applicable === 1 ? 'text' : 'not-allowed'
                        }}
                      />
                    </td>
                    <td>
                      <input 
                        type="text" 
                        value={data.notes || ''} 
                        onChange={e => {
                          if (isLocked) return;
                          const notes = e.target.value;
                          setAttendanceMap(prev => ({
                            ...prev,
                            [empId]: { ...prev[empId], notes }
                          }));
                        }}
                        placeholder="e.g. sick leave..."
                        disabled={isLocked}
                        style={{height:22,fontSize:11,padding:'1px 4px',border:'1px solid var(--border-strong)',borderRadius:3,width:'100%'}}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
