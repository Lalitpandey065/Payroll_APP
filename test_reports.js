const fs = require('fs');
const path = require('path');
const { initDB, getDB } = require('./out/main/db/database');
const { generatePaySlips, generateSalarySheet, generateMonthlySummary } = require('./out/main/services/report.service');

// Mock electron app for the service
require.cache[require.resolve('electron')] = {
  exports: {
    app: {
      getPath: () => path.join(__dirname, 'out'),
      isPackaged: false
    },
    shell: {
      openPath: () => Promise.resolve()
    }
  }
};

async function runTest() {
  console.log('Initializing DB...');
  initDB();
  const db = getDB();

  console.log('Fetching test company and run...');
  const company = db.prepare('SELECT * FROM companies LIMIT 1').get();
  if (!company) throw new Error('No company found in DB');

  const run = db.prepare('SELECT * FROM payroll_runs WHERE company_id = ? AND status IN ("locked", "approved") LIMIT 1').get(company.id);
  if (!run) throw new Error('No locked/approved payroll run found for company');

  console.log(`Using Company: ${company.name}`);
  console.log(`Using Run: ${run.month}/${run.year}`);

  // We have to copy the logic of getReportData from report.ipc.js
  const monthLabel = (() => {
    const d = new Date(run.month + '-01'); // Need year too, but let's just do a simple string
    return `${run.month}/${run.year}`;
  })();

  const companyData = {
    name: company.name,
    address: [company.address_line1, company.city, company.pincode].filter(Boolean).join(', '),
    month_label: monthLabel,
  };

  const details = db.prepare(`
    SELECT
      pd.*,
      e.employee_code, e.name, e.designation, e.date_of_joining,
      e.father_name, e.category, e.state,
      ei.uan, ei.esi_insurance_number AS esic_no, ei.bank_name, ei.bank_account_number AS bank_account, ei.bank_ifsc AS ifsc, ei.aadhaar_last4 AS aadhar,
      al.present_days AS workday,
      0 AS weekoff,
      0 AS nfh,
      0 AS el,
      0 AS cl,
      0 AS sl,
      al.lop_days,
      al.paid_leave_days AS paid_days,
      al.ot_hours
    FROM payroll_details pd
    JOIN employees e ON pd.emp_id = e.id
    LEFT JOIN employee_identity ei ON e.id = ei.emp_id
    LEFT JOIN attendance_logs al ON e.id = al.emp_id
      AND al.month = ? AND al.year = ? AND al.company_id = ?
    WHERE pd.run_id = ?
    ORDER BY e.name
  `).all(run.month, run.year, company.id, run.id);

  console.log(`Found ${details.length} employees in this run.`);

  const outDir = path.join(__dirname, 'test_output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  const data = { company: companyData, run, employees: details };

  try {
    console.log('Generating Pay Slips...');
    await generatePaySlips(data, path.join(outDir, 'payslips_test.pdf'));
    console.log('✅ Pay Slips Success');

    console.log('Generating Salary Sheet...');
    await generateSalarySheet(data, path.join(outDir, 'salary_sheet_test.pdf'));
    console.log('✅ Salary Sheet Success');

    // Build totals for summary
    const sum = (key) => details.reduce((a, e) => a + Number(e[key] || 0), 0);
    const totals = {
      basic: sum('basic_earned'),
      hra: sum('hra_earned'),
      gross_earned: sum('gross_earned'),
      epf_employee: sum('epf_employee'),
      esic_employee: sum('esic_employee'),
      lwf_employee: sum('lwf_employee'),
      prof_tax: sum('prof_tax'),
      total_deductions: sum('total_deductions'),
      net_pay: sum('net_pay'),
    };

    const summaryData = {
      company: companyData,
      totals,
      epf: { members: 5, wages: 10000, total_challan: 2500 },
      esi: { employee: 100, employer: 400, total: 500 },
      lwf: { total: 100 },
      pt: { total: totals.prof_tax },
      employee_count: details.length,
      epf_exempt_count: 0,
      epf_exempt_wages: 0
    };

    console.log('Generating Monthly Summary...');
    await generateMonthlySummary(summaryData, path.join(outDir, 'monthly_summary_test.pdf'));
    console.log('✅ Monthly Summary Success');

  } catch (err) {
    console.error('❌ Error during PDF generation:', err);
    process.exit(1);
  }
  process.exit(0);
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
