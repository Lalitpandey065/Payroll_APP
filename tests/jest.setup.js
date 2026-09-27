const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock window.api — all methods return resolved Promises
const ok  = (data) => Promise.resolve({ success: true, data });
const err = (msg)  => Promise.resolve({ success: false, error: { message: msg } });

global.window = global.window || {};
window.api = {
  auth: {
    login:          jest.fn().mockResolvedValue(ok({ id:'u1', name:'Admin', email:'admin@paysmart.com', role:'admin', force_password_change:0 }).then(r=>r)),
    updatePassword: jest.fn().mockResolvedValue({ success: true, data: {} })
  },
  company: {
    getAll:  jest.fn().mockResolvedValue({ success: true, data: [] }),
    create:  jest.fn().mockResolvedValue({ success: true, data: { id:'c1', name:'Acme' } }),
    update:  jest.fn().mockResolvedValue({ success: true, data: {} }),
    getById: jest.fn().mockResolvedValue({ success: true, data: {} }),
    delete:  jest.fn().mockResolvedValue({ success: true, data: {} })
  },
  employee: {
    getAll:          jest.fn().mockResolvedValue({ success: true, data: [] }),
    create:          jest.fn().mockResolvedValue({ success: true, data: { id:'e1' } }),
    update:          jest.fn().mockResolvedValue({ success: true, data: {} }),
    getPackage:      jest.fn().mockResolvedValue({ success: true, data: null }),
    getDeclaration:  jest.fn().mockResolvedValue({ success: true, data: null }),
    saveDeclaration: jest.fn().mockResolvedValue({ success: true, data: {} }),
    delete:          jest.fn().mockResolvedValue({ success: true, data: {} })
  },
  salary: {
    getAll:                  jest.fn().mockResolvedValue({ success: true, data: [] }),
    getStructureWithComponents: jest.fn().mockResolvedValue({ success: true, data: null }),
    assignStructure:         jest.fn().mockResolvedValue({ success: true, data: {} }),
    getEmployeeSalary:       jest.fn().mockResolvedValue({ success: true, data: null })
  },
  attendance: {
    getCompany: jest.fn().mockResolvedValue({ success: true, data: [] }),
    save:       jest.fn().mockResolvedValue({ success: true, data: {} }),
    lock:       jest.fn().mockResolvedValue({ success: true }),
    unlock:     jest.fn().mockResolvedValue({ success: true }),
    get:        jest.fn().mockResolvedValue({ success: true, data: null })
  },
  payroll: {
    getRun:        jest.fn().mockResolvedValue({ success: true, data: null }),
    executeRun:    jest.fn().mockResolvedValue({ success: true, data: {} }),
    draftRun:      jest.fn().mockResolvedValue({ success: true, data: {} }),
    getRunDetails: jest.fn().mockResolvedValue({ success: true, data: [] }),
    updateStatus:  jest.fn().mockResolvedValue({ success: true, data: {} }),
    addOverride:   jest.fn().mockResolvedValue({ success: true, data: {} }),
    bulkFlagCheck: jest.fn().mockResolvedValue({ success: true, data: {} })
  },
  report: { selectDirectory: jest.fn().mockResolvedValue({ success: true, data: '/tmp' }) }
};

// localStorage mock
const _store = {};
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem:    (k) => _store[k] ?? null,
    setItem:    (k, v) => { _store[k] = String(v); },
    removeItem: (k) => { delete _store[k]; },
    clear:      () => { Object.keys(_store).forEach(k => delete _store[k]); }
  }, configurable: true, writable: true
});

// Silence console noise
jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});
