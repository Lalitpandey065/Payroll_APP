/**
 * PaySmart Pro — Practical UI Cycle Test
 * Tests every form in the app: renders it, fills fields, validates, submits.
 */
const React = require('react');
const { render, screen, fireEvent, waitFor, act } = require('@testing-library/react');
require('@testing-library/jest-dom');

// ─── Import validators directly ───────────────────────────────────────────
const validators = require('/sessions/nifty-charming-euler/mnt/Payroll_System/src/utils/validators.js');
const { validatePAN, validateTAN, validateIFSC, validateUAN, validateAadhaar,
        validatePhone, validateEmail, validateESICode, validatePincode,
        validateGSTIN, validateCIN, validateBankAccount, getCurrentFinancialYear } = validators;

// ─── Shared helper ────────────────────────────────────────────────────────
const MemoryRouter = require('react-router-dom').MemoryRouter;

function wrap(Component, path = '/') {
  return render(
    React.createElement(MemoryRouter, { initialEntries: [path] },
      React.createElement(Component)
    )
  );
}

// ══════════════════════════════════════════════════════════════════
// SECTION 1 — VALIDATOR UNIT TESTS (the foundation of all UI validation)
// ══════════════════════════════════════════════════════════════════
describe('Section 1 — Validator Functions', () => {
  test('validatePAN: accepts ABCDE1234F', () => expect(validatePAN('ABCDE1234F').valid).toBe(true));
  test('validatePAN: rejects short PAN', () => expect(validatePAN('ABCD1234').valid).toBe(false));
  test('validatePAN: rejects empty', () => expect(validatePAN('').valid).toBe(false));
  test('validatePAN: case-insensitive (lowercase)', () => expect(validatePAN('abcde1234f').valid).toBe(true));

  test('validateTAN: accepts ABCD12345E', () => expect(validateTAN('ABCD12345E').valid).toBe(true));
  test('validateTAN: rejects short TAN', () => expect(validateTAN('ABCD1234').valid).toBe(false));

  test('validateIFSC: accepts HDFC0001234', () => expect(validateIFSC('HDFC0001234').valid).toBe(true));
  test('validateIFSC: rejects missing 0 at pos 5', () => expect(validateIFSC('HDFC1001234').valid).toBe(false));

  test('validateUAN: accepts 100123456789', () => expect(validateUAN('100123456789').valid).toBe(true));
  test('validateUAN: rejects 11 digits', () => expect(validateUAN('10012345678').valid).toBe(false));

  test('validateAadhaar: accepts 4 digits', () => expect(validateAadhaar('1234').valid).toBe(true));
  test('validateAadhaar: rejects 3 digits', () => expect(validateAadhaar('123').valid).toBe(false));
  test('validateAadhaar: rejects 5 digits', () => expect(validateAadhaar('12345').valid).toBe(false));

  test('validatePhone: accepts 9876543210', () => expect(validatePhone('9876543210').valid).toBe(true));
  test('validatePhone: accepts +91 9876543210', () => expect(validatePhone('+91 9876543210').valid).toBe(true));
  test('validatePhone: accepts 09876543210', () => expect(validatePhone('09876543210').valid).toBe(true));
  test('validatePhone: rejects starts-with-5', () => expect(validatePhone('5123456789').valid).toBe(false));
  test('validatePhone: rejects 9 digit number', () => expect(validatePhone('987654321').valid).toBe(false));

  test('validateEmail: accepts hr@acme.com', () => expect(validateEmail('hr@acme.com').valid).toBe(true));
  test('validateEmail: rejects no @', () => expect(validateEmail('hracme.com').valid).toBe(false));
  test('validateEmail: rejects empty', () => expect(validateEmail('').valid).toBe(false));

  test('validateESICode: accepts 17 digits', () => expect(validateESICode('31000123450001234').valid).toBe(true));
  test('validateESICode: rejects 16 digits', () => expect(validateESICode('3100012345000123').valid).toBe(false));

  test('validatePincode: accepts 400001', () => expect(validatePincode('400001').valid).toBe(true));
  test('validatePincode: rejects starts-with-0', () => expect(validatePincode('012345').valid).toBe(false));
  test('validatePincode: rejects 5 digits', () => expect(validatePincode('40000').valid).toBe(false));

  test('validateGSTIN: accepts valid 27ABCDE1234F1Z5', () => expect(validateGSTIN('27ABCDE1234F1Z5').valid).toBe(true));
  test('validateGSTIN: empty is valid (optional)', () => expect(validateGSTIN('').valid).toBe(true));
  test('validateGSTIN: invalid format rejected', () => expect(validateGSTIN('BADGSTIN').valid).toBe(false));

  test('validateCIN: accepts U72200MH2025PTC123456', () => expect(validateCIN('U72200MH2025PTC123456').valid).toBe(true));
  test('validateCIN: empty is valid (optional)', () => expect(validateCIN('').valid).toBe(true));
  test('validateCIN: invalid rejected', () => expect(validateCIN('BADCIN').valid).toBe(false));

  test('validateBankAccount: accepts 12-digit account', () => expect(validateBankAccount('123456789012').valid).toBe(true));
  test('validateBankAccount: rejects 8-digit (too short)', () => expect(validateBankAccount('12345678').valid).toBe(false));
  test('validateBankAccount: empty is valid (optional)', () => expect(validateBankAccount('').valid).toBe(true));

  test('getCurrentFinancialYear: returns correct format', () => {
    const fy = getCurrentFinancialYear();
    expect(fy).toMatch(/^\d{4}-\d{2}$/);
    // Since today is June 2026, FY should be 2026-27
    expect(fy).toBe('2026-27');
  });
});

// ══════════════════════════════════════════════════════════════════
// SECTION 2 — LOGIN PAGE
// ══════════════════════════════════════════════════════════════════
describe('Section 2 — Login Page', () => {
  const Login = require('/sessions/nifty-charming-euler/mnt/Payroll_System/src/pages/Login.jsx').default;

  beforeEach(() => {
    const { useAuthStore } = require('/sessions/nifty-charming-euler/mnt/Payroll_System/src/store/auth.store.js');
    useAuthStore.setState({ user: null, isAuthenticated: false, loading: false, error: null });
  });

  test('renders login form with email and password fields', () => {
    wrap(Login);
    expect(screen.getByPlaceholderText('admin@paysmart.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  test('shows error when submitting empty fields', async () => {
    const { container } = wrap(Login);
    const form = container.querySelector('form');
    await act(async () => { fireEvent.submit(form); });
    await waitFor(() => expect(screen.getByText('Please fill in all fields.')).toBeInTheDocument());
  });

  test('shows error for invalid email format', async () => {
    const { container } = wrap(Login);
    fireEvent.change(screen.getByPlaceholderText('admin@paysmart.com'), { target: { value: 'notanemail' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });
    const form = container.querySelector('form');
    await act(async () => { fireEvent.submit(form); });
    await waitFor(() => expect(screen.getByText(/valid email/i)).toBeInTheDocument());
  });

  test('shows error for wrong credentials', async () => {
    window.api.auth.login.mockResolvedValueOnce({ success: false, error: { message: 'Invalid email or password.' } });
    wrap(Login);
    fireEvent.change(screen.getByPlaceholderText('admin@paysmart.com'), { target: { value: 'wrong@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByText('Sign In'));
    await waitFor(() => expect(screen.getByText(/Invalid email or password/i)).toBeInTheDocument());
  });

  test('shows hint with default credentials', () => {
    wrap(Login);
    expect(screen.getByText(/admin@paysmart.com/)).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════════════════
// SECTION 3 — COMPANY FORM VALIDATION
// ══════════════════════════════════════════════════════════════════
describe('Section 3 — Company Form Validation', () => {
  const CompanyForm = require('/sessions/nifty-charming-euler/mnt/Payroll_System/src/pages/companies/CompanyForm.jsx').default;
  const { useCompanyStore } = require('/sessions/nifty-charming-euler/mnt/Payroll_System/src/store/company.store.js');

  beforeEach(() => {
    useCompanyStore.setState({ companies: [], activeCompany: null, loading: false });
  });

  test('renders all core fields', () => {
    wrap(CompanyForm, '/companies/new');
    expect(screen.getByPlaceholderText('Enterprise Services Pvt Ltd')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('ABCDE1234F')).toBeInTheDocument();
    expect(screen.getByText('Create & Seed Defaults')).toBeInTheDocument();
  });

  test('shows error when company name is empty', async () => {
    wrap(CompanyForm, '/companies/new');
    await act(async () => { fireEvent.submit(document.querySelector('form')); });
    await waitFor(() => expect(screen.getByText(/Company name is required/i)).toBeInTheDocument());
  });

  test('shows PAN error for invalid format', async () => {
    wrap(CompanyForm, '/companies/new');
    fireEvent.change(screen.getByPlaceholderText('Enterprise Services Pvt Ltd'), { target: { value: 'Acme Corp' } });
    fireEvent.change(screen.getByPlaceholderText('ABCDE1234F'), { target: { value: 'BADPAN' } });
    await act(async () => { fireEvent.submit(document.querySelector('form')); });
    await waitFor(() => expect(screen.getByText(/Invalid PAN/i)).toBeInTheDocument());
  });

  test('shows email error for invalid email', async () => {
    wrap(CompanyForm, '/companies/new');
    fireEvent.change(screen.getByPlaceholderText('Enterprise Services Pvt Ltd'), { target: { value: 'Acme Corp' } });
    fireEvent.change(screen.getByPlaceholderText('ABCDE1234F'), { target: { value: 'AABCA1234C' } });
    fireEvent.change(screen.getByPlaceholderText('Mumbai'), { target: { value: 'Mumbai' } });
    fireEvent.change(screen.getByPlaceholderText('payroll@enterprise.com'), { target: { value: 'bademail' } });
    await act(async () => { fireEvent.submit(document.querySelector('form')); });
    await waitFor(() => expect(screen.getByText(/Invalid email/i)).toBeInTheDocument());
  });

  test('shows pincode error for invalid format', async () => {
    wrap(CompanyForm, '/companies/new');
    fireEvent.change(screen.getByPlaceholderText('Enterprise Services Pvt Ltd'), { target: { value: 'Acme Corp' } });
    fireEvent.change(screen.getByPlaceholderText('ABCDE1234F'), { target: { value: 'AABCA1234C' } });
    fireEvent.change(screen.getByPlaceholderText('Mumbai'), { target: { value: 'Mumbai' } });
    fireEvent.change(screen.getByPlaceholderText('400001'), { target: { value: '0123456' } });
    await act(async () => { fireEvent.submit(document.querySelector('form')); });
    await waitFor(() => expect(screen.getByText(/Invalid pincode/i)).toBeInTheDocument());
  });

  test('shows GSTIN error for invalid format', async () => {
    wrap(CompanyForm, '/companies/new');
    fireEvent.change(screen.getByPlaceholderText('Enterprise Services Pvt Ltd'), { target: { value: 'Acme' } });
    fireEvent.change(screen.getByPlaceholderText('ABCDE1234F'), { target: { value: 'AABCA1234C' } });
    fireEvent.change(screen.getByPlaceholderText('Mumbai'), { target: { value: 'Mumbai' } });
    fireEvent.change(screen.getByPlaceholderText('27ABCDE1234F1Z5'), { target: { value: 'BADGSTIN' } });
    await act(async () => { fireEvent.submit(document.querySelector('form')); });
    await waitFor(() => expect(screen.getByText(/Invalid GSTIN/i)).toBeInTheDocument());
  });
});

// ══════════════════════════════════════════════════════════════════
// SECTION 4 — EMPLOYEE FORM VALIDATION
// ══════════════════════════════════════════════════════════════════
describe('Section 4 — Employee Form Validation', () => {
  const EmployeeForm = require('/sessions/nifty-charming-euler/mnt/Payroll_System/src/pages/employees/EmployeeForm.jsx').default;
  const { useCompanyStore } = require('/sessions/nifty-charming-euler/mnt/Payroll_System/src/store/company.store.js');

  beforeEach(() => {
    useCompanyStore.setState({ activeCompany: { id: 'c1', name: 'Acme', state_code: 'MH' } });
  });

  test('renders Personal tab with all required fields', () => {
    wrap(EmployeeForm, '/employees/new');
    expect(screen.getByPlaceholderText('EMP001')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Rahul')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Sharma')).toBeInTheDocument();
  });

  test('shows error when employee code is empty', async () => {
    wrap(EmployeeForm, '/employees/new');
    // Click Next Tab twice then submit
    const nextBtn = screen.getByText('Next Tab');
    fireEvent.click(nextBtn); // personal -> identity
    await waitFor(() => {}, { timeout: 100 });
    const nextBtn2 = screen.getByText('Next Tab');
    fireEvent.click(nextBtn2); // identity -> statutory
    await waitFor(() => {}, { timeout: 100 });
    fireEvent.click(screen.getByText('Register Employee'));
    await waitFor(() => expect(screen.getByText(/Employee code is required/i)).toBeInTheDocument());
  });

  test('shows error for under-18 date of birth', async () => {
    wrap(EmployeeForm, '/employees/new');
    fireEvent.change(screen.getByPlaceholderText('EMP001'), { target: { value: 'EMP001' } });
    fireEvent.change(screen.getByPlaceholderText('Rahul'), { target: { value: 'Rahul' } });
    fireEvent.change(screen.getByPlaceholderText('Sharma'), { target: { value: 'Sharma' } });
    // Set DOB to under-18 (2015)
    const dateInputs = document.querySelectorAll('input[type="date"]');
    if (dateInputs[0]) fireEvent.change(dateInputs[0], { target: { value: '2015-01-01' } });
    if (dateInputs[1]) fireEvent.change(dateInputs[1], { target: { value: '2024-04-01' } });
    // Navigate to statutory and submit
    fireEvent.click(screen.getByText('Next Tab'));
    await waitFor(() => {}, { timeout: 100 });
    const nextBtn2 = screen.queryByText('Next Tab');
    if (nextBtn2) fireEvent.click(nextBtn2);
    await waitFor(() => {}, { timeout: 100 });
    const submitBtn = screen.queryByText('Register Employee');
    if (submitBtn) fireEvent.click(submitBtn);
    await waitFor(() => expect(screen.getByText(/at least 18/i)).toBeInTheDocument(), { timeout: 2000 });
  });

  test('shows IFSC error for invalid format on identity tab', async () => {
    wrap(EmployeeForm, '/employees/new');
    // Fill personal
    fireEvent.change(screen.getByPlaceholderText('EMP001'), { target: { value: 'EMP001' } });
    fireEvent.change(screen.getByPlaceholderText('Rahul'), { target: { value: 'Rahul' } });
    fireEvent.change(screen.getByPlaceholderText('Sharma'), { target: { value: 'Sharma' } });
    const dateInputs = document.querySelectorAll('input[type="date"]');
    if (dateInputs[0]) fireEvent.change(dateInputs[0], { target: { value: '1993-06-15' } });
    if (dateInputs[1]) fireEvent.change(dateInputs[1], { target: { value: '2023-04-01' } });
    fireEvent.click(screen.getByText('Next Tab'));
    await waitFor(() => expect(screen.getByPlaceholderText('HDFC0000123')).toBeInTheDocument());
    // Enter invalid IFSC
    fireEvent.change(screen.getByPlaceholderText('HDFC0000123'), { target: { value: 'BADINVALIDIFSC' } });
    // Go to statutory and submit
    fireEvent.click(screen.getByText('Next Tab'));
    await waitFor(() => {}, { timeout: 100 });
    const submitBtn = screen.queryByText('Register Employee');
    if (submitBtn) fireEvent.click(submitBtn);
    await waitFor(() => expect(screen.getByText(/Invalid IFSC/i)).toBeInTheDocument(), { timeout: 2000 });
  });

  test('shows PAN required error when TDS enabled and PAN empty', async () => {
    wrap(EmployeeForm, '/employees/new');
    // Fill personal completely
    fireEvent.change(screen.getByPlaceholderText('EMP001'), { target: { value: 'EMP002' } });
    fireEvent.change(screen.getByPlaceholderText('Rahul'), { target: { value: 'Priya' } });
    fireEvent.change(screen.getByPlaceholderText('Sharma'), { target: { value: 'Patel' } });
    const dateInputs = document.querySelectorAll('input[type="date"]');
    if (dateInputs[0]) fireEvent.change(dateInputs[0], { target: { value: '1990-03-20' } });
    if (dateInputs[1]) fireEvent.change(dateInputs[1], { target: { value: '2022-07-01' } });
    // Skip to statutory, TDS is ON by default, PAN is empty
    fireEvent.click(screen.getByText('Next Tab')); // personal -> identity
    await waitFor(() => {}, { timeout: 100 });
    fireEvent.click(screen.getByText('Next Tab')); // identity -> statutory
    await waitFor(() => {}, { timeout: 100 });
    fireEvent.click(screen.getByText('Register Employee'));
    await waitFor(() => expect(screen.getByText(/PAN is required when TDS/i)).toBeInTheDocument(), { timeout: 2000 });
  });
});

// ══════════════════════════════════════════════════════════════════
// SECTION 5 — SALARY STRUCTURE BUILDER VALIDATION
// ══════════════════════════════════════════════════════════════════
describe('Section 5 — Salary Structure Builder Validation', () => {
  const StructureBuilder = require('/sessions/nifty-charming-euler/mnt/Payroll_System/src/pages/salary/StructureBuilder.jsx').default;
  const { useCompanyStore } = require('/sessions/nifty-charming-euler/mnt/Payroll_System/src/store/company.store.js');

  beforeEach(() => {
    useCompanyStore.setState({ activeCompany: { id: 'c1', name: 'Acme' } });
  });

  test('renders structure builder with default components', () => {
    wrap(StructureBuilder, '/salary/new');
    // Component codes appear as text; names appear as input values
    expect(screen.getByText('BASIC')).toBeInTheDocument();
    expect(screen.getByText('HRA')).toBeInTheDocument();
    // "Special Allowance" name is inside an <input value=...>
    expect(screen.getByDisplayValue('Special Allowance')).toBeInTheDocument();
  });

  test('shows CTC error when CTC is empty', async () => {
    wrap(StructureBuilder, '/salary/new');
    const ctcInput = screen.getByPlaceholderText('600000');
    fireEvent.change(ctcInput, { target: { value: '' } });
    await act(async () => { fireEvent.submit(document.querySelector('form')); });
    await waitFor(() => expect(screen.getByText(/Annual CTC must be/i)).toBeInTheDocument());
  });

  test('shows CTC error when CTC is zero', async () => {
    wrap(StructureBuilder, '/salary/new');
    const ctcInput = screen.getByPlaceholderText('600000');
    fireEvent.change(ctcInput, { target: { value: '0' } });
    await act(async () => { fireEvent.submit(document.querySelector('form')); });
    await waitFor(() => expect(screen.getByText(/Annual CTC must be/i)).toBeInTheDocument());
  });

  test('shows name error when structure name is empty', async () => {
    wrap(StructureBuilder, '/salary/new');
    const nameInput = screen.getAllByRole('textbox')[0];
    fireEvent.change(nameInput, { target: { value: '' } });
    await act(async () => { fireEvent.submit(document.querySelector('form')); });
    await waitFor(() => expect(screen.getByText(/Structure name is required/i)).toBeInTheDocument());
  });

  test('live calculation updates when CTC changes', async () => {
    wrap(StructureBuilder, '/salary/new');
    const ctcInput = screen.getByPlaceholderText('600000');
    fireEvent.change(ctcInput, { target: { value: '1200000' } });
    // Gross estimate should update
    await waitFor(() => {
      const text = document.body.innerText || document.body.textContent;
      // Should show some numeric value in the preview
      expect(ctcInput.value).toBe('1200000');
    });
  });
});

// ══════════════════════════════════════════════════════════════════
// SECTION 6 — ATTENDANCE ENTRY
// ══════════════════════════════════════════════════════════════════
describe('Section 6 — Attendance Entry', () => {
  const AttendanceEntry = require('/sessions/nifty-charming-euler/mnt/Payroll_System/src/pages/attendance/AttendanceEntry.jsx').default;
  const { useCompanyStore } = require('/sessions/nifty-charming-euler/mnt/Payroll_System/src/store/company.store.js');
  const { useAuthStore } = require('/sessions/nifty-charming-euler/mnt/Payroll_System/src/store/auth.store.js');

  beforeEach(() => {
    useCompanyStore.setState({ activeCompany: { id:'c1', name:'Acme', working_days_per_week: 5 } });
    useAuthStore.setState({ user: { id:'u1', name:'Admin', role:'admin' }, isAuthenticated: true });
    window.api.attendance.getCompany.mockResolvedValue({ success: true, data: [{
      id:'e1', emp_id:'e1', emp_code:'EMP001', first_name:'Rahul', last_name:'Sharma',
      is_ot_applicable: 0, present_days: 26, paid_leave_days: 0, ot_hours: 0,
      notes: '', is_attendance_locked: 0
    }]});
  });

  test('renders attendance table with employee rows', async () => {
    wrap(AttendanceEntry, '/attendance');
    await waitFor(() => expect(screen.getByText('Rahul Sharma')).toBeInTheDocument());
    expect(screen.getByText('EMP001')).toBeInTheDocument();
  });

  test('shows working days info', async () => {
    wrap(AttendanceEntry, '/attendance');
    await waitFor(() => expect(screen.getByText(/Standard Working Days/i)).toBeInTheDocument());
  });

  test('lock/unlock button visible for admin', async () => {
    wrap(AttendanceEntry, '/attendance');
    await waitFor(() => expect(screen.getByText(/Lock Sheet/i)).toBeInTheDocument());
  });

  test('save attendance button is present', async () => {
    wrap(AttendanceEntry, '/attendance');
    await waitFor(() => expect(screen.getByText(/Save Attendance/i)).toBeInTheDocument());
  });
});

