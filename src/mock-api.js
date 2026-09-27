/**
 * Mock window.api for web-only dev/testing mode.
 * Simulates all IPC calls with realistic data.
 */

const MOCK_USER = {
  id: 'user-001', name: 'Admin', email: 'admin@paysmart.com',
  role: 'admin', force_password_change: 0
};

const MOCK_COMPANY = {
  id: 'comp-001', name: 'Acme Technologies Pvt Ltd',
  trade_name: 'Acme Tech', cin: 'U72900MH2020PTC123456',
  pan: 'AABCA1234C', tan: 'MUMR12345E',
  gstin: '27AABCA1234C1Z5', address: '123 Tech Park, Andheri',
  city: 'Mumbai', state: 'Maharashtra', state_code: 'MH',
  pincode: '400001', phone: '9876543210', email: 'hr@acme.com',
  industry: 'technology', working_days_per_week: 5,
  is_pf_registered: 1, pf_number: 'MH/MUM/0012345/000/0001234',
  is_esi_registered: 1, esi_number: '3100123456',
  is_pt_applicable: 1, is_tds_deductor: 1,
  status: 'active', created_at: new Date().toISOString()
};

const MOCK_EMPLOYEE = {
  id: 'emp-001', emp_code: 'EMP001', first_name: 'Rahul', last_name: 'Sharma',
  gender: 'male', date_of_birth: '1990-05-15',
  date_of_joining: '2023-04-01', department: 'Engineering',
  designation: 'Software Engineer', employment_type: 'permanent',
  status: 'active', company_id: 'comp-001',
  identity: {
    pan: 'ABCDE1234F', uan: '100123456789',
    aadhar_last4: '1234', bank_account_number: '12345678901234',
    bank_name: 'HDFC Bank', bank_ifsc: 'HDFC0001234',
    bank_branch: 'Andheri West'
  },
  statutory: {
    is_pf_enabled: 1, is_esi_enabled: 1, is_pt_enabled: 1,
    is_tds_enabled: 1, tds_regime: 'new',
    pf_contribution_type: 'statutory', voluntary_pf_pct: 0,
    pt_state_override: null, is_advance_recovery_active: 0,
    advance_outstanding: 0, advance_monthly_deduction: 0
  }
};

const MOCK_STRUCTURE = {
  id: 'struct-001', name: 'Standard Structure', company_id: 'comp-001',
  is_ctc_based: 1, is_active: 1,
  components: [
    { id: 'c1', code: 'BASIC', name: 'Basic Salary', component_type: 'earning', calc_type: 'pct_ctc', calc_value: '40', is_pf_wage: 1, is_esi_wage: 1, is_taxable: 1, is_pro_rated: 1, display_order: 1 },
    { id: 'c2', code: 'HRA', name: 'HRA', component_type: 'earning', calc_type: 'pct_basic', calc_value: '50', is_pf_wage: 0, is_esi_wage: 1, is_taxable: 1, is_pro_rated: 1, display_order: 2 },
    { id: 'c3', code: 'SA', name: 'Special Allowance', component_type: 'earning', calc_type: 'formula', calc_value: 'MONTHLY_CTC-BASIC-HRA', is_pf_wage: 0, is_esi_wage: 1, is_taxable: 1, is_pro_rated: 1, display_order: 3 },
    { id: 'c4', code: 'PF_EMP', name: 'PF Employee', component_type: 'deduction', calc_type: 'statutory', calc_value: 'pf_employee', statutory_type: 'pf_employee', display_order: 4 },
    { id: 'c5', code: 'TDS', name: 'TDS', component_type: 'deduction', calc_type: 'statutory', calc_value: 'tds', statutory_type: 'tds', display_order: 5 },
    { id: 'c6', code: 'PT', name: 'Professional Tax', component_type: 'deduction', calc_type: 'statutory', calc_value: 'pt', statutory_type: 'pt', display_order: 6 },
  ]
};

let mockAllowances = [
  { company_id: 'comp-001', code: 'All-01', component_type: 'allowance', slot_number: 1, heading: 'BASIC', epf_status: 1, esi_status: 1, bonus_status: 1, leave_encashment: 1, overtime_status: 1, gratuity_status: 1, shown_in_print: 1, shown_in_screen: 1, carry_forward: 1, is_taxable: 1, mode: 'Salary', percentage: 0, pct_bases: '[]' },
  { company_id: 'comp-001', code: 'All-02', component_type: 'allowance', slot_number: 2, heading: 'H.R.A.', epf_status: 0, esi_status: 1, bonus_status: 1, leave_encashment: 0, overtime_status: 1, gratuity_status: 0, shown_in_print: 1, shown_in_screen: 1, carry_forward: 1, is_taxable: 1, mode: 'Salary', percentage: 0, pct_bases: '[]' },
  { company_id: 'comp-001', code: 'All-03', component_type: 'allowance', slot_number: 3, heading: 'CONVEY.', epf_status: 0, esi_status: 1, bonus_status: 1, leave_encashment: 0, overtime_status: 1, gratuity_status: 0, shown_in_print: 1, shown_in_screen: 1, carry_forward: 1, is_taxable: 1, mode: 'Salary', percentage: 0, pct_bases: '[]' },
  { company_id: 'comp-001', code: 'All-04', component_type: 'allowance', slot_number: 4, heading: 'HEA', epf_status: 0, esi_status: 1, bonus_status: 1, leave_encashment: 0, overtime_status: 1, gratuity_status: 0, shown_in_print: 1, shown_in_screen: 1, carry_forward: 1, is_taxable: 1, mode: 'Salary', percentage: 0, pct_bases: '[]' },
  { company_id: 'comp-001', code: 'All-05', component_type: 'allowance', slot_number: 5, heading: 'SPLALL', epf_status: 0, esi_status: 1, bonus_status: 1, leave_encashment: 0, overtime_status: 1, gratuity_status: 0, shown_in_print: 1, shown_in_screen: 1, carry_forward: 0, is_taxable: 1, mode: 'Salary', percentage: 0, pct_bases: '[]' },
  ...Array.from({ length: 25 }, (_, i) => ({
    company_id: 'comp-001', code: `All-${(i + 6).toString().padStart(2, '0')}`, component_type: 'allowance', slot_number: i + 6, heading: '', epf_status: 0, esi_status: 0, bonus_status: 0, leave_encashment: 0, overtime_status: 0, gratuity_status: 0, shown_in_print: 1, shown_in_screen: 1, carry_forward: 1, is_taxable: 1, mode: 'Salary', percentage: 0, pct_bases: '[]'
  })),
  { company_id: 'comp-001', code: 'DW-01', component_type: 'dwage', slot_number: 1, heading: 'D.Wage-1', epf_status: 0, esi_status: 1, bonus_status: 1, leave_encashment: 1, overtime_status: 1, gratuity_status: 1, shown_in_print: 1, shown_in_screen: 1, carry_forward: 1, is_taxable: 1, mode: 'Salary', percentage: 0, pct_bases: '[]' },
  { company_id: 'comp-001', code: 'DW-02', component_type: 'dwage', slot_number: 2, heading: 'D.Wage-2', epf_status: 0, esi_status: 0, bonus_status: 0, leave_encashment: 0, overtime_status: 0, gratuity_status: 0, shown_in_print: 0, shown_in_screen: 0, carry_forward: 0, is_taxable: 1, mode: 'Salary', percentage: 0, pct_bases: '[]' },
  { company_id: 'comp-001', code: 'DW-03', component_type: 'dwage', slot_number: 3, heading: 'D.Wage-3', epf_status: 0, esi_status: 0, bonus_status: 0, leave_encashment: 0, overtime_status: 0, gratuity_status: 0, shown_in_print: 0, shown_in_screen: 0, carry_forward: 0, is_taxable: 1, mode: 'Salary', percentage: 0, pct_bases: '[]' },
  { company_id: 'comp-001', code: 'DW-04', component_type: 'dwage', slot_number: 4, heading: 'D.Wage-4', epf_status: 0, esi_status: 0, bonus_status: 0, leave_encashment: 0, overtime_status: 0, gratuity_status: 0, shown_in_print: 0, shown_in_screen: 0, carry_forward: 0, is_taxable: 1, mode: 'Salary', percentage: 0, pct_bases: '[]' },
  { company_id: 'comp-001', code: 'DW-05', component_type: 'dwage', slot_number: 5, heading: 'D.Wage-5', epf_status: 0, esi_status: 0, bonus_status: 0, leave_encashment: 0, overtime_status: 0, gratuity_status: 0, shown_in_print: 0, shown_in_screen: 0, carry_forward: 0, is_taxable: 1, mode: 'Salary', percentage: 0, pct_bases: '[]' },
  { company_id: 'comp-001', code: 'DW-06', component_type: 'dwage', slot_number: 6, heading: 'D.Wage-6', epf_status: 0, esi_status: 0, bonus_status: 0, leave_encashment: 0, overtime_status: 0, gratuity_status: 0, shown_in_print: 0, shown_in_screen: 0, carry_forward: 0, is_taxable: 1, mode: 'Salary', percentage: 0, pct_bases: '[]' }
];

function ensureAllowances(companyId) {
  const existing = mockAllowances.filter(a => a.company_id === companyId);
  if (existing.length > 0) return existing;

  const defaults = [
    { slot: 1, type: 'allowance', heading: 'BASIC', epf: 1, esi: 1, bonus: 1, leave: 1, ot: 1, gratuity: 1, gross: 1, print: 1, screen: 1, carry: 1, taxable: 1 },
    { slot: 2, type: 'allowance', heading: 'H.R.A.', epf: 0, esi: 1, bonus: 1, leave: 0, ot: 1, gratuity: 0, gross: 1, print: 1, screen: 1, carry: 1, taxable: 1 },
    { slot: 3, type: 'allowance', heading: 'CONVEY.', epf: 0, esi: 1, bonus: 1, leave: 0, ot: 1, gratuity: 0, gross: 1, print: 1, screen: 1, carry: 1, taxable: 1 },
    { slot: 4, type: 'allowance', heading: 'HEA', epf: 0, esi: 1, bonus: 1, leave: 0, ot: 1, gratuity: 0, gross: 1, print: 1, screen: 1, carry: 1, taxable: 1 },
    { slot: 5, type: 'allowance', heading: 'SPLALL', epf: 0, esi: 1, bonus: 1, leave: 0, ot: 1, gratuity: 0, gross: 1, print: 1, screen: 1, carry: 0, taxable: 1 },
    ...Array.from({ length: 25 }, (_, i) => ({
      slot: i + 6, type: 'allowance', heading: '', epf: 0, esi: 0, bonus: 0, leave: 0, ot: 0, gratuity: 0, gross: 1, print: 1, screen: 1, carry: 1, taxable: 1
    })),
    { slot: 1, type: 'dwage', heading: 'D.Wage-1', epf: 0, esi: 1, bonus: 1, leave: 1, ot: 1, gratuity: 1, gross: 1, print: 1, screen: 1, carry: 1, taxable: 1 },
    { slot: 2, type: 'dwage', heading: 'D.Wage-2', epf: 0, esi: 0, bonus: 0, leave: 0, ot: 0, gratuity: 0, gross: 0, print: 0, screen: 0, carry: 0, taxable: 1 },
    { slot: 3, type: 'dwage', heading: 'D.Wage-3', epf: 0, esi: 0, bonus: 0, leave: 0, ot: 0, gratuity: 0, gross: 0, print: 0, screen: 0, carry: 0, taxable: 1 },
    { slot: 4, type: 'dwage', heading: 'D.Wage-4', epf: 0, esi: 0, bonus: 0, leave: 0, ot: 0, gratuity: 0, gross: 0, print: 0, screen: 0, carry: 0, taxable: 1 },
    { slot: 5, type: 'dwage', heading: 'D.Wage-5', epf: 0, esi: 0, bonus: 0, leave: 0, ot: 0, gratuity: 0, gross: 0, print: 0, screen: 0, carry: 0, taxable: 1 },
    { slot: 6, type: 'dwage', heading: 'D.Wage-6', epf: 0, esi: 0, bonus: 0, leave: 0, ot: 0, gratuity: 0, gross: 0, print: 0, screen: 0, carry: 0, taxable: 1 }
  ];

  const seeded = defaults.map(item => {
    const code = item.type === 'allowance' 
      ? `All-${item.slot.toString().padStart(2, '0')}`
      : `DW-${item.slot.toString().padStart(2, '0')}`;
    return {
      company_id: companyId,
      code,
      component_type: item.type,
      slot_number: item.slot,
      heading: item.heading,
      hindi_heading: '',
      is_gross_salary: item.gross ?? 1,
      calculation: 'Month',
      epf_status: item.epf ?? 0,
      esi_status: item.esi ?? 1,
      bonus_status: item.bonus ?? 1,
      leave_encashment: item.leave ?? 0,
      overtime_status: item.ot ?? 1,
      gratuity_status: item.gratuity ?? 0,
      shown_in_print: item.print ?? 1,
      shown_in_screen: item.screen ?? 1,
      carry_forward: item.carry ?? 1,
      is_taxable: item.taxable ?? 1,
      mode: 'Salary',
      percentage: 0,
      pct_bases: '[]'
    };
  });
  mockAllowances = [...mockAllowances, ...seeded];
  return seeded;
}

let mockDeductions = [];

function ensureDeductions(companyId) {
  const existing = mockDeductions.filter(d => d.company_id === companyId);
  if (existing.length > 0) return existing;

  const fixed = [
    { code: 'TDS',      type: 'fixed', slot: null, heading: 'T.D.S.',    carry: 0, taxable: 0, print: 1, screen: 1 },
    { code: 'ADVANCE',  type: 'fixed', slot: null, heading: 'Advance',   carry: 0, taxable: 0, print: 1, screen: 1 },
    { code: 'LOAN',     type: 'fixed', slot: null, heading: 'Loan',      carry: 0, taxable: 0, print: 1, screen: 1 },
    { code: 'LWF',      type: 'fixed', slot: null, heading: 'L.W.F.',    carry: 0, taxable: 0, print: 1, screen: 1 },
    { code: 'PROFTAX',  type: 'fixed', slot: null, heading: 'Prof.Tax',  carry: 0, taxable: 0, print: 1, screen: 1 },
  ];

  const custom = Array.from({ length: 10 }, (_, i) => ({
    code: `Ded-${String(i + 1).padStart(2, '0')}`,
    type: 'custom',
    slot: i + 1,
    heading: '',
    carry: 0,
    taxable: 0,
    print: 1,
    screen: 1,
  }));

  const seeded = [...fixed, ...custom].map(item => ({
    company_id: companyId,
    code: item.code,
    deduction_type: item.type,
    slot_number: item.slot,
    heading: item.heading,
    hindi_heading: '',
    calculation: 'Fixed',
    shown_in_print: item.print ?? 1,
    shown_in_screen: item.screen ?? 1,
    carry_forward: item.carry ?? 0,
    is_taxable: item.taxable ?? 0,
    mode: 'Salary',
    percentage: 0,
    pct_bases: '[]'
  }));

  mockDeductions = [...mockDeductions, ...seeded];
  return seeded;
}

const MOCK_PAYROLL_RUN = {
  id: 'run-001', company_id: 'comp-001', month: 4, year: 2025,
  status: 'draft', total_employees: 1, total_gross: 50000,
  total_net: 43000, total_pf_employee: 1800, total_tds: 3000, total_pt: 200
};

const MOCK_PAYROLL_DETAIL = {
  id: 'det-001', run_id: 'run-001', emp_id: 'emp-001',
  emp_code: 'EMP001', emp_name: 'Rahul Sharma',
  basic: 20000, hra: 10000, special_allowance: 20000,
  gross_salary: 50000, net_salary: 43000,
  pf_employee: 1800, esi_employee: 375, tds: 3000, pt: 200,
  total_deductions: 7000, tds_regime: 'new',
  working_days: 26, present_days: 26, lop_days: 0
};

const ok = (data) => ({ success: true, data });
const err = (msg) => ({ success: false, error: { message: msg } });

window.api = {
  auth: {
    login: async (email, password) => {
      if (email === 'admin@paysmart.com' && password === 'Admin@123') return ok(MOCK_USER);
      return err('Invalid email or password.');
    },
    updatePassword: async (userId, current, newPass) => {
      if (current !== 'Admin@123') return err('Current password is incorrect.');
      return ok({ ...MOCK_USER });
    }
  },
  company: {
    getAll: async () => ok([MOCK_COMPANY]),
    getById: async (id) => ok(MOCK_COMPANY),
    create: async (data) => ok({ ...MOCK_COMPANY, ...data, id: 'comp-new-' + Date.now() }),
    update: async (id, data) => ok({ ...MOCK_COMPANY, ...data }),
    delete: async (id) => ok({ id })
  },
  employee: {
    getAll: async () => ok([{ ...MOCK_EMPLOYEE, ...MOCK_EMPLOYEE.identity, ...MOCK_EMPLOYEE.statutory }]),
    getById: async (id) => ok(MOCK_EMPLOYEE),
    getPackage: async (id) => ok(MOCK_EMPLOYEE),
    create: async (data, identity, statutory) => ok({ ...MOCK_EMPLOYEE, ...data, id: 'emp-new-' + Date.now() }),
    update: async (id, core, identity, statutory) => ok({ ...MOCK_EMPLOYEE, ...core }),
    delete: async (id) => ok({ id }),
    getDeclaration: async (empId, finYear) => ok(null),
    saveDeclaration: async (data) => ok(data)
  },
  salary: {
    getSalaryMappings: async (companyId) => ok([{
      emp_id: 'emp-001', emp_code: 'EMP001', first_name: 'Rahul', last_name: 'Sharma',
      department: 'Engineering', designation: 'Software Engineer',
      assignment_id: 'asgn-001', structure_id: 'struct-001',
      structure_name: 'Standard Structure', ctc: 600000, monthly_ctc: 50000,
      effective_from: '2025-04-01'
    }]),
    createStructure: async (companyId, name, description, defaultCtc) => ok({
      id: 'struct-' + Date.now(), company_id: companyId, name, description,
      default_ctc: defaultCtc, is_ctc_based: 1, is_active: 1,
      effective_from: new Date().toISOString().slice(0, 10)
    }),
    getAll: async () => ok([MOCK_STRUCTURE]),
    getStructureWithComponents: async (id) => ok(MOCK_STRUCTURE),
    assignStructure: async (empId, structureId, ctc, overrides, effectiveFrom) => ok({ emp_id: empId, structure_id: structureId, ctc, monthly_ctc: ctc/12 }),
    getEmployeeSalary: async (empId) => ok({ ...MOCK_STRUCTURE, ctc: 600000, monthly_ctc: 50000, component_overrides: {} }),
    saveStructure: async (structureId, components, defaultCtc, name, description) => ok({ id: structureId, name, description, default_ctc: defaultCtc, components })
  },
  attendance: {
    get: async (empId, month, year) => ok({ emp_id: empId, month, year, present_days: 26, paid_leave_days: 0, lop_days: 0, ot_hours: 0 }),
    getCompany: async (companyId, month, year) => ok([{
      ...MOCK_EMPLOYEE, emp_id: MOCK_EMPLOYEE.id, emp_code: 'EMP001',
      first_name: 'Rahul', last_name: 'Sharma', is_ot_applicable: 0,
      present_days: 26, paid_leave_days: 0, unpaid_leave_days: 0, ot_hours: 0, notes: '',
      is_attendance_locked: 0
    }]),
    save: async (data) => {
      const working = Number(data.total_working_days);
      const present = Number(data.present_days);
      const paidLeave = Number(data.paid_leave_days);
      const calDays = Number(data.total_calendar_days) || 30;

      if (present < 0) return err(`present_days cannot be negative`);
      if (present > calDays) return err(`present_days (${present}) exceeds calendar days (${calDays})`);
      if (present > working) return err(`present_days (${present}) exceeds working_days (${working})`);
      if (paidLeave < 0) return err(`paid_leave_days cannot be negative`);
      if (present + paidLeave > working) return err(`present (${present}) + paid_leave (${paidLeave}) = ${present + paidLeave} exceeds working_days (${working})`);

      data.lop_days = Math.max(0, working - present - paidLeave);
      data.ot_hours = Math.max(0, Number(data.ot_hours) || 0);

      return ok(data);
    },
    lock: async (companyId, month, year, user) => ok({ locked: true }),
    unlock: async (companyId, month, year, user) => ok({ locked: false })
  },
  payroll: {
    getRun: async (companyId, month, year) => ok(MOCK_PAYROLL_RUN),
    getRunDetails: async (runId) => ok([MOCK_PAYROLL_DETAIL]),
    draftRun: async (companyId, month, year, operator) => ok({ runData: MOCK_PAYROLL_RUN, detailsArray: [MOCK_PAYROLL_DETAIL], overridesArray: [] }),
    executeRun: async (companyId, month, year, operator) => ok({ run: MOCK_PAYROLL_RUN, details: [MOCK_PAYROLL_DETAIL] }),
    updateStatus: async (runId, status, user) => ok({ ...MOCK_PAYROLL_RUN, status }),
    addOverride: async (override) => ok({ ...override, id: 'ov-' + Date.now() }),
    bulkFlagCheck: async (companyId, month, year) => ok({ errors: [], warnings: [] })
  },
  audit: {
    getLast: async (limit = 20, companyId = null) => ok([
      { id: 'a1', user_id: 'Admin', action: 'User logged in', entity_type: 'session', notes: null, created_at: new Date(Date.now() - 600000).toISOString() },
      { id: 'a2', user_id: 'Admin', action: 'Salary structure created', entity_type: 'salary_structures', notes: 'Standard Structure', created_at: new Date(Date.now() - 1200000).toISOString() },
      { id: 'a3', user_id: 'System', action: 'Database migrated', entity_type: 'schema', notes: '22 migrations applied', created_at: new Date(Date.now() - 3600000).toISOString() }
    ]),
    getPendingApprovals: async (companyId) => ok({ count: 0 })
  },
  report: {
    downloadPayslip: async () => ok({ path: '/tmp/payslip.pdf' }),
    downloadRegister: async () => ok({ path: '/tmp/register.xlsx' }),
    downloadPF: async () => ok({ path: '/tmp/pf.xlsx' }),
    downloadESI: async () => ok({ path: '/tmp/esi.xlsx' }),
    downloadBank: async () => ok({ path: '/tmp/bank.xlsx' }),
    selectDirectory: async () => ok('/tmp')
  },
  backup: {
    getInfo: async () => ok({
      dbPath: 'Web mode — SQLite not available',
      autoBackupDir: 'N/A (web mode)',
      exportsDir: 'N/A (web mode)',
      documentsBackupDir: null,
      lastBackup: null,
      lastExport: null,
      counts: { autoBackups: 0, migrationSnapshots: 0, payrollSnapshots: 0, sessionCheckpoints: 0, jsonExports: 0 },
      autoBackups: [],
      migrationSnapshots: [],
      payrollSnapshots: [],
      sessionCheckpoints: [],
      jsonExports: []
    }),
    createManual: async () => err('Manual backup not available in web mode.'),
    restore: async () => err('Restore not available in web mode.'),
    restoreFromPath: async () => err('Restore not available in web mode.'),
    runNow: async () => err('Backup not available in web mode.'),
    exportJSON: async () => err('JSON export not available in web mode.')
  },
  server: {
    getConfig: async () => ok({ mode: 'standalone', serverUrl: '', apiKey: '', hostPort: 7654, autoStart: false }),
    saveConfig: async () => ok({}),
    start: async () => err('Server not available in web mode.'),
    stop: async () => err('Server not available in web mode.'),
    getStatus: async () => ok({ running: false, ips: [] }),
    getClients: async () => ok([])
  },
  sync: {
    getStatus: async () => ok({ machineId: 'web-mode', mode: 'standalone', serverUrl: null, lastPullAt: null, lastPushAt: null, pendingPushCount: 0, totalSyncedCount: 0 }),
    now:  async () => err('Sync not available in web mode.'),
    push: async () => err('Sync not available in web mode.'),
    pull: async () => err('Sync not available in web mode.')
  },
  import: {
    downloadEmployeeTemplate:   async () => err('Import not available in web mode.'),
    downloadAttendanceTemplate: async () => err('Import not available in web mode.'),
    parseEmployeeFile:          async () => err('Import not available in web mode.'),
    parseAttendanceFile:        async () => err('Import not available in web mode.'),
    executeEmployees:           async () => err('Import not available in web mode.'),
    executeAttendance:          async () => err('Import not available in web mode.')
  },
  setup: {
    getAll: async (companyId) => ok({
      company: { fy_start: 2026, fy_close: 2027, epf_status: 1, epf_coverage_date: '2026-04-01' },
      epf: { epf_number: 'MHBAN00123450000000123', epf_state: 'Maharashtra', epf_district: 'Bandra', epf_office: 'Bandra Office', epf_office_address: 'EPFO Road', fps_wage: 15000, fps_amount: 1250, edli_wage: 15000, epf_ac01_pct: 12.00, fps_ac10_pct: 8.33, eps_ac01_pct: 3.67, admin_ac02_pct: 0.50, edli_ac21_pct: 0.50, edli_ac22_pct: 0.00, epf_calc_on_full: 1, fps_calc_full: 1, auth_signatory: 'MD' },
      esi: { esic_number: '31000123450001001', esic_office: 'Mumbai Office', esic_office_address: 'ESIC Marg', esic_wage_ceiling: 21000, employee_pct: 0.75, employer_pct: 3.25, employer_name: 'Acme', employer_designation: 'Director', employer_address: 'Tech Park', auth_signatory: 'Director' },
      overtime: { calculation_setting: 'Grand', calculation_type: 'Salary', overtime_paid_pct: 2.00, hours_print_in_salary: 1, hours_heading: 'OT.HR', amount_print_in_salary: 1, amount_heading: 'OT.AMT', epf_on_ot: 0, esi_on_ot: 1, esi_limit_on_ot: 1, special_calculation: 0, time_period_calculation: 'Day', hours_per_day: 8.00, wages_calculation: 'Gross', epf_in_netpay: 0, esi_in_netpay: 0, lwf_in_netpay: 0, pt_in_netpay: 0, ot_allowances_json: '[]' },
      bonus: { bonus_pct: 8.33, min_working_days: 30, bonus_limit: 7000, payment_limit: 21000 },
      gratuity: { gratuity_days: 15.00, gratuity_divide: 26.00, maximum_limit: 2000000.00 },
      factory: { factory_license_number: 'FL12345', district: 'Pune', manager_name: 'Manager A', manager_address: 'Factory Road', nature_of_work: 'Manufacturing', factory_start_date: '2026-04-01', factory_close_date: '2027-03-31', wage_for_calculation: 0.00, wage_limit: 0.00, minimum_wage: 0.00, safety_officer_required: 1, safety_officer_appointed: 0, ambulance_room: 0, canteen_provided: 0, canteen_managed: 0, rest_room_provided: 0, lunch_room_provided: 0, creches_provided: 0, welfare_officer_required: 1, welfare_officer_appointed: 0 }
    }),
    getCompany: async (companyId) => ok({ fy_start: 2026, fy_close: 2027, epf_status: 1 }),
    saveCompany: async (companyId, data) => ok(data),
    getEPF: async (companyId) => ok({ epf_number: 'MHBAN00123450000000123', epf_state: 'Maharashtra' }),
    saveEPF: async (companyId, data) => ok(data),
    getESI: async (companyId) => ok({ esic_number: '31000123450001001', esic_office: 'Mumbai Office' }),
    saveESI: async (companyId, data) => ok(data),
    getOT: async (companyId) => ok({}),
    saveOT: async (companyId, data) => ok(data),
    getBonus: async (companyId) => ok({}),
    saveBonus: async (companyId, data) => ok(data),
    getGratuity: async (companyId) => ok({}),
    saveGratuity: async (companyId, data) => ok(data),
    getFactory: async (companyId) => ok({}),
    saveFactory: async (companyId, data) => ok(data),
    getAllowances: async (companyId) => {
      ensureAllowances(companyId);
      return ok(mockAllowances.filter(a => a.company_id === companyId));
    },
    getAllowanceByCode: async (companyId, code) => {
      ensureAllowances(companyId);
      return ok(mockAllowances.find(a => a.company_id === companyId && a.code === code) || null);
    },
    saveAllowance: async (companyId, code, data) => {
      const idx = mockAllowances.findIndex(a => a.company_id === companyId && a.code === code);
      const pctBasesStr = typeof data.pct_bases === 'string' ? data.pct_bases : JSON.stringify(data.pct_bases || []);
      const record = { ...data, company_id: companyId, code, pct_bases: pctBasesStr };
      if (idx !== -1) {
        mockAllowances[idx] = { ...mockAllowances[idx], ...record };
      } else {
        mockAllowances.push(record);
      }
      return ok(record);
    },
    getAllDeductions: async (companyId) => {
      ensureDeductions(companyId);
      return ok(mockDeductions.filter(d => d.company_id === companyId));
    },
    getDeductionByCode: async (companyId, code) => {
      ensureDeductions(companyId);
      return ok(mockDeductions.find(d => d.company_id === companyId && d.code === code) || null);
    },
    saveDeduction: async (companyId, code, data) => {
      const idx = mockDeductions.findIndex(d => d.company_id === companyId && d.code === code);
      const pctBasesStr = typeof data.pct_bases === 'string' ? data.pct_bases : JSON.stringify(data.pct_bases || []);
      const record = { ...data, company_id: companyId, code, pct_bases: pctBasesStr };
      if (idx !== -1) {
        mockDeductions[idx] = { ...mockDeductions[idx], ...record };
      } else {
        mockDeductions.push(record);
      }
      return ok(record);
    }
  }
};


console.log('[MockAPI] window.api injected for web testing mode');

// Export so dynamic import in main.jsx can resolve via mockModule.default
export default window.api;
