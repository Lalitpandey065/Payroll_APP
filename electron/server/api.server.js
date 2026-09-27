/**
 * PaySmart Pro — Embedded LAN API Server
 *
 * Runs on the HOST machine. Exposes all IPC functionality as HTTP endpoints
 * so CLIENT machines on the same LAN can connect and share the same SQLite DB.
 *
 * Port: 7654 (configurable)
 * Auth: shared API key in X-PaySmart-Key header
 */

const express = require('express');
const cors = require('cors');
const os = require('os');

let _server = null;

// ─── Connected clients registry (in-memory, resets on server restart) ────────
// Map<machineId, { machineId, label, ip, lastSeen, pushCount, pullCount }>
const _connectedClients = new Map();
const CLIENT_TIMEOUT_MS = 60_000; // consider client disconnected after 60s with no heartbeat

function registerClient(machineId, label, ip) {
  const existing = _connectedClients.get(machineId) || { pushCount: 0, pullCount: 0 };
  _connectedClients.set(machineId, {
    machineId,
    label: label || machineId.slice(0, 8),
    ip,
    lastSeen: new Date().toISOString(),
    pushCount: existing.pushCount,
    pullCount: existing.pullCount
  });
}

function getConnectedClients() {
  const now = Date.now();
  const result = [];
  for (const [, client] of _connectedClients) {
    const age = now - new Date(client.lastSeen).getTime();
    result.push({ ...client, isActive: age < CLIENT_TIMEOUT_MS });
  }
  return result.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
}

// ─── Service imports (lazy — only available in Electron main process) ────────
function getServices() {
  return {
    authService:       require('../services/auth.service'),
    companyService:    require('../services/company.service'),
    employeeService:   require('../services/employee.service'),
    salaryService:     require('../services/salary.service'),
    attendanceService: require('../services/attendance.service'),
    payrollService:    require('../services/payroll.service'),
    reportService:     require('../services/report.service')
  };
}

// ─── Get LAN IP addresses ────────────────────────────────────────────────────

function getLanIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  return ips;
}

// ─── Auth middleware ─────────────────────────────────────────────────────────

function makeAuthMiddleware(apiKey) {
  return (req, res, next) => {
    if (!apiKey) return next(); // No key configured = open (dev only)
    const provided = req.headers['x-paysmart-key'];
    if (provided !== apiKey) {
      return res.status(401).json({ success: false, error: { message: 'Invalid API key.' } });
    }
    next();
  };
}

// ─── Response helper ─────────────────────────────────────────────────────────

function ok(data)  { return { success: true,  data }; }
function err(msg)  { return { success: false, error: { message: msg } }; }

function wrap(fn) {
  return async (req, res) => {
    try {
      const result = await fn(req);
      res.json(result);
    } catch (e) {
      console.error('[APIServer] Error:', e.message);
      res.status(500).json(err(e.message));
    }
  };
}

// ─── Start / Stop ────────────────────────────────────────────────────────────

function startServer(port = 7654, apiKey = '') {
  if (_server) return { already: true };

  const app = express();
  const auth = makeAuthMiddleware(apiKey);
  const svc = getServices();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // ── Public routes (no API key required) ───────────────────────────────────
  app.get('/ping', (req, res) => res.json({ ok: true, app: 'PaySmart Pro', version: '1.0' }));

  // Login must be public — clients need to authenticate before they have a key
  app.post('/api/auth/login', wrap(async req => {
    const { email, password } = req.body;
    const user = svc.authService.login(email, password);
    return user ? ok(user) : err('Invalid email or password.');
  }));

  // Apply API key auth to all routes below this line
  app.use(auth);

  // ── Auth (protected) ──────────────────────────────────────────────────────
  app.post('/api/auth/updatePassword', wrap(async req => {
    const { userId, current, newPass } = req.body;
    return ok(svc.authService.updatePassword(userId, current, newPass));
  }));

  // ── Company ───────────────────────────────────────────────────────────────
  app.get('/api/company',        wrap(async req => ok(svc.companyService.getAllCompanies(req.query))));
  app.get('/api/company/:id',    wrap(async req => ok(svc.companyService.getCompanyById(req.params.id))));
  app.post('/api/company',       wrap(async req => ok(svc.companyService.createCompany(req.body))));
  app.put('/api/company/:id',    wrap(async req => ok(svc.companyService.updateCompany(req.params.id, req.body))));
  app.delete('/api/company/:id', wrap(async req => ok(svc.companyService.deleteCompany(req.params.id))));

  // ── Employee ──────────────────────────────────────────────────────────────
  app.get('/api/employee',        wrap(async req => ok(svc.employeeService.getAllEmployees(req.query))));
  app.get('/api/employee/:id',    wrap(async req => ok(svc.employeeService.getEmployeeById(req.params.id))));
  app.get('/api/employee/:id/package', wrap(async req => ok(svc.employeeService.getEmployeePackage(req.params.id))));
  app.post('/api/employee',       wrap(async req => {
    const { data, identity, statutory } = req.body;
    return ok(svc.employeeService.createEmployee(data, identity, statutory));
  }));
  app.put('/api/employee/:id',    wrap(async req => {
    const { core, identity, statutory } = req.body;
    return ok(svc.employeeService.updateEmployee(req.params.id, core, identity, statutory));
  }));
  app.delete('/api/employee/:id', wrap(async req => ok(svc.employeeService.deleteEmployee(req.params.id))));
  app.get('/api/employee/:id/declaration', wrap(async req => ok(svc.employeeService.getInvestmentDeclaration(req.params.id, req.query.finYear))));
  app.post('/api/employee/declaration',    wrap(async req => ok(svc.employeeService.saveInvestmentDeclaration(req.body))));

  // ── Salary ────────────────────────────────────────────────────────────────
  app.post('/api/salary/create',   wrap(async req => {
    const { companyId, name, description, defaultCtc } = req.body;
    return ok(svc.salaryService.createStructure(companyId, name, description, defaultCtc));
  }));
  app.get('/api/salary',           wrap(async req => ok(svc.salaryService.getAllStructures(req.query))));
  app.get('/api/salary/:id',       wrap(async req => ok(svc.salaryService.getStructureWithComponents(req.params.id))));
  app.post('/api/salary/assign',   wrap(async req => {
    const { empId, structureId, ctc, overrides, effectiveFrom } = req.body;
    return ok(svc.salaryService.assignSalaryStructure(empId, structureId, ctc, overrides, effectiveFrom));
  }));
  app.get('/api/salary/employee/:empId', wrap(async req => ok(svc.salaryService.getEmployeeSalary(req.params.empId))));
  app.put('/api/salary/:id',       wrap(async req => {
    const { components, defaultCtc, name, description } = req.body;
    return ok(svc.salaryService.saveStructureWithComponents(req.params.id, components, defaultCtc, name, description));
  }));

  // ── Attendance ────────────────────────────────────────────────────────────
  app.get('/api/attendance/:empId', wrap(async req => {
    const { month, year } = req.query;
    return ok(svc.attendanceService.getAttendanceLog(req.params.empId, parseInt(month), parseInt(year)));
  }));
  app.get('/api/attendance/company/:companyId', wrap(async req => {
    const { month, year } = req.query;
    return ok(svc.attendanceService.getCompanyAttendance(req.params.companyId, parseInt(month), parseInt(year)));
  }));
  app.post('/api/attendance',      wrap(async req => ok(svc.attendanceService.saveAttendanceLog(req.body))));
  app.post('/api/attendance/lock', wrap(async req => {
    const { companyId, month, year, user } = req.body;
    return ok(svc.attendanceService.lockAttendance(companyId, month, year, user));
  }));
  app.post('/api/attendance/unlock', wrap(async req => {
    const { companyId, month, year, user } = req.body;
    return ok(svc.attendanceService.unlockAttendance(companyId, month, year, user));
  }));

  // ── Payroll ───────────────────────────────────────────────────────────────
  app.get('/api/payroll/run',       wrap(async req => {
    const { companyId, month, year } = req.query;
    return ok(svc.payrollService.getPayrollRun(companyId, parseInt(month), parseInt(year)));
  }));
  app.get('/api/payroll/run/:runId/details', wrap(async req => ok(svc.payrollService.getRunDetails(req.params.runId))));
  app.post('/api/payroll/draft',    wrap(async req => {
    const { companyId, month, year, operator } = req.body;
    return ok(svc.payrollService.calculateDraftPayroll(companyId, parseInt(month), parseInt(year), operator));
  }));
  app.post('/api/payroll/execute',  wrap(async req => {
    const { companyId, month, year, operator } = req.body;
    return ok(svc.payrollService.executeAndSavePayroll(companyId, parseInt(month), parseInt(year), operator));
  }));
  app.put('/api/payroll/run/:runId/status', wrap(async req => {
    const { status, user } = req.body;
    return ok(svc.payrollService.updateRunStatus(req.params.runId, status, user));
  }));
  app.post('/api/payroll/override', wrap(async req => ok(svc.payrollService.addOverride(req.body))));
  app.get('/api/payroll/flags',     wrap(async req => {
    const { companyId, month, year } = req.query;
    return ok(svc.payrollService.bulkFlagCheck(companyId, parseInt(month), parseInt(year)));
  }));

  // ── Sync endpoints ────────────────────────────────────────────────────────
  const syncService = require('../services/sync.service');

  // Client heartbeat — registers the client and keeps it in the connected list
  app.post('/api/sync/heartbeat', wrap(async req => {
    const { machineId = 'unknown', label = '', ip = '' } = req.body;
    const clientIp = ip || req.socket.remoteAddress || req.ip || '';
    registerClient(machineId, label, clientIp);
    return ok({ serverTime: new Date().toISOString() });
  }));

  // Child pushes its unsynced changes to master
  app.post('/api/sync/push', wrap(async req => {
    const { items = [], machineId = 'unknown', label = '' } = req.body;
    const clientIp = req.socket.remoteAddress || req.ip || '';
    // Register / refresh client
    registerClient(machineId, label, clientIp);
    if (_connectedClients.has(machineId)) {
      _connectedClients.get(machineId).pushCount += items.length;
    }
    if (!Array.isArray(items) || items.length === 0) {
      return ok({ applied: 0, conflicts: 0, failed: 0, successIds: [] });
    }
    const result = syncService.applyPushedItems(items, machineId);
    return ok(result);
  }));

  // Child pulls master changes since a given timestamp
  app.get('/api/sync/pull', wrap(async req => {
    const { since = null, machineId = 'unknown', label = '' } = req.query;
    const clientIp = req.socket.remoteAddress || req.ip || '';
    registerClient(machineId, label, clientIp);
    if (_connectedClients.has(machineId)) {
      _connectedClients.get(machineId).pullCount += 1;
    }
    const result = syncService.getChangesSince(since || null);
    return ok(result);
  }));

  // Child checks server time and machine ID
  app.get('/api/sync/status', wrap(async req => {
    return ok({
      serverTime: new Date().toISOString(),
      machineId: syncService.getMachineId(),
      tables: syncService.SYNC_TABLES
    });
  }));

  // Master gets list of connected clients (for host UI)
  app.get('/api/sync/clients', wrap(async req => {
    return ok(getConnectedClients());
  }));

  _server = app.listen(port, '0.0.0.0', () => {
    console.log(`[APIServer] PaySmart Pro LAN server started on port ${port}`);
    getLanIPs().forEach(ip => console.log(`[APIServer]   → http://${ip.address}:${port}`));
  });

  _server.on('error', (e) => {
    console.error('[APIServer] Server error:', e.message);
    _server = null;
  });

  return { started: true, port, ips: getLanIPs() };
}

function stopServer() {
  if (!_server) return { stopped: false };
  _server.close();
  _server = null;
  console.log('[APIServer] Server stopped.');
  return { stopped: true };
}

function isRunning() {
  return _server !== null;
}

module.exports = { startServer, stopServer, isRunning, getLanIPs, getConnectedClients };
