/**
 * Formatting and Calendar utilities for PaySmart Pro
 */

/**
 * Format currency into Indian Number System. E.g., ₹1,23,456.00
 */
export function formatCurrency(v) {
  if (v === undefined || v === null || isNaN(v)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(v);
}

/**
 * Format month number to human readable string (e.g. 5, 2026 -> May 2026)
 */
export function formatMonth(month, year) {
  const date = new Date(year, month - 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

/**
 * Format ISO Date string into Indian readable date (e.g., 2026-03-15 -> 15 Mar 2026)
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Calculate working days in a month.
 * Excludes Sundays (and Saturdays if 5-day week)
 */
export function calcWorkingDays(month, year, workingDaysPerWeek = 6) {
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;
  const weeklyOffDays = workingDaysPerWeek === 5 ? 2 : 1;

  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    if (dayOfWeek !== 0) { // Sunday off
      if (weeklyOffDays === 2 && dayOfWeek === 6) continue; // Saturday off too
      workingDays++;
    }
  }

  return workingDays;
}

/**
 * Returns total calendar days in a month
 * @param {number} month - 1-based (1=Jan, 12=Dec)
 * @param {number} year
 */
export function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

/**
 * Validates a single attendance row. Returns array of error strings (empty = valid).
 */
export function validateAttendanceRow(row, month, year) {
  const errors = [];
  const calDays = daysInMonth(month, year);
  const working = Number(row.working_days);
  const present = Number(row.present_days);
  const paidLeave = Number(row.paid_leave_days);

  if (present < 0) errors.push('Present days cannot be negative');
  if (present > calDays) errors.push(`Present (${present}) exceeds calendar days (${calDays})`);
  if (present > working) errors.push(`Present (${present}) exceeds working days (${working})`);
  if (paidLeave < 0) errors.push('Paid leave cannot be negative');
  if (paidLeave > working) errors.push(`Paid leave (${paidLeave}) exceeds working days (${working})`);
  if (present + paidLeave > working)
    errors.push(`Present + Paid Leave (${present + paidLeave}) exceeds working days (${working})`);

  return errors;
}
