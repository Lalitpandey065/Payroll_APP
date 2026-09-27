const { round2 } = require('../../db/database');

/**
 * Calculates statutory ESI contributions for an employee.
 * 
 * @param {object} company Core company configuration
 * @param {object} empStatutory Per-employee statutory configuration (Layer 2)
 * @param {number} esiWageBase Sum of earnings where is_esi_wage = 1
 * @param {object} esiConfig ESI Statutory configuration (ceilings, percentages)
 * @returns {object} Calculated ESI values, ceiling flags, and audit log
 */
function calculateESI(company, empStatutory, esiWageBase, esiConfig) {
  const log = [];
  const results = {
    esi_employee: 0,
    esi_employer: 0,
    esi_ceiling_crossed: 0
  };

  // ESI Gating Check (Layer 1 & 2)
  if (!company.is_esi_registered) {
    log.push("ESI is not registered at the company level. Skipping.");
    return { ...results, log };
  }
  if (!empStatutory.is_esi_enabled) {
    log.push("ESI is disabled for this employee. Skipping.");
    return { ...results, log };
  }

  const {
    emp_contribution_pct,
    er_contribution_pct,
    gross_ceiling
  } = esiConfig;

  // ESI Gross wage ceiling check
  if (esiWageBase > gross_ceiling) {
    log.push(`ESI Wage Base (${esiWageBase}) exceeds the ESI statutory ceiling (${gross_ceiling}). Skipping ESI.`);
    return {
      ...results,
      esi_ceiling_crossed: 1,
      log
    };
  }

  // Calculate Employee Share (normally 0.75%)
  let esiEmp = (esiWageBase * emp_contribution_pct) / 100;
  // Standard Indian ESI rules require rounding up to next rupee, but round2 is acceptable or standard
  esiEmp = round2(esiEmp);
  log.push(`Employee ESI: ${esiWageBase} * ${emp_contribution_pct}% = ${esiEmp}`);

  // Calculate Employer Share (normally 3.25%)
  let esiEr = (esiWageBase * er_contribution_pct) / 100;
  esiEr = round2(esiEr);
  log.push(`Employer ESI: ${esiWageBase} * ${er_contribution_pct}% = ${esiEr}`);

  return {
    esi_employee: esiEmp,
    esi_employer: esiEr,
    esi_ceiling_crossed: 0,
    log
  };
}

module.exports = {
  calculateESI
};
