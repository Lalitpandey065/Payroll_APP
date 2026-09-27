import React, { useState, useEffect } from 'react';
import {
  Database, HardDrive, Download, Upload, RefreshCw,
  CheckCircle, AlertTriangle, Clock, RotateCcw,
  FileJson, Shield, ShieldCheck, ShieldAlert,
  FolderOpen, Activity, Layers, FileText,
  Wifi, WifiOff, Server, Monitor, Link
} from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' }); }
  catch { return d; }
}
function fmtDateTime(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('en-IN', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
}
function VerifiedBadge({ verified }) {
  if (verified === null || verified === undefined)
    return <span className="text-[10px] text-[var(--text-muted)]">—</span>;
  return verified
    ? <span className="inline-flex items-center space-x-0.5 text-[10px] font-bold text-[var(--success)]"><CheckCircle className="w-3 h-3" /><span>Verified</span></span>
    : <span className="inline-flex items-center space-x-0.5 text-[10px] font-bold text-[var(--danger)]"><AlertTriangle className="w-3 h-3" /><span>Failed</span></span>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState('');

  // Network / LAN state
  const [netConfig, setNetConfig] = useState({ mode: 'standalone', serverUrl: '', apiKey: '', hostPort: 7654, autoStart: false });
  const [serverStatus, setServerStatus] = useState({ running: false, ips: [] });
  const [netBusy, setNetBusy] = useState('');
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const isElectron = !!window.api?.backup;
  const hasServerApi = !!window.api?.server;

  useEffect(() => { loadInfo(); loadNetworkState(); }, []);

  const loadInfo = async () => {
    setLoading(true);
    try {
      if (isElectron) {
        const res = await window.api.backup.getInfo();
        if (res.success) setInfo(res.data);
      } else {
        setInfo({
          dbPath: 'Web mode — SQLite not available',
          autoBackupDir: 'N/A',
          documentsBackupDir: null,
          lastBackup: null,
          counts: { autoBackups: 0, migrationSnapshots: 0, payrollSnapshots: 0, sessionCheckpoints: 0 },
          autoBackups: [], migrationSnapshots: [], payrollSnapshots: [], sessionCheckpoints: []
        });
      }
    } catch (e) {
      showMsg('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadNetworkState = async () => {
    if (!hasServerApi) return;
    try {
      const [cfgRes, statusRes] = await Promise.all([
        window.api.server.getConfig(),
        window.api.server.getStatus()
      ]);
      if (cfgRes.success) setNetConfig(cfgRes.data);
      if (statusRes.success) setServerStatus(statusRes.data);
    } catch (e) {}
    // Load sync status
    if (window.api?.sync) {
      try {
        const syncRes = await window.api.sync.getStatus();
        if (syncRes.success) setSyncStatus(syncRes.data);
      } catch (e) {}
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await window.api.sync.now();
      if (res.success) {
        setSyncResult(res.data);
        await loadNetworkState();
        showMsg('success', `Sync complete — pushed ${res.data.push.pushed}, pulled ${res.data.pull.applied} records.`);
      } else {
        showMsg('error', res.error?.message || 'Sync failed.');
      }
    } catch (e) { showMsg('error', e.message); }
    finally { setSyncing(false); }
  };

  const handleSaveNetConfig = async () => {
    setNetBusy('save');
    try {
      await window.api.server.saveConfig(netConfig);
      showMsg('success', 'Network settings saved. Restart the app to apply changes.');
    } catch (e) { showMsg('error', e.message); }
    finally { setNetBusy(''); }
  };

  const handleStartServer = async () => {
    setNetBusy('start');
    try {
      const res = await window.api.server.start(netConfig.hostPort, netConfig.apiKey);
      if (res.success) { await loadNetworkState(); showMsg('success', `Server started on port ${netConfig.hostPort}`); }
      else showMsg('error', res.error?.message || 'Failed to start server.');
    } catch (e) { showMsg('error', e.message); }
    finally { setNetBusy(''); }
  };

  const handleStopServer = async () => {
    setNetBusy('stop');
    try {
      await window.api.server.stop();
      await loadNetworkState();
      showMsg('success', 'Server stopped.');
    } catch (e) { showMsg('error', e.message); }
    finally { setNetBusy(''); }
  };

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: '', text: '' }), 6000);
  };

  const act = async (key, fn) => {
    setBusy(key);
    try { await fn(); }
    catch (e) { showMsg('error', e.message); }
    finally { setBusy(''); }
  };

  const handleBackupNow = () => act('backup_now', async () => {
    const res = await window.api.backup.runNow();
    if (res.success) { showMsg('success', `Backup saved & verified: ${res.data.path}`); await loadInfo(); }
    else showMsg('error', res.error?.message || 'Backup failed.');
  });

  const handleManualBackup = () => act('manual', async () => {
    const res = await window.api.backup.createManual();
    if (res.success) { showMsg('success', `Manual backup saved to: ${res.data.path}${res.data.verified ? ' ✓ Verified' : ' ⚠ Verify failed'}`); await loadInfo(); }
    else showMsg('error', res.error?.message || 'Cancelled.');
  });

  const handleRestore = () => act('restore', async () => {
    const res = await window.api.backup.restore();
    if (res.success) showMsg('success', res.data?.message || 'Restore initiated...');
    else showMsg('error', res.error?.message || 'Cancelled.');
  });

  const handleRestoreFromPath = (backupPath) => act('restore_' + backupPath, async () => {
    const res = await window.api.backup.restoreFromPath(backupPath);
    if (res.success) showMsg('success', res.data?.message || 'Restore initiated...');
    else showMsg('error', res.error?.message || 'Cancelled.');
  });

  const handleExportJSON = () => act('export_json', async () => {
    const res = await window.api.backup.exportJSON();
    if (res.success) showMsg('success', `All data exported to: ${res.data.path} (${res.data.tableCount} tables)`);
    else showMsg('error', res.error?.message || 'Cancelled.');
  });

  // Compute overall protection score for the status banner
  const protectionLevel = (() => {
    if (!info || !isElectron) return 'unknown';
    const { lastBackup, counts } = info;
    if (!lastBackup) return 'low';
    const daysSince = lastBackup.date
      ? Math.floor((Date.now() - new Date(lastBackup.date).getTime()) / 86400000)
      : 999;
    if (daysSince > 7) return 'low';
    if (!lastBackup.verified) return 'medium';
    if (counts.sessionCheckpoints > 0) return 'high';
    return 'medium';
  })();

  const protectionConfig = {
    high:    { icon: ShieldCheck, color: 'text-[var(--success)]', bg: 'bg-[var(--success-light)]', label: 'Fully Protected', desc: 'Daily backups, session checkpoints, and verified backups are all active.' },
    medium:  { icon: Shield,      color: 'text-amber-600',        bg: 'bg-amber-50',               label: 'Partially Protected', desc: 'Backups are running but some checks are unverified or checkpoints are missing.' },
    low:     { icon: ShieldAlert,  color: 'text-[var(--danger)]',  bg: 'bg-[var(--danger-light)]',  label: 'Low Protection', desc: 'No recent backup found. Run a backup now to protect your data.' },
    unknown: { icon: Shield,       color: 'text-[var(--text-muted)]', bg: 'bg-[var(--bg-hover)]',  label: 'Unknown', desc: 'Running in web mode — backup features require the desktop app.' }
  };
  const pc = protectionConfig[protectionLevel];
  const ProtIcon = pc.icon;

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[var(--bg-base)]">
      <TopBar title="Settings" />

      <div className="flex-1 p-6 space-y-6 min-h-0 overflow-y-scroll text-left">

        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">System Settings</h2>
          <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
            Database protection, backups, and data safety controls
          </p>
        </div>

        {/* Feedback */}
        {msg.text && (
          <div className={`p-3.5 rounded-md text-xs font-semibold flex items-center space-x-2 ${
            msg.type === 'success' ? 'bg-[var(--success-light)] text-[var(--success)]' : 'bg-[var(--danger-light)] text-[var(--danger)]'
          }`}>
            {msg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{msg.text}</span>
          </div>
        )}

        {/* Protection Status Banner */}
        <div className={`p-4 rounded-lg flex items-center space-x-4 ${pc.bg}`}>
          <ProtIcon className={`w-8 h-8 shrink-0 ${pc.color}`} />
          <div>
            <p className={`text-sm font-bold ${pc.color}`}>{pc.label}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{pc.desc}</p>
          </div>
          {isElectron && (
            <button onClick={loadInfo} className="ml-auto p-1.5 rounded hover:bg-black/5 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Web mode notice */}
        {!isElectron && (
          <div className="p-3.5 rounded-md text-xs font-semibold flex items-center space-x-2 bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Running in web mode — backup and restore features require the Electron desktop app.</span>
          </div>
        )}

        {/* Top row: DB Info + Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Database Info */}
          <Card title="Database Information" subTitle="Storage locations and current status">
            {loading ? (
              <div className="text-xs text-[var(--text-secondary)] py-4">Loading...</div>
            ) : (
              <div className="space-y-4">
                <InfoRow icon={Database} label="Live Database" value={info?.dbPath} mono />
                <InfoRow icon={FolderOpen} label="Auto-Backup Folder (AppData)" value={info?.autoBackupDir} mono />
                <InfoRow icon={FileText} label="JSON Exports Folder (AppData)" value={info?.exportsDir} mono />
                <InfoRow icon={HardDrive} label="Mirror Folder (Documents)" value={info?.documentsBackupDir || 'Could not resolve'} mono />
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[var(--border)]">
                  <CountChip label="Daily Backups" count={info?.counts?.autoBackups} />
                  <CountChip label="Payroll Snapshots" count={info?.counts?.payrollSnapshots} />
                  <CountChip label="Session Checkpoints" count={info?.counts?.sessionCheckpoints} />
                  <CountChip label="JSON Exports" count={info?.counts?.jsonExports} />
                </div>
                {info?.lastBackup && (
                  <div className="pt-2 border-t border-[var(--border)]">
                    <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Last DB Backup</p>
                    <div className="flex items-center space-x-3 mt-1">
                      <p className="text-sm font-bold text-[var(--text-primary)]">{fmtDate(info.lastBackup.date)}</p>
                      <VerifiedBadge verified={info.lastBackup.verified} />
                      <span className="text-xs text-[var(--text-muted)]">{info.lastBackup.sizeKB} KB</span>
                    </div>
                  </div>
                )}
                {info?.lastExport && (
                  <div className="pt-2 border-t border-[var(--border)]">
                    <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Last JSON Export</p>
                    <div className="flex items-center space-x-3 mt-1">
                      <p className="text-sm font-bold text-[var(--text-primary)]">{fmtDateTime(info.lastExport.createdAt)}</p>
                      <span className="text-xs text-[var(--text-muted)]">{info.lastExport.sizeKB} KB</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Actions */}
          <Card title="Backup & Recovery Actions" subTitle="Protect and restore your payroll data">
            <div className="space-y-3">

              <ActionBlock
                title="Daily Auto-Backup"
                desc="One verified backup per day, kept for 30 days. Also mirrored to your Documents folder."
                status="Active — runs on every app launch"
                statusOk
              />

              <ActionBlock
                title="Session Checkpoint"
                desc="Rolling checkpoint every 30 minutes while the app is open. Max data loss window = 30 min."
                status="Active — runs every 30 minutes"
                statusOk
              />

              <Button variant="primary" icon={RefreshCw} onClick={handleBackupNow}
                disabled={!isElectron || !!busy} className="w-full">
                {busy === 'backup_now' ? 'Backing up…' : 'Force Backup Now'}
              </Button>

              <Button variant="secondary" icon={Download} onClick={handleManualBackup}
                disabled={!isElectron || !!busy} className="w-full">
                {busy === 'manual' ? 'Saving…' : 'Save Manual Backup to Custom Location…'}
              </Button>

              <Button variant="secondary" icon={FileJson} onClick={handleExportJSON}
                disabled={!isElectron || !!busy} className="w-full">
                {busy === 'export_json' ? 'Exporting…' : 'Export All Data as JSON…'}
              </Button>

              <div className="border-t border-[var(--border)] pt-3 space-y-2">
                <Button variant="danger" icon={Upload} onClick={handleRestore}
                  disabled={!isElectron || !!busy} className="w-full">
                  {busy === 'restore' ? 'Restoring…' : 'Restore from Backup File…'}
                </Button>
                <p className="text-[10px] text-[var(--text-muted)] text-center">
                  Backup is verified before restoring. App restarts automatically.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Daily Backup History */}
        <BackupTable
          title="Daily Backup History"
          subTitle="1 per day · 30-day rolling · auto-mirrored to Documents"
          icon={Database}
          iconColor="text-[var(--accent)]"
          emptyMsg="No daily backups yet — will be created on next app launch."
          backups={info?.autoBackups || []}
          loading={loading}
          isElectron={isElectron}
          busy={busy}
          onRestore={handleRestoreFromPath}
          renderLabel={b => fmtDate(b.date)}
          renderSub={b => b.name}
        />

        {/* Payroll Snapshots */}
        <BackupTable
          title="Pre-Payroll Snapshots"
          subTitle="Automatic snapshot before every payroll run · last 10 kept"
          icon={Activity}
          iconColor="text-purple-500"
          emptyMsg="No payroll snapshots yet — created automatically before each payroll run."
          backups={info?.payrollSnapshots || []}
          loading={loading}
          isElectron={isElectron}
          busy={busy}
          onRestore={handleRestoreFromPath}
          renderLabel={b => b.name.replace('pre_payroll_', '').replace(/(_\d+)?\.db$/, '').replace('_', '/')}
          renderSub={b => fmtDateTime(b.createdAt)}
        />

        {/* Session Checkpoints */}
        <BackupTable
          title="Session Checkpoints"
          subTitle="Rolling 30-min checkpoints · last 3 kept"
          icon={Clock}
          iconColor="text-sky-500"
          emptyMsg="No session checkpoints yet."
          backups={info?.sessionCheckpoints || []}
          loading={loading}
          isElectron={isElectron}
          busy={busy}
          onRestore={handleRestoreFromPath}
          renderLabel={b => fmtDateTime(b.createdAt)}
          renderSub={b => `${b.sizeKB} KB`}
        />

        {/* JSON Exports */}
        <Card
          title="Auto JSON Exports"
          subTitle="Once per day · last 10 days kept · mirrored to Documents · human-readable last-resort recovery"
        >
          {loading ? (
            <div className="text-xs text-[var(--text-secondary)] py-4">Loading...</div>
          ) : info?.jsonExports?.length > 0 ? (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {info.jsonExports.map((exp, i) => (
                <div key={exp.name} className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-[var(--bg-hover)]">
                  <div className="flex items-center space-x-3">
                    <FileJson className="w-4 h-4 shrink-0 text-emerald-500" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-xs font-semibold text-[var(--text-primary)]">{fmtDate(exp.date)}</p>
                        {i === 0 && <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 font-bold">Latest</span>}
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] font-mono">{exp.name} · {exp.sizeKB} KB</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 text-center">
              <FileJson className="w-8 h-8 text-[var(--text-muted)] mb-2" />
              <p className="text-xs text-[var(--text-muted)]">No JSON exports yet — created automatically once per day on app launch.</p>
            </div>
          )}
        </Card>

        {/* Migration Snapshots */}
        {(info?.migrationSnapshots?.length > 0) && (
          <BackupTable
            title="Migration Snapshots"
            subTitle="Taken before schema upgrades · last 5 kept"
            icon={Layers}
            iconColor="text-amber-500"
            emptyMsg=""
            backups={info.migrationSnapshots}
            loading={loading}
            isElectron={isElectron}
            busy={busy}
            onRestore={handleRestoreFromPath}
            renderLabel={b => fmtDateTime(b.createdAt)}
            renderSub={b => `${b.sizeKB} KB`}
          />
        )}

        {/* ── LAN / Network Sharing ───────────────────────────────────── */}
        <div className="border-t border-[var(--border)] pt-6">
          <div className="mb-4">
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center space-x-2">
              <Wifi className="w-5 h-5 text-[var(--accent)]" />
              <span>LAN Network Sharing</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Share this database across multiple computers on the same network.
              One machine is the <strong>Host</strong>, others are <strong>Clients</strong>.
            </p>
          </div>

          {!hasServerApi && (
            <div className="p-3 rounded-md bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
              Network sharing requires the desktop app.
            </div>
          )}

          {hasServerApi && (
            <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Mode selector */}
              <Card title="Network Mode" subTitle="How this machine connects to payroll data">
                <div className="space-y-3">
                  {[
                    { value: 'standalone', icon: Monitor, label: 'Standalone',           desc: 'Local database only. No network sharing.' },
                    { value: 'host',       icon: Server,  label: 'Host (Data Server)',   desc: 'Share this machine\'s database with clients on the LAN.' },
                    { value: 'client',     icon: Link,    label: 'Client (Remote)',       desc: 'Connect to a Host machine. All data comes from that machine.' }
                  ].map(opt => (
                    <div key={opt.value} onClick={() => setNetConfig(c => ({ ...c, mode: opt.value }))}
                      className={`flex items-start space-x-3 p-3 rounded-md cursor-pointer border transition-all ${
                        netConfig.mode === opt.value
                          ? 'border-[var(--accent)] bg-[var(--accent-light)]/20'
                          : 'border-[var(--border)] hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      <opt.icon className={`w-4 h-4 mt-0.5 shrink-0 ${netConfig.mode === opt.value ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`} />
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary)]">{opt.label}</p>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Config panel */}
              <Card
                title={netConfig.mode === 'host' ? 'Host Configuration' : netConfig.mode === 'client' ? 'Client Configuration' : 'No Config Needed'}
                subTitle={netConfig.mode === 'host' ? 'Start the server and share the address with clients' : netConfig.mode === 'client' ? 'Enter the Host machine\'s address' : 'Standalone mode uses only this machine\'s local database'}
              >
                {netConfig.mode === 'standalone' && (
                  <p className="text-xs text-[var(--text-secondary)] py-4 text-center">No network configuration needed.</p>
                )}

                {netConfig.mode === 'host' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Port</label>
                      <input type="number" value={netConfig.hostPort}
                        onChange={e => setNetConfig(c => ({ ...c, hostPort: parseInt(e.target.value) || 7654 }))}
                        className="w-28 text-sm px-3 py-1.5 border border-[var(--border-strong)] rounded-md bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">API Key <span className="text-[var(--text-muted)] normal-case font-normal">(recommended)</span></label>
                      <input type="text" placeholder="e.g. paysmart-secret-2026" value={netConfig.apiKey}
                        onChange={e => setNetConfig(c => ({ ...c, apiKey: e.target.value }))}
                        className="w-full text-sm px-3 py-1.5 border border-[var(--border-strong)] rounded-md bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      />
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">Same key must be entered on all client machines.</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="autoStart" checked={!!netConfig.autoStart}
                        onChange={e => setNetConfig(c => ({ ...c, autoStart: e.target.checked }))}
                        className="rounded text-[var(--accent)]"
                      />
                      <label htmlFor="autoStart" className="text-xs font-semibold text-[var(--text-secondary)] cursor-pointer">
                        Auto-start server on every app launch
                      </label>
                    </div>

                    {/* Server status */}
                    <div className={`p-3 rounded-md ${serverStatus.running ? 'bg-[var(--success-light)]' : 'bg-[var(--bg-hover)]'}`}>
                      <div className="flex items-center space-x-2 mb-1.5">
                        {serverStatus.running ? <Wifi className="w-4 h-4 text-[var(--success)]" /> : <WifiOff className="w-4 h-4 text-[var(--text-muted)]" />}
                        <span className={`text-xs font-bold ${serverStatus.running ? 'text-[var(--success)]' : 'text-[var(--text-secondary)]'}`}>
                          {serverStatus.running ? `Server running on port ${netConfig.hostPort}` : 'Server stopped'}
                        </span>
                      </div>
                      {serverStatus.running && serverStatus.ips.map(ip => (
                        <p key={ip.address} className="text-[11px] font-mono text-[var(--text-primary)]">
                          http://{ip.address}:{netConfig.hostPort}
                        </p>
                      ))}
                      {serverStatus.running && <p className="text-[10px] text-[var(--text-muted)] mt-1">Share the address above with client machines.</p>}
                    </div>

                    <div className="flex space-x-2">
                      <Button variant="primary" onClick={handleStartServer} disabled={serverStatus.running || netBusy === 'start'} className="flex-1">
                        {netBusy === 'start' ? 'Starting…' : 'Start Server'}
                      </Button>
                      <Button variant="secondary" onClick={handleStopServer} disabled={!serverStatus.running || netBusy === 'stop'} className="flex-1">
                        {netBusy === 'stop' ? 'Stopping…' : 'Stop Server'}
                      </Button>
                    </div>

                    <Button variant="secondary" onClick={handleSaveNetConfig} disabled={netBusy === 'save'} className="w-full">
                      {netBusy === 'save' ? 'Saving…' : 'Save Host Settings'}
                    </Button>
                  </div>
                )}

                {netConfig.mode === 'client' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Host Server URL</label>
                      <input type="text" placeholder="http://192.168.1.100:7654" value={netConfig.serverUrl}
                        onChange={e => setNetConfig(c => ({ ...c, serverUrl: e.target.value }))}
                        className="w-full text-sm px-3 py-1.5 border border-[var(--border-strong)] rounded-md bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      />
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">Get this from the Host machine → Settings → LAN Network Sharing.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">API Key</label>
                      <input type="text" placeholder="Same key configured on Host" value={netConfig.apiKey}
                        onChange={e => setNetConfig(c => ({ ...c, apiKey: e.target.value }))}
                        className="w-full text-sm px-3 py-1.5 border border-[var(--border-strong)] rounded-md bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      />
                    </div>
                    <div className="p-3 rounded-md bg-blue-50 text-blue-800 text-[11px] font-semibold border border-blue-200">
                      After saving, restart the app — it will connect to the Host automatically.
                    </div>
                    <Button variant="primary" onClick={handleSaveNetConfig} disabled={netBusy === 'save'} className="w-full">
                      {netBusy === 'save' ? 'Saving…' : 'Save & Connect on Next Launch'}
                    </Button>
                  </div>
                )}
              </Card>

            </div>

          {/* Sync Status — only visible in client mode */}
          {hasServerApi && netConfig.mode === 'client' && syncStatus && (
            <div className="mt-6">
              <Card title="Offline Sync" subTitle="Push local changes to master · Pull master changes to this machine">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                  <div className="bg-[var(--bg-hover)] rounded-md px-3 py-2">
                    <p className="text-xs font-semibold text-[var(--text-secondary)]">Machine ID</p>
                    <p className="text-xs font-mono text-[var(--text-primary)] mt-1 truncate">{syncStatus.machineId?.slice(0, 12)}…</p>
                  </div>
                  <div className="bg-[var(--bg-hover)] rounded-md px-3 py-2">
                    <p className="text-xs font-semibold text-[var(--text-secondary)]">Pending Push</p>
                    <p className={`text-lg font-bold mt-0.5 ${syncStatus.pendingPushCount > 0 ? 'text-amber-600' : 'text-[var(--success)]'}`}>
                      {syncStatus.pendingPushCount}
                    </p>
                  </div>
                  <div className="bg-[var(--bg-hover)] rounded-md px-3 py-2">
                    <p className="text-xs font-semibold text-[var(--text-secondary)]">Last Push</p>
                    <p className="text-xs text-[var(--text-primary)] mt-1">{syncStatus.lastPushAt ? fmtDateTime(syncStatus.lastPushAt) : 'Never'}</p>
                  </div>
                  <div className="bg-[var(--bg-hover)] rounded-md px-3 py-2">
                    <p className="text-xs font-semibold text-[var(--text-secondary)]">Last Pull</p>
                    <p className="text-xs text-[var(--text-primary)] mt-1">{syncStatus.lastPullAt ? fmtDateTime(syncStatus.lastPullAt) : 'Never'}</p>
                  </div>
                </div>

                {syncResult && (
                  <div className="mb-4 p-3 rounded-md bg-[var(--success-light)] text-[var(--success)] text-xs font-semibold space-y-1">
                    <p>✓ Sync complete at {fmtDateTime(syncResult.syncedAt)}</p>
                    <p>↑ Pushed: {syncResult.push.pushed} records · Conflicts (master won): {syncResult.push.conflicts}</p>
                    <p>↓ Pulled: {syncResult.pull.pulled} records · Applied: {syncResult.pull.applied}</p>
                    {(syncResult.push.errors?.length > 0 || syncResult.pull.errors?.length > 0) && (
                      <p className="text-amber-700">⚠ Some errors occurred — check app logs.</p>
                    )}
                  </div>
                )}

                <div className="flex space-x-3">
                  <Button variant="primary" icon={RefreshCw} onClick={handleSyncNow} disabled={syncing} className="flex-1">
                    {syncing ? 'Syncing…' : 'Sync Now (Push + Pull)'}
                  </Button>
                </div>

                <div className="mt-3 p-3 rounded-md bg-[var(--bg-hover)] text-[11px] text-[var(--text-secondary)] space-y-1">
                  <p><strong>How it works:</strong></p>
                  <p>→ <strong>Push</strong>: All changes made on this machine while offline are sent to the master.</p>
                  <p>→ <strong>Pull</strong>: All changes on the master since your last sync are downloaded here.</p>
                  <p>→ <strong>Conflict rule</strong>: Newer timestamp wins. For payroll records, master always wins.</p>
                  <p>→ Sync also runs automatically every time this app launches.</p>
                </div>
              </Card>
            </div>
          )}

          </>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value, mono }) {
  return (
    <div>
      <div className="flex items-center space-x-1.5 mb-0.5">
        <Icon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-xs text-[var(--text-primary)] break-all ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  );
}

function CountChip({ label, count }) {
  return (
    <div className="bg-[var(--bg-hover)] rounded-md px-3 py-2">
      <p className="text-xs font-semibold text-[var(--text-secondary)]">{label}</p>
      <p className="text-lg font-bold text-[var(--text-primary)] mt-0.5">{count ?? '—'}</p>
    </div>
  );
}

function ActionBlock({ title, desc, status, statusOk }) {
  return (
    <div className="p-3 rounded-md bg-[var(--bg-hover)]">
      <p className="text-xs font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{desc}</p>
      <div className="flex items-center space-x-1.5 mt-1.5">
        <CheckCircle className={`w-3.5 h-3.5 ${statusOk ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`} />
        <span className={`text-[11px] font-semibold ${statusOk ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>{status}</span>
      </div>
    </div>
  );
}

function BackupTable({ title, subTitle, icon: Icon, iconColor, emptyMsg, backups, loading, isElectron, busy, onRestore, renderLabel, renderSub }) {
  if (!loading && backups.length === 0 && !emptyMsg) return null;

  return (
    <Card title={title} subTitle={subTitle}>
      {loading ? (
        <div className="text-xs text-[var(--text-secondary)] py-4">Loading...</div>
      ) : backups.length > 0 ? (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {backups.map((b, i) => (
            <div key={b.name} className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-[var(--bg-hover)]">
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">{renderLabel(b)}</p>
                    {i === 0 && <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--accent-light)] text-[var(--accent)] font-bold">Latest</span>}
                    <VerifiedBadge verified={b.verified} />
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] font-mono">{renderSub(b)}</p>
                </div>
              </div>
              {isElectron && (
                <button
                  onClick={() => onRestore(b.path)}
                  disabled={!!busy}
                  className="text-[11px] font-semibold text-[var(--accent)] hover:underline disabled:opacity-50 focus:outline-none flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restore</span>
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-8 text-center">
          <Clock className="w-8 h-8 text-[var(--text-muted)] mb-2" />
          <p className="text-xs text-[var(--text-muted)]">{emptyMsg}</p>
        </div>
      )}
    </Card>
  );
}
