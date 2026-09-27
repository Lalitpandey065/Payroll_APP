/**
 * Application Constants
 */

export const INDIAN_STATES = [
  { code: 'MH', name: 'Maharashtra' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'WB', name: 'West Bengal' },
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'TS', name: 'Telangana' },
  { code: 'GJ', name: 'Gujarat' },
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'KL', name: 'Kerala' },
  { code: 'MP', name: 'Madhya Pradesh' },
  { code: 'DL', name: 'Delhi' },
  { code: 'UP', name: 'Uttar Pradesh' },
  { code: 'RJ', name: 'Rajasthan' },
  { code: 'HR', name: 'Haryana' },
  { code: 'BR', name: 'Bihar' },
  { code: 'OR', name: 'Odisha' },
  { code: 'PB', name: 'Punjab' }
];

export const EMPLOYMENT_TYPES = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'probation', label: 'Probation' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
  { value: 'part_time', label: 'Part Time' }
];

export const MONTH_NAMES = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
];

/**
 * Calculates current active Indian Fiscal Year.
 * Starts in April.
 */
export function CURRENT_FIN_YEAR() {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-indexed

  if (month >= 4) {
    const nextYear = (year + 1).toString().substring(2);
    return `${year}-${nextYear}`;
  } else {
    const prevYear = year - 1;
    const currentYear = year.toString().substring(2);
    return `${prevYear}-${currentYear}`;
  }
}
