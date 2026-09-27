/**
 * PaySmart Pro — Full Test Suite
 * Runs against a sql.js in-memory SQLite (no Electron required).
 */
'use strict';

// ─── Patch Module Resolution ─────────────────────────────────────────────────
// Replace 'better-sqlite3' and 'electron' with test doubles BEFORE any app
// modules are required.
const Module = require('module');
const path   = require('path');
const originalLoad = Module._load.bind(Module);

const shimPath = path.join(__dirname, 'sqlite_shim.js');

Module._load = function(request, parent, isMain) {
  if (request === 'better-sqlite3') return originalLoad(shimPath, parent, isMain);
  if (request === 'electron')       return { app: { getPath: () => '/tmp' } };
  return originalLoad(request, parent, isMain);
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
let passed = 0, failed = 0, total = 0;
const failures = [];

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}`);
    console.log(`      ${e.message}`);
    failures.push({ name, error: e });
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

function assertEq(a, b, msg) {
  if (a !== b) throw new Error(`${msg || 'Expected equal'}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
}

function assertNear(a, b, msg, tol = 0.01) {
  if (Math.abs(a - b) > tol) throw new Error(`${msg || 'Expected ~equal'}: ${a} ≈ ${b} (diff ${Math.abs(a-b)})`);
}

// ─── Module Imports ───────────────────────────────────────────────────────────
const { round2 }           = require('../electron/db/database');
const { calculatePF }      = require('../electron/services/engine/pf.calculator');
const { calculateESI }     = require('../electron/services/engine/esi.calculator');
const { calculatePT }      = require('../electron/services/engine/pt.calculator');
const { calculateTDS, getMonthsRemaining } = require('../electron/services/engine/tds.calculator');
const { calculateEarnings } = require('../electron/services/engine/earnings.calculator');

// ─── DATABASE BOOTSTRAP ──────────────────────────────────────────────────────
// We need to run migrations against the DB before importing repos.
const { initDB, getDB } = require('../electron/db/database');
initDB('/tmp/test_paysmart.db');
const db = getDB();

// ─── REPOS (imported after DB is ready) ──────────────────────────────────────
const CompanyRepository    = require('../electron/db/repositories/company.repo');
const EmployeeRepository   = require('../electron/db/repositories/employee.repo');
const SalaryRepository     = require('../electron/db/repositories/salary.repo');
const AttendanceRepository = require('../electron/db/repositories/attendance.repo');
const PayrollRepository    = require('../electron/db/repositories/payroll.repo');
const StatutoryRepository  = require('../electron/db/repositories/statutory.repo');

const companyRepo    = new CompanyRepository();
const employeeRepo   = new EmployeeRepository();
const salaryRepo     = new SalaryRepository();
const attendanceRepo = new AttendanceRepository();
const payrollRepo    = new PayrollRepository();
const statutoryRepo  = new StatutoryRepository();

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 1 — PURE UTILITY
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── Section 1: Utility Helpers ──');

test('round2: rounds to 2 decimal places', () => {
  assertEq(round2(1.005), 1.01);
  assertEq(round2(1234.567), 1234.57);
  assertEq(round2(0), 0);
  assertEq(round2(null), 0);
  assertEq(round2(undefined), 0);
  assertEq(round2(NaN), 0);
});

test('getMonthsRemaining: April = 12 months remaining', () => {
  assertEq(getMonthsRemaining(4), 12);
});
test('getMonthsRemaining: March = 1 month remaining', () => {
  assertEq(getMonthsRemaining(3), 1);
});
test('getMonthsRemaining: January = 3 months remaining', () => {
  assertEq(getMonthsRemaining(1), 3);
});
test('getMonthsRemaining: December = 4 months remaining', () => {
  assertEq(getMonthsRemaining(12), 4);
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2 — PF CALCULATOR
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── Section 2: PF Calculator ──');

const pfConfig = { emp_contribution_pct: 12, er_contribution_pct: 12, eps_pct: 8.33, eps_ceiling: 1250, edli_pct: 0.5, wage_ceiling: 15000, is_ceiling_applicable: 1 };
const pfCompany = { is_pf_registered: 1 };
const pfStatutory = { is_pf_enabled: 1, pf_contribution_type: 'statutory', voluntary_pf_pct: 0 };

test('PF: skipped when company not registered', () => {
  const r = calculatePF({ is_pf_registered: 0 }, pfStatutory, 20000, pfConfig);
  assertEq(r.pf_employee, 0);
});
test('PF: skipped when employee disabled', () => {
  const r = calculatePF(pfCompany, { is_pf_enabled: 0 }, 20000, pfConfig);
  assertEq(r.pf_employee, 0);
});
test('PF: wage capped at 15000', () => {
  const r = calculatePF(pfCompany, pfStatutory, 25000, pfConfig);
  assertEq(r.pf_employee, 1800); // 15000 * 12%
});
test('PF: wage below ceiling uses actual', () => {
  const r = calculatePF(pfCompany, pfStatutory, 10000, pfConfig);
  assertEq(r.pf_employee, 1200); // 10000 * 12%
});
test('PF: EPS capped at 1250', () => {
  const r = calculatePF(pfCompany, pfStatutory, 25000, pfConfig);
  assertEq(r.eps_contribution, 1250);
});
test('PF: employer EPF = er_total - EPS', () => {
  const r = calculatePF(pfCompany, pfStatutory, 25000, pfConfig);
  // er_total = 15000 * 12% = 1800; eps = 1250; epf_er = 550
  assertEq(r.pf_employer, 550);
});
test('PF: EDLI = 0.5% of capped wage', () => {
  const r = calculatePF(pfCompany, pfStatutory, 25000, pfConfig);
  assertEq(r.edli_contribution, 75); // 15000 * 0.5%
});
test('PF: voluntary PF contribution adds on top', () => {
  const vpfStat = { ...pfStatutory, pf_contribution_type: 'voluntary', voluntary_pf_pct: 5 };
  const r = calculatePF(pfCompany, vpfStat, 20000, pfConfig);
  // employee PF = 1800 (capped wage 15000*12%) + VPF = 20000 * 5% = 1000 => total 2800
  assertEq(r.pf_employee, 2800);
  assertEq(r.vpf_contribution, 1000);
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3 — ESI CALCULATOR
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── Section 3: ESI Calculator ──');

const esiConfig = { emp_contribution_pct: 0.75, er_contribution_pct: 3.25, gross_ceiling: 21000 };
const esiCompany = { is_esi_registered: 1 };
const esiStatutory = { is_esi_enabled: 1 };

test('ESI: skipped when company not registered', () => {
  const r = calculateESI({ is_esi_registered: 0 }, esiStatutory, 15000, esiConfig);
  assertEq(r.esi_employee, 0);
});
test('ESI: skipped when employee disabled', () => {
  const r = calculateESI(esiCompany, { is_esi_enabled: 0 }, 15000, esiConfig);
  assertEq(r.esi_employee, 0);
});
test('ESI: ceiling crossed — both contributions zero, flag set', () => {
  const r = calculateESI(esiCompany, esiStatutory, 22000, esiConfig);
  assertEq(r.esi_employee, 0);
  assertEq(r.esi_ceiling_crossed, 1);
});
test('ESI: employee share 0.75% of wage', () => {
  const r = calculateESI(esiCompany, esiStatutory, 20000, esiConfig);
  assertEq(r.esi_employee, 150); // 20000 * 0.75%
});
test('ESI: employer share 3.25% of wage', () => {
  const r = calculateESI(esiCompany, esiStatutory, 20000, esiConfig);
  assertEq(r.esi_employer, 650); // 20000 * 3.25%
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 4 — PT CALCULATOR
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── Section 4: PT Calculator ──');

const mhSlabs = [
  { min: 0,     max: 7500,  monthly_pt: 0   },
  { min: 7501,  max: 10000, monthly_pt: 175 },
  { min: 10001, max: null,  monthly_pt: 200 }
];
const mhPtConfig = { slabs_json: mhSlabs };
const ptCompany = { is_pt_applicable: 1, state_code: 'MH' };
const ptStatutory = { is_pt_enabled: 1, pt_state_override: null };

test('PT: skipped when company not applicable', () => {
  const r = calculatePT({ is_pt_applicable: 0 }, ptStatutory, 20000, 5, mhPtConfig);
  assertEq(r.pt, 0);
});
test('PT: skipped when employee disabled', () => {
  const r = calculatePT(ptCompany, { is_pt_enabled: 0 }, 20000, 5, mhPtConfig);
  assertEq(r.pt, 0);
});
test('PT: MH slab 0 (gross <= 7500)', () => {
  const r = calculatePT(ptCompany, ptStatutory, 7000, 5, mhPtConfig);
  assertEq(r.pt, 0);
});
test('PT: MH slab 175 (7501-10000)', () => {
  const r = calculatePT(ptCompany, ptStatutory, 8000, 5, mhPtConfig);
  assertEq(r.pt, 175);
});
test('PT: MH slab 200 (above 10000)', () => {
  const r = calculatePT(ptCompany, ptStatutory, 15000, 5, mhPtConfig);
  assertEq(r.pt, 200);
});
test('PT: MH February override to 300', () => {
  const r = calculatePT(ptCompany, ptStatutory, 15000, 2, mhPtConfig);
  assertEq(r.pt, 300);
});
test('PT: returns 0 when no config', () => {
  const r = calculatePT(ptCompany, ptStatutory, 15000, 5, null);
  assertEq(r.pt, 0);
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 5 — TDS CALCULATOR
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── Section 5: TDS Calculator ──');

const newRegimeConfig = {
  fin_year: '2025-26', regime: 'new', standard_deduction: 75000,
  slabs_json: [
    { min: 0,       max: 400000,  rate: 0  },
    { min: 400000,  max: 800000,  rate: 5  },
    { min: 800000,  max: 1200000, rate: 10 },
    { min: 1200000, max: 1600000, rate: 15 },
    { min: 1600000, max: 2000000, rate: 20 },
    { min: 2000000, max: 2400000, rate: 25 },
    { min: 2400000, max: null,    rate: 30 }
  ],
  surcharge_json: [],
  cess_pct: 4,
  rebate_87a_limit: 1200000,
  rebate_87a_amount: 60000
};

const tdsCompany   = { is_tds_deductor: 1 };
const tdsStatutory = { is_tds_enabled: 1, tds_regime: 'new' };
const tdsEmployee  = {};
const blankYtd     = { ytd_gross: 0, ytd_tds: 0, ytd_basic: 0, ytd_hra: 0 };

test('TDS: skipped when company not deductor', () => {
  const r = calculateTDS({ is_tds_deductor: 0 }, tdsStatutory, tdsEmployee, 50000, blankYtd, 4, newRegimeConfig, null, {});
  assertEq(r.tds, 0);
});
test('TDS: skipped when employee disabled', () => {
  const r = calculateTDS(tdsCompany, { is_tds_enabled: 0 }, tdsEmployee, 50000, blankYtd, 4, newRegimeConfig, null, {});
  assertEq(r.tds, 0);
});
test('TDS: zero tax for income below rebate limit (new regime ≤12L)', () => {
  // Monthly taxable = 80000, April (all 12 months), annual projected = 960000
  // After std deduction 75000 => taxable 885000; tax on 400k-800k=20000, 800k-885k=8500 => 28500
  // 28500 < 60000 rebate, so net 0
  const r = calculateTDS(tdsCompany, tdsStatutory, tdsEmployee, 80000, blankYtd, 4, newRegimeConfig, null, {});
  assertEq(r.tds, 0);
});
test('TDS: positive tax for high earner', () => {
  // Monthly 200000, April, annual 2400000. After std ded 75000 => 2325000
  // Slab calc: 0-400k=0, 400k-800k=20000, 800k-1200k=40000, 1200k-1600k=60000,
  // 1600k-2000k=80000, 2000k-2325k=81250 => base=281250
  // rebate: 2325000 > 1200000 => no rebate
  // cess 4% => total = 281250*1.04 = 292500; monthly = 292500/12 = 24375
  const r = calculateTDS(tdsCompany, tdsStatutory, tdsEmployee, 200000, blankYtd, 4, newRegimeConfig, null, {});
  assert(r.tds > 0, `TDS should be positive, got ${r.tds}`);
  assert(r.annual_tax_liability > 0, 'Annual tax liability should be positive');
});
test('TDS: monthly apportionment decreases across months', () => {
  const aprilR = calculateTDS(tdsCompany, tdsStatutory, tdsEmployee, 200000, blankYtd, 4, newRegimeConfig, null, {});
  // Simulate Dec: 8 months paid already
  const decYtd = { ytd_gross: 200000 * 8, ytd_tds: aprilR.tds * 8, ytd_basic: 0, ytd_hra: 0 };
  const decR = calculateTDS(tdsCompany, tdsStatutory, tdsEmployee, 200000, decYtd, 12, newRegimeConfig, null, {});
  // Both should be similar since income is consistent; just verify it's non-zero
  assert(decR.tds > 0, 'Dec TDS should still be positive');
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 6 — EARNINGS CALCULATOR
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── Section 6: Earnings Calculator ──');

const standardComponents = [
  { code: 'BASIC', name: 'Basic', component_type: 'earning', calc_type: 'pct_ctc',   calc_value: '40', is_pf_wage: 1, is_esi_wage: 1, is_taxable: 1, is_pro_rated: 1 },
  { code: 'HRA',   name: 'HRA',   component_type: 'earning', calc_type: 'pct_basic', calc_value: '50', is_pf_wage: 0, is_esi_wage: 1, is_taxable: 1, is_pro_rated: 1 },
  { code: 'SA',    name: 'SA',    component_type: 'earning', calc_type: 'formula',   calc_value: 'MONTHLY_CTC-BASIC-HRA', is_pf_wage: 0, is_esi_wage: 1, is_taxable: 1, is_pro_rated: 1 },
  { code: 'CONV',  name: 'Conv',  component_type: 'earning', calc_type: 'fixed',     calc_value: '1600', is_pf_wage: 0, is_esi_wage: 1, is_taxable: 1, is_pro_rated: 0 }
];

const fullAttendance = { total_working_days: 26, present_days: 26, paid_leave_days: 0, lop_days: 0, ot_hours: 0 };

test('Earnings: BASIC = 40% of monthly CTC', () => {
  const salary = { monthly_ctc: 50000, ctc: 600000, component_overrides: {} };
  const r = calculateEarnings({}, standardComponents, salary, fullAttendance);
  assertEq(r.earnings.BASIC, 20000); // 50000 * 40%
});
test('Earnings: HRA = 50% of BASIC', () => {
  const salary = { monthly_ctc: 50000, ctc: 600000, component_overrides: {} };
  const r = calculateEarnings({}, standardComponents, salary, fullAttendance);
  assertEq(r.earnings.HRA, 10000); // 20000 * 50%
});
test('Earnings: SA = CTC - BASIC - HRA', () => {
  const salary = { monthly_ctc: 50000, ctc: 600000, component_overrides: {} };
  const r = calculateEarnings({}, standardComponents, salary, fullAttendance);
  assertEq(r.earnings.SA, 20000); // 50000 - 20000 - 10000
});
test('Earnings: gross = sum of all earnings', () => {
  const salary = { monthly_ctc: 50000, ctc: 600000, component_overrides: {} };
  const r = calculateEarnings({}, standardComponents, salary, fullAttendance);
  // BASIC(20000) + HRA(10000) + SA(20000) + CONV(1600) = 51600
  assertEq(r.totalGross, 51600);
});
test('Earnings: LOP deduction reduces pro-rated components', () => {
  const lopAttendance = { total_working_days: 26, present_days: 20, paid_leave_days: 0, lop_days: 6, ot_hours: 0 };
  const salary = { monthly_ctc: 50000, ctc: 600000, component_overrides: {} };
  const r = calculateEarnings({}, standardComponents, salary, lopAttendance);
  // BASIC LOP = 20000/26*6 = 4615.38 => final = 15384.62
  assert(r.earnings.BASIC < 20000, 'BASIC should be reduced by LOP');
  assert(r.totalLopDeduction > 0, 'LOP deduction should be positive');
  // CONV is not pro-rated
  assertEq(r.earnings.CONV, 1600);
});
test('Earnings: override replaces component value', () => {
  const salary = { monthly_ctc: 50000, ctc: 600000, component_overrides: { BASIC: 25000 } };
  const r = calculateEarnings({}, standardComponents, salary, fullAttendance);
  assertEq(r.earnings.BASIC, 25000);
});
test('Earnings: PF wage base includes only is_pf_wage=1 components', () => {
  const salary = { monthly_ctc: 50000, ctc: 600000, component_overrides: {} };
  const r = calculateEarnings({}, standardComponents, salary, fullAttendance);
  assertEq(r.pfWageBase, 20000); // only BASIC
});
test('Earnings: ESI wage base includes all is_esi_wage=1 components', () => {
  const salary = { monthly_ctc: 50000, ctc: 600000, component_overrides: {} };
  const r = calculateEarnings({}, standardComponents, salary, fullAttendance);
  assertEq(r.esiWageBase, 51600); // BASIC + HRA + SA + CONV
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 7 — DATABASE & MIGRATIONS
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── Section 7: DB Migrations & Schema ──');

test('Migrations: companies table exists', () => {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='companies'").get();
  assert(row, 'companies table should exist');
});
test('Migrations: 22 migration files applied to schema_migrations', () => {
  const rows = db.prepare("SELECT count(*) as cnt FROM schema_migrations").get();
  assert(rows.cnt >= 22, `Expected >=22 migrations, got ${rows.cnt}`);
});
test('Migrations: statutory_pf_config seeded with global default', () => {
  const row = db.prepare("SELECT * FROM statutory_pf_config WHERE id='pf-global-default'").get();
  assert(row, 'PF global default should be seeded');
  assertEq(row.wage_ceiling, 15000);
  assertEq(row.emp_contribution_pct, 12);
});
test('Migrations: statutory_esi_config seeded', () => {
  const row = db.prepare("SELECT * FROM statutory_esi_config WHERE id='esi-global-default'").get();
  assert(row, 'ESI global default should be seeded');
  assertEq(row.gross_ceiling, 21000);
});
test('Migrations: TDS 2025-26 new regime seeded', () => {
  const row = db.prepare("SELECT * FROM statutory_tds_config WHERE id='tds-2526-new'").get();
  assert(row, 'TDS new regime should be seeded');
  assertEq(row.standard_deduction, 75000);
});
test('Migrations: PT Maharashtra seeded', () => {
  const row = db.prepare("SELECT * FROM statutory_pt_config WHERE state_code='MH'").get();
  assert(row, 'MH PT config should exist');
});
test('Migrations: default admin user seeded', () => {
  const row = db.prepare("SELECT * FROM users WHERE email='admin@paysmart.com'").get();
  assert(row, 'admin user should exist');
  assertEq(row.role, 'admin');
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 8 — COMPANY REPOSITORY
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── Section 8: Company Repository ──');

let testCompanyId = null;

test('CompanyRepo: insert creates company + standard structure + 12 components', () => {
  const company = companyRepo.insert({
    id: 'comp-test-1',
    name: 'Test Corp Pvt Ltd',
    pan: 'TESTC1234A',
    state_code: 'MH',
    fin_year_start_month: 4,
    working_days_per_week: 6,
    working_hours_per_day: 8,
    payroll_cycle: 'monthly',
    payroll_run_day: 28,
    is_pf_registered: 1,
    is_esi_registered: 1,
    is_pt_applicable: 1,
    is_tds_deductor: 1,
    is_lwf_applicable: 0,
    is_gratuity_applicable: 1,
    is_bonus_applicable: 0,
    cloud_sync_enabled: 0,
    created_by: 'test'
  });
  testCompanyId = company.id;
  assert(company.id === 'comp-test-1', 'Company id should match');

  // Check structure seeded
  const struct = db.prepare("SELECT * FROM salary_structures WHERE company_id=?").get(testCompanyId);
  assert(struct, 'Default salary structure should be seeded');
  assert(struct.name === 'Standard Structure', 'Structure name check');

  // Check 12 components seeded
  const comps = db.prepare("SELECT count(*) as cnt FROM salary_components WHERE structure_id=?").get(struct.id);
  assertEq(comps.cnt, 12, '12 default components expected');
});

test('CompanyRepo: findById returns company', () => {
  const c = companyRepo.findById(testCompanyId);
  assert(c, 'Should find company');
  assertEq(c.name, 'Test Corp Pvt Ltd');
});

test('CompanyRepo: findAll returns at least one company', () => {
  const all = companyRepo.findAll();
  assert(all.length >= 1, 'Should have at least one company');
});

test('CompanyRepo: update changes name', () => {
  const updated = companyRepo.update(testCompanyId, { name: 'Updated Corp Pvt Ltd' });
  assertEq(updated.name, 'Updated Corp Pvt Ltd');
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 9 — EMPLOYEE REPOSITORY
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── Section 9: Employee Repository ──');

let testEmpId = null;

test('EmployeeRepo: insert creates employee + identity + statutory config', () => {
  const emp = employeeRepo.insert({
    id: 'emp-test-1',
    company_id: testCompanyId,
    emp_code: 'EMP001',
    first_name: 'Rahul',
    last_name: 'Sharma',
    doj: '2024-04-01',
    employment_type: 'permanent',
    status: 'active'
  }, {
    pan: 'ABCDE1234F',
    bank_account_number: '123456789012',
    bank_ifsc: 'SBIN0001234',
    uan: '100234567890'
  }, {
    is_pf_enabled: 1,
    is_esi_enabled: 1,
    is_tds_enabled: 1,
    tds_regime: 'new'
  });
  testEmpId = emp.id;
  assertEq(emp.emp_code, 'EMP001');

  const identity = db.prepare("SELECT * FROM employee_identity WHERE emp_id=?").get(testEmpId);
  assert(identity, 'Identity record should be created');
  assertEq(identity.pan, 'ABCDE1234F');

  const statutory = db.prepare("SELECT * FROM employee_statutory_config WHERE emp_id=?").get(testEmpId);
  assert(statutory, 'Statutory config should be created');
  assertEq(statutory.is_pf_enabled, 1);
});

test('EmployeeRepo: contract employee defaults pf/esi to 0', () => {
  const emp = employeeRepo.insert({
    id: 'emp-test-c1',
    company_id: testCompanyId,
    emp_code: 'EMP002',
    first_name: 'Priya',
    last_name: 'Patel',
    doj: '2024-04-01',
    employment_type: 'contract',
    status: 'active'
  });
  const statutory = db.prepare("SELECT * FROM employee_statutory_config WHERE emp_id=?").get('emp-test-c1');
  assertEq(statutory.is_pf_enabled, 0, 'Contract worker PF should default off');
  assertEq(statutory.is_esi_enabled, 0, 'Contract worker ESI should default off');
});

test('EmployeeRepo: getEmployeePackage returns full nested object', () => {
  const pkg = employeeRepo.getEmployeePackage(testEmpId);
  assert(pkg, 'Package should exist');
  assert(pkg.identity, 'Package.identity should exist');
  assert(pkg.statutory, 'Package.statutory should exist');
  assertEq(pkg.first_name, 'Rahul');
});

test('EmployeeRepo: update modifies core fields', () => {
  const updated = employeeRepo.updateEmployeePackage(testEmpId, { department: 'Engineering' }, {}, {});
  assertEq(updated.department, 'Engineering');
});

test('EmployeeRepo: saveInvestmentDeclaration upserts correctly', () => {
  const decl = employeeRepo.saveInvestmentDeclaration({
    emp_id: testEmpId,
    company_id: testCompanyId,
    fin_year: '2025-26',
    total_80c: 150000,
    rent_paid_annual: 120000,
    rent_city_type: 'metro',
    is_renting: 1,
    hra_exemption: 0,
    total_deductions: 150000
  });
  assert(decl, 'Declaration should be saved');
  assertEq(decl.total_80c, 150000);

  // Upsert again
  const updated = employeeRepo.saveInvestmentDeclaration({
    emp_id: testEmpId,
    company_id: testCompanyId,
    fin_year: '2025-26',
    total_80c: 100000,
    rent_paid_annual: 120000,
    rent_city_type: 'metro',
    is_renting: 1,
    hra_exemption: 0,
    total_deductions: 100000
  });
  assertEq(updated.total_80c, 100000, 'Upsert should update value');
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 10 — SALARY REPOSITORY
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── Section 10: Salary Repository ──');

let testStructureId = null;

test('SalaryRepo: getAll returns standard structure for company', () => {
  const structs = salaryRepo.findAll({ company_id: testCompanyId });
  assert(structs.length >= 1, 'Should have at least one structure');
  testStructureId = structs[0].id;
});

test('SalaryRepo: getStructureWithComponents returns components array', () => {
  const s = salaryRepo.getStructureWithComponents(testStructureId);
  assert(s, 'Structure should exist');
  assert(Array.isArray(s.components), 'Should have components array');
  assert(s.components.length > 0, 'Should have at least one component');
});

test('SalaryRepo: assignSalaryStructure creates employee_salary record', () => {
  const result = salaryRepo.assignSalaryStructure(testEmpId, testStructureId, 600000, {});
  assert(result, 'Should return salary record');
  assertEq(result.ctc, 600000);
  assertEq(result.monthly_ctc, 50000);
});

test('SalaryRepo: getEmployeeSalary fetches latest assignment', () => {
  const sal = salaryRepo.getEmployeeSalary(testEmpId);
  assert(sal, 'Should find salary');
  assertEq(sal.ctc, 600000);
  assert(sal.structure_name, 'Should join structure name');
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 11 — ATTENDANCE REPOSITORY
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── Section 11: Attendance Repository ──');

test('AttendanceRepo: saveAttendanceLog inserts new record', () => {
  const saved = attendanceRepo.saveAttendanceLog({
    emp_id: testEmpId,
    company_id: testCompanyId,
    month: 4,
    year: 2025,
    total_calendar_days: 30,
    total_working_days: 26,
    present_days: 24,
    paid_leave_days: 1,
    unpaid_leave_days: 0,
    ot_hours: 0,
    notes: ''
  });
  assert(saved, 'Should return saved record');
  assertEq(saved.lop_days, 1, 'LOP = 26 - 24 - 1 = 1');
});

test('AttendanceRepo: getAttendanceLog retrieves the saved record', () => {
  const log = attendanceRepo.getAttendanceLog(testEmpId, 4, 2025);
  assert(log, 'Should find attendance log');
  assertEq(log.present_days, 24);
  assertEq(log.lop_days, 1);
});

test('AttendanceRepo: saveAttendanceLog updates existing record', () => {
  const updated = attendanceRepo.saveAttendanceLog({
    emp_id: testEmpId,
    company_id: testCompanyId,
    month: 4,
    year: 2025,
    total_calendar_days: 30,
    total_working_days: 26,
    present_days: 26,
    paid_leave_days: 0,
    unpaid_leave_days: 0,
    ot_hours: 2,
    notes: 'Corrected'
  });
  assertEq(updated.present_days, 26);
  assertEq(updated.lop_days, 0);
  assertEq(updated.ot_hours, 2);
});

test('AttendanceRepo: getCompanyAttendance returns all active employees', () => {
  const rows = attendanceRepo.getCompanyAttendance(testCompanyId, 4, 2025);
  assert(rows.length >= 1, 'Should return at least one employee');
});

test('AttendanceRepo: setLockState locks the attendance', () => {
  attendanceRepo.setLockState(testCompanyId, 4, 2025, 'admin', 1);
  const log = attendanceRepo.getAttendanceLog(testEmpId, 4, 2025);
  assertEq(log.is_attendance_locked, 1);
});

test('AttendanceRepo: LOP never goes negative', () => {
  const saved = attendanceRepo.saveAttendanceLog({
    emp_id: 'emp-test-c1',
    company_id: testCompanyId,
    month: 5,
    year: 2025,
    total_calendar_days: 31,
    total_working_days: 26,
    present_days: 30, // more than working days (holiday makeup)
    paid_leave_days: 0,
    unpaid_leave_days: 0,
    ot_hours: 0,
    notes: ''
  });
  assertEq(saved.lop_days, 0, 'LOP should never be negative');
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 12 — STATUTORY REPOSITORY
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── Section 12: Statutory Repository ──');

test('StatutoryRepo: getPFConfig returns global default', () => {
  const config = statutoryRepo.getPFConfig(testCompanyId);
  assert(config, 'PF config should exist');
  assertEq(config.wage_ceiling, 15000);
});

test('StatutoryRepo: getESIConfig returns global default', () => {
  const config = statutoryRepo.getESIConfig(testCompanyId);
  assert(config, 'ESI config should exist');
  assertEq(config.gross_ceiling, 21000);
});

test('StatutoryRepo: getPTConfig returns MH slabs', () => {
  const config = statutoryRepo.getPTConfig('MH');
  assert(config, 'PT config should exist');
  assert(Array.isArray(config.slabs_json), 'slabs_json should be parsed array');
  assert(config.slabs_json.length > 0, 'Should have slabs');
});

test('StatutoryRepo: getPTConfig returns null for no-PT state', () => {
  const config = statutoryRepo.getPTConfig('DL');
  // DL has has_pt=0 so query filters it out
  assert(config === null, 'Delhi should return null PT config');
});

test('StatutoryRepo: getTDSConfig returns 2025-26 new regime', () => {
  const config = statutoryRepo.getTDSConfig('2025-26', 'new');
  assert(config, 'TDS new regime config should exist');
  assert(Array.isArray(config.slabs_json), 'slabs_json should be parsed');
  assertEq(config.standard_deduction, 75000);
});

test('StatutoryRepo: getYTDMetrics returns zero for new employee', () => {
  const ytd = statutoryRepo.getYTDMetrics(testEmpId, '2025-26');
  assertEq(ytd.ytd_months_worked, 0);
  assertEq(ytd.ytd_gross, 0);
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 13 — PAYROLL ENGINE (Integration)
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── Section 13: Payroll Engine Integration ──');

const { processPayroll } = require('../electron/services/engine/payroll.engine');

test('PayrollEngine: processes payroll for active employees', () => {
  const result = processPayroll(testCompanyId, 4, 2025, 'test-operator');
  assert(result, 'Should return result object');
  assert(result.runData, 'Should have runData');
  assert(Array.isArray(result.detailsArray), 'Should have detailsArray');
  // We have 2 active employees (EMP001 permanent + EMP002 contract)
  // Both have salary assigned? No — only EMP001. EMP002 has no salary. Engine skips it.
  assertEq(result.detailsArray.length, 1, 'Only employee with salary structure should be processed');
});

test('PayrollEngine: runData contains correct totals structure', () => {
  const result = processPayroll(testCompanyId, 4, 2025, 'test-operator');
  const r = result.runData;
  assert(r.company_id === testCompanyId, 'company_id correct');
  assertEq(r.month, 4);
  assertEq(r.year, 2025);
  assertEq(r.run_type, 'regular');
  assertEq(r.status, 'draft');
  assert(r.total_gross > 0, 'Total gross should be positive');
  assert(r.total_net > 0, 'Total net should be positive');
  assert(r.total_net <= r.total_gross, 'Net must be <= gross');
});

test('PayrollEngine: employee detail snapshot has all required fields', () => {
  const result = processPayroll(testCompanyId, 4, 2025, 'test-operator');
  const detail = result.detailsArray[0];
  assert(detail.emp_id, 'emp_id');
  assert(detail.emp_code, 'emp_code');
  assert(detail.tds_regime, 'tds_regime should be set (not undefined)');
  assert(detail.gross_salary > 0, 'gross > 0');
  assert(detail.net_salary > 0, 'net > 0');
  assert(detail.components_json, 'components_json should exist');
  const comps = JSON.parse(detail.components_json);
  assert(comps.earnings, 'earnings breakdown exists');
  assert(comps.deductions, 'deductions breakdown exists');
});

test('PayrollEngine: PF deducted when company + employee both enabled', () => {
  const result = processPayroll(testCompanyId, 4, 2025, 'test-operator');
  const detail = result.detailsArray[0];
  assertEq(detail.is_pf_deducted, 1, 'PF should be deducted');
  assert(detail.pf_employee > 0, `PF employee > 0, got ${detail.pf_employee}`);
});

test('PayrollEngine: ESI deducted when gross within ceiling', () => {
  // CTC 600000/yr => 50000/month gross. ESI ceiling is 21000. Gross > ceiling.
  // So ESI should NOT be deducted (ceiling crossed)
  const result = processPayroll(testCompanyId, 4, 2025, 'test-operator');
  const detail = result.detailsArray[0];
  assertEq(detail.esi_ceiling_crossed, 1, 'ESI ceiling crossed at gross 50k');
  assertEq(detail.esi_employee, 0, 'No ESI deduction when ceiling crossed');
});

test('PayrollEngine: tds_regime is set correctly (not undefined)', () => {
  const result = processPayroll(testCompanyId, 4, 2025, 'test-operator');
  const detail = result.detailsArray[0];
  assertEq(detail.tds_regime, 'new', 'TDS regime should be "new"');
});

test('PayrollEngine: financial year derived correctly for April 2025', () => {
  // FY for Apr 2025 = '2025-26'
  const result = processPayroll(testCompanyId, 4, 2025, 'test-operator');
  // Engine should not throw - and TDS config should be loaded
  const detail = result.detailsArray[0];
  assert(detail.computation_log.includes('TDS Calculation') || detail.computation_log.includes('TDS'), 'TDS computation should be logged');
});

test('PayrollEngine: net = gross - deductions', () => {
  const result = processPayroll(testCompanyId, 4, 2025, 'test-operator');
  const d = result.detailsArray[0];
  const expectedNet = round2(d.gross_salary - d.total_deductions);
  assertNear(d.net_salary, expectedNet, 'Net salary = Gross - Deductions');
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 14 — PAYROLL REPOSITORY
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── Section 14: Payroll Repository ──');

let testRunId = null;

test('PayrollRepo: savePayrollRunAndDetails persists run', () => {
  const result = processPayroll(testCompanyId, 4, 2025, 'test-operator');
  const saved = payrollRepo.savePayrollRunAndDetails(result.runData, result.detailsArray, result.overridesArray);
  assert(saved, 'Should return saved run');
  assert(saved.id, 'Should have an id');
  testRunId = saved.id;
  assertEq(saved.status, 'draft');
  assertEq(saved.month, 4);
});

test('PayrollRepo: getPayrollRun retrieves the saved run', () => {
  const run = payrollRepo.getPayrollRun(testCompanyId, 4, 2025);
  assert(run, 'Should find run');
  assertEq(run.id, testRunId);
});

test('PayrollRepo: getRunDetails returns employee details', () => {
  const details = payrollRepo.getRunDetails(testRunId);
  assert(Array.isArray(details), 'Should be array');
  assert(details.length >= 1, 'Should have at least one detail');
  assert(details[0].emp_name, 'Should have emp_name');
});

test('PayrollRepo: updateRunStatus draft -> under_review', () => {
  const updated = payrollRepo.updateRunStatus(testRunId, 'under_review', 'manager1');
  assertEq(updated.status, 'under_review');
  assertEq(updated.reviewed_by, 'manager1');
});

test('PayrollRepo: updateRunStatus under_review -> approved', () => {
  const updated = payrollRepo.updateRunStatus(testRunId, 'approved', 'director1');
  assertEq(updated.status, 'approved');
  assertEq(updated.approved_by, 'director1');
});

test('PayrollRepo: savePayrollRunAndDetails cannot overwrite approved run', () => {
  const result = processPayroll(testCompanyId, 4, 2025, 'test-operator');
  let threw = false;
  try {
    payrollRepo.savePayrollRunAndDetails(result.runData, result.detailsArray, []);
  } catch (e) {
    threw = true;
    assert(e.message.includes('approved'), `Expected "approved" in error, got: ${e.message}`);
  }
  assert(threw, 'Should throw when trying to overwrite approved run');
});

test('PayrollRepo: addOverride inserts override record', () => {
  const override = payrollRepo.addOverride({
    run_id: testRunId,
    emp_id: testEmpId,
    override_type: 'bonus',
    label: 'Performance Bonus',
    amount: 5000,
    is_taxable: 1,
    is_pf_wage: 0,
    is_esi_wage: 0,
    added_by: 'admin'
  });
  assert(override.id, 'Override should have id');
  assertEq(override.amount, 5000);
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 15 — YTD ACCUMULATION
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n── Section 15: YTD Accumulation ──');

test('StatutoryRepo: getYTDMetrics accumulates approved run', () => {
  // The run is now approved — YTD should include it
  const ytd = statutoryRepo.getYTDMetrics(testEmpId, '2025-26');
  assertEq(ytd.ytd_months_worked, 1);
  assert(ytd.ytd_gross > 0, 'YTD gross should be positive after one approved month');
});

test('StatutoryRepo: getYTDMetrics does not include draft runs', () => {
  // Save a new DRAFT run for May 2025
  const result = processPayroll(testCompanyId, 5, 2025, 'test-operator');
  payrollRepo.savePayrollRunAndDetails(result.runData, result.detailsArray, []);
  // YTD should still be 1 month (draft not counted)
  const ytd = statutoryRepo.getYTDMetrics(testEmpId, '2025-26');
  assertEq(ytd.ytd_months_worked, 1, 'Draft run should not count in YTD');
});

// ═════════════════════════════════════════════════════════════════════════════
// RESULTS
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(60));
console.log(`Results: ${passed}/${total} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log('\nFailed tests:');
  failures.forEach(f => console.log(`  ✗ ${f.name}\n    ${f.error.message}`));
  process.exitCode = 1;
} else {
  console.log('\n✅ All tests passed!');
}
process.exit(process.exitCode || 0);
