import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

async function bootstrap() {
  // STEP 1: If window.api does not exist (browser/web mode), apply mock API
  if (!window.api) {
    try {
      const mockModule = await import('./mock-api.js');
      // mock-api.js sets window.api as a side-effect AND exports default.
      // Prefer the export so we always have the correct reference.
      const buildMockApi = mockModule.default || mockModule.buildMockApi || mockModule;
      window.api = typeof buildMockApi === 'function' ? buildMockApi() : buildMockApi;
      console.info('[PaySmart] Running in web mode — mock API applied');
    } catch (e) {
      console.warn('[PaySmart] Could not load mock-api.js:', e.message);
      // Build a minimal stub so the app doesn't crash on load
      window.api = {
        auth:       { login: async () => ({ success: false, error: { message: 'Web mode: no real auth' } }), updatePassword: async () => ({}) },
        company:    { getAll: async () => ({ success: true, data: [] }), getById: async () => ({}), create: async () => ({}), update: async () => ({}), delete: async () => ({}) },
        employee:   { getAll: async () => ({ success: true, data: [] }), getById: async () => ({}), getPackage: async () => ({}), create: async () => ({}), update: async () => ({}), delete: async () => ({}), getDeclaration: async () => ({}), saveDeclaration: async () => ({}) },
        salary:     { getAll: async () => ({ success: true, data: [] }), getSalaryMappings: async () => ({ success: true, data: [] }), getStructureWithComponents: async () => ({}), assignStructure: async () => ({}), getEmployeeSalary: async () => ({}), saveStructure: async () => ({}), createStructure: async () => ({}) },
        attendance: { get: async () => ({}), getCompany: async () => ({ success: true, data: [] }), save: async () => ({}), lock: async () => ({}), unlock: async () => ({}) },
        payroll:    { getRun: async () => ({}), getRunDetails: async () => ({ success: true, data: [] }), draftRun: async () => ({}), executeRun: async () => ({}), updateStatus: async () => ({}), addOverride: async () => ({}), bulkFlagCheck: async () => ({ success: true, data: { errors: [], warnings: [] } }) },
        report:     { downloadPayslip: async () => ({}), downloadRegister: async () => ({}), downloadPF: async () => ({}), downloadESI: async () => ({}), downloadBank: async () => ({}), selectDirectory: async () => ({}) },
        setup:      { getAll: async () => ({ success: true, data: {} }), getCompany: async () => ({}), saveCompany: async () => ({}), getEPF: async () => ({}), saveEPF: async () => ({}), getESI: async () => ({}), saveESI: async () => ({}), getOT: async () => ({}), saveOT: async () => ({}), getBonus: async () => ({}), saveBonus: async () => ({}), getGratuity: async () => ({}), saveGratuity: async () => ({}), getFactory: async () => ({}), saveFactory: async () => ({}), getAllowances: async () => ({ success: true, data: [] }), getAllowanceByCode: async () => ({}), saveAllowance: async () => ({}), getAllDeductions: async () => ({ success: true, data: [] }), getDeductionByCode: async () => ({}), saveDeduction: async () => ({}) },
        backup:     { getInfo: async () => ({}), createManual: async () => ({}), restore: async () => ({}), restoreFromPath: async () => ({}), runNow: async () => ({}), exportJSON: async () => ({}) },
        server:     { getConfig: async () => ({ success: true, data: { mode: 'standalone' } }), saveConfig: async () => ({}), start: async () => ({}), stop: async () => ({}), getStatus: async () => ({ success: true, data: { mode: 'standalone', running: false } }), getClients: async () => ({ success: true, data: [] }) },
        sync:       { getStatus: async () => ({}), now: async () => ({}), push: async () => ({}), pull: async () => ({}) },
        import:     { downloadEmployeeTemplate: async () => ({}), downloadAttendanceTemplate: async () => ({}), parseEmployeeFile: async () => ({}), parseAttendanceFile: async () => ({}), executeEmployees: async () => ({}), executeAttendance: async () => ({}) },
        audit:      { getLast: async () => ({ success: true, data: [] }), getPendingApprovals: async () => ({ success: true, data: { count: 0 } }) },
      };
    }
  }

  // STEP 2: Try client mode swap (only if running in Electron with server config)
  try {
    const configRes = await window.api.server.getConfig();
    if (configRes?.data?.mode === 'client' && configRes?.data?.serverUrl) {
      const { buildRemoteApi } = await import('./utils/remote-api.js');
      const remoteApi = buildRemoteApi(configRes.data.serverUrl, configRes.data.apiKey);
      // Swap all except local-only namespaces
      const localOnly = ['import', 'backup', 'server', 'sync'];
      Object.keys(remoteApi).forEach(key => {
        if (!localOnly.includes(key)) window.api[key] = remoteApi[key];
      });
    }
  } catch (e) {
    // server config unavailable — continue in standalone/offline mode
    console.info('[PaySmart] Server config unavailable, running standalone');
  }

  // STEP 3: Mount React
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();
