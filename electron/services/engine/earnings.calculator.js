const { round2 } = require('../../db/database');

/**
 * Safely evaluates algebraic subtraction/addition formulas from component parameters.
 * E.g., "MONTHLY_CTC-BASIC-HRA-DA-CONV-MED"
 */
function evaluateFormula(formulaStr, context) {
  let resolved = formulaStr.toUpperCase();
  
  // Replace tokens with context values
  Object.keys(context).forEach(key => {
    const regex = new RegExp(`\\b${key}\\b`, 'g');
    resolved = resolved.replace(regex, context[key]);
  });

  // Ensure expression contains only numbers, basic operators, and spaces
  if (/^[0-9+\-*/().\s]+$/.test(resolved)) {
    try {
      // Use Function constructor in isolated manner
      const calc = new Function(`return (${resolved})`);
      return round2(Math.max(0, calc()));
    } catch (e) {
      console.error(`[EarningsCalc] Formula evaluation failed: "${formulaStr}" resolved to "${resolved}"`, e);
      return 0;
    }
  }
  return 0;
}

/**
 * Calculate all earnings components for an employee.
 * @param {object} employee 
 * @param {array} components Salary components of the structure
 * @param {object} salary Employee salary definition (CTC, overrides)
 * @param {object} attendance Attendance log for the month
 * @returns {object} Calculated earnings, bases, and pro-rata pro-rate logs
 */
function calculateEarnings(employee, components, salary, attendance) {
  const overrides = salary.component_overrides || {};
  const workingDays = attendance.total_working_days;
  const lopDays = attendance.lop_days || 0;
  const monthlyCtc = salary.monthly_ctc;

  const context = {
    MONTHLY_CTC: monthlyCtc,
    CTC: salary.ctc,
    WORKING_DAYS: workingDays,
    LOP_DAYS: lopDays
  };

  const results = {};
  const computationLog = [];
  let totalGross = 0;
  let totalLopDeduction = 0;

  // Filter only earning types
  const earningsComponents = components.filter(c => c.component_type === 'earning');

  for (const comp of earningsComponents) {
    let baseAmount = 0;

    // 1. Resolve base value using Calc Type
    const code = comp.code;
    
    // Check overrides first
    if (overrides[code] !== undefined) {
      baseAmount = parseFloat(overrides[code]);
      computationLog.push(`${code}: Overridden base set to ${baseAmount}`);
    } else {
      // Setup-allowance custom percent calculation (taps into pct_bases)
      let pctBasesArray = [];
      try {
        pctBasesArray = typeof comp.pct_bases === 'string' ? JSON.parse(comp.pct_bases) : (comp.pct_bases || []);
      } catch (e) {
        pctBasesArray = [];
      }

      if (pctBasesArray && pctBasesArray.length > 0) {
        let pctBasesSum = 0;
        for (const baseCode of pctBasesArray) {
          const matchedBase = components.find(c => {
            const cCode = (c.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            const cName = (c.name || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            const bCode = baseCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
            return cCode === bCode || cName === bCode;
          });
          if (matchedBase && results[matchedBase.code] !== undefined) {
            pctBasesSum += results[matchedBase.code];
          } else if (results[baseCode] !== undefined) {
            pctBasesSum += results[baseCode];
          }
        }
        const percentage = parseFloat(comp.percentage) || 0;
        baseAmount = (pctBasesSum * percentage) / 100;
        computationLog.push(`${code}: Setup Allowance % calculation: ${percentage}% of base sum (${pctBasesSum}) = ${round2(baseAmount)}`);
      } else {
        const calcType = comp.calc_type;
        const calcVal = comp.calc_value;

        if (calcType === 'fixed') {
          baseAmount = parseFloat(calcVal);
          computationLog.push(`${code}: Fixed base set to ${baseAmount}`);
        } else if (calcType === 'pct_ctc') {
          const pct = parseFloat(calcVal) / 100;
          baseAmount = monthlyCtc * pct;
          computationLog.push(`${code}: ${calcVal}% of Monthly CTC (${monthlyCtc}) = ${round2(baseAmount)}`);
        } else if (calcType === 'pct_basic') {
          const pct = parseFloat(calcVal) / 100;
          const basic = results['BASIC'] || 0;
          baseAmount = basic * pct;
          computationLog.push(`${code}: ${calcVal}% of Basic (${basic}) = ${round2(baseAmount)}`);
        } else if (calcType === 'formula') {
          baseAmount = evaluateFormula(calcVal, { ...context, ...results });
          computationLog.push(`${code}: Formula evaluation (${calcVal}) set to ${baseAmount}`);
        }
      }
    }

    baseAmount = round2(baseAmount);

    // 2. Apply Loss-of-Pay Pro-rating if applicable
    let lopAdjustment = 0;
    let finalAmount = baseAmount;

    if (comp.is_pro_rated === 1 && lopDays > 0 && workingDays > 0) {
      lopAdjustment = round2((baseAmount / workingDays) * lopDays);
      // Ensure LOP doesn't exceed base amount
      lopAdjustment = Math.min(baseAmount, lopAdjustment);
      finalAmount = round2(baseAmount - lopAdjustment);
      totalLopDeduction += lopAdjustment;
      computationLog.push(`${code}: LOP applied. Base ${baseAmount} - Pro-rated LOP ${lopAdjustment} = ${finalAmount} (LOP days: ${lopDays}/${workingDays})`);
    } else {
      computationLog.push(`${code}: Final earning matches base = ${finalAmount}`);
    }

    results[code] = finalAmount;
    if (comp.is_included_in_gross !== 0) {
      totalGross += finalAmount;
    } else {
      computationLog.push(`${code}: Excluded from Gross Salary based on setup allowance configuration`);
    }
  }

  // 3. Compute Statutory Wage Bases based on component rules (Layer 3)
  let pfWageBase = 0;
  let esiWageBase = 0;
  let taxableBase = 0;

  for (const comp of earningsComponents) {
    const code = comp.code;
    const amount = results[code] || 0;

    if (comp.is_pf_wage === 1) {
      pfWageBase += amount;
    }
    if (comp.is_esi_wage === 1) {
      esiWageBase += amount;
    }
    if (comp.is_taxable === 1) {
      taxableBase += amount;
    }
  }

  return {
    earnings: results,
    totalGross: round2(totalGross),
    totalLopDeduction: round2(totalLopDeduction),
    pfWageBase: round2(pfWageBase),
    esiWageBase: round2(esiWageBase),
    taxableBase: round2(taxableBase),
    computationLog
  };
}

module.exports = {
  calculateEarnings
};
