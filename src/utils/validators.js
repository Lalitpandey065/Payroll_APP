/**
 * Indian Statutory and Financial Field Validators
 */

function result(isValid, errorMsg = "") {
  return { valid: isValid, message: isValid ? "" : errorMsg };
}

export function validatePAN(v) {
  if (!v) return result(false, "PAN is required.");
  const regex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return result(regex.test(v.toUpperCase()), "Invalid PAN format. Must match ABCDE1234F.");
}

export function validateTAN(v) {
  if (!v) return result(false, "TAN is required.");
  const regex = /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/;
  return result(regex.test(v.toUpperCase()), "Invalid TAN format. Must match ABCD12345E.");
}

export function validateIFSC(v) {
  if (!v) return result(false, "IFSC is required.");
  const regex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  return result(regex.test(v.toUpperCase()), "Invalid IFSC format. Must match ABCD0123456.");
}

export function validateUAN(v) {
  if (!v) return result(false, "UAN is required.");
  const regex = /^[0-9]{12}$/;
  return result(regex.test(v), "Invalid UAN. Must be exactly 12 digits.");
}

export function validateAadhaar(v) {
  if (!v) return result(false, "Aadhaar is required.");
  const regex = /^[0-9]{4}$/;
  return result(regex.test(v), "Aadhaar must be last 4 digits only.");
}

export function validatePhone(v) {
  if (!v) return result(false, "Phone number is required.");
  // Strip spaces, dashes; also strip leading +91 or 0 country/trunk prefix
  let cleaned = v.replace(/[\s\-]/g, "");
  if (cleaned.startsWith("+91")) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith("91") && cleaned.length === 12) cleaned = cleaned.slice(2);
  else if (cleaned.startsWith("0")) cleaned = cleaned.slice(1);
  const regex = /^[6-9]\d{9}$/;
  return result(regex.test(cleaned), "Invalid phone number. Must be a 10-digit Indian mobile number starting with 6-9.");
}

export function validateEmail(v) {
  if (!v) return result(false, "Email is required.");
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return result(regex.test(v), "Invalid email address.");
}

export function validateESICode(v) {
  if (!v) return result(false, "ESI Code is required.");
  const regex = /^[0-9]{17}$/;
  return result(regex.test(v), "Invalid ESI Code. Must be exactly 17 digits.");
}

export function validatePFRegNumber(v) {
  if (!v) return result(false, "PF Registration Number is required.");
  return result(v.trim().length >= 10, "PF Registration is too short. Minimum 10 characters.");
}

export function validatePincode(v) {
  if (!v) return result(false, "Pincode is required.");
  const regex = /^[1-9][0-9]{5}$/;
  return result(regex.test(v), "Invalid pincode. Must be a 6-digit Indian PIN code.");
}

export function validateGSTIN(v) {
  if (!v) return result(true, ""); // GSTIN is optional
  // 15-character: 2 digits state code + 10-char PAN + 1 entity + 1 Z + 1 checksum
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return result(regex.test(v.toUpperCase()), "Invalid GSTIN format (e.g. 27ABCDE1234F1Z5).");
}

export function validateCIN(v) {
  if (!v) return result(true, ""); // CIN is optional
  // 21 chars: L/U + 5 digits + 2 alpha state + 4 digit year + 3 alpha type + 6 digit + 3 chars
  const regex = /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
  return result(regex.test(v.toUpperCase()), "Invalid CIN format (e.g. U72200MH2025PTC123456).");
}

export function validateBankAccount(v) {
  if (!v) return result(true, ""); // optional but validated when present
  const regex = /^[0-9]{9,18}$/;
  return result(regex.test(v), "Bank account number must be 9–18 digits.");
}

/**
 * Returns the current Indian Financial Year string e.g. "2025-26"
 */
export function getCurrentFinancialYear() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-based
  const year = now.getFullYear();
  if (month >= 4) {
    return year + "-" + (year + 1).toString().substring(2);
  } else {
    return (year - 1) + "-" + year.toString().substring(2);
  }
}
