const { round2 } = require("../../db/database");

/**
 * Calculates statutory PF and EPS contributions for an employee.
 * 
 * @param {object} company Core company configuration
 * @param {object} empStatutory Per-employee statutory configuration (Layer 2)
 * @param {number} pfWageBase Sum of earnings where is_pf_wage = 1
 * @param {object} pfConfig PF Statutory configuration (limits, percentages)
 * @returns {object} Calculated PF values and audit log
 */
function calculatePF(company, empStatutory, pfWageBase, pfConfig) {
  const log = [];
  const results = {
    pf_employee: 0,
    pf_employer: 0,
    eps_contribution: 0,
    edli_contribution: 0,
    vpf_contribution: 0
  };

  // PF Gating Check (Layer 1 & 2)
  if (!company.is_pf_registered) {
    log.push("PF is not registered at the company level. Skipping.");
    return { ...results, log };
  }
  if (!empStatutory.is_pf_enabled) {
    log.push("PF is disabled for this employee. Skipping.");
    return { ...results, log };
  }

  const {
    emp_contribution_pct,
    er_contribution_pct,
    eps_pct,
    eps_ceiling,
    edli_pct,
    wage_ceiling,
    is_ceiling_applicable
  } = pfConfig;

  // Determine PF wage basis (normally capped at Rs.15,000 unless voluntary or unlimited)
  let pfWage = pfWageBase;
  if (is_ceiling_applicable === 1) {
    pfWage = Math.min(pfWageBase, wage_ceiling);
    log.push(`Wage ceiling applicable: Capped PF Wage at ${pfWage} (Base: ${pfWageBase}, Ceiling: ${wage_ceiling})`);
  } else {
    log.push(`PF Wage set to full wage base: ${pfWage}`);
  }

  // 1. Employee PF Contribution
  let epfEmp = (pfWage * emp_contribution_pct) / 100;
  epfEmp = round2(epfEmp);
  log.push(`Employee PF: ${pfWage} * ${emp_contribution_pct}% = ${epfEmp}`);

  // Voluntary PF Contribution
  let vpf = 0;
  if (empStatutory.pf_contribution_type === "voluntary" && empStatutory.voluntary_pf_pct > 0) {
    vpf = (pfWageBase * empStatutory.voluntary_pf_pct) / 100;
    vpf = round2(vpf);
    log.push(`VPF Earning: ${pfWageBase} * ${empStatutory.voluntary_pf_pct}% = ${vpf}`);
  }

  // 2. Employer PF Contribution (normally matches 12%, split into EPS & EPF)
  let erTotal = (pfWage * er_contribution_pct) / 100;
  erTotal = round2(erTotal);

  // Employer Pension Scheme (EPS) Contribution (capped at eps_ceiling, typically Rs.1,250)
  // When PF wage is at the wage ceiling, use eps_ceiling directly because 8.33% is an
  // approximation of 1/12, and 1/12 x 15000 = 1250 exactly (EPFO standard practice).
  let eps;
  if (is_ceiling_applicable === 1 && pfWage >= wage_ceiling) {
    eps = eps_ceiling;
  } else {
    eps = round2(Math.min((pfWage * eps_pct) / 100, eps_ceiling));
  }
  log.push(`Employer EPS: Min(${pfWage} * ${eps_pct}%, ${eps_ceiling}) = ${eps}`);

  // Employer EPF contribution is the remainder of the 12% total
  let epfEr = erTotal - eps;
  epfEr = round2(Math.max(0, epfEr));
  log.push(`Employer EPF (Remainder): Total ${erTotal} - EPS ${eps} = ${epfEr}`);

  // 3. EDLI Contribution (paid by employer, typically 0.5% capped at Rs.75)
  let edli = (pfWage * edli_pct) / 100;
  edli = round2(edli);
  log.push(`Employer EDLI: ${pfWage} * ${edli_pct}% = ${edli}`);

  return {
    pf_employee: round2(epfEmp + vpf),
    pf_employer: epfEr,
    eps_contribution: eps,
    edli_contribution: edli,
    vpf_contribution: vpf,
    log
  };
}

module.exports = {
  calculatePF
};
