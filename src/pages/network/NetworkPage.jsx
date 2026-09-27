import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wifi, WifiOff, Server, Monitor, Copy, Check,
  RefreshCw, Link, Users, Clock, AlertCircle
} from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import Button from '../../components/ui/Button';

const PING_INTERVAL_MS    = 10_000; // connection check every 10s
const CLIENTS_REFRESH_MS  = 10_000; // refresh client list every 10s on host

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return iso; }
}

function fmtDateTime(iso) {
  if (!iso) return 'Never';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return iso; }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NetworkPage() {
  const isElectron  = !!window.api?.server;

  // Config state
  const [mode, setMode]           = useState('standalone'); // 'standalone' | 'host' | 'client'
  const [hostPort, setHostPort]   = useState(7654);
  const [apiKey, setApiKey]       = useState('');
  const [autoStart, setAutoStart] = useState(false);
  const [serverUrl, setServerUrl] = useState('');

  // Server state (host mode)
  const [serverRunning, setServerRunning] = useState(false);
  const [lanIPs, setLanIPs]               = useState([]);
  const [copied, setCopied]               = useState('');

  // Connection state (client mode)
  const [connected, setConnected]       = useState(false);
  const [pingMs, setPingMs]             = useState(null);
  const [lastPingAt, setLastPingAt]     = useState(null);
  const [connecting, setConnecting]     = useState(false);
  const [testUrl, setTestUrl]           = useState('');  // editable field for client

  // Sync state
  const [syncStatus, setSyncStatus]   = useState(null);
  const [syncing, setSyncing]         = useState(false);
  const [syncResult, setSyncResult]   = useState(null);

  // Host: connected clients list
  const [connectedClients, setConnectedClients] = useState([]);

  // UI
  const [busy, setBusy]     = useState('');
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState('');

  const pingTimerRef    = useRef(null);
  const clientsTimerRef = useRef(null);

  // ── Load config on mount ──────────────────────────────────────────────────

  useEffect(() => {
    loadAll();
    return () => {
      clearInterval(pingTimerRef.current);
      clearInterval(clientsTimerRef.current);
    };
  }, []);

  const loadAll = async () => {
    if (!isElectron) return;
    try {
      const [cfgRes, statusRes] = await Promise.all([
        window.api.server.getConfig(),
        window.api.server.getStatus()
      ]);
      if (cfgRes.success && cfgRes.data) {
        const c = cfgRes.data;
        setMode(c.mode || 'standalone');
        setHostPort(c.hostPort || 7654);
        setApiKey(c.apiKey || '');
        setAutoStart(!!c.autoStart);
        setServerUrl(c.serverUrl || '');
        setTestUrl(c.serverUrl || '');
      }
      if (statusRes.success) {
        setServerRunning(statusRes.data.running);
        setLanIPs(statusRes.data.ips || []);
      }

      if (window.api?.sync) {
        const syncRes = await window.api.sync.getStatus();
        if (syncRes.success) setSyncStatus(syncRes.data);
      }
    } catch (e) {
      console.error('[NetworkPage] loadAll error:', e);
    }
  };

  // ── Live ping (client mode) ───────────────────────────────────────────────

  const pingServer = useCallback(async (url) => {
    const target = (url || serverUrl || '').replace(/\/$/, '');
    if (!target) return;
    const start = Date.now();
    try {
      const res = await fetch(`${target}/ping`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        setPingMs(Date.now() - start);
        setConnected(true);
        setLastPingAt(new Date().toISOString());
        return true;
      }
    } catch {
      setPingMs(null);
      setConnected(false);
    }
    return false;
  }, [serverUrl]);

  // Client: start/restart ping timer
  useEffect(() => {
    clearInterval(pingTimerRef.current);
    if (mode === 'client' && serverUrl) {
      pingServer(serverUrl);
      pingTimerRef.current = setInterval(() => pingServer(serverUrl), PING_INTERVAL_MS);
    } else {
      setConnected(false);
      setPingMs(null);
    }
    return () => clearInterval(pingTimerRef.current);
  }, [mode, serverUrl, pingServer]);

  // Host: refresh connected clients list
  const refreshClients = useCallback(async () => {
    if (!window.api?.server?.getClients) return;
    try {
      const res = await window.api.server.getClients();
      if (res.success) setConnectedClients(res.data || []);
    } catch {}
  }, []);

  useEffect(() => {
    clearInterval(clientsTimerRef.current);
    if (mode === 'host' && serverRunning) {
      refreshClients();
      clientsTimerRef.current = setInterval(refreshClients, CLIENTS_REFRESH_MS);
    } else {
      setConnectedClients([]);
    }
    return () => clearInterval(clientsTimerRef.current);
  }, [mode, serverRunning, refreshClients]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleTestConnection = async () => {
    setConnecting(true);
    setError('');
    const ok = await pingServer(testUrl);
    if (ok) {
      setServerUrl(testUrl);
    } else {
      setError(`Cannot reach ${testUrl} — check the IP, port, and that the host server is running.`);
    }
    setConnecting(false);
  };

  const handleSave = async () => {
    setBusy('save');
    setError('');
    const config = { mode, hostPort, apiKey, autoStart, serverUrl: testUrl };
    try {
      await window.api.server.saveConfig(config);
      setServerUrl(testUrl);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  };

  const handleStartServer = async () => {
    setBusy('start');
    try {
      const res = await window.api.server.start(hostPort, apiKey);
      if (res.success) {
        setServerRunning(true);
        const statusRes = await window.api.server.getStatus();
        if (statusRes.success) setLanIPs(statusRes.data.ips || []);
        refreshClients();
      } else {
        setError(res.error?.message || 'Failed to start server.');
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  };

  const handleStopServer = async () => {
    setBusy('stop');
    try {
      await window.api.server.stop();
      setServerRunning(false);
      setLanIPs([]);
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await window.api.sync.now();
      if (res.success) {
        setSyncResult(res.data);
        const syncRes = await window.api.sync.getStatus();
        if (syncRes.success) setSyncStatus(syncRes.data);
      } else {
        setError(res.error?.message || 'Sync failed.');
      }
    } catch (e) { setError(e.message); }
    finally { setSyncing(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[var(--bg-base)]">
      <TopBar title="Network Config" />

      <div className="flex-1 p-6 space-y-6 min-h-0 overflow-y-scroll text-left">

        {/* Page header */}
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">LAN Network Configuration</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Share payroll data across multiple computers on the same network.
          </p>
        </div>

        {!isElectron && (
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold">
            Network features require the desktop app.
          </div>
        )}

        {isElectron && (
          <>
            {/* Error banner */}
            {error && (
              <div className="p-3 rounded-md bg-[var(--danger-light)] text-[var(--danger)] text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Mode selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  value: 'standalone', icon: Monitor,
                  title: 'Standalone',
                  desc: 'No network. This machine uses its own database only.'
                },
                {
                  value: 'host', icon: Server,
                  title: 'Host  (Master DB)',
                  desc: 'This machine holds the database and shares it with others.'
                },
                {
                  value: 'client', icon: Link,
                  title: 'Client  (Remote)',
                  desc: 'Connect to a Host machine. All data comes from the Host.'
                }
              ].map(opt => (
                <div
                  key={opt.value}
                  onClick={() => { setMode(opt.value); setError(''); }}
                  className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                    mode === opt.value
                      ? 'border-[var(--accent)] bg-[var(--accent-light)]/30'
                      : 'border-[var(--border)] hover:border-[var(--accent)]/40 hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`p-2 rounded-lg ${mode === opt.value ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'}`}>
                      <opt.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-[var(--text-primary)]">{opt.title}</span>
                    {mode === opt.value && <Check className="w-4 h-4 text-[var(--accent)] ml-auto" />}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">{opt.desc}</p>
                </div>
              ))}
            </div>

            {/* ── HOST MODE ────────────────────────────────────────────────── */}
            {mode === 'host' && (
              <div className="space-y-4">

                {/* Status banner */}
                <div className={`rounded-xl p-5 flex items-center space-x-5 ${
                  serverRunning
                    ? 'bg-emerald-50 border border-emerald-200'
                    : 'bg-[var(--bg-surface)] border border-[var(--border)]'
                }`}>
                  <div className={`relative w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${
                    serverRunning ? 'bg-emerald-100' : 'bg-slate-100'
                  }`}>
                    {serverRunning && (
                      <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30" />
                    )}
                    <Wifi className={`w-7 h-7 ${serverRunning ? 'text-emerald-600' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <p className={`text-lg font-bold ${serverRunning ? 'text-emerald-700' : 'text-[var(--text-secondary)]'}`}>
                      {serverRunning ? 'Server Running — Ready to Accept Clients' : 'Server Stopped'}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {serverRunning
                        ? 'Share any of the addresses below with your client machines.'
                        : 'Start the server to allow other machines on the LAN to connect.'}
                    </p>
                  </div>
                </div>

                {/* Shareable IPs — the main thing to show */}
                {serverRunning && lanIPs.length > 0 && (
                  <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                    <div className="px-4 py-3 bg-[var(--bg-surface)] border-b border-[var(--border)]">
                      <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                        Share this address with client machines
                      </p>
                    </div>
                    <div className="divide-y divide-[var(--border)]">
                      {lanIPs.map(ip => {
                        const full = `http://${ip.address}:${hostPort}`;
                        return (
                          <div key={ip.address} className="flex items-center justify-between px-4 py-3.5 bg-[var(--bg-surface)]">
                            <div className="flex items-center space-x-3">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                              <div>
                                <p className="text-lg font-bold font-mono text-[var(--text-primary)]">{full}</p>
                                <p className="text-[10px] text-[var(--text-muted)]">{ip.name}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleCopy(full, ip.address)}
                              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors hover:bg-[var(--bg-hover)] text-[var(--accent)]"
                            >
                              {copied === ip.address
                                ? <><Check className="w-3.5 h-3.5" /><span>Copied!</span></>
                                : <><Copy className="w-3.5 h-3.5" /><span>Copy</span></>
                              }
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Connected clients list */}
                {serverRunning && (
                  <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                    <div className="px-4 py-3 bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-[var(--accent)]" />
                        <p className="text-sm font-bold text-[var(--text-primary)]">Connected Clients</p>
                        <span className="px-1.5 py-0.5 rounded-full bg-[var(--accent-light)] text-[var(--accent)] text-xs font-bold">
                          {connectedClients.filter(c => c.isActive).length} online
                        </span>
                      </div>
                      <button onClick={refreshClients} className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {connectedClients.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <p className="text-xs text-[var(--text-muted)]">No clients connected yet. Share the server address above.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--border)]">
                        {connectedClients.map(client => (
                          <div key={client.machineId} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-hover)]">
                            <div className="flex items-center space-x-3">
                              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${client.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                              <div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">{client.label}</p>
                                <p className="text-[11px] text-[var(--text-muted)] font-mono">{client.ip}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-xs font-bold ${client.isActive ? 'text-emerald-600' : 'text-[var(--text-muted)]'}`}>
                                {client.isActive ? '● Online' : '○ Offline'}
                              </p>
                              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                                ↑{client.pushCount} pushed · ↓{client.pullCount} pulled
                              </p>
                              <p className="text-[10px] text-[var(--text-muted)]">
                                Last seen {fmtTime(client.lastSeen)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Server settings */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Port</label>
                    <input
                      type="number"
                      value={hostPort}
                      onChange={e => setHostPort(parseInt(e.target.value) || 7654)}
                      className="w-full text-sm px-3 py-2 border border-[var(--border-strong)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                      API Key <span className="text-[var(--text-muted)] normal-case font-normal">(same key must be entered on all clients)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. paysmart-secret-2026"
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      className="w-full text-sm px-3 py-2 border border-[var(--border-strong)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="autoStartChk" checked={autoStart}
                    onChange={e => setAutoStart(e.target.checked)}
                    className="w-4 h-4 rounded text-[var(--accent)] border-[var(--border-strong)]"
                  />
                  <label htmlFor="autoStartChk" className="text-sm text-[var(--text-primary)] cursor-pointer">
                    Auto-start server every time this app opens
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  {!serverRunning ? (
                    <Button variant="primary" icon={Wifi} onClick={handleStartServer} disabled={busy === 'start'} className="flex-1">
                      {busy === 'start' ? 'Starting…' : 'Start Server'}
                    </Button>
                  ) : (
                    <Button variant="danger" icon={WifiOff} onClick={handleStopServer} disabled={busy === 'stop'} className="flex-1">
                      {busy === 'stop' ? 'Stopping…' : 'Stop Server'}
                    </Button>
                  )}
                  <Button variant="secondary" onClick={handleSave} disabled={busy === 'save'} className="flex-1">
                    {saved ? '✓ Saved' : busy === 'save' ? 'Saving…' : 'Save Settings'}
                  </Button>
                </div>

              </div>
            )}

            {/* ── CLIENT MODE ──────────────────────────────────────────────── */}
            {mode === 'client' && (
              <div className="space-y-4">

                {/* Big connection status */}
                <div className={`rounded-xl p-6 flex items-center space-x-5 ${
                  connected
                    ? 'bg-emerald-50 border-2 border-emerald-200'
                    : 'bg-rose-50 border-2 border-rose-200'
                }`}>
                  <div className={`relative w-16 h-16 rounded-full flex items-center justify-center shrink-0 ${
                    connected ? 'bg-emerald-100' : 'bg-rose-100'
                  }`}>
                    {connected && (
                      <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-25" />
                    )}
                    {connected
                      ? <Wifi className="w-8 h-8 text-emerald-600" />
                      : <WifiOff className="w-8 h-8 text-rose-500" />
                    }
                  </div>
                  <div className="flex-1">
                    <p className={`text-xl font-extrabold ${connected ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {connected ? '● Connected to Master' : '○ Not Connected'}
                    </p>
                    {connected && (
                      <p className="text-xs text-emerald-600 mt-1 font-semibold">
                        {serverUrl} · {pingMs}ms · Last checked {fmtTime(lastPingAt)}
                      </p>
                    )}
                    {!connected && serverUrl && (
                      <p className="text-xs text-rose-500 mt-1">
                        Cannot reach {serverUrl} — ensure Host machine is running and on the same network.
                      </p>
                    )}
                    {!connected && !serverUrl && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        Enter the Host machine's address below and click Connect.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => pingServer(testUrl || serverUrl)}
                    className="p-2 rounded-lg hover:bg-black/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    title="Check connection now"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>

                {/* Host address input */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                    Host Machine Address
                  </label>
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      placeholder="http://192.168.1.100:7654"
                      value={testUrl}
                      onChange={e => { setTestUrl(e.target.value); setError(''); }}
                      onKeyDown={e => { if (e.key === 'Enter') handleTestConnection(); }}
                      className="flex-1 text-sm px-3 py-2 border border-[var(--border-strong)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    />
                    <Button variant="primary" onClick={handleTestConnection} disabled={connecting || !testUrl}>
                      {connecting ? 'Testing…' : 'Connect'}
                    </Button>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    Get this from the Host machine → Network Config page. Press Enter or click Connect to test.
                  </p>
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">API Key</label>
                  <input
                    type="text"
                    placeholder="Same key configured on the Host machine"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-[var(--border-strong)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>

                <Button variant="primary" onClick={handleSave} disabled={busy === 'save'} className="w-full">
                  {saved ? '✓ Settings Saved — Restart app to activate' : busy === 'save' ? 'Saving…' : 'Save & Activate on Next Launch'}
                </Button>

                {/* Sync panel — only when connected */}
                {connected && syncStatus && (
                  <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                    <div className="px-4 py-3 bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-[var(--text-primary)]">Data Sync</p>
                        <p className="text-xs text-[var(--text-secondary)]">Push local changes to master · Pull master updates here</p>
                      </div>
                      {syncStatus.pendingPushCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                          {syncStatus.pendingPushCount} pending
                        </span>
                      )}
                    </div>

                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <SyncStat label="Pending Push" value={syncStatus.pendingPushCount} warn={syncStatus.pendingPushCount > 0} />
                        <SyncStat label="Last Pull" value={fmtDateTime(syncStatus.lastPullAt)} />
                      </div>

                      {syncResult && (
                        <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold space-y-1">
                          <p>✓ Sync complete</p>
                          <p>↑ Pushed {syncResult.push.pushed} records · {syncResult.push.conflicts} conflicts (master won)</p>
                          <p>↓ Pulled {syncResult.pull.pulled} · Applied {syncResult.pull.applied}</p>
                        </div>
                      )}

                      <Button variant="primary" icon={RefreshCw} onClick={handleSyncNow} disabled={syncing} className="w-full">
                        {syncing ? 'Syncing…' : 'Sync Now'}
                      </Button>

                      <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                        Sync runs automatically on every app launch. Use <strong>Sync Now</strong> after coming back online.
                        Conflict rule: newer timestamp wins · payroll records = master always wins.
                      </p>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* ── STANDALONE MODE ──────────────────────────────────────────── */}
            {mode === 'standalone' && (
              <div className="rounded-xl border border-[var(--border)] p-6 flex items-start space-x-4">
                <div className="p-3 rounded-xl bg-[var(--bg-hover)]">
                  <Monitor className="w-6 h-6 text-[var(--text-muted)]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">Standalone Mode</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-md">
                    This machine uses only its own local database.
                    Select <strong>Host</strong> to share data with other computers,
                    or <strong>Client</strong> to connect to another machine's database.
                  </p>
                  <Button variant="secondary" onClick={handleSave} disabled={busy === 'save'} className="mt-4">
                    {saved ? '✓ Saved' : 'Save'}
                  </Button>
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SyncStat({ label, value, warn }) {
  return (
    <div className="bg-[var(--bg-hover)] rounded-lg px-3 py-2">
      <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold mt-0.5 ${warn ? 'text-amber-600' : 'text-[var(--text-primary)]'}`}>{value ?? '—'}</p>
    </div>
  );
}
