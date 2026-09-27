const BaseRepository = require('./base.repo');
const { newId } = require('../database');

class EmployeeRepository extends BaseRepository {
  constructor() {
    super('employees');
  }

  /**
   * Insert employee and automatically seed identity, statutory config, and initial salary placeholder.
   * @param {object} employeeData 
   * @param {object} [identityData]
   * @param {object} [statutoryData]
   * @returns {object} The created employee
   */
  insert(employeeData, identityData = {}, statutoryData = {}) {
    const transaction = this.db.transaction(() => {
      // 1. Insert Core Employee
      const employee = super.insert(employeeData);
      const empId = employee.id;
      const companyId = employee.company_id;

      // 2. Determine Statutory Defaults based on Employment Type (Layer 2)
      let defaults = {
        is_pf_enabled: 1,
        pf_contribution_type: 'statutory',
        voluntary_pf_pct: 0,
        is_pf_er_contribution: 1,
        pf_joining_date: employee.doj,
        pf_exemption_reason: null,
        
        is_esi_enabled: 1,
        esi_joining_date: employee.doj,
        esi_dispensary: null,
        esi_exemption_reason: null,
        
        is_tds_enabled: 1,
        tds_regime: 'new',
        tds_declaration_submitted: 0,
        tds_no_deduction_cert: 0,
        
        is_pt_enabled: 1,
        pt_state_override: null,
        pt_exemption_reason: null,
        
        is_ot_applicable: 0,
        ot_multiplier: 1.5,
        ot_calc_basis: 'basic',
        
        is_gratuity_applicable: 1,
        gratuity_eligible_from: null,
        
        is_bonus_applicable: 0,
        bonus_eligibility_start: null,
        
        is_lwf_enabled: 0,
        is_advance_recovery_active: 0,
        advance_outstanding: 0,
        advance_monthly_deduction: 0
      };

      const empType = employee.employment_type || 'permanent';
      if (empType === 'contract') {
        defaults.is_pf_enabled = 0;
        defaults.pf_exemption_reason = 'Contract worker';
        defaults.is_esi_enabled = 0;
        defaults.esi_exemption_reason = 'Contract worker';
        defaults.is_gratuity_applicable = 0;
      } else if (empType === 'intern') {
        defaults.is_pf_enabled = 0;
        defaults.pf_exemption_reason = 'Stipend internship';
        defaults.is_esi_enabled = 0;
        defaults.esi_exemption_reason = 'Stipend internship';
        defaults.is_tds_enabled = 0;
        defaults.is_pt_enabled = 0;
        defaults.pt_exemption_reason = 'Intern exemption';
        defaults.is_gratuity_applicable = 0;
      }

      // Merge with custom overrides if passed
      const finalStatutory = {
        ...defaults,
        ...statutoryData,
        id: newId(),
        emp_id: empId,
        company_id: companyId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        synced: 0
      };

      // 3. Create Identity Record
      const finalIdentity = {
        pan: null,
        pan_verified: 0,
        aadhaar_last4: null,
        uan: null,
        pf_account_number: null,
        esi_insurance_number: null,
        bank_account_number: null,
        bank_ifsc: null,
        bank_name: null,
        bank_branch: null,
        account_type: 'savings',
        phone_primary: null,
        phone_alternate: null,
        email_personal: null,
        email_official: null,
        address_current: null,
        address_permanent: null,
        emergency_contact: null,
        ...identityData,
        id: newId(),
        emp_id: empId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        synced: 0
      };

      // Insert Statutory Config
      const sKeys = Object.keys(finalStatutory);
      this.db.prepare(`
        INSERT INTO employee_statutory_config (${sKeys.join(', ')})
        VALUES (${sKeys.map(() => '?').join(', ')})
      `).run(...Object.values(finalStatutory));
      this.enqueueSync('employee_statutory_config', finalStatutory.id, 'INSERT', finalStatutory);

      // Insert Identity Config
      const iKeys = Object.keys(finalIdentity);
      this.db.prepare(`
        INSERT INTO employee_identity (${iKeys.join(', ')})
        VALUES (${iKeys.map(() => '?').join(', ')})
      `).run(...Object.values(finalIdentity));
      this.enqueueSync('employee_identity', finalIdentity.id, 'INSERT', finalIdentity);

      return employee;
    });

    return transaction();
  }

  /**
   * Fetch complete employee package (Core + Identity + Statutory)
   * @param {string} empId 
   * @returns {object} Full employee object
   */
  getEmployeePackage(empId) {
    const core = this.findById(empId);
    if (!core) return null;

    const identity = this.db.prepare('SELECT * FROM employee_identity WHERE emp_id = ?').get(empId) || {};
    const statutory = this.db.prepare('SELECT * FROM employee_statutory_config WHERE emp_id = ?').get(empId) || {};
    const salary = this.db.prepare(`
      SELECT es.*, ss.name as structure_name 
      FROM employee_salary es
      JOIN salary_structures ss ON es.structure_id = ss.id
      WHERE es.emp_id = ?
      ORDER BY es.effective_from DESC LIMIT 1
    `).get(empId) || null;

    // Parse JSONs
    if (identity.address_current) identity.address_current = JSON.parse(identity.address_current);
    if (identity.address_permanent) identity.address_permanent = JSON.parse(identity.address_permanent);
    if (identity.emergency_contact) identity.emergency_contact = JSON.parse(identity.emergency_contact);

    return {
      ...core,
      identity,
      statutory,
      salary
    };
  }

  /**
   * Update full employee package (transaction-safe)
   */
  updateEmployeePackage(empId, coreData, identityData = {}, statutoryData = {}) {
    const transaction = this.db.transaction(() => {
      // 1. Update Core
      if (Object.keys(coreData).length > 0) {
        this.update(empId, coreData);
      }

      // 2. Update Identity
      if (Object.keys(identityData).length > 0) {
        const identity = this.db.prepare('SELECT id FROM employee_identity WHERE emp_id = ?').get(empId);
        if (identity) {
          // Serialize JSONs
          const formatted = { ...identityData };
          if (formatted.address_current) formatted.address_current = JSON.stringify(formatted.address_current);
          if (formatted.address_permanent) formatted.address_permanent = JSON.stringify(formatted.address_permanent);
          if (formatted.emergency_contact) formatted.emergency_contact = JSON.stringify(formatted.emergency_contact);

          const keys = Object.keys(formatted);
          const assignments = keys.map(k => `${k} = ?`).join(', ');
          this.db.prepare(`
            UPDATE employee_identity SET ${assignments}, updated_at = datetime('now'), synced = 0 WHERE id = ?
          `).run(...Object.values(formatted), identity.id);

          const updatedId = this.db.prepare('SELECT * FROM employee_identity WHERE id = ?').get(identity.id);
          this.enqueueSync('employee_identity', identity.id, 'UPDATE', updatedId);
        }
      }

      // 3. Update Statutory Config
      if (Object.keys(statutoryData).length > 0) {
        const statutory = this.db.prepare('SELECT id FROM employee_statutory_config WHERE emp_id = ?').get(empId);
        if (statutory) {
          const keys = Object.keys(statutoryData);
          const assignments = keys.map(k => `${k} = ?`).join(', ');
          this.db.prepare(`
            UPDATE employee_statutory_config SET ${assignments}, updated_at = datetime('now'), synced = 0 WHERE id = ?
          `).run(...Object.values(statutoryData), statutory.id);

          const updatedStat = this.db.prepare('SELECT * FROM employee_statutory_config WHERE id = ?').get(statutory.id);
          this.enqueueSync('employee_statutory_config', statutory.id, 'UPDATE', updatedStat);
        }
      }

      return this.getEmployeePackage(empId);
    });

    return transaction();
  }

  /**
   * Save investment declaration for Old Tax Regime.
   */
  saveInvestmentDeclaration(declaration) {
    const { emp_id, fin_year } = declaration;
    const existing = this.db.prepare('SELECT id FROM employee_investment_declaration WHERE emp_id = ? AND fin_year = ?')
      .get(emp_id, fin_year);

    if (existing) {
      const keys = Object.keys(declaration).filter(k => k !== 'id' && k !== 'emp_id' && k !== 'fin_year');
      const assignments = keys.map(k => `${k} = ?`).join(', ');
      this.db.prepare(`
        UPDATE employee_investment_declaration 
        SET ${assignments}, updated_at = datetime('now')
        WHERE id = ?
      `).run(...keys.map(k => declaration[k]), existing.id);
      return this.db.prepare('SELECT * FROM employee_investment_declaration WHERE id = ?').get(existing.id);
    } else {
      const id = newId();
      const record = {
        id,
        ...declaration,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const keys = Object.keys(record);
      this.db.prepare(`
        INSERT INTO employee_investment_declaration (${keys.join(', ')})
        VALUES (${keys.map(() => '?').join(', ')})
      `).run(...Object.values(record));
      return record;
    }
  }

  /**
   * Fetch employee's tax declaration.
   */
  getInvestmentDeclaration(empId, finYear) {
    return this.db.prepare('SELECT * FROM employee_investment_declaration WHERE emp_id = ? AND fin_year = ?')
      .get(empId, finYear) || null;
  }
}

module.exports = EmployeeRepository;
