const { round2 } = require('../../db/database');

/**
 * Get remaining months in Indian fiscal year (April - March) including the current month.
 * @param {number} month Current month (1 to 12)
 * @returns {number} Months remaining in the fiscal year
 */
function getMonthsRemaining(month) {
  if (month >= 4) {
    return 12 - (month - 4);
  } else {
    return 3 - (month - 1);
  }
}

/**
 * Calculates statutory monthly TDS (Tax Deducted at Source) for an employee.
 * 
 * @param {object} company Core company configuration
 * @param {object} empStatutory Per-employee statutory configuration (Layer 2)
 * @param {object} employee Core employee info (DOB, Age)
 * @param {number} monthlyTaxableGross Current month's gross taxable income
 * @param {object} ytdMetrics Year-to-Date cumulative aggregates
 * @param {number} month Current month (1 to 12)
 * @param {object} tdsConfig Tax config (slabs, cess, standard deduction)
 * @param {object} [declaration] Investment declaration for Old regime
 * @param {object} [monthlyEarnings] Full monthly earnings mapping (Basic, HRA snapshots for exemption checks)
 * @returns {object} Calculated TDS, annual estimates, and audit log
 */
function calculateTDS(company, empStatutory, employee, monthlyTaxableGross, ytdMetrics, month, tdsConfig, declaration = null, monthlyEarnings = {}) {
  const log = [];
  const results = {
    tds: 0,
    annual_gross: 0,
    annual_taxable: 0,
    annual_tax_liability: 0
  };

  // TDS Gating Check (Layer 1 & 2)
  if (!company.is_tds_deductor) {
    log.push("Company is not a TDS deductor. Skipping.");
    return { ...results, log };
  }
  if (!empStatutory.is_tds_enabled) {
    log.push("TDS is disabled for this employee. Skipping.");
    return { ...results, log };
  }
  if (!tdsConfig) {
    log.push(`TDS configuration not found for fiscal year. Skipping.`);
    return { ...results, log };
  }

  const regime = empStatutory.tds_regime || 'new';
  const monthsRemaining = getMonthsRemaining(month);
  
  log.push(`TDS Calculation Details: Regime: ${regime}, Months Remaining in FY: ${monthsRemaining} (current month: ${month})`);

  // 1. Project Annual Gross Taxable Income
  const projectedGross = ytdMetrics.ytd_gross + (monthlyTaxableGross * monthsRemaining);
  log.push(`Projected Annual Gross: YTD ${ytdMetrics.ytd_gross} + (Current Taxable Earning ${monthlyTaxableGross} * remaining ${monthsRemaining}) = ${projectedGross}`);

  let netTaxableIncome = projectedGross;
  let totalDeductions = 0;

  // 2. Apply Standard Deduction
  const stdDeduction = tdsConfig.standard_deduction || 0;
  netTaxableIncome -= stdDeduction;
  totalDeductions += stdDeduction;
  log.push(`Applied Standard Deduction: -${stdDeduction}. Intermediate Taxable: ${netTaxableIncome}`);

  // 3. Process Old Regime Deductions & HRA Exemption
  if (regime === 'old' && declaration) {
    log.push("Evaluating Old Regime tax deductions and exemptions.");

    // HRA Exemption Calculation
    let hraExemption = 0;
    if (declaration.is_renting === 1 && monthlyEarnings.BASIC && monthlyEarnings.HRA) {
      const monthlyBasic = monthlyEarnings.BASIC;
      const monthlyHra = monthlyEarnings.HRA;
      
      const projectedAnnualBasic = (ytdMetrics.ytd_basic || 0) + (monthlyBasic * monthsRemaining);
      const projectedAnnualHra = (ytdMetrics.ytd_hra || 0) + (monthlyHra * monthsRemaining);
      const annualRentPaid = declaration.rent_paid_annual || 0;
      const cityPct = declaration.rent_city_type === 'metro' ? 0.50 : 0.40;

      // HRA Exemption is minimum of:
      // a) Actual HRA received
      // b) 50% (metro) or 40% (non-metro) of Basic Salary
      // c) Rent paid minus 10% of Basic Salary
      const optionA = projectedAnnualHra;
      const optionB = projectedAnnualBasic * cityPct;
      const optionC = Math.max(0, annualRentPaid - (projectedAnnualBasic * 0.10));

      hraExemption = Math.min(optionA, optionB, optionC);
      hraExemption = round2(hraExemption);
      
      log.push(`HRA Exemption: Min of HRA Received (${optionA}), ${cityPct*100}% Basic (${optionB}), Rent Excess (${optionC}) = Exemption: ${hraExemption}`);
    }

    // Capped 80C Deduction (Max ₹1,50,000)
    const declared80c = declaration.total_80c || 0;
    const allowed80c = Math.min(declared80c, 150000);
    log.push(`Section 80C Deduction: Capped ${declared80c} at maximum of 1,50,000 = ${allowed80c}`);

    // Section 80D (Medical)
    const allowed80d = declaration.total_80d || 0;
    log.push(`Section 80D Deduction: ${allowed80d}`);

    // Home Loan Interest (Section 24b, capped typically at ₹2,00,000)
    const allowed24b = Math.min(declaration.section_24b || 0, 200000);
    log.push(`Section 24b Home Loan Interest: Capped at 2,00,000 = ${allowed24b}`);

    // NPS 80CCD
    const allowedNps = declaration.nps_80ccd || 0;
    log.push(`Section 80CCD NPS: ${allowedNps}`);

    // Other deductions (80E, 80G, etc.)
    const otherDeductions = (declaration.section_80e || 0) + (declaration.section_80g || 0) + (declaration.section_80gg || 0);

    const totalOldDeductions = allowed80c + allowed80d + allowed24b + allowedNps + otherDeductions + hraExemption;
    
    netTaxableIncome -= totalOldDeductions;
    totalDeductions += totalOldDeductions;
    log.push(`Total Deductions (Exemption + Old Slabs): -${totalOldDeductions}. Final Taxable: ${netTaxableIncome}`);
  }

  // Ensure net taxable income does not fall below zero
  netTaxableIncome = Math.max(0, netTaxableIncome);
  results.annual_gross = projectedGross;
  results.annual_taxable = netTaxableIncome;

  // 4. Calculate Slab-wise Base Tax
  const slabs = tdsConfig.slabs_json || [];
  let baseTax = 0;
  let tempIncome = netTaxableIncome;

  log.push("Running slab tax calculations:");
  for (let i = 0; i < slabs.length; i++) {
    const slab = slabs[i];
    const rate = parseFloat(slab.rate) / 100;
    const min = parseFloat(slab.min);
    const max = slab.max ? parseFloat(slab.max) : Infinity;

    if (tempIncome > min) {
      const taxableInSlab = Math.min(tempIncome - min, max - min);
      const slabTax = taxableInSlab * rate;
      baseTax += slabTax;
      log.push(`Slab [${min} to ${slab.max || 'above'}]: ${taxableInSlab} at ${slab.rate}% = ${round2(slabTax)}`);
      
      // Stop evaluating if income is fully apportioned
      if (tempIncome <= max) break;
    }
  }

  baseTax = round2(baseTax);
  log.push(`Base slab tax total: ${baseTax}`);

  // 5. Apply Section 87A Tax Rebate
  const rebateLimit = tdsConfig.rebate_87a_limit || 0;
  const rebateMax = tdsConfig.rebate_87a_amount || 0;
  let taxAfterRebate = baseTax;

  if (netTaxableIncome <= rebateLimit) {
    const rebateAmount = Math.min(baseTax, rebateMax);
    taxAfterRebate = Math.max(0, baseTax - rebateAmount);
    log.push(`Section 87A Rebate Eligible! Net taxable ${netTaxableIncome} <= rebate limit ${rebateLimit}. Tax reduced by ${rebateAmount} = ${taxAfterRebate}`);
  }

  // 6. Apply Graduated Surcharge
  const surcharges = tdsConfig.surcharge_json || [];
  let surchargePct = 0;

  for (const s of surcharges) {
    if (netTaxableIncome > parseFloat(s.income_above)) {
      surchargePct = parseFloat(s.surcharge_pct);
    }
  }

  let surchargeTax = 0;
  if (surchargePct > 0) {
    surchargeTax = (taxAfterRebate * surchargePct) / 100;
    surchargeTax = round2(surchargeTax);
    log.push(`Applied Surcharge: Income ${netTaxableIncome} > threshold. surcharge rate: ${surchargePct}% = ${surchargeTax}`);
  }

  // 7. Apply Education & Health Cess (typically 4%)
  const cessPct = tdsConfig.cess_pct || 4;
  const taxableTaxForCess = taxAfterRebate + surchargeTax;
  let cessTax = (taxableTaxForCess * cessPct) / 100;
  cessTax = round2(cessTax);
  log.push(`Applied Cess: ${taxableTaxForCess} * ${cessPct}% = ${cessTax}`);

  const annualTaxLiability = round2(taxAfterRebate + surchargeTax + cessTax);
  results.annual_tax_liability = annualTaxLiability;
  log.push(`Total Annual Tax Liability: ${annualTaxLiability}`);

  // 8. Apportion Monthly TDS Over Remaining Months
  const currentYtdTds = ytdMetrics.ytd_tds || 0;
  let monthlyTds = 0;

  if (monthsRemaining > 0) {
    monthlyTds = Math.max(0, (annualTaxLiability - currentYtdTds) / monthsRemaining);
    monthlyTds = round2(monthlyTds);
    log.push(`Monthly Apportionment: (Annual Tax ${annualTaxLiability} - Paid YTD ${currentYtdTds}) / remaining ${monthsRemaining} months = ${monthlyTds}`);
  } else {
    monthlyTds = Math.max(0, annualTaxLiability - currentYtdTds);
    log.push(`Final Month Adjustment: (Annual Tax ${annualTaxLiability} - Paid YTD ${currentYtdTds}) = ${monthlyTds}`);
  }

  results.tds = round2(monthlyTds);
  return {
    ...results,
    log
  };
}

module.exports = {
  calculateTDS,
  getMonthsRemaining
};
