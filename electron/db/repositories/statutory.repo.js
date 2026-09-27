const BaseRepository = require("./base.repo");

class StatutoryRepository extends BaseRepository {
  constructor() {
    super("statutory_pf_config");
  }

  /**
   * Fetch active EPF config for a company-date.
   */
  getPFConfig(companyId, dateStr = "2025-04-01") {
    const row = this.db.prepare(`
      SELECT * FROM statutory_pf_config
      WHERE (company_id = ? OR company_id IS NULL)
        AND effective_from <= ?
        AND (effective_to IS NULL OR effective_to >= ?)
      ORDER BY company_id DESC, effective_from DESC LIMIT 1
    `).get(companyId, dateStr, dateStr);

    return row || null;
  }

  /**
   * Fetch active ESI config.
   */
  getESIConfig(companyId, dateStr = "2025-04-01") {
    const row = this.db.prepare(`
      SELECT * FROM statutory_esi_config
      WHERE (company_id = ? OR company_id IS NULL)
        AND effective_from <= ?
        AND (effective_to IS NULL OR effective_to >= ?)
      ORDER BY company_id DESC, effective_from DESC LIMIT 1
    `).get(companyId, dateStr, dateStr);

    return row || null;
  }

  /**
   * Fetch Professional Tax slab configs for a state.
   */
  getPTConfig(stateCode) {
    const row = this.db.prepare(`
      SELECT * FROM statutory_pt_config
      WHERE state_code = ? AND has_pt = 1
    `).get(stateCode);

    if (row && row.slabs_json) {
      row.slabs_json = JSON.parse(row.slabs_json);
    }
    return row || null;
  }

  /**
   * Fetch TDS slabs and surcharge configs.
   */
  getTDSConfig(finYear, regime) {
    const row = this.db.prepare(`
      SELECT * FROM statutory_tds_config
      WHERE fin_year = ? AND regime = ?
    `).get(finYear, regime);

    if (row) {
      row.slabs_json = JSON.parse(row.slabs_json);
      row.surcharge_json = JSON.parse(row.surcharge_json);
    }
    return row || null;
  }

  /**
   * Calculate Year-To-Date (YTD) cumulative values for an employee in the current financial year.
   * Indian FY: April to March.
   */
  getYTDMetrics(empId, finYear = "2025-26") {
    const [startYearStr, endYearStr] = finYear.split("-");
    // startYearStr is already a 4-digit year e.g. "2025"; endYearStr is 2-digit e.g. "26"
    const startYear = parseInt(startYearStr);
    const endYear = parseInt("20" + endYearStr);

    // Runs in April-Dec of startYear OR Jan-Mar of endYear
    const rows = this.db.prepare(`
      SELECT pd.* 
      FROM payroll_details pd
      JOIN payroll_runs pr ON pd.run_id = pr.id
      WHERE pd.emp_id = ?
        AND pr.status IN ('approved', 'locked')
        AND (
          (pr.year = ? AND pr.month >= 4)
          OR 
          (pr.year = ? AND pr.month <= 3)
        )
    `).all(empId, startYear, endYear);

    const totals = {
      ytd_gross: 0,
      ytd_pf_employee: 0,
      ytd_esi_employee: 0,
      ytd_tds: 0,
      ytd_pt: 0,
      ytd_net: 0,
      ytd_months_worked: rows.length
    };

    for (const r of rows) {
      totals.ytd_gross += r.gross_salary;
      totals.ytd_pf_employee += r.pf_employee;
      totals.ytd_esi_employee += r.esi_employee;
      totals.ytd_tds += r.tds;
      totals.ytd_pt += r.pt;
      totals.ytd_net += r.net_salary;
    }

    return totals;
  }
}

module.exports = StatutoryRepository;
