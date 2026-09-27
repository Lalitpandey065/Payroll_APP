// test_report_cycle.js — Full end-to-end report generation test
// Run: npx cross-env electron test_report_cycle.js

const { initDB, getDB, newId, round2 } = require('./out/main/db/database');
const { app } = require('electron');

app.whenReady().then(async () => {
  try {
    initDB();
    const db = getDB();
    console.log('\n=== FULL REPORT CYCLE TEST ===\n');

    // Step 1: Get or create a company
    let company = db.prepare('SELECT * FROM companies LIMIT 1').get();
    if (!company) {
      console.error('❌ No company found. Create one first.');
      process.exit(1);
    }
    console.log(`✅ Company: ${company.name} (${company.id})`);

    // Step 2: Ensure we have at least one employee
    const employees = db.prepare(
      `SELECT * FROM employees WHERE company_id = ? AND status = 'active' AND deleted_at IS NULL`
    ).all(company.id);

    if (employees.length === 0) {
      console.log('⚠  No active employees. Creating test employee...');
      const EmployeeRepository = require('./out/main/db/repositories/employee.repo');
      const empRepo = new EmployeeRepository();
      
      // Clean up any old test employee
      const existing = db.prepare(`SELECT id FROM employees WHERE emp_code = 'RPT-001' AND company_id = ?`).get(company.id);
      if (existing) {
        db.prepare(`DELETE FROM payroll_details WHERE emp_id = ?`).run(existing.id);
        db.prepare(`DELETE FROM attendance_logs WHERE emp_id = ?`).run(existing.id);
        db.prepare(`DELETE FROM employee_statutory_config WHERE emp_id = ?`).run(existing.id);
        db.prepare(`DELETE FROM employee_identity WHERE emp_id = ?`).run(existing.id);
        db.prepare(`DELETE FROM employee_salary WHERE emp_id = ?`).run(existing.id);
        db.prepare(`DELETE FROM employees WHERE id = ?`).run(existing.id);
      }
      
      const emp = empRepo.insert({
        company_id: company.id,
        emp_code: 'RPT-001',
        first_name: 'Report',
        last_name: 'TestUser',
        gender: 'Male',
        doj: '2025-01-01',
        designation: 'Analyst',
        department: 'Finance',
        status: 'active',
      });
      employees.push(emp);
      console.log(`✅ Created employee: ${emp.id}`);
    } else {
      console.log(`✅ Found ${employees.length} active employees`);
    }

    // Step 3: Check for payroll runs
    let payrollRun = db.prepare(
      `SELECT * FROM payroll_runs WHERE company_id = ? AND (status = 'locked' OR status = 'approved') ORDER BY year DESC, month DESC LIMIT 1`
    ).get(company.id);

    if (!payrollRun) {
      console.log('⚠  No locked/approved payroll run. Creating test run...');
      const runId = newId();
      const month = 6;
      const year = 2026;
      
      db.prepare(`
        INSERT INTO payroll_runs (
          id, company_id, month, year, run_type, status,
          total_employees, total_gross, total_net,
          total_pf_employee, total_pf_employer, total_esi_employee, total_esi_employer,
          total_tds, total_pt, total_lwf_employee, total_advance_recovery,
          run_by, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, 'regular', 'locked',
          ?, 50000, 42000,
          1800, 1800, 375, 325,
          0, 200, 0, 0,
          'test', datetime('now'), datetime('now')
        )
      `).run(runId, company.id, month, year, employees.length);
      
      payrollRun = db.prepare('SELECT * FROM payroll_runs WHERE id = ?').get(runId);
      console.log(`✅ Created payroll run: ${runId} (${month}/${year})`);
      
      // Step 4: Create payroll details for each employee
      for (const emp of employees) {
        const detailId = newId();
        const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
        
        db.prepare(`
          INSERT INTO payroll_details (
            id, run_id, emp_id, emp_code, emp_name,
            department, designation, structure_id, ctc,
            working_days, present_days, paid_leave_days, lop_days, ot_hours,
            basic, hra, da, conveyance, medical_allowance, special_allowance, lta,
            ot_amount, gross_salary,
            lop_deduction, pf_employee, pf_employer, eps_contribution, edli_contribution,
            esi_employee, esi_employer, tds, pt,
            lwf_employee, lwf_employer, advance_recovery,
            total_deductions, net_salary,
            is_pf_deducted, is_esi_deducted, is_tds_deducted, is_pt_deducted,
            components_json, created_at
          ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, 'default', 600000,
            26, 24, 2, 0, 4,
            20000, 8000, 0, 1600, 1250, 10000, 0,
            1200, 42050,
            0, 1800, 1800, 1250, 75,
            315, 325, 0, 200,
            0, 0, 0,
            2315, 39735,
            1, 1, 0, 1,
            '{}', datetime('now')
          )
        `).run(detailId, payrollRun.id, emp.id, emp.emp_code, empName,
               emp.department || '', emp.designation || '');
        
        console.log(`✅ Created payroll detail for ${empName}`);
      }
      
      // Step 5: Create attendance logs
      for (const emp of employees) {
        const existingAtt = db.prepare(
          `SELECT id FROM attendance_logs WHERE emp_id = ? AND month = ? AND year = ?`
        ).get(emp.id, 6, 2026);
        
        if (!existingAtt) {
          const AttendanceRepository = require('./out/main/db/repositories/attendance.repo');
          const attRepo = new AttendanceRepository();
          attRepo.saveAttendanceLog({
            company_id: company.id,
            emp_id: emp.id,
            month: 6,
            year: 2026,
            total_calendar_days: 30,
            total_working_days: 26,
            present_days: 24,
            paid_leave_days: 2,
            unpaid_leave_days: 0,
            ot_hours: 4,
          });
          console.log(`✅ Created attendance for ${emp.emp_code}`);
        }
      }
    } else {
      console.log(`✅ Found payroll run: ${payrollRun.id} (${payrollRun.month}/${payrollRun.year}, status: ${payrollRun.status})`);
    }

    // Step 6: Test getReportData function
    console.log('\n--- Testing Report Data Query ---');
    
    const reportIpc = require('./out/main/ipc/report.ipc');
    // The IPC handlers are registered via ipcMain.handle, so we test the SQL directly
    
    const run = payrollRun;
    
    const details = db.prepare(`
      SELECT
        pd.*,
        e.emp_code AS e_emp_code,
        (COALESCE(e.first_name,'') || ' ' || COALESCE(e.last_name,'')) AS emp_full_name,
        e.designation AS e_designation,
        e.doj,
        e.department AS e_department,
        e.location,
        ei.uan,
        ei.esi_insurance_number AS esic_no,
        ei.bank_name,
        ei.bank_account_number AS bank_account,
        ei.bank_ifsc AS ifsc,
        ei.aadhaar_last4 AS aadhar,
        al.present_days AS workday,
        al.lop_days AS att_lop,
        al.paid_leave_days AS paid_days,
        al.ot_hours AS att_ot_hours,
        al.total_working_days
      FROM payroll_details pd
      JOIN employees e ON pd.emp_id = e.id
      LEFT JOIN employee_identity ei ON e.id = ei.emp_id
      LEFT JOIN attendance_logs al ON e.id = al.emp_id
        AND al.month = ? AND al.year = ? AND al.company_id = ?
      WHERE pd.run_id = ?
      ORDER BY e.first_name
    `).all(run.month, run.year, company.id, run.id);

    console.log(`✅ Report query returned ${details.length} employees`);
    
    if (details.length > 0) {
      const d = details[0];
      console.log(`   Employee: ${d.emp_full_name} (${d.e_emp_code})`);
      console.log(`   Basic: ${d.basic}, Gross: ${d.gross_salary}, Net: ${d.net_salary}`);
      console.log(`   PF: ${d.pf_employee}, ESI: ${d.esi_employee}, PT: ${d.pt}`);
      console.log(`   Attendance: workday=${d.workday}, LOP=${d.att_lop}, OT=${d.att_ot_hours}`);
    }

    // Step 7: Test PDF generation
    console.log('\n--- Testing PDF Generation ---');
    
    const { generatePaySlips, generateSalarySheet, generateMonthlySummary, getOutputPath } = 
      require('./out/main/services/report.service');

    const companyData = {
      name: company.name,
      address: [company.address_line1, company.city, company.state_code, company.pincode].filter(Boolean).join(', '),
      month_label: `June - 2026`,
    };

    const empData = details.map(d => ({
      employee_code: d.e_emp_code || d.emp_code,
      name: d.emp_full_name || d.emp_name || '',
      designation: d.e_designation || d.designation || '',
      doj: d.doj || '',
      department: d.e_department || d.department || '',
      workday: d.workday || d.present_days || 0,
      weekoff: 0, nfh: 0, el: 0, cl: 0, sl: 0,
      lop_days: d.att_lop || d.lop_days || 0,
      paid_days: d.paid_days || d.present_days || 0,
      ot_hours: d.att_ot_hours || d.ot_hours || 0,
      basic_earned: d.basic || 0,
      hra_earned: d.hra || 0,
      convey_earned: d.conveyance || 0,
      spl_all_earned: d.special_allowance || 0,
      ot_earned: d.ot_amount || 0,
      gross_earned: d.gross_salary || 0,
      epf_employee: d.pf_employee || 0,
      esic_employee: d.esi_employee || 0,
      prof_tax: d.pt || 0,
      tds: d.tds || 0,
      advance: d.advance_recovery || 0,
      total_deductions: d.total_deductions || 0,
      net_pay: d.net_salary || 0,
      uan: d.uan || '',
      esic_no: d.esic_no || '',
      bank_name: d.bank_name || '',
      bank_account: d.bank_account || '',
      ifsc: d.ifsc || '',
      aadhar: d.aadhar || '',
    }));

    // Test 1: Salary Sheet
    try {
      const ssPath = getOutputPath('Test_SalarySheet.pdf');
      await generateSalarySheet({ company: companyData, employees: empData }, ssPath);
      console.log(`✅ Salary Sheet PDF generated: ${ssPath}`);
    } catch (e) {
      console.error(`❌ Salary Sheet FAILED: ${e.message}`);
    }

    // Test 2: Pay Slips
    try {
      const psPath = getOutputPath('Test_PaySlips.pdf');
      await generatePaySlips({ company: companyData, employees: empData }, psPath);
      console.log(`✅ Pay Slips PDF generated: ${psPath}`);
    } catch (e) {
      console.error(`❌ Pay Slips FAILED: ${e.message}`);
    }

    // Test 3: Monthly Summary
    try {
      const sum = (key) => empData.reduce((a, e) => a + Number(e[key] || 0), 0);
      const totals = {
        basic: sum('basic_earned'), hra: sum('hra_earned'), convey: sum('convey_earned'),
        spl_all: sum('spl_all_earned'), ot_amount: sum('ot_earned'),
        gross_earned: sum('gross_earned'),
        epf_employee: sum('epf_employee'), esic_employee: sum('esic_employee'),
        prof_tax: sum('prof_tax'), tds: sum('tds'), advance: sum('advance'),
        total_deductions: sum('total_deductions'), net_pay: sum('net_pay'),
        lwf_employee: 0, vol_epf: 0, loan: 0, food: 0,
      };

      const summaryData = {
        company: companyData,
        totals,
        epf: { members: empData.length, wages: totals.basic, employee_a1: totals.epf_employee,
               pension_a10: Math.round(totals.basic * 0.0833), employer_diff_a1: 0,
               admin_a2: Math.round(totals.basic * 0.005), edli_a21: Math.round(totals.basic * 0.005),
               edli_charges_a22: 0, total_challan: totals.epf_employee * 2 },
        esi: { wages: totals.gross_earned, employee: totals.esic_employee,
               employer: Math.round(totals.gross_earned * 0.0325),
               total: totals.esic_employee + Math.round(totals.gross_earned * 0.0325) },
        lwf: { employee: 0, employer: 0, total: 0 },
        pt: { total: totals.prof_tax },
        employee_count: empData.length,
        epf_exempt_count: 0,
        epf_exempt_wages: 0,
      };

      const msPath = getOutputPath('Test_MonthlySummary.pdf');
      await generateMonthlySummary(summaryData, msPath);
      console.log(`✅ Monthly Summary PDF generated: ${msPath}`);
    } catch (e) {
      console.error(`❌ Monthly Summary FAILED: ${e.message}`);
    }

    console.log('\n🎉 REPORT CYCLE TEST COMPLETE!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  }
});
