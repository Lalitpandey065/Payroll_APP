const BaseRepository = require('./base.repo');
const { getDB, newId } = require('../database');

class SetupRepository extends BaseRepository {
  constructor() {
    super('setup_company');
  }

  // Generic upsert pattern for all 7 setup tables
  upsertSetup(tableName, companyId, data) {
    const db = getDB();
    const existing = db.prepare(`SELECT id FROM ${tableName} WHERE company_id = ?`).get(companyId);
    if (existing) {
      const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
      db.prepare(`UPDATE ${tableName} SET ${fields}, updated_at = datetime('now'), synced = 0 WHERE company_id = ?`)
        .run(...Object.values(data), companyId);
      return { id: existing.id, ...data };
    } else {
      const id = newId();
      const keys = ['id', 'company_id', ...Object.keys(data)].join(', ');
      const placeholders = ['?', '?', ...Object.keys(data).map(() => '?')].join(', ');
      db.prepare(`INSERT INTO ${tableName} (${keys}) VALUES (${placeholders})`)
        .run(id, companyId, ...Object.values(data));
      return { id, company_id: companyId, ...data };
    }
  }

  getSetup(tableName, companyId) {
    return getDB().prepare(`SELECT * FROM ${tableName} WHERE company_id = ?`).get(companyId) || null;
  }

  // Convenience methods per tab
  getCompanySetup(companyId)  { return this.getSetup('setup_company', companyId); }
  saveCompanySetup(cid, data) { return this.upsertSetup('setup_company', cid, data); }

  getEPFSetup(companyId)      { return this.getSetup('setup_epf', companyId); }
  saveEPFSetup(cid, data)     { return this.upsertSetup('setup_epf', cid, data); }

  getESISetup(companyId)      { return this.getSetup('setup_esi', companyId); }
  saveESISetup(cid, data)     { return this.upsertSetup('setup_esi', cid, data); }

  getOTSetup(companyId)       { return this.getSetup('setup_overtime', companyId); }
  saveOTSetup(cid, data)      { return this.upsertSetup('setup_overtime', cid, data); }

  getBonusSetup(companyId)    { return this.getSetup('setup_bonus', companyId); }
  saveBonusSetup(cid, data)   { return this.upsertSetup('setup_bonus', cid, data); }

  getGratuitySetup(companyId) { return this.getSetup('setup_gratuity', companyId); }
  saveGratuitySetup(cid, data){ return this.upsertSetup('setup_gratuity', cid, data); }

  getFactorySetup(companyId)  { return this.getSetup('setup_factory', companyId); }
  saveFactorySetup(cid, data) { return this.upsertSetup('setup_factory', cid, data); }

  getAllowances(companyId) {
    const db = getDB();
    const rows = db.prepare(`
      SELECT * FROM setup_allowances 
      WHERE company_id = ? 
      ORDER BY component_type ASC, slot_number ASC
    `).all(companyId);

    if (rows.length > 0) {
      return rows;
    }

    // Seed defaults if not present
    this.seedAllowances(companyId);

    return db.prepare(`
      SELECT * FROM setup_allowances 
      WHERE company_id = ? 
      ORDER BY component_type ASC, slot_number ASC
    `).all(companyId);
  }

  getAllowanceByCode(companyId, code) {
    this.getAllowances(companyId);
    return getDB().prepare(`
      SELECT * FROM setup_allowances 
      WHERE company_id = ? AND code = ?
    `).get(companyId, code) || null;
  }

  saveAllowance(companyId, code, data) {
    if (!data.heading?.trim()) throw new Error('Heading is required');
    if (data.percentage !== undefined && (data.percentage < 0 || data.percentage > 100)) {
      throw new Error('Percentage must be between 0 and 100');
    }

    this.getAllowances(companyId);
    const db = getDB();
    const existing = db.prepare('SELECT id FROM setup_allowances WHERE company_id = ? AND code = ?').get(companyId, code);
    
    // Ensure pct_bases is serialized if it is passed as array or object
    const pctBasesStr = typeof data.pct_bases === 'string' ? data.pct_bases : JSON.stringify(data.pct_bases || []);
    
    const updateData = { ...data, pct_bases: pctBasesStr };
    delete updateData.company_id;
    delete updateData.code;
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.updated_at;

    if (existing) {
      const keys = Object.keys(updateData);
      const fields = keys.map(k => `${k} = ?`).join(', ');
      db.prepare(`
        UPDATE setup_allowances 
        SET ${fields}, updated_at = datetime('now') 
        WHERE company_id = ? AND code = ?
      `).run(...Object.values(updateData), companyId, code);
      return { id: existing.id, company_id: companyId, code, ...updateData };
    } else {
      const allData = { company_id: companyId, code, ...updateData };
      const keys = Object.keys(allData).join(', ');
      const placeholders = Object.keys(allData).map(() => '?').join(', ');
      db.prepare(`INSERT INTO setup_allowances (${keys}) VALUES (${placeholders})`)
        .run(...Object.values(allData));
      return allData;
    }
  }

  seedAllowances(companyId) {
    const db = getDB();
    const existing = db.prepare('SELECT 1 FROM setup_allowances WHERE company_id = ? LIMIT 1').get(companyId);
    if (existing) return;

    const insertStmt = db.prepare(`
      INSERT INTO setup_allowances (
        company_id, code, component_type, slot_number, heading,
        epf_status, esi_status, bonus_status, leave_encashment,
        overtime_status, gratuity_status, shown_in_print, shown_in_screen,
        carry_forward, is_taxable, pct_bases
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const allowanceDefaults = [
      { slot: 1, type: 'allowance', heading: 'BASIC',   epf: 1, esi: 1, bonus: 1, leave: 1, ot: 1, gratuity: 1, gross: 1, print: 1, screen: 1, carry: 1, taxable: 1, pct_bases: '[]' },
      { slot: 2, type: 'allowance', heading: 'H.R.A.',  epf: 0, esi: 1, bonus: 1, leave: 0, ot: 1, gratuity: 0, gross: 1, print: 1, screen: 1, carry: 1, taxable: 1, pct_bases: '[]' },
      { slot: 3, type: 'allowance', heading: 'CONVEY.', epf: 0, esi: 1, bonus: 1, leave: 0, ot: 1, gratuity: 0, gross: 1, print: 1, screen: 1, carry: 1, taxable: 1, pct_bases: '[]' },
      { slot: 4, type: 'allowance', heading: 'HEA',     epf: 0, esi: 1, bonus: 1, leave: 0, ot: 1, gratuity: 0, gross: 1, print: 1, screen: 1, carry: 1, taxable: 1, pct_bases: '[]' },
      { slot: 5, type: 'allowance', heading: 'SPLALL',  epf: 0, esi: 1, bonus: 1, leave: 0, ot: 1, gratuity: 0, gross: 1, print: 1, screen: 1, carry: 0, taxable: 1, pct_bases: '[]' },
      ...Array.from({ length: 25 }, (_, i) => ({
        slot: i + 6, type: 'allowance', heading: '', epf: 0, esi: 0, bonus: 0, leave: 0, ot: 0, gratuity: 0, gross: 1, print: 1, screen: 1, carry: 1, taxable: 1, pct_bases: '[]'
      })),
      { slot: 1, type: 'dwage', heading: 'D.Wage-1', epf: 0, esi: 1, bonus: 1, leave: 1, ot: 1, gratuity: 1, gross: 1, print: 1, screen: 1, carry: 1, taxable: 1, pct_bases: '[]' },
      { slot: 2, type: 'dwage', heading: 'D.Wage-2', epf: 0, esi: 0, bonus: 0, leave: 0, ot: 0, gratuity: 0, gross: 0, print: 0, screen: 0, carry: 0, taxable: 1, pct_bases: '[]' },
      { slot: 3, type: 'dwage', heading: 'D.Wage-3', epf: 0, esi: 0, bonus: 0, leave: 0, ot: 0, gratuity: 0, gross: 0, print: 0, screen: 0, carry: 0, taxable: 1, pct_bases: '[]' },
      { slot: 4, type: 'dwage', heading: 'D.Wage-4', epf: 0, esi: 0, bonus: 0, leave: 0, ot: 0, gratuity: 0, gross: 0, print: 0, screen: 0, carry: 0, taxable: 1, pct_bases: '[]' },
      { slot: 5, type: 'dwage', heading: 'D.Wage-5', epf: 0, esi: 0, bonus: 0, leave: 0, ot: 0, gratuity: 0, gross: 0, print: 0, screen: 0, carry: 0, taxable: 1, pct_bases: '[]' },
      { slot: 6, type: 'dwage', heading: 'D.Wage-6', epf: 0, esi: 0, bonus: 0, leave: 0, ot: 0, gratuity: 0, gross: 0, print: 0, screen: 0, carry: 0, taxable: 1, pct_bases: '[]' }
    ];

    const dbTx = db.transaction(() => {
      for (const item of allowanceDefaults) {
        const code = item.type === 'allowance' 
          ? `All-${item.slot.toString().padStart(2, '0')}`
          : `DW-${item.slot.toString().padStart(2, '0')}`;
        
        insertStmt.run(
          companyId,
          code,
          item.type,
          item.slot,
          item.heading,
          item.epf,
          item.esi,
          item.bonus,
          item.leave,
          item.ot,
          item.gratuity,
          item.print,
          item.screen,
          item.carry,
          item.taxable,
          item.pct_bases
        );
      }
    });
    dbTx();
  }

  getDeductions(companyId) {
    const db = getDB();
    const rows = db.prepare(`
      SELECT * FROM setup_deductions 
      WHERE company_id = ? 
      ORDER BY 
        CASE deduction_type WHEN 'fixed' THEN 0 ELSE 1 END ASC,
        slot_number ASC
    `).all(companyId);

    if (rows.length > 0) {
      return rows;
    }

    // Seed defaults if not present
    this.seedDeductions(companyId);

    return db.prepare(`
      SELECT * FROM setup_deductions 
      WHERE company_id = ? 
      ORDER BY 
        CASE deduction_type WHEN 'fixed' THEN 0 ELSE 1 END ASC,
        slot_number ASC
    `).all(companyId);
  }

  getAllDeductions(companyId) {
    return this.getDeductions(companyId);
  }

  getDeductionByCode(companyId, code) {
    this.getDeductions(companyId);
    return getDB().prepare(`
      SELECT * FROM setup_deductions 
      WHERE company_id = ? AND code = ?
    `).get(companyId, code) || null;
  }

  saveDeduction(companyId, code, data) {
    if (!data.heading?.trim()) throw new Error('Heading is required');
    if (data.percentage !== undefined && (data.percentage < 0 || data.percentage > 100)) {
      throw new Error('Percentage must be between 0 and 100');
    }

    this.getDeductions(companyId);
    const db = getDB();
    const existing = db.prepare('SELECT id FROM setup_deductions WHERE company_id = ? AND code = ?').get(companyId, code);
    
    // Ensure pct_bases is serialized if it is passed as array or object
    const pctBasesStr = typeof data.pct_bases === 'string' ? data.pct_bases : JSON.stringify(data.pct_bases || []);
    
    const updateData = { ...data, pct_bases: pctBasesStr };
    delete updateData.company_id;
    delete updateData.code;
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.updated_at;

    if (existing) {
      const keys = Object.keys(updateData);
      const fields = keys.map(k => `${k} = ?`).join(', ');
      db.prepare(`
        UPDATE setup_deductions 
        SET ${fields}, updated_at = datetime('now') 
        WHERE company_id = ? AND code = ?
      `).run(...Object.values(updateData), companyId, code);
      return { id: existing.id, company_id: companyId, code, ...updateData };
    } else {
      const allData = { company_id: companyId, code, ...updateData };
      const keys = Object.keys(allData).join(', ');
      const placeholders = Object.keys(allData).map(() => '?').join(', ');
      db.prepare(`INSERT INTO setup_deductions (${keys}) VALUES (${placeholders})`)
        .run(...Object.values(allData));
      return allData;
    }
  }

  seedDeductions(companyId) {
    const db = getDB();
    const existing = db.prepare('SELECT 1 FROM setup_deductions WHERE company_id = ? LIMIT 1').get(companyId);
    if (existing) return;

    const insertStmt = db.prepare(`
      INSERT INTO setup_deductions (
        company_id, code, deduction_type, slot_number, heading, calculation,
        shown_in_print, shown_in_screen, carry_forward, is_taxable, pct_bases
      ) VALUES (?, ?, ?, ?, ?, 'Fixed', ?, ?, ?, ?, '[]')
    `);

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

    const dbTx = db.transaction(() => {
      for (const item of [...fixed, ...custom]) {
        insertStmt.run(
          companyId,
          item.code,
          item.type,
          item.slot,
          item.heading,
          item.print,
          item.screen,
          item.carry,
          item.taxable
        );
      }
    });
    dbTx();
  }

  // Get ALL setup for a company in one call (used by payroll engine)
  seedAttendance(companyId) {
    const rows = [
      { code: 'WORKING_DAYS',   sort: 1,  label: 'Working Days',        heading: 'Workday',  hindi: '' },
      { code: 'WEEKLY_OFF',     sort: 2,  label: 'Weekly Off',          heading: 'WeekOff',  hindi: '' },
      { code: 'FESTIVAL_HOL',   sort: 3,  label: 'Festival Holiday',    heading: 'N.F.H.',   hindi: '' },
      { code: 'EARNED_LEAVE',   sort: 4,  label: 'Earned Leave',        heading: 'E.L.',     hindi: '' },
      { code: 'CASUAL_LEAVE',   sort: 5,  label: 'Casual Leave',        heading: 'C.L.',     hindi: '' },
      { code: 'SICK_LEAVE',     sort: 6,  label: 'Sick Leave',          heading: 'S.L.',     hindi: '' },
      { code: 'COMP_OFF',       sort: 7,  label: 'Compensatory Leave',  heading: 'CompOff',  hindi: '' },
      { code: 'MATERNITY',      sort: 8,  label: 'Maternity Leave',     heading: 'Matern.',  hindi: '' },
      { code: 'OTHER_LEAVE',    sort: 9,  label: 'Other Leave',         heading: 'Patern.',  hindi: '' },
      { code: 'LOP',            sort: 10, label: 'L.O.P.',              heading: 'L.O.P.',   hindi: '' },
      { code: 'PAID_DAYS',      sort: 11, label: 'Paid Days',           heading: 'PaidDay',  hindi: '' },
    ];

    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO setup_attendance
        (company_id, code, sort_order, field_label, heading, hindi_heading)
      VALUES
        (@company_id, @code, @sort, @label, @heading, @hindi)
    `);

    const insertAll = this.db.transaction((rows) => {
      for (const r of rows) insert.run({ company_id: companyId, ...r });
    });

    insertAll(rows);
  }

  getAttendanceSetup(companyId) {
    return this.db.prepare(`
      SELECT * FROM setup_attendance
      WHERE company_id = ?
      ORDER BY sort_order ASC
    `).all(companyId);
  }

  saveAttendanceSetup(companyId, rows) {
    for (const r of rows) {
      if (!r.heading?.trim()) throw new Error('All headings are required');
    }

    const upsert = this.db.prepare(`
      INSERT INTO setup_attendance
        (company_id, code, sort_order, field_label, heading, hindi_heading, updated_at)
      VALUES
        (@company_id, @code, @sort_order, @field_label, @heading, @hindi_heading, datetime('now'))
      ON CONFLICT(company_id, code)
      DO UPDATE SET
        heading       = excluded.heading,
        hindi_heading = excluded.hindi_heading,
        updated_at    = datetime('now')
    `);

    const saveAll = this.db.transaction((rows) => {
      for (const r of rows) upsert.run({ company_id: companyId, ...r });
    });

    saveAll(rows);
    return { success: true };
  }

  getAllSetup(companyId) {
    return {
      company:  this.getCompanySetup(companyId),
      epf:      this.getEPFSetup(companyId),
      esi:      this.getESISetup(companyId),
      overtime: this.getOTSetup(companyId),
      bonus:    this.getBonusSetup(companyId),
      gratuity: this.getGratuitySetup(companyId),
      factory:  this.getFactorySetup(companyId),
    };
  }

  // Auto-seed defaults when company is created
  seedDefaults(companyId) {
    const db = getDB();
    const seedTx = db.transaction(() => {
      this.saveCompanySetup(companyId, { fy_start: new Date().getFullYear(), fy_close: new Date().getFullYear() + 1, epf_status: 1, fps_status: 1, edli_status: 1, esi_status: 1, lwf_status: 0, pt_status: 0 });
      this.saveEPFSetup(companyId, { fps_wage: 15000, fps_amount: 1250, edli_wage: 15000, epf_ac01_pct: 12, fps_ac10_pct: 8.33, eps_ac01_pct: 3.67, admin_ac02_pct: 0.50, edli_ac21_pct: 0.50, edli_ac22_pct: 0, epf_calc_on_full: 1, fps_calc_full: 1 });
      this.saveESISetup(companyId, { esic_wage_ceiling: 21000, employee_pct: 0.75, employer_pct: 3.25 });
      this.saveOTSetup(companyId, { calculation_setting: 'Grand', calculation_type: 'Salary', overtime_paid_pct: 2.00, hours_print_in_salary: 1, hours_heading: 'OT.HR', amount_print_in_salary: 1, amount_heading: 'OT.AMT', epf_on_ot: 0, esi_on_ot: 1, esi_limit_on_ot: 1, time_period_calculation: 'Day', hours_per_day: 8, wages_calculation: 'Gross', ot_allowances_json: '[]' });
      this.saveBonusSetup(companyId, { bonus_pct: 8.33, min_working_days: 30, bonus_limit: 7000, payment_limit: 21000 });
      this.saveGratuitySetup(companyId, { gratuity_days: 15, gratuity_divide: 26, maximum_limit: 2000000 });
      this.saveFactorySetup(companyId, { safety_officer_required: 1, safety_officer_appointed: 0, ambulance_room: 0, canteen_provided: 0, canteen_managed: 0, rest_room_provided: 0, lunch_room_provided: 0, creches_provided: 0, welfare_officer_required: 1, welfare_officer_appointed: 0 });
    });
    seedTx();
  }
}

const setupRepo = new SetupRepository();
module.exports = {
  SetupRepository,
  setupRepo
};
