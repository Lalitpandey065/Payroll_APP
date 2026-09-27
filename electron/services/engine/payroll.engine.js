const { round2 } = require('../../db/database');
const { calculateEarnings } = require('./earnings.calculator');
const { calculatePF } = require('./pf.calculator');
const { calculateESI } = require('./esi.calculator');
const { calculatePT } = require('./pt.calculator');
const { calculateTDS } = require('./tds.calculator');

/**
 * Derive the Indian Financial Year string (e.g. "2025-26") from a payroll month/year.
 * Indian FY runs April–March.
 * @param {number} month 1-12
 * @param {number} year  full year e.g. 2026
 * @returns {string}
 */
function getFinancialYear(month, year) {
  if (month >= 4) {
    const nextYearShort = (year + 1).toString().substring(2);
    return `${year}-${nextYearShort}`;
  } else {
    const prevYear = year - 1;
    const currYearShort = year.toString().substring(2);
    return `${prevYear}-${currYearShort}`;
  }
}

const CompanyRepository = require('../../db/repositories/company.repo');
const EmployeeRepository = require('../../db/repositories/employee.repo');
const SalaryRepository = require('../../db/repositories/salary.repo');
const AttendanceRepository = require('../../db/repositories/attendance.repo');
const PayrollRepository = require('../../db/repositories/payroll.repo');
const StatutoryRepository = require('../../db/repositories/statutory.repo');
const { setupRepo } = require('../../db/repositories/setup.repo');

const companyRepo = new CompanyRepository();
const employeeRepo = new EmployeeRepository();
const salaryRepo = new SalaryRepository();
const attendanceRepo = new AttendanceRepository();
const payrollRepo = new PayrollRepository();
const statutoryRepo = new StatutoryRepository();

/**
 * Execute payroll calculations for all active employees of a company-month.
 * 
 * @param {string} companyId 
 * @param {number} month 
 * @param {number} year 
 * @param {string} operatorName 
 * @returns {object} Payroll run package summary and details
 */
function processPayroll(companyId, month, year, operatorName) {
  const startTime = Date.now();
  console.log(`[PayrollEngine] Starting payroll execution for company ${companyId} for ${month}/${year}`);

  // 1. Load Company & Statutory Rules
  const company = companyRepo.findById(companyId);
  if (!company) throw new Error(`Company with ID ${companyId} not found.`);

  // Derive the active Indian Financial Year from the payroll period
  const finYear = getFinancialYear(month, year);

  // Load company setup
  const companySetup = setupRepo.getAllSetup(companyId);
  const companyAllowances = setupRepo.getAllowances(companyId);

  // Map setup_epf → pfConfig shape engine expects
  const pfConfig = {
    emp_contribution_pct:  companySetup.epf?.epf_ac01_pct ?? 12,
    er_contribution_pct:   12, // Employer matches employee A/C 01 rate (typically 12%)
    eps_pct:               companySetup.epf?.fps_ac10_pct ?? 8.33,
    eps_ceiling:           companySetup.epf?.fps_amount ?? 1250,
    edli_pct:              companySetup.epf?.edli_ac21_pct ?? 0.50,
    admin_charges_pct:     companySetup.epf?.admin_ac02_pct ?? 0.50,
    wage_ceiling:          companySetup.epf?.fps_wage ?? 15000,
    is_ceiling_applicable: companySetup.epf?.epf_calc_on_full ? 0 : 1,
  };

  // Map setup_esi → esiConfig shape
  const esiConfig = {
    emp_contribution_pct: companySetup.esi?.employee_pct ?? 0.75,
    er_contribution_pct:  companySetup.esi?.employer_pct ?? 3.25,
    gross_ceiling:        companySetup.esi?.esic_wage_ceiling ?? 21000,
  };

  const tdsConfig = statutoryRepo.getTDSConfig(finYear, 'new');
  const tdsConfigOld = statutoryRepo.getTDSConfig(finYear, 'old');

  // Load active employees
  const employees = employeeRepo.findAll({ company_id: companyId, status: 'active' });
  console.log(`[PayrollEngine] Found ${employees.length} active employees.`);

  const detailsArray = [];
  const overridesArray = [];

  let totalGross = 0;
  let totalLopDeduction = 0;
  let totalNet = 0;
  let totalPfEmployee = 0;
  let totalPfEmployer = 0;
  let totalEps = 0;
  let totalEdli = 0;
  let totalEsiEmployee = 0;
  let totalEsiEmployer = 0;
  let totalTds = 0;
  let totalPt = 0;
  let totalAdvanceRecovery = 0;
  let totalOtherDeductions = 0;
  
  let pfEligibleCount = 0;
  let esiEligibleCount = 0;

  for (const emp of employees) {
    const empId = emp.id;
    const empCode = emp.emp_code;
    const empName = `${emp.first_name} ${emp.last_name}`;

    console.log(`[PayrollEngine] Computing salary for employee [${empCode}] ${empName}`);

    // Load full employee package (Identity, Statutory layers)
    const empPackage = employeeRepo.getEmployeePackage(empId);
    const empStatutory = empPackage.statutory;
    const empIdentity = empPackage.identity;

    // Load active salary structure
    const empSalary = salaryRepo.getEmployeeSalary(empId);
    if (!empSalary) {
      console.warn(`[PayrollEngine] Employee ${empCode} has no assigned salary structure. Skipping.`);
      continue;
    }

    const structureWithComponents = salaryRepo.getStructureWithComponents(empSalary.structure_id);
    if (!structureWithComponents) {
      console.warn(`[PayrollEngine] Salary Structure ${empSalary.structure_id} is missing. Skipping.`);
      continue;
    }

    // Merge setup_allowance flags into structure components
    if (structureWithComponents && structureWithComponents.components) {
      for (const comp of structureWithComponents.components) {
        const compCode = (comp.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const compName = (comp.name || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        const match = companyAllowances.find(allow => {
          const allowCode = (allow.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          const allowHeading = (allow.heading || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          return (
            (allowCode && allowCode === compCode) ||
            (allowHeading && allowHeading === compCode) ||
            (allowHeading && allowHeading === compName)
          );
        });

        if (match) {
          comp.is_pf_wage = match.epf_status === 1 ? 1 : 0;
          comp.is_esi_wage = match.esi_status === 1 ? 1 : 0;
          comp.is_bonus_applicable = match.bonus_status === 1 ? 1 : 0;
          comp.is_gratuity_applicable = match.gratuity_status === 1 ? 1 : 0;
          comp.is_ot_applicable = match.overtime_status === 1 ? 1 : 0;
          comp.is_included_in_gross = match.is_gross_salary === 1 ? 1 : 0;
          comp.is_shown_on_payslip = match.shown_in_print === 1 ? 1 : 0;
          comp.is_taxable = match.is_taxable === 1 ? 1 : 0;
          comp.percentage = match.percentage;
          comp.pct_bases = match.pct_bases;
        }
      }
    }

    // Load Attendance, or default to full working month
    let attendance = attendanceRepo.getAttendanceLog(empId, month, year);
    let isAttendanceDefaulted = false;

    if (!attendance) {
      isAttendanceDefaulted = true;
      const weeklyOffDays = company.working_days_per_week === 5 ? 2 : 1;
      
      // Calculate days in month
      const daysInMonth = new Date(year, month, 0).getDate();
      // Estimate working days excluding Sundays
      let workingDays = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const dayOfWeek = new Date(year, month - 1, d).getDay();
        if (dayOfWeek !== 0) { // Exclude Sundays
          if (weeklyOffDays === 2 && dayOfWeek === 6) continue; // Exclude Saturdays too
          workingDays++;
        }
      }

      attendance = {
        total_calendar_days: daysInMonth,
        total_working_days: workingDays,
        present_days: workingDays,
        paid_leave_days: 0,
        unpaid_leave_days: 0,
        lop_days: 0,
        ot_hours: 0
      };
    }

    const employeeCompLog = [];
    if (isAttendanceDefaulted) {
      employeeCompLog.push("WARNING: Attendance log missing! Assuming full working month (auto-generated).");
    }

    // 2. Compute Earnings & Adjust LOPs
    const earningsResults = calculateEarnings(
      empPackage,
      structureWithComponents.components,
      empSalary,
      attendance
    );
    employeeCompLog.push(...earningsResults.computationLog);

    const { earnings, pfWageBase, esiWageBase, taxableBase } = earningsResults;

    // 2a. Calculate Overtime (OT) Earning
    let otAmount = 0;
    const otSetup = companySetup.overtime;
    if (otSetup && attendance.ot_hours > 0) {
      let otWageBase = 0;
      const wagesCalc = otSetup.wages_calculation || 'Gross';
      if (wagesCalc === 'Gross') {
        otWageBase = earningsResults.totalGross;
      } else if (wagesCalc === 'Basic+DA') {
        otWageBase = (earnings.BASIC || 0) + (earnings.DA || 0);
      } else {
        otWageBase = earnings.BASIC || 0;
      }

      // Add allowances included in OT wage base
      try {
        const otAllowances = JSON.parse(otSetup.ot_allowances_json || '[]');
        for (const code of otAllowances) {
          if (code !== 'BASIC' && code !== 'DA') {
            otWageBase += (earnings[code] || 0);
          }
        }
      } catch (e) {
        console.error('[PayrollEngine] Error parsing ot_allowances_json:', e);
      }

      const calcType = otSetup.calculation_type || 'Salary';
      const hoursPerDay = otSetup.hours_per_day || 8;
      const workingDays = attendance.total_working_days || 26;

      let hourlyRate = 0;
      if (calcType === 'Hourly') {
        hourlyRate = otWageBase;
      } else if (calcType === 'Daily') {
        hourlyRate = otWageBase / hoursPerDay;
      } else {
        // Salary
        hourlyRate = (otWageBase / (workingDays || 26)) / hoursPerDay;
      }

      const otMultiplier = otSetup.overtime_paid_pct ?? 2.00;
      otAmount = round2(hourlyRate * otMultiplier * attendance.ot_hours);
      
      // Inject to earnings so it prints/breaks down
      earnings.OT = otAmount;
      // Adjust gross salary since OT is an earning
      earningsResults.totalGross = round2(earningsResults.totalGross + otAmount);
      
      employeeCompLog.push(`Overtime: Calculated ${attendance.ot_hours} hrs @ ${otMultiplier}x multiplier. Hourly rate: ${round2(hourlyRate)}, OT Amount: ${otAmount}`);
    }

    // 2b. Adjust PF and ESI wage bases for OT if applicable
    let finalPfWageBase = pfWageBase;
    let finalEsiWageBase = esiWageBase;
    let esiConfigForEmp = { ...esiConfig };

    if (otAmount > 0) {
      if (otSetup?.epf_on_ot === 1) {
        finalPfWageBase = round2(finalPfWageBase + otAmount);
        employeeCompLog.push(`OT included in PF wage base: +${otAmount} (PF Wage: ${finalPfWageBase})`);
      }
      if (otSetup?.esi_on_ot === 1) {
        if (otSetup?.esi_limit_on_ot === 1) {
          // Standard ESIC rule: exclude OT from coverage ceiling check.
          // If normal ESI wage is within ceiling, ESI is paid on total (normal + OT).
          if (esiWageBase <= esiConfig.gross_ceiling) {
            finalEsiWageBase = round2(esiWageBase + otAmount);
            // Set gross_ceiling to Infinity so ESI calculator doesn't block on total
            esiConfigForEmp.gross_ceiling = Infinity;
            employeeCompLog.push(`OT included in ESI wage base: +${otAmount} (Excluding OT from ceiling check, ESI covered)`);
          } else {
            employeeCompLog.push(`OT excluded from ESI because normal gross exceeds ESI ceiling.`);
          }
        } else {
          // Apply ceiling check on the total gross including OT
          finalEsiWageBase = round2(esiWageBase + otAmount);
          employeeCompLog.push(`OT included in ESI wage base: +${otAmount} (Ceiling checked including OT)`);
        }
      }
    }

    // 3. Compute PF
    const pfResults = calculatePF(company, empStatutory, finalPfWageBase, pfConfig);
    employeeCompLog.push(...pfResults.log);
    if (pfResults.pf_employee > 0) pfEligibleCount++;

    // 4. Compute ESI
    const esiResults = calculateESI(company, empStatutory, finalEsiWageBase, esiConfigForEmp);
    employeeCompLog.push(...esiResults.log);
    if (esiResults.esi_employee > 0) esiEligibleCount++;

    // 5. Compute Professional Tax
    const stateCode = empStatutory.pt_state_override || company.state_code;
    const ptConfig = statutoryRepo.getPTConfig(stateCode);
    const ptResults = calculatePT(company, empStatutory, earningsResults.totalGross, month, ptConfig);
    employeeCompLog.push(...ptResults.log);

    // 6. Compute TDS
    // Bug fix: use employeeRepo (not statutoryRepo) which owns getInvestmentDeclaration
    const declaration = employeeRepo.getInvestmentDeclaration(empId, finYear);
    const activeTdsConfig = empStatutory.tds_regime === 'old' ? tdsConfigOld : tdsConfig;

    // Accumulate YTD metrics for the current financial year
    const ytdMetrics = statutoryRepo.getYTDMetrics(empId, finYear);

    // Supplement YTD basic and HRA for old-regime HRA exemption calculation.
    // Filter by current financial year months so prior-year data is excluded.
    const [fyStartYear] = finYear.split('-').map(Number);
    const fyFullStartYear = fyStartYear; // e.g. 2025
    const fyFullEndYear = fyStartYear + 1; // e.g. 2026
    const prevDetails = statutoryRepo.db.prepare(`
      SELECT SUM(pd.basic) as prev_basic, SUM(pd.hra) as prev_hra
      FROM payroll_details pd
      JOIN payroll_runs pr ON pd.run_id = pr.id
      WHERE pd.emp_id = ?
        AND pr.status IN ('approved', 'locked')
        AND (
          (pr.year = ? AND pr.month >= 4)
          OR
          (pr.year = ? AND pr.month <= 3)
        )
    `).get(empId, fyFullStartYear, fyFullEndYear);

    ytdMetrics.ytd_basic = prevDetails ? (prevDetails.prev_basic || 0) : 0;
    ytdMetrics.ytd_hra = prevDetails ? (prevDetails.prev_hra || 0) : 0;

    const tdsResults = calculateTDS(
      company,
      empStatutory,
      empPackage,
      taxableBase,
      ytdMetrics,
      month,
      activeTdsConfig,
      declaration,
      earnings
    );
    employeeCompLog.push(...tdsResults.log);

    // 7. Load and Process Manual Pre-Run Overrides
    const prevRun = payrollRepo.getPayrollRun(companyId, month, year, 'regular');
    let employeeOverrides = [];
    if (prevRun) {
      employeeOverrides = payrollRepo.getEmployeeOverrides(prevRun.id, empId);
    }

    let overrideEarnings = 0;
    let overrideDeductions = 0;
    const otherEarningsMap = {};
    const otherDeductionsMap = {};

    for (const ov of employeeOverrides) {
      const amt = parseFloat(ov.amount);
      if (amt > 0) {
        overrideEarnings += amt;
        otherEarningsMap[ov.label] = amt;
        employeeCompLog.push(`Override Applied (Earning): ${ov.label} = +${amt}`);
      } else if (amt < 0) {
        overrideDeductions += Math.abs(amt);
        otherDeductionsMap[ov.label] = Math.abs(amt);
        employeeCompLog.push(`Override Applied (Deduction): ${ov.label} = -${Math.abs(amt)}`);
      }
      overridesArray.push({
        emp_id: empId,
        override_type: ov.override_type,
        label: ov.label,
        amount: amt,
        is_taxable: ov.is_taxable,
        is_pf_wage: ov.is_pf_wage,
        is_esi_wage: ov.is_esi_wage,
        remarks: ov.remarks,
        added_by: ov.added_by
      });
    }

    // Advance recovery installment deduction auto-triggers if ON
    let advanceDeduction = 0;
    if (empStatutory.is_advance_recovery_active === 1 && empStatutory.advance_outstanding > 0) {
      advanceDeduction = Math.min(empStatutory.advance_outstanding, empStatutory.advance_monthly_deduction);
      advanceDeduction = round2(advanceDeduction);
      employeeCompLog.push(`Advance Recovery: Deducting monthly installment of ${advanceDeduction} (Outstanding: ${empStatutory.advance_outstanding})`);
    }

    // 8. Compile Net Salary Payout
    const finalGross = round2(earningsResults.totalGross + overrideEarnings);
    
    // Deductions pool
    const ptDeduction = ptResults.pt;
    const tdsDeduction = tdsResults.tds;
    const pfDeduction = pfResults.pf_employee;
    const esiDeduction = esiResults.esi_employee;
    const lopDeduction = earningsResults.totalLopDeduction;

    const totalDeductions = round2(
      pfDeduction +
      esiDeduction +
      tdsDeduction +
      ptDeduction +
      advanceDeduction +
      overrideDeductions
    );

    const netSalary = round2(Math.max(0, finalGross - totalDeductions));
    employeeCompLog.push(`Salary Totals: Final Gross: ${finalGross}, Total Deductions: ${totalDeductions}, Net Payout: ${netSalary}`);

    // Create Components JSON breakdown
    const fullComponentsBreakdown = {
      earnings,
      deductions: {
        PF_EMP: pfDeduction,
        ESI_EMP: esiDeduction,
        TDS: tdsDeduction,
        PT: ptDeduction,
        LOP: lopDeduction,
        ADVANCE: advanceDeduction,
        ...otherDeductionsMap
      },
      employer_contributions: {
        PF_ER: pfResults.pf_employer,
        EPS_ER: pfResults.eps_contribution,
        EDLI_ER: pfResults.edli_contribution,
        ESI_ER: esiResults.esi_employer
      },
      overrides: otherEarningsMap
    };

    // Form employee detail snapshot
    const employeeDetails = {
      emp_id: empId,
      emp_code: empCode,
      emp_name: empName,
      department: emp.department,
      designation: emp.designation,
      structure_id: empSalary.structure_id,
      ctc: empSalary.ctc,
      pan: empIdentity ? empIdentity.pan : null,
      uan: empIdentity ? empIdentity.uan : null,
      bank_account: empIdentity ? empIdentity.bank_account_number : null,
      bank_ifsc: empIdentity ? empIdentity.bank_ifsc : null,
      tds_regime: empStatutory.tds_regime,
      
      working_days: attendance.total_working_days,
      present_days: attendance.present_days,
      paid_leave_days: attendance.paid_leave_days,
      lop_days: attendance.lop_days,
      ot_hours: attendance.ot_hours,
      
      basic: earnings.BASIC || 0,
      hra: earnings.HRA || 0,
      da: earnings.DA || 0,
      conveyance: earnings.CONV || 0,
      medical_allowance: earnings.MED || 0,
      special_allowance: earnings.SA || 0,
      lta: earnings.LTA || 0,
      ot_amount: earnings.OT || 0,
      other_earnings_json: JSON.stringify(otherEarningsMap),
      gross_salary: finalGross,
      
      lop_deduction: lopDeduction,
      pf_employee: pfDeduction,
      pf_employer: pfResults.pf_employer,
      eps_contribution: pfResults.eps_contribution,
      edli_contribution: pfResults.edli_contribution,
      esi_employee: esiDeduction,
      esi_employer: esiResults.esi_employer,
      tds: tdsDeduction,
      pt: ptDeduction,
      lwf_employee: 0,
      lwf_employer: 0,
      advance_recovery: advanceDeduction,
      other_deductions_json: JSON.stringify(otherDeductionsMap),
      total_deductions: totalDeductions,
      net_salary: netSalary,

      // YTD snapshot for Payslip
      ytd_gross: round2(ytdMetrics.ytd_gross + finalGross),
      ytd_pf_employee: round2(ytdMetrics.ytd_pf_employee + pfDeduction),
      ytd_esi_employee: round2(ytdMetrics.ytd_esi_employee + esiDeduction),
      ytd_tds: round2(ytdMetrics.ytd_tds + tdsDeduction),
      ytd_pt: round2(ytdMetrics.ytd_pt + ptDeduction),
      ytd_net: round2(ytdMetrics.ytd_net + netSalary),

      is_pf_deducted: pfDeduction > 0 ? 1 : 0,
      is_esi_deducted: esiDeduction > 0 ? 1 : 0,
      is_tds_deducted: tdsDeduction > 0 ? 1 : 0,
      is_pt_deducted: ptDeduction > 0 ? 1 : 0,
      esi_ceiling_crossed: esiResults.esi_ceiling_crossed,
      
      components_json: JSON.stringify(fullComponentsBreakdown),
      computation_log: employeeCompLog.join('\n')
    };

    detailsArray.push(employeeDetails);

    // Sum overall payroll totals
    totalGross += finalGross;
    totalLopDeduction += lopDeduction;
    totalNet += netSalary;
    totalPfEmployee += pfDeduction;
    totalPfEmployer += pfResults.pf_employer;
    totalEps += pfResults.eps_contribution;
    totalEdli += pfResults.edli_contribution;
    totalEsiEmployee += esiDeduction;
    totalEsiEmployer += esiResults.esi_employer;
    totalTds += tdsDeduction;
    totalPt += ptDeduction;
    totalAdvanceRecovery += advanceDeduction;
    totalOtherDeductions += overrideDeductions;
  }

  // 9. Build overall Payroll Run summary Data
  const runDurationMs = Date.now() - startTime;
  
  const payrollRun = {
    company_id: companyId,
    month,
    year,
    run_type: 'regular',
    status: 'draft',
    total_employees: detailsArray.length,
    pf_eligible_count: pfEligibleCount,
    esi_eligible_count: esiEligibleCount,
    total_gross: round2(totalGross),
    total_lop_deduction: round2(totalLopDeduction),
    total_net: round2(totalNet),
    total_pf_employee: round2(totalPfEmployee),
    total_pf_employer: round2(totalPfEmployer),
    total_eps: round2(totalEps),
    total_edli: round2(totalEdli),
    total_esi_employee: round2(totalEsiEmployee),
    total_esi_employer: round2(totalEsiEmployer),
    total_tds: round2(totalTds),
    total_pt: round2(totalPt),
    total_lwf_employee: 0,
    total_advance_recovery: round2(totalAdvanceRecovery),
    total_other_deductions: round2(totalOtherDeductions),
    run_by: operatorName,
    run_duration_ms: runDurationMs
  };

  return {
    runData: payrollRun,
    detailsArray,
    overridesArray
  };
}

module.exports = {
  processPayroll
};
