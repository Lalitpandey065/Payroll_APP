const PayrollRepository = require('../db/repositories/payroll.repo');
const { processPayroll } = require('./engine/payroll.engine');
const { getDB } = require('../db/database');

const payrollRepo = new PayrollRepository();

class PayrollService {
  get db() {
    return getDB();
  }

  getPayrollRun(companyId, month, year, runType = 'regular') {
    return payrollRepo.getPayrollRun(companyId, month, year, runType);
  }

  getRunDetails(runId) {
    return payrollRepo.getRunDetails(runId);
  }

  addOverride(override) {
    return payrollRepo.addOverride(override);
  }

  getEmployeeOverrides(runId, empId) {
    return payrollRepo.getEmployeeOverrides(runId, empId);
  }

  updateRunStatus(runId, status, actionBy) {
    return payrollRepo.updateRunStatus(runId, status, actionBy);
  }

  /**
   * Run a dry run calculation of payroll for review (no database commit).
   */
  calculateDraftPayroll(companyId, month, year, operatorName) {
    return processPayroll(companyId, month, year, operatorName);
  }

  /**
   * Run payroll calculations and persist the results (run summary, snaps, and overrides) to SQLite.
   */
  executeAndSavePayroll(companyId, month, year, operatorName) {
    // 1. Run engine calculations
    const computed = processPayroll(companyId, month, year, operatorName);
    
    // 2. Commit the entire transaction
    const savedRun = payrollRepo.savePayrollRunAndDetails(
      computed.runData,
      computed.detailsArray,
      computed.overridesArray
    );

    return {
      run: savedRun,
      details: computed.detailsArray
    };
  }

  /**
   * Performs automatic audits on configurations before payroll runs.
   * Fulfills crucial PRE-RUN FLAG CHECK requirement.
   */
  bulkFlagCheck(companyId, month, year) {
    const employees = this.db.prepare(`
      SELECT * FROM employees 
      WHERE company_id = ? AND status = 'active' AND deleted_at IS NULL
    `).all(companyId);

    const issues = {
      errors: [],   // Blocking issues
      warnings: []  // Non-blocking alerts
    };

    for (const emp of employees) {
      const empId = emp.id;
      const code = emp.emp_code;
      const name = `${emp.first_name} ${emp.last_name}`;

      // A. Check Salary Structure Assigned
      const salary = this.db.prepare('SELECT 1 FROM employee_salary WHERE emp_id = ?').get(empId);
      if (!salary) {
        issues.errors.push(`[${code}] ${name} has no salary structure assigned.`);
      }

      // B. Check Statutory configuration (Layer 2 flags)
      const statutory = this.db.prepare('SELECT * FROM employee_statutory_config WHERE emp_id = ?').get(empId);
      if (!statutory) {
        issues.errors.push(`[${code}] ${name} is missing Layer 2 statutory configuration.`);
      }

      // C. Identity Checks
      const identity = this.db.prepare('SELECT * FROM employee_identity WHERE emp_id = ?').get(empId);
      if (!identity || !identity.pan) {
        issues.warnings.push(`[${code}] ${name} has no PAN card. Standard 20% TDS may apply if tax bracket is exceeded.`);
      }

      if (statutory && statutory.is_pf_enabled === 1) {
        if (!identity || !identity.uan) {
          issues.warnings.push(`[${code}] ${name} has PF enabled but is missing a UAN.`);
        }
      }

      // D. Attendance Audit
      const attendance = this.db.prepare(`
        SELECT 1 FROM attendance_logs
        WHERE emp_id = ? AND month = ? AND year = ?
      `).get(empId, month, year);

      if (!attendance) {
        issues.warnings.push(`[${code}] ${name} is missing attendance. The engine will automatically calculate full working month.`);
      }
    }

    return issues;
  }
}

module.exports = new PayrollService();
