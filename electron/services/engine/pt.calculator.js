const { round2 } = require('../../db/database');

/**
 * Calculates statutory state-level PT (Professional Tax) for an employee.
 * 
 * @param {object} company Core company configuration
 * @param {object} empStatutory Per-employee statutory configuration (Layer 2)
 * @param {number} grossSalary Total earned gross salary for the month
 * @param {number} month Monthly runtime (1 to 12)
 * @param {object} ptConfig PT Statutory config for the active state
 * @returns {object} Calculated PT deduction amount and audit log
 */
function calculatePT(company, empStatutory, grossSalary, month, ptConfig) {
  const log = [];
  const results = {
    pt: 0
  };

  // PT Gating Check (Layer 1 & 2)
  if (!company.is_pt_applicable) {
    log.push("PT is not applicable at the company level. Skipping.");
    return { ...results, log };
  }
  if (!empStatutory.is_pt_enabled) {
    log.push("PT is disabled for this employee. Skipping.");
    return { ...results, log };
  }

  const stateCode = empStatutory.pt_state_override || company.state_code;
  log.push(`PT State Target: ${stateCode} (Company default: ${company.state_code})`);

  if (!ptConfig || !ptConfig.slabs_json) {
    log.push(`No PT configuration found for state: ${stateCode}. Skipping.`);
    return { ...results, log };
  }

  const slabs = ptConfig.slabs_json;
  let ptAmount = 0;

  // Find corresponding slab matching gross salary
  const matchingSlab = slabs.find(slab => {
    const minMatch = grossSalary >= slab.min;
    const maxMatch = slab.max === null || slab.max === undefined || grossSalary <= slab.max;
    return minMatch && maxMatch;
  });

  if (matchingSlab) {
    ptAmount = parseFloat(matchingSlab.monthly_pt);
    log.push(`Gross income of ${grossSalary} fell in slab [${matchingSlab.min} to ${matchingSlab.max || 'above'}]. Standard PT: ${ptAmount}`);
  } else {
    log.push(`Gross income of ${grossSalary} did not match any PT slab. Defaulting to 0.`);
  }

  // Maharashtra Special Override: In Feb, PT is ₹300 instead of ₹200 for the highest slab
  if (stateCode === 'MH' && month === 2 && grossSalary > 10000) {
    ptAmount = 300;
    log.push("Maharashtra Special Rule: Month is February and gross is above 10,000. PT overridden to ₹300.");
  }

  return {
    pt: round2(ptAmount),
    log
  };
}

module.exports = {
  calculatePT
};
