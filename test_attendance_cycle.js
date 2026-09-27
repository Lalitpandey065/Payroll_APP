const { initDB, getDB } = require('./out/main/db/database');
const { app } = require('electron');

app.whenReady().then(async () => {
  try {
    initDB();
    const db = getDB();
    
    // Test 1: Create a company
    console.log('Fetching test company...');
    const CompanyRepository = require('./out/main/db/repositories/company.repo');
    const companyRepo = new CompanyRepository();
    let company = db.prepare('SELECT * FROM companies LIMIT 1').get();
    if (!company) {
      company = companyRepo.insert({
        name: 'Test Attendance Company',
        pan: 'PAN' + Date.now().toString().slice(-7),
        state_code: 'MH',
        email: 'test@setup.com'
      });
      console.log(`✅ Created company: ${company.id}`);
    } else {
      console.log(`✅ Found company: ${company.id}`);
    }

    // Ensure Attendance Setup
    const setupRepo = require('./out/main/db/repositories/setup.repo').setupRepo;
    const attSetup = setupRepo.getAttendanceSetup(company.id);
    if (attSetup.length === 0) {
      setupRepo.seedAttendance(company.id);
      console.log('✅ Seeded Attendance');
    }

    // Test 2: Create an employee
    const EmployeeRepository = require('./out/main/db/repositories/employee.repo');
    const employeeRepo = new EmployeeRepository();
    const empData = {
      company_id: company.id,
      emp_code: 'EMP-001',
      first_name: 'John',
      last_name: 'Doe',
      gender: 'Male',
      doj: '2025-01-01',
      designation: 'Developer',
      status: 'active'
    };
    
    // Cleanup existing test employee and their children
    const existingEmp = db.prepare(`SELECT id FROM employees WHERE emp_code = 'EMP-001' AND company_id = ?`).get(company.id);
    if (existingEmp) {
      db.prepare(`DELETE FROM attendance_logs WHERE emp_id = ?`).run(existingEmp.id);
      db.prepare(`DELETE FROM employee_statutory_config WHERE emp_id = ?`).run(existingEmp.id);
      db.prepare(`DELETE FROM employee_identity WHERE emp_id = ?`).run(existingEmp.id);
      db.prepare(`DELETE FROM employee_salary WHERE emp_id = ?`).run(existingEmp.id);
      db.prepare(`DELETE FROM employees WHERE id = ?`).run(existingEmp.id);
    }
    
    const emp = employeeRepo.insert(empData);
    console.log(`✅ Created employee: ${emp.id}`);

    const AttendanceRepository = require('./out/main/db/repositories/attendance.repo');
    const attendanceRepo = new AttendanceRepository();
    
    const attLog = {
      company_id: company.id,
      emp_id: emp.id,
      month: '06',
      year: '2026',
      total_calendar_days: 30,
      total_working_days: 26,
      present_days: 22,
      paid_leave_days: 2,
      unpaid_leave_days: 0,
      ot_hours: 5
    };

    console.log('Saving attendance log...');
    
    const result = attendanceRepo.saveAttendanceLog(attLog);
    console.log(`✅ Saved attendance: ${JSON.stringify(result)}`);

    console.log('\n🎉 ATTENDANCE CYCLE TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  }
});
