/**
 * PaySmart Pro — Remote API Client
 *
 * Creates a window.api-compatible object that makes HTTP fetch calls
 * to a PaySmart Pro host machine on the same LAN.
 *
 * Usage: drop-in replacement for window.api when in client mode.
 * All components remain unchanged — they call window.api.x.y() as normal.
 */

function buildRemoteApi(serverUrl, apiKey) {
  const base = serverUrl.replace(/\/$/, '');
  const headers = {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'X-PaySmart-Key': apiKey } : {})
  };

  async function get(path, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const url = `${base}${path}${qs ? '?' + qs : ''}`;
    const res = await fetch(url, { headers });
    return res.json();
  }

  async function post(path, body = {}) {
    const res = await fetch(`${base}${path}`, {
      method: 'POST', headers, body: JSON.stringify(body)
    });
    return res.json();
  }

  async function put(path, body = {}) {
    const res = await fetch(`${base}${path}`, {
      method: 'PUT', headers, body: JSON.stringify(body)
    });
    return res.json();
  }

  async function del(path) {
    const res = await fetch(`${base}${path}`, { method: 'DELETE', headers });
    return res.json();
  }

  return {
    auth: {
      login: (email, password) => post('/api/auth/login', { email, password }),
      updatePassword: (userId, current, newPass) => post('/api/auth/updatePassword', { userId, current, newPass })
    },
    company: {
      getAll: (filters) => get('/api/company', filters),
      getById: (id) => get(`/api/company/${id}`),
      create: (data) => post('/api/company', data),
      update: (id, data) => put(`/api/company/${id}`, data),
      delete: (id) => del(`/api/company/${id}`)
    },
    employee: {
      getAll: (filters) => get('/api/employee', filters),
      getById: (id) => get(`/api/employee/${id}`),
      getPackage: (id) => get(`/api/employee/${id}/package`),
      create: (data, identity, statutory) => post('/api/employee', { data, identity, statutory }),
      update: (id, core, identity, statutory) => put(`/api/employee/${id}`, { core, identity, statutory }),
      delete: (id) => del(`/api/employee/${id}`),
      getDeclaration: (empId, finYear) => get(`/api/employee/${empId}/declaration`, { finYear }),
      saveDeclaration: (data) => post('/api/employee/declaration', data)
    },
    salary: {
      createStructure: (companyId, name, description, defaultCtc) =>
        post('/api/salary/create', { companyId, name, description, defaultCtc }),
      getAll: (filters) => get('/api/salary', filters),
      getStructureWithComponents: (id) => get(`/api/salary/${id}`),
      assignStructure: (empId, structureId, ctc, overrides, effectiveFrom) =>
        post('/api/salary/assign', { empId, structureId, ctc, overrides, effectiveFrom }),
      getEmployeeSalary: (empId) => get(`/api/salary/employee/${empId}`),
      saveStructure: (structureId, components, defaultCtc, name, description) =>
        put(`/api/salary/${structureId}`, { components, defaultCtc, name, description })
    },
    attendance: {
      get: (empId, month, year) =>
        get(`/api/attendance/${empId}`, { month, year }),
      getCompany: (companyId, month, year) =>
        get(`/api/attendance/company/${companyId}`, { month, year }),
      save: (data) => post('/api/attendance', data),
      lock: (companyId, month, year, user) =>
        post('/api/attendance/lock', { companyId, month, year, user }),
      unlock: (companyId, month, year, user) =>
        post('/api/attendance/unlock', { companyId, month, year, user })
    },
    payroll: {
      getRun: (companyId, month, year) =>
        get('/api/payroll/run', { companyId, month, year }),
      getRunDetails: (runId) =>
        get(`/api/payroll/run/${runId}/details`),
      draftRun: (companyId, month, year, operator) =>
        post('/api/payroll/draft', { companyId, month, year, operator }),
      executeRun: (companyId, month, year, operator) =>
        post('/api/payroll/execute', { companyId, month, year, operator }),
      updateStatus: (runId, status, user) =>
        put(`/api/payroll/run/${runId}/status`, { status, user }),
      addOverride: (override) => post('/api/payroll/override', override),
      bulkFlagCheck: (companyId, month, year) =>
        get('/api/payroll/flags', { companyId, month, year })
    },
    // Reports and backup not available in remote mode (files stay on host)
    report: {
      downloadPayslip: async () => ({ success: false, error: { message: 'Reports must be downloaded on the host machine.' } }),
      downloadRegister: async () => ({ success: false, error: { message: 'Reports must be downloaded on the host machine.' } }),
      downloadPF: async () => ({ success: false, error: { message: 'Reports must be downloaded on the host machine.' } }),
      downloadESI: async () => ({ success: false, error: { message: 'Reports must be downloaded on the host machine.' } }),
      downloadBank: async () => ({ success: false, error: { message: 'Reports must be downloaded on the host machine.' } }),
      selectDirectory: async () => ({ success: false, error: { message: 'Not available in remote mode.' } })
    },
    backup: {
      getInfo: async () => ({ success: false, error: { message: 'Backup managed on host machine.' } }),
      createManual: async () => ({ success: false, error: { message: 'Backup managed on host machine.' } }),
      restore: async () => ({ success: false, error: { message: 'Restore managed on host machine.' } }),
      restoreFromPath: async () => ({ success: false, error: { message: 'Restore managed on host machine.' } }),
      runNow: async () => ({ success: false, error: { message: 'Backup managed on host machine.' } }),
      exportJSON: async () => ({ success: false, error: { message: 'Export managed on host machine.' } })
    },
    // Server config still uses local IPC even in client mode
    server: window.api?.server || {}
  };
}

export default buildRemoteApi;
export { buildRemoteApi };
