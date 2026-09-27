const BaseRepository = require('./base.repo');
const { newId } = require('../database');
const { setupRepo } = require('./setup.repo');

class CompanyRepository extends BaseRepository {
  constructor() {
    super('companies');
  }

  /**
   * Create a company and automatically seed its default Standard Salary Structure.
   * @param {object} companyData 
   * @returns {object} The created company
   */
  insert(companyData) {
    const transaction = this.db.transaction(() => {
      // 1. Create company record
      const company = super.insert(companyData);
      const companyId = company.id;

      // 2. Create the default "Standard Structure" salary structure
      const structureId = newId();
      const structure = {
        id: structureId,
        company_id: companyId,
        name: 'Standard Structure',
        description: 'Standard Indian CTC-based statutory payroll structure',
        is_ctc_based: 1,
        default_ctc: 0,
        applicable_employment_types: JSON.stringify(['permanent', 'probation', 'contract']),
        effective_from: (() => {
          // Derive start of the current Indian Financial Year (April 1)
          const now = new Date();
          const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
          return `${yr}-04-01`;
        })(),
        is_active: 1,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        synced: 0
      };

      const sKeys = Object.keys(structure);
      const sPlaceholders = sKeys.map(() => '?').join(', ');
      this.db.prepare(`
        INSERT INTO salary_structures (${sKeys.join(', ')})
        VALUES (${sPlaceholders})
      `).run(...Object.values(structure));
      
      this.enqueueSync('salary_structures', structureId, 'INSERT', structure);

      // 3. Define the 12 default components
      const components = [
        {
          code: 'BASIC',
          name: 'Basic Salary',
          component_type: 'earning',
          calc_type: 'pct_ctc',
          calc_value: '40',
          statutory_type: null,
          is_pf_wage: 1,
          is_esi_wage: 1,
          is_taxable: 1,
          is_exempted: 0,
          exemption_type: null,
          exemption_limit: 0,
          is_pro_rated: 1,
          is_ot_included: 0,
          display_order: 1
        },
        {
          code: 'HRA',
          name: 'House Rent Allowance',
          component_type: 'earning',
          calc_type: 'pct_basic',
          calc_value: '50',
          statutory_type: null,
          is_pf_wage: 0,
          is_esi_wage: 1,
          is_taxable: 1,
          is_exempted: 1,
          exemption_type: 'hra',
          exemption_limit: 0,
          is_pro_rated: 1,
          is_ot_included: 0,
          display_order: 2
        },
        {
          code: 'DA',
          name: 'Dearness Allowance',
          component_type: 'earning',
          calc_type: 'pct_basic',
          calc_value: '10',
          statutory_type: null,
          is_pf_wage: 1,
          is_esi_wage: 1,
          is_taxable: 1,
          is_exempted: 0,
          exemption_type: null,
          exemption_limit: 0,
          is_pro_rated: 1,
          is_ot_included: 0,
          display_order: 3
        },
        {
          code: 'CONV',
          name: 'Conveyance Allowance',
          component_type: 'earning',
          calc_type: 'fixed',
          calc_value: '1600',
          statutory_type: null,
          is_pf_wage: 0,
          is_esi_wage: 1,
          is_taxable: 1,
          is_exempted: 1,
          exemption_type: 'conveyance',
          exemption_limit: 19200,
          is_pro_rated: 0,
          is_ot_included: 0,
          display_order: 4
        },
        {
          code: 'MED',
          name: 'Medical Allowance',
          component_type: 'earning',
          calc_type: 'fixed',
          calc_value: '1250',
          statutory_type: null,
          is_pf_wage: 0,
          is_esi_wage: 1,
          is_taxable: 1,
          is_exempted: 1,
          exemption_type: 'medical',
          exemption_limit: 15000,
          is_pro_rated: 0,
          is_ot_included: 0,
          display_order: 5
        },
        {
          code: 'SA',
          name: 'Special Allowance',
          component_type: 'earning',
          calc_type: 'formula',
          calc_value: 'MONTHLY_CTC-BASIC-HRA-DA-CONV-MED',
          statutory_type: null,
          is_pf_wage: 0,
          is_esi_wage: 1,
          is_taxable: 1,
          is_exempted: 0,
          exemption_type: null,
          exemption_limit: 0,
          is_pro_rated: 1,
          is_ot_included: 0,
          display_order: 6
        },
        {
          code: 'PF_EMP',
          name: 'PF Employee',
          component_type: 'deduction',
          calc_type: 'statutory',
          calc_value: 'pf_employee',
          statutory_type: 'pf_employee',
          is_pf_wage: 0,
          is_esi_wage: 0,
          is_taxable: 0,
          is_exempted: 0,
          exemption_type: null,
          exemption_limit: 0,
          is_pro_rated: 0,
          is_ot_included: 0,
          display_order: 7
        },
        {
          code: 'PF_ER',
          name: 'PF Employer',
          component_type: 'employer_contribution',
          calc_type: 'statutory',
          calc_value: 'pf_employer',
          statutory_type: 'pf_employer',
          is_pf_wage: 0,
          is_esi_wage: 0,
          is_taxable: 0,
          is_exempted: 0,
          exemption_type: null,
          exemption_limit: 0,
          is_pro_rated: 0,
          is_ot_included: 0,
          display_order: 8
        },
        {
          code: 'ESI_EMP',
          name: 'ESI Employee',
          component_type: 'deduction',
          calc_type: 'statutory',
          calc_value: 'esi_employee',
          statutory_type: 'esi_employee',
          is_pf_wage: 0,
          is_esi_wage: 0,
          is_taxable: 0,
          is_exempted: 0,
          exemption_type: null,
          exemption_limit: 0,
          is_pro_rated: 0,
          is_ot_included: 0,
          display_order: 9
        },
        {
          code: 'ESI_ER',
          name: 'ESI Employer',
          component_type: 'employer_contribution',
          calc_type: 'statutory',
          calc_value: 'esi_employer',
          statutory_type: 'esi_employer',
          is_pf_wage: 0,
          is_esi_wage: 0,
          is_taxable: 0,
          is_exempted: 0,
          exemption_type: null,
          exemption_limit: 0,
          is_pro_rated: 0,
          is_ot_included: 0,
          display_order: 10
        },
        {
          code: 'TDS',
          name: 'TDS',
          component_type: 'deduction',
          calc_type: 'statutory',
          calc_value: 'tds',
          statutory_type: 'tds',
          is_pf_wage: 0,
          is_esi_wage: 0,
          is_taxable: 0,
          is_exempted: 0,
          exemption_type: null,
          exemption_limit: 0,
          is_pro_rated: 0,
          is_ot_included: 0,
          display_order: 11
        },
        {
          code: 'PT',
          name: 'Professional Tax',
          component_type: 'deduction',
          calc_type: 'statutory',
          calc_value: 'pt',
          statutory_type: 'pt',
          is_pf_wage: 0,
          is_esi_wage: 0,
          is_taxable: 0,
          is_exempted: 0,
          exemption_type: null,
          exemption_limit: 0,
          is_pro_rated: 0,
          is_ot_included: 0,
          display_order: 12
        }
      ];

      for (const comp of components) {
        const cId = newId();
        const componentRecord = {
          id: cId,
          structure_id: structureId,
          name: comp.name,
          code: comp.code,
          component_type: comp.component_type,
          calc_type: comp.calc_type,
          calc_value: comp.calc_value,
          statutory_type: comp.statutory_type,
          is_pf_wage: comp.is_pf_wage,
          is_esi_wage: comp.is_esi_wage,
          is_taxable: comp.is_taxable,
          is_exempted: comp.is_exempted,
          exemption_type: comp.exemption_type,
          exemption_limit: comp.exemption_limit,
          is_pro_rated: comp.is_pro_rated,
          is_ot_included: comp.is_ot_included,
          is_arrear_applicable: 1,
          is_shown_on_payslip: 1,
          is_included_in_ctc: comp.component_type === 'employer_contribution' || comp.component_type === 'earning' ? 1 : 0,
          display_label: comp.name,
          display_order: comp.display_order,
          min_value: 0,
          max_value: 0,
          is_active: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const cKeys = Object.keys(componentRecord);
        const cPlaceholders = cKeys.map(() => '?').join(', ');
        this.db.prepare(`
          INSERT INTO salary_components (${cKeys.join(', ')})
          VALUES (${cPlaceholders})
        `).run(...Object.values(componentRecord));
      }

      setupRepo.seedDefaults(companyId);
      setupRepo.seedAllowances(companyId);
      setupRepo.seedDeductions(companyId);
      setupRepo.seedAttendance(companyId);

      return company;
    });

    return transaction();
  }
}

module.exports = CompanyRepository;
