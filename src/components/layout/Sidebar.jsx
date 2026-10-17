import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  IndianRupee,
  CalendarRange,
  PlayCircle,
  FileSpreadsheet,
  Upload,
  Settings,
  Wifi,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
  SlidersHorizontal,
  Database,
  Layers,
  Briefcase,
  MapPin,
  ClipboardList,
  DollarSign,
  MinusCircle,
  ShieldCheck,
  CreditCard,
  Link2
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useCompanyStore } from '../../store/company.store';

/** Poll the network status every 15s so the sidebar dot stays fresh. */
function useNetworkDot() {
  const [dot, setDot] = useState(null); // null | 'host' | 'connected' | 'disconnected'

  useEffect(() => {
    let timer;
    async function check() {
      if (!window.api?.server) return;
      try {
        const [cfgRes, statusRes] = await Promise.all([
          window.api.server.getConfig(),
          window.api.server.getStatus()
        ]);
        const mode = cfgRes.success ? cfgRes.data?.mode : 'standalone';
        if (mode === 'host') {
          setDot(statusRes.success && statusRes.data?.running ? 'host' : 'stopped');
          return;
        }
        if (mode === 'client') {
          const url = cfgRes.success ? cfgRes.data?.serverUrl : '';
          if (!url) { setDot('disconnected'); return; }
          try {
            const r = await fetch(`${url.replace(/\/$/, '')}/ping`, { signal: AbortSignal.timeout(2000) });
            setDot(r.ok ? 'connected' : 'disconnected');
          } catch { setDot('disconnected'); }
          return;
        }
        setDot(null);
      } catch { setDot(null); }
    }
    check();
    timer = setInterval(check, 15_000);
    return () => clearInterval(timer);
  }, []);

  return dot;
}

const reportsNav = {
  label: 'Reports',
  icon: 'ti-file-analytics',
  path: '/reports',
  groups: [
    {
      label: 'Month',
      icon: 'ti-calendar-month',
      key: 'month',
      items: [
        { label: 'Salary Register',  path: '/reports/month/salary-register',  icon: 'ti-table' },
        { label: 'Pay Slip',         path: '/reports/month/payslip',           icon: 'ti-file-invoice' },
        { label: 'Totals',           path: '/reports/month/summary',            icon: 'ti-sum' },
        { label: 'EPF',              path: '/reports/month/epf',               icon: 'ti-building-bank' },
        { label: 'ESI',              path: '/reports/month/esi',               icon: 'ti-heart-rate-monitor' },
        { label: 'Labour Welfare',   path: '/reports/month/labour-welfare',    icon: 'ti-users' },
        { label: 'Professional Tax', path: '/reports/month/professional-tax',  icon: 'ti-receipt-tax' },
        { label: 'Overtime',         path: '/reports/month/overtime',          icon: 'ti-clock-overtime' },
        { label: 'Bank Statement',   path: '/reports/month/bank-statement',    icon: 'ti-building-bank' },
        { label: 'Arrear',           path: '/reports/month/arrear',            icon: 'ti-clock-dollar' },
        { label: 'Full & Final',     path: '/reports/month/full-final',        icon: 'ti-file-check' },
      ]
    },
    {
      label: 'Contractor',
      icon: 'ti-briefcase',
      key: 'contractor',
      items: [
        { label: 'Contractor Register', path: '/reports/contractor/register', icon: 'ti-table' },
        { label: 'Contractor Pay Slip', path: '/reports/contractor/payslip',  icon: 'ti-file-invoice' },
      ]
    },
    {
      label: 'Labour Welfare Fund',
      icon: 'ti-heart-handshake',
      key: 'lwf',
      items: [
        { label: 'LWF Register', path: '/reports/lwf/register', icon: 'ti-table' },
        { label: 'LWF Challan',  path: '/reports/lwf/challan',  icon: 'ti-file-text' },
      ]
    },
    {
      label: 'M.I.S.',
      icon: 'ti-chart-bar',
      key: 'mis',
      items: [
        { label: 'Department Summary', path: '/reports/mis/department',   icon: 'ti-building' },
        { label: 'Cost Centre Report', path: '/reports/mis/cost-centre',  icon: 'ti-coins' },
        { label: 'Head Count Report',  path: '/reports/mis/head-count',   icon: 'ti-users-group' },
      ]
    },
    {
      label: 'Bonus',
      icon: 'ti-gift',
      key: 'bonus',
      items: [
        { label: 'Bonus Register',          path: '/reports/bonus/register',    icon: 'ti-table' },
        { label: 'Bonus Calculation Sheet', path: '/reports/bonus/calculation', icon: 'ti-calculator' },
      ]
    },
    {
      label: 'Labour Act(s)',
      icon: 'ti-scale',
      key: 'labour',
      items: [
        { label: 'Form A  (Muster Roll)',      path: '/reports/labour/form-a', icon: 'ti-forms' },
        { label: 'Form B  (Leave Register)',   path: '/reports/labour/form-b', icon: 'ti-forms' },
        { label: 'Form C  (Service Register)', path: '/reports/labour/form-c', icon: 'ti-forms' },
        { label: 'Form D  (Wages Register)',   path: '/reports/labour/form-d', icon: 'ti-forms' },
        { label: 'Form H  (OT Register)',      path: '/reports/labour/form-h', icon: 'ti-forms' },
      ]
    },
  ]
};

const dataMaintenanceNav = [
  {
    group: 'Emoluments',
    icon: DollarSign,
    key: 'dm-emoluments',
    items: [
      { label: 'Salary',            path: '/data-maintenance/emoluments/salary' },
    ]
  },
  {
    group: 'Deductions',
    icon: MinusCircle,
    key: 'dm-deductions',
    items: [
      { label: 'Deductions',        path: '/data-maintenance/deductions' },
    ]
  },
  {
    group: 'ESI Limit',
    icon: ShieldCheck,
    key: 'dm-esi',
    items: [
      { label: 'ESI Limit',         path: '/data-maintenance/esi-limit' },
    ]
  },
  {
    group: 'KYC',
    icon: ClipboardList,
    key: 'dm-kyc',
    items: [
      { label: 'Statutory Numbers', path: '/data-maintenance/kyc/statutory-numbers' },
      { label: 'Statutory Status',  path: '/data-maintenance/kyc/statutory-status' },
      { label: 'Salary / OT Type',  path: '/data-maintenance/kyc/salary-ot-type' },
    ]
  },
  {
    group: 'Master',
    icon: CreditCard,
    key: 'dm-master',
    items: [
      { label: 'I-Card',            path: '/data-maintenance/master/icard' },
    ]
  },
];

const mastersNav = [
  { label: 'Department',       path: '/masters/department',  icon: Layers },
  { label: 'Designation',      path: '/masters/designation', icon: Briefcase },
  { label: 'Branch / Location',path: '/masters/branch',      icon: MapPin },
  { label: 'Employee',         path: '/employees',           icon: Users },
  { label: 'Company',          path: '/companies',           icon: Building2 },
  { label: 'Salary Structure', path: '/salary',              icon: IndianRupee },
  { label: 'Salary Mapping',   path: '/salary/mapping',      icon: Link2 },
];

export default function Sidebar() {
  const netDot = useNetworkDot();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  
  const companies = useCompanyStore(state => state.companies);
  const activeCompany = useCompanyStore(state => state.activeCompany);
  const setActiveCompany = useCompanyStore(state => state.setActiveCompany);

  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [hasPFSetup, setHasPFSetup] = useState(true);
  const [setupExpanded, setSetupExpanded] = useState(() => location.pathname.startsWith('/setup'));

  const isMastersPath = (p) =>
    p.startsWith('/masters') ||
    p.startsWith('/companies') ||
    p.startsWith('/employees') ||
    p.startsWith('/salary');
  const [mastersExpanded, setMastersExpanded] = useState(() => isMastersPath(location.pathname));

  const isDMPath = (p) => p.startsWith('/data-maintenance');
  const [dmExpanded,      setDmExpanded]      = useState(() => isDMPath(location.pathname));
  const [dmGroupExpanded, setDmGroupExpanded] = useState(() => {
    const found = dataMaintenanceNav.find(g => g.items.some(i => i.path === location.pathname));
    return found ? { [found.key]: true } : {};
  });

  const [expandedGroups, setExpandedGroups] = useState(() => {
    const currentPath = location.pathname;
    const activeGroup = reportsNav.groups.find(g =>
      g.items.some(item => item.path === currentPath)
    );
    return activeGroup ? { [activeGroup.key]: true } : {};
  });

  const toggleGroup = (key) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    const currentPath = location.pathname;
    reportsNav.groups.forEach(group => {
      if (group.items.some(item => item.path === currentPath)) {
        setExpandedGroups(prev => ({ ...prev, [group.key]: true }));
      }
    });
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname.startsWith('/setup')) {
      setSetupExpanded(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (isMastersPath(location.pathname)) {
      setMastersExpanded(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (isDMPath(location.pathname)) {
      setDmExpanded(true);
      const found = dataMaintenanceNav.find(g => g.items.some(i => i.path === location.pathname));
      if (found) setDmGroupExpanded(prev => ({ ...prev, [found.key]: true }));
    }
  }, [location.pathname]);

  useEffect(() => {
    async function checkSetup() {
      if (!activeCompany) {
        setHasPFSetup(true);
        return;
      }
      try {
        const response = await window.api.setup.getEPF(activeCompany.id);
        if (response.success && response.data) {
          setHasPFSetup(true);
        } else {
          setHasPFSetup(false);
        }
      } catch (e) {
        console.error('Error checking EPF setup:', e);
        setHasPFSetup(true);
      }
    }
    checkSetup();
  }, [activeCompany]);

  const [theme, setTheme] = useState(() => {
    const cached = localStorage.getItem('paysmart_theme');
    if (cached) {
      document.documentElement.setAttribute('data-theme', cached);
      return cached;
    }
    return 'light';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('paysmart_theme', nextTheme);
    setTheme(nextTheme);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard',        path: '/',          icon: LayoutDashboard },
    { label: 'Masters',          path: null,         icon: Database },
    { label: 'Data Maintenance', path: null,         icon: ClipboardList },
    { label: 'Setup',            path: '/setup',     icon: SlidersHorizontal },
    { label: 'Attendance',  path: '/attendance',icon: CalendarRange },
    { label: 'Payroll Run', path: '/payroll',   icon: PlayCircle },
    { label: 'Reports',     path: '/reports',   icon: FileSpreadsheet },
    { label: 'Import Data', path: '/import',    icon: Upload },
    { label: 'Network',     path: '/network',   icon: Wifi },
    { label: 'Settings',    path: '/settings',  icon: Settings }
  ];

  // Helper to extract company initials
  const getInitials = (name) => {
    if (!name) return 'PS';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <div className="w-[240px] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] h-screen flex flex-col justify-between shrink-0 select-none z-10">
      
      {/* Top Section */}
      <div className="flex flex-col flex-1 min-h-0">
        
        {/* Company Switcher Dropdown */}
        <div className="relative p-4 border-b border-slate-700/50">
          {activeCompany ? (
            <div 
              onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
              className="flex items-center justify-between p-2 rounded-md hover:bg-[var(--sidebar-hover)] cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-md bg-[var(--sidebar-active)] text-white font-bold flex items-center justify-center shrink-0 text-sm">
                  {getInitials(activeCompany.name)}
                </div>
                <div className="flex flex-col overflow-hidden text-left">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider leading-none">Client Company</span>
                  <span className="text-sm font-semibold truncate mt-1 text-white leading-tight">
                    {activeCompany.name}
                  </span>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            </div>
          ) : (
            <div 
              onClick={() => navigate('/companies')}
              className="flex items-center space-x-2.5 p-2 rounded-md hover:bg-[var(--sidebar-hover)] cursor-pointer text-slate-400"
            >
              <Building2 className="w-5 h-5" />
              <span className="text-sm font-medium">Create Company</span>
            </div>
          )}

          {/* Switcher list */}
          {companyDropdownOpen && (
            <div className="absolute top-[68px] left-4 right-4 bg-slate-800 border border-slate-700 rounded-md shadow-lg z-50 py-1">
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">
                Switch Organization
              </div>
              <div className="max-h-[160px] overflow-y-auto">
                {companies.map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setActiveCompany(c);
                      setCompanyDropdownOpen(false);
                    }}
                    className={`px-3 py-2 text-sm flex items-center space-x-2.5 hover:bg-slate-750 cursor-pointer ${
                      activeCompany?.id === c.id ? 'bg-slate-700 text-white font-medium' : 'text-slate-300'
                    }`}
                  >
                    <div className="w-6 h-6 rounded bg-slate-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {getInitials(c.name)}
                    </div>
                    <span className="truncate text-left">{c.name}</span>
                  </div>
                ))}
              </div>
              <div 
                onClick={() => {
                  setCompanyDropdownOpen(false);
                  navigate('/companies');
                }}
                className="px-3 py-2 text-xs font-semibold text-sky-400 hover:bg-slate-700 cursor-pointer border-t border-slate-700 text-left"
              >
                + Add New Company
              </div>
            </div>
          )}
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-3 py-4 space-y-1 min-h-0 overflow-y-auto">
          {navItems.map((item, idx) => {
            if (item.label === 'Masters') {
              const isActive = isMastersPath(location.pathname);
              return (
                <div key={idx} className="space-y-1">
                  <div
                    onClick={() => setMastersExpanded(!mastersExpanded)}
                    className={`
                      flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 leading-none cursor-pointer
                      ${isActive
                        ? 'bg-[var(--sidebar-hover)] text-white border-l-4 border-[var(--sidebar-active)]'
                        : 'hover:bg-[var(--sidebar-hover)] hover:text-white text-slate-300'
                      }
                    `}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1">Masters</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${mastersExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                  {mastersExpanded && (
                    <div className="pl-6 space-y-0.5">
                      {mastersNav.map((sub) => {
                        const SubIcon = sub.icon;
                        // Longest matching path wins, so /salary/mapping doesn't also highlight /salary
                        const matchesPath = (p) => location.pathname === p || location.pathname.startsWith(p + '/');
                        const isSubActive = matchesPath(sub.path) &&
                          !mastersNav.some(o => o.path.length > sub.path.length && matchesPath(o.path));
                        return (
                          <div
                            key={sub.path}
                            onClick={() => navigate(sub.path)}
                            className={`
                              flex items-center space-x-3 px-3 py-2 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer
                              ${isSubActive
                                ? 'text-white bg-[var(--sidebar-hover)] font-semibold border-l-2 border-[var(--sidebar-active)] pl-2'
                                : 'text-slate-400 hover:text-white hover:bg-[var(--sidebar-hover)] pl-2.5'
                              }
                            `}
                          >
                            <SubIcon className="w-3.5 h-3.5 shrink-0" />
                            <span className="flex-1">{sub.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            if (item.label === 'Data Maintenance') {
              const isActive = isDMPath(location.pathname);
              return (
                <div key={idx} className="space-y-1">
                  <div
                    onClick={() => setDmExpanded(!dmExpanded)}
                    className={`
                      flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 leading-none cursor-pointer
                      ${isActive
                        ? 'bg-[var(--sidebar-hover)] text-white border-l-4 border-[var(--sidebar-active)]'
                        : 'hover:bg-[var(--sidebar-hover)] hover:text-white text-slate-300'
                      }
                    `}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1">Data Maintenance</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${dmExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                  {dmExpanded && (
                    <div className="pl-4 space-y-0.5">
                      {dataMaintenanceNav.map(group => {
                        const GroupIcon = group.icon;
                        const groupActive = group.items.some(i => location.pathname === i.path);
                        const isGroupOpen = dmGroupExpanded[group.key];
                        return (
                          <div key={group.key}>
                            <div
                              onClick={() => setDmGroupExpanded(prev => ({ ...prev, [group.key]: !prev[group.key] }))}
                              className={`
                                flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors
                                ${groupActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}
                              `}
                            >
                              <GroupIcon className="w-3 h-3 shrink-0" />
                              <span className="flex-1">{group.group}</span>
                              <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${isGroupOpen ? 'rotate-180' : ''}`} />
                            </div>
                            {isGroupOpen && (
                              <div className="pl-5 space-y-0.5">
                                {group.items.map(sub => {
                                  const isSubActive = location.pathname === sub.path;
                                  return (
                                    <div
                                      key={sub.path}
                                      onClick={() => navigate(sub.path)}
                                      className={`
                                        flex items-center px-3 py-1.5 rounded-md text-xs cursor-pointer transition-colors
                                        ${isSubActive
                                          ? 'text-white bg-[var(--sidebar-hover)] font-semibold border-l-2 border-[var(--sidebar-active)]'
                                          : 'text-slate-400 hover:text-white hover:bg-[var(--sidebar-hover)]'
                                        }
                                      `}
                                    >
                                      {sub.label}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            if (item.label === 'Setup') {
              const isActive = location.pathname.startsWith('/setup');
              return (
                <div key={idx} className="space-y-1">
                  <div
                    onClick={() => setSetupExpanded(!setupExpanded)}
                    className={`
                      flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 leading-none cursor-pointer
                      ${isActive 
                        ? 'bg-[var(--sidebar-hover)] text-white border-l-4 border-[var(--sidebar-active)]' 
                        : 'hover:bg-[var(--sidebar-hover)] hover:text-white text-slate-300'
                      }
                    `}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {!hasPFSetup && !setupExpanded && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mr-1" title="Setup incomplete" />
                    )}
                    <ChevronDown 
                      className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${setupExpanded ? 'rotate-180' : ''}`} 
                    />
                  </div>
                  {setupExpanded && (
                    <div className="pl-6 space-y-1">
                      <NavLink
                        to="/setup"
                        end
                        className={({ isActive }) => `
                          flex items-center space-x-3 px-3 py-2 rounded-md text-xs font-medium transition-all duration-150
                          ${isActive 
                            ? 'text-white bg-[var(--sidebar-hover)] font-semibold border-l-2 border-[var(--sidebar-active)] pl-2' 
                            : 'text-slate-400 hover:text-white hover:bg-[var(--sidebar-hover)] pl-2.5'
                          }
                        `}
                      >
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="flex-1">Company Setup</span>
                        {!hasPFSetup && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Setup incomplete" />
                        )}
                      </NavLink>
                      <NavLink
                        to="/setup/allowance"
                        className={({ isActive }) => `
                          flex items-center space-x-3 px-3 py-2 rounded-md text-xs font-medium transition-all duration-150
                          ${isActive 
                            ? 'text-white bg-[var(--sidebar-hover)] font-semibold border-l-2 border-[var(--sidebar-active)] pl-2' 
                            : 'text-slate-400 hover:text-white hover:bg-[var(--sidebar-hover)] pl-2.5'
                          }
                        `}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                        <span className="flex-1">Allowance Setup</span>
                      </NavLink>
                      <NavLink
                        to="/setup/deduction"
                        className={({ isActive }) => `
                          flex items-center space-x-3 px-3 py-2 rounded-md text-xs font-medium transition-all duration-150
                          ${isActive 
                            ? 'text-white bg-[var(--sidebar-hover)] font-semibold border-l-2 border-[var(--sidebar-active)] pl-2' 
                            : 'text-slate-400 hover:text-white hover:bg-[var(--sidebar-hover)] pl-2.5'
                          }
                        `}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                        <span className="flex-1">Deduction Setup</span>
                      </NavLink>
                      <NavLink
                        to="/setup/attendance"
                        className={({ isActive }) => `
                          flex items-center space-x-3 px-3 py-2 rounded-md text-xs font-medium transition-all duration-150
                          ${isActive 
                            ? 'text-white bg-[var(--sidebar-hover)] font-semibold border-l-2 border-[var(--sidebar-active)] pl-2' 
                            : 'text-slate-400 hover:text-white hover:bg-[var(--sidebar-hover)] pl-2.5'
                          }
                        `}
                      >
                        <CalendarRange className="w-3.5 h-3.5 shrink-0" />
                        <span className="flex-1">Attendance Setup</span>
                      </NavLink>
                    </div>
                  )}
                </div>
              );
            }

            if (item.label === 'Reports') {
              return (
                <div key={idx} className="sb-section space-y-1">
                  <div
                    className={`
                      flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 leading-none cursor-pointer
                      ${location.pathname.startsWith('/reports') 
                        ? 'bg-[var(--sidebar-hover)] text-white border-l-4 border-[var(--sidebar-active)]' 
                        : 'hover:bg-[var(--sidebar-hover)] hover:text-white text-slate-300'
                      }
                    `}
                    onClick={() => navigate('/reports')}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className={`flex-1 ${location.pathname.startsWith('/reports') ? 'sb-item-active-parent' : ''}`}>
                      Reports
                    </span>
                  </div>

                  {location.pathname.startsWith('/reports') && (
                    <div className="sb-report-groups">
                      {reportsNav.groups.map(group => (
                        <div key={group.key} className="sb-group">
                          <div
                            className={`sb-group-header ${expandedGroups[group.key] ? 'expanded' : ''}`}
                            onClick={() => toggleGroup(group.key)}
                          >
                            <i className={`ti ${group.icon} sb-group-icon`} />
                            <span className="sb-group-label">{group.label}</span>
                            <i className={`ti ${expandedGroups[group.key] ? 'ti-chevron-down' : 'ti-chevron-right'} sb-chevron`} />
                          </div>

                          {expandedGroups[group.key] && (
                            <div className="sb-group-items">
                              {group.items.map(subItem => (
                                <div
                                  key={subItem.path}
                                  className={`sb-sub-item ${location.pathname === subItem.path ? 'active' : ''}`}
                                  onClick={() => navigate(subItem.path)}
                                  title={subItem.label}
                                >
                                  <i className={`ti ${subItem.icon} sb-sub-icon`} />
                                  <span className="sb-sub-label">{subItem.label}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={idx}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 leading-none
                  ${isActive 
                    ? 'bg-[var(--sidebar-hover)] text-white border-l-4 border-[var(--sidebar-active)]' 
                    : 'hover:bg-[var(--sidebar-hover)] hover:text-white text-slate-300'
                  }
                `}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.path === '/network' && netDot && (
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    netDot === 'host'         ? 'bg-emerald-400' :
                    netDot === 'connected'    ? 'bg-emerald-400' :
                    netDot === 'stopped'      ? 'bg-amber-400'   :
                    netDot === 'disconnected' ? 'bg-rose-500'    : ''
                  }`} title={
                    netDot === 'host'         ? 'Server running' :
                    netDot === 'connected'    ? 'Connected to master' :
                    netDot === 'stopped'      ? 'Server stopped' :
                    'Not connected'
                  } />
                )}
                {item.path === '/setup' && !hasPFSetup && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Setup incomplete" />
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile and Controls */}
      <div className="p-4 border-t border-slate-700/50 flex flex-col space-y-3 bg-slate-900/40">
        
        {/* User Card */}
        {user && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center font-semibold text-xs shrink-0">
                {getInitials(user.name)}
              </div>
              <div className="flex flex-col text-left overflow-hidden">
                <span className="text-sm font-medium text-white truncate leading-none">
                  {user.name}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider leading-none mt-1">
                  {user.role}
                </span>
              </div>
            </div>
            
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md hover:bg-[var(--sidebar-hover)] text-slate-400 hover:text-white transition-colors focus:outline-none"
              title="Toggle Theme"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </button>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-wider text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-colors border border-rose-950/10 focus:outline-none"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
