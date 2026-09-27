const { initDB, getDB } = require('./out/main/db/database');
const { app } = require('electron');

app.whenReady().then(async () => {
  try {
    initDB();
    const db = getDB();
    
    // Test 1: Create a company
    const CompanyRepository = require('./out/main/db/repositories/company.repo');
    const companyRepo = new CompanyRepository();
    const company = companyRepo.insert({
      name: 'Test Setup Company',
      pan: 'PAN' + Date.now().toString().slice(-7),
      state_code: 'MH',
      email: 'test@setup.com'
    });
    console.log(`✅ Created company: ${company.id}`);

    // Company setup is created via seedDefaults when company is created!
    const setupRepo = require('./out/main/db/repositories/setup.repo').setupRepo;
    const allSetup = setupRepo.getAllSetup(company.id);
    if (!allSetup.company) throw new Error('Company setup missing');
    if (!allSetup.epf) throw new Error('EPF setup missing');
    console.log('✅ Company Setup seeded correctly');

    // Test 2: Allowance Setup
    console.log('Testing Allowance Setup...');
    const allowances = setupRepo.getAllowances(company.id);
    if (allowances.length === 0) throw new Error('Allowances not seeded');
    console.log(`✅ Seeded ${allowances.length} allowances.`);

    // Modify an allowance
    const savedAllowance = setupRepo.saveAllowance(company.id, 'All-01', {
      heading: 'BASIC-TEST',
      is_taxable: 1,
      mode: 'Salary'
    });
    if (savedAllowance.heading !== 'BASIC-TEST') throw new Error('Allowance not updated');
    console.log('✅ Allowance updated successfully');

    // Test 3: Deduction Setup
    console.log('Testing Deduction Setup...');
    const deductions = setupRepo.getDeductions(company.id);
    if (deductions.length === 0) throw new Error('Deductions not seeded');
    console.log(`✅ Seeded ${deductions.length} deductions.`);

    const savedDeduction = setupRepo.saveDeduction(company.id, 'Ded-01', {
      heading: 'DED-TEST',
      is_taxable: 0,
      mode: 'Salary'
    });
    if (savedDeduction.heading !== 'DED-TEST') throw new Error('Deduction not updated');
    console.log('✅ Deduction updated successfully');

    // Test 4: Attendance Setup
    console.log('Testing Attendance Setup...');
    setupRepo.seedAttendance(company.id);
    const attendance = setupRepo.getAttendanceSetup(company.id);
    if (attendance.length !== 11) throw new Error(`Attendance not seeded, found ${attendance.length}`);
    console.log('✅ Seeded 11 attendance rows.');

    // Save attendance
    setupRepo.saveAttendanceSetup(company.id, [
      { code: 'WORKING_DAYS', sort_order: 1, field_label: 'Working Days', heading: 'W.Days', hindi_heading: '' }
    ]);
    const updatedAtt = setupRepo.getAttendanceSetup(company.id).find(a => a.code === 'WORKING_DAYS');
    if (updatedAtt.heading !== 'W.Days') throw new Error('Attendance not updated');
    console.log('✅ Attendance updated successfully');

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  }
});
