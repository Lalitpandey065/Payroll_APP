const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

async function run() {
  console.log('[Seeder] Starting E2E Statutory Payroll Seeder...');
  
  // 1. Initialize database using production Electron context
  const { initDB, getDB } = require('./electron/db/database');
  initDB('C:/Users/lalit.mohan/AppData/Roaming/paysmart-pro/paysmart.db');
  const db = getDB();

  console.log('[Seeder] Database initialized successfully.');

  // 2. Register/Update the Admin User
  const adminEmail = 'admin@paysmart.com';
  console.log(`[Seeder] Seeding admin user: ${adminEmail}`);
  
  // Delete existing admin user if any, to avoid unique constraints
  db.prepare('DELETE FROM users WHERE email = ?').run(adminEmail);
  
  const adminPasswordHash = bcrypt.hashSync('Lalit@12345', 10);
  const adminId = 'admin-user-id-1';
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, is_active, force_password_change)
    VALUES (?, ?, ?, ?, ?, 1, 0)
  `).run(adminId, 'System Administrator', adminEmail, adminPasswordHash, 'admin');

  console.log('[Seeder] Admin user seeded successfully with password: Lalit@12345');

  // 3. Clear existing transaction/setup data to prevent ID clashes
  console.log('[Seeder] Clearing old transaction databases for a clean cycle...');
  db.prepare('DELETE FROM sync_queue').run();
  db.prepare('DELETE FROM payroll_overrides').run();
  db.prepare('DELETE FROM payroll_details').run();
  db.prepare('DELETE FROM payroll_runs').run();
  db.prepare('DELETE FROM attendance_logs').run();
  db.prepare('DELETE FROM employee_salary').run();
  db.prepare('DELETE FROM employee_statutory_config').run();
  db.prepare('DELETE FROM employee_identity').run();
  db.prepare('DELETE FROM employees').run();
  db.prepare('DELETE FROM salary_components').run();
  db.prepare('DELETE FROM salary_structures').run();
  db.prepare('DELETE FROM companies').run();

  // 4. Import Repositories
  const CompanyRepository = require('./electron/db/repositories/company.repo');
  const EmployeeRepository = require('./electron/db/repositories/employee.repo');
  const SalaryRepository = require('./electron/db/repositories/salary.repo');
  const AttendanceRepository = require('./electron/db/repositories/attendance.repo');
  const PayrollRepository = require('./electron/db/repositories/payroll.repo');
  const payrollService = require('./electron/services/payroll.service');

  const companyRepo = new CompanyRepository();
  const employeeRepo = new EmployeeRepository();
  const salaryRepo = new SalaryRepository();
  const attendanceRepo = new AttendanceRepository();
  const payrollRepo = new PayrollRepository();

  // 5. Create Client Company
  console.log('[Seeder] Creating Acme Statutory Solutions Pvt Ltd company...');
  const company = companyRepo.insert({
    id: 'company-acme-1',
    name: 'Acme Statutory Solutions Pvt Ltd',
    short_name: 'Acme Statutory',
    pan: 'ACMES1234E',
    tan: 'MUMB12345C',
    cin: 'U72200MH2025PTC123456',
    gstin: '27ACMES1234E1Z1',
    state_code: 'MH',
    working_days_per_week: 6,
    working_hours_per_day: 8,
    payroll_cycle: 'monthly',
    payroll_run_day: 28,
    is_pf_registered: 1,
    pf_reg_number: 'MH/BAN/12345/A',
    pf_establishment_id: 'MH12345',
    is_esi_registered: 1,
    esi_code: '31000123450001001',
    is_pt_applicable: 1,
    pt_reg_number: 'PTR1234567',
    is_tds_deductor: 1,
    is_lwf_applicable: 0,
    is_gratuity_applicable: 1,
    is_bonus_applicable: 0
  });

  console.log(`[Seeder] Company created successfully with ID: ${company.id}`);

  // 6. Find the seeded default salary structure
  const structure = db.prepare('SELECT id FROM salary_structures WHERE company_id = ?').get(company.id);
  if (!structure) {
    throw new Error('Default salary structure failed to seed on company insert!');
  }
  const structureId = structure.id;
  console.log(`[Seeder] Found auto-seeded Standard Salary Structure with ID: ${structureId}`);

  // 7. Onboard Employee
  console.log('[Seeder] Onboarding Employee (Rahul Sharma) with PF, ESI, PT, and TDS enabled...');
  const employee = employeeRepo.insert({
    id: 'emp-rahul-1',
    company_id: company.id,
    emp_code: 'EMP001',
    prefix: 'Mr.',
    first_name: 'Rahul',
    middle_name: '',
    last_name: 'Sharma',
    gender: 'male',
    dob: '1995-05-15',
    doj: '2024-04-01',
    department: 'Engineering',
    designation: 'Senior Software Engineer',
    employment_type: 'permanent',
    status: 'active'
  }, {
    pan: 'ABCDE1234F',
    bank_account_number: '123456789012',
    bank_ifsc: 'SBIN0001234',
    bank_name: 'State Bank of India',
    bank_branch: 'Mumbai Main',
    account_type: 'savings',
    uan: '100234567890',
    pf_account_number: 'MH/BAN/12345/A/0000001',
    esi_insurance_number: '3100000001',
    phone_primary: '9876543210',
    email_personal: 'rahul.sharma@gmail.com',
    email_official: 'rahul.sharma@acme.com',
    address_current: JSON.stringify({ line1: 'Flat 402, Royal Palms', line2: 'Goregaon East', city: 'Mumbai', state: 'MH', pincode: '400063' }),
    address_permanent: JSON.stringify({ line1: 'Flat 402, Royal Palms', line2: 'Goregaon East', city: 'Mumbai', state: 'MH', pincode: '400063' })
  }, {
    is_pf_enabled: 1,
    pf_contribution_type: 'statutory',
    voluntary_pf_pct: 0,
    is_pf_er_contribution: 1,
    is_esi_enabled: 1,
    is_tds_enabled: 1,
    tds_regime: 'new',
    is_pt_enabled: 1,
    is_ot_applicable: 0,
    is_gratuity_applicable: 1
  });

  console.log(`[Seeder] Employee Rahul Sharma registered successfully with ID: ${employee.id}`);

  // 8. Assign Salary Structure
  console.log('[Seeder] Assigning CTC slabs of ₹6,00,000 (₹50,000 monthly) to Rahul Sharma...');
  salaryRepo.assignSalaryStructure(employee.id, structureId, 600000, {});
  console.log('[Seeder] Salary Structure assigned successfully.');

  // 9. Log Attendance for April 2026
  console.log('[Seeder] Seeding Attendance Log for April 2026 (26 working days, 24 present, 1 paid leave, 1 LOP)...');
  attendanceRepo.saveAttendanceLog({
    emp_id: employee.id,
    company_id: company.id,
    month: 4,
    year: 2026,
    total_calendar_days: 30,
    total_working_days: 26,
    present_days: 24,
    paid_leave_days: 1,
    unpaid_leave_days: 0,
    ot_hours: 0,
    notes: 'Standard month'
  });
  console.log('[Seeder] Attendance log seeded successfully.');

  // 10. Execute E2E Statutory Payroll Calculations
  console.log('[Seeder] Executing E2E Statutory Payroll Run for April 2026...');
  const payrollResult = payrollService.executeAndSavePayroll(company.id, 4, 2026, 'System Administrator');
  const runId = payrollResult.run.id;
  console.log(`[Seeder] Payroll run drafted and saved with ID: ${runId}`);

  // 11. Lock and Approve Payroll Run to generate payslips and reports
  console.log('[Seeder] Locking and approving payroll run to generate statutory reports and lock balances...');
  payrollRepo.updateRunStatus(runId, 'approved', 'System Administrator');
  console.log('[Seeder] E2E Statutory Payroll Cycle completed and approved successfully!');
  
  console.log('\n============================================================');
  console.log('✅ SEED SUCCESSFUL!');
  console.log('You can now log into PaySmart Pro using the following:');
  console.log(`- Username: ${adminEmail}`);
  console.log('- Password: Lalit@12345');
  console.log('============================================================\n');
}

run().catch(err => {
  console.error('[Seeder] FAILED:', err);
  process.exit(1);
}).then(() => {
  process.exit(0);
});
