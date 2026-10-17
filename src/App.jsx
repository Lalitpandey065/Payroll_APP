import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CompanyList from './pages/companies/CompanyList';
import CompanyForm from './pages/companies/CompanyForm';
import EmployeeList from './pages/employees/EmployeeList';
import EmployeeForm from './pages/employees/EmployeeForm';
import StructureList from './pages/salary/StructureList';
import StructureBuilder from './pages/salary/StructureBuilder';
import SalaryMapping from './pages/salary/SalaryMapping';
import AttendanceEntry from './pages/attendance/AttendanceEntry';
import PayrollRun from './pages/payroll/PayrollRun';
import PayrollReview from './pages/payroll/PayrollReview';
import ReportsCentre from './pages/reports/ReportsCentre';

// Month reports
import SalaryRegister       from './pages/reports/month/SalaryRegister';
import PaySlip              from './pages/reports/month/PaySlip';
import MonthlySummary       from './pages/reports/month/MonthlySummary';
import EPFReport            from './pages/reports/month/EPFReport';
import ESIReport            from './pages/reports/month/ESIReport';
import LabourWelfare        from './pages/reports/month/LabourWelfare';
import ProfessionalTax      from './pages/reports/month/ProfessionalTax';
import OvertimeReport       from './pages/reports/month/OvertimeReport';
import BankStatement        from './pages/reports/month/BankStatement';
import ArrearReport         from './pages/reports/month/ArrearReport';
import FullFinal            from './pages/reports/month/FullFinal';

// Contractor reports
import ContractorRegister   from './pages/reports/contractor/ContractorRegister';
import ContractorPaySlip    from './pages/reports/contractor/ContractorPaySlip';

// LWF reports
import LWFRegister          from './pages/reports/lwf/LWFRegister';
import LWFChallan           from './pages/reports/lwf/LWFChallan';

// MIS reports
import DepartmentSummary    from './pages/reports/mis/DepartmentSummary';
import CostCentreReport     from './pages/reports/mis/CostCentreReport';
import HeadCountReport      from './pages/reports/mis/HeadCountReport';

// Bonus reports
import BonusRegister        from './pages/reports/bonus/BonusRegister';
import BonusCalculation     from './pages/reports/bonus/BonusCalculation';

// Labour Act reports
import FormA                from './pages/reports/labour/FormA';
import FormB                from './pages/reports/labour/FormB';
import FormC                from './pages/reports/labour/FormC';
import FormD                from './pages/reports/labour/FormD';
import FormH                from './pages/reports/labour/FormH';

// Masters pages
import DepartmentMaster  from './pages/masters/DepartmentMaster';
import DesignationMaster from './pages/masters/DesignationMaster';
import BranchMaster      from './pages/masters/BranchMaster';

// Data Maintenance pages
import EmolumentsSalary           from './pages/data-maintenance/EmolumentsSalary';
import DeductionsPage             from './pages/data-maintenance/DeductionsPage';
import EsiLimitPage               from './pages/data-maintenance/EsiLimitPage';
import StatutoryNumbers           from './pages/data-maintenance/StatutoryNumbers';
import StatutoryStatus            from './pages/data-maintenance/StatutoryStatus';
import SalaryOtType               from './pages/data-maintenance/SalaryOtType';
import IcardPage                  from './pages/data-maintenance/IcardPage';
import DataMaintenancePlaceholder from './pages/data-maintenance/DataMaintenancePlaceholder';

import SettingsPage from './pages/settings/SettingsPage';
import NetworkPage from './pages/network/NetworkPage';
import ImportPage from './pages/import/ImportPage';
import CompanySetup from './pages/setup/CompanySetup';
import SetupAllowance from './pages/setup/SetupAllowance';
import SetupDeduction from './pages/setup/SetupDeduction';
import SetupAttendance from './pages/setup/SetupAttendance';

// Shell Layout
import Sidebar from './components/layout/Sidebar';

/**
 * Route Guard: Redirect to Login if not authenticated.
 */
function ProtectedLayout({ children }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-base)]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedLayout>
              <Dashboard />
            </ProtectedLayout>
          }
        />
        <Route
          path="/companies"
          element={
            <ProtectedLayout>
              <CompanyList />
            </ProtectedLayout>
          }
        />
        <Route
          path="/companies/new"
          element={
            <ProtectedLayout>
              <CompanyForm />
            </ProtectedLayout>
          }
        />
        <Route
          path="/companies/edit/:id"
          element={
            <ProtectedLayout>
              <CompanyForm />
            </ProtectedLayout>
          }
        />
        <Route
          path="/employees"
          element={
            <ProtectedLayout>
              <EmployeeList />
            </ProtectedLayout>
          }
        />
        <Route
          path="/employees/new"
          element={
            <ProtectedLayout>
              <EmployeeForm />
            </ProtectedLayout>
          }
        />
        <Route
          path="/employees/edit/:id"
          element={
            <ProtectedLayout>
              <EmployeeForm />
            </ProtectedLayout>
          }
        />
        <Route
          path="/salary"
          element={
            <ProtectedLayout>
              <StructureList />
            </ProtectedLayout>
          }
        />
        <Route
          path="/salary/new"
          element={
            <ProtectedLayout>
              <StructureBuilder />
            </ProtectedLayout>
          }
        />
        <Route
          path="/salary/edit/:id"
          element={
            <ProtectedLayout>
              <StructureBuilder />
            </ProtectedLayout>
          }
        />
        <Route
          path="/salary/mapping"
          element={
            <ProtectedLayout>
              <SalaryMapping />
            </ProtectedLayout>
          }
        />
        <Route
          path="/attendance"
          element={
            <ProtectedLayout>
              <AttendanceEntry />
            </ProtectedLayout>
          }
        />
        <Route
          path="/payroll"
          element={
            <ProtectedLayout>
              <PayrollRun />
            </ProtectedLayout>
          }
        />
        <Route
          path="/payroll/review"
          element={
            <ProtectedLayout>
              <PayrollReview />
            </ProtectedLayout>
          }
        />
        <Route path="/reports" element={<ProtectedLayout><ReportsCentre /></ProtectedLayout>} />
        <Route path="/reports/month/salary-register" element={<ProtectedLayout><SalaryRegister /></ProtectedLayout>} />
        <Route path="/reports/month/payslip" element={<ProtectedLayout><PaySlip /></ProtectedLayout>} />
        <Route path="/reports/month/summary" element={<ProtectedLayout><MonthlySummary /></ProtectedLayout>} />
        <Route path="/reports/month/epf" element={<ProtectedLayout><EPFReport /></ProtectedLayout>} />
        <Route path="/reports/month/esi" element={<ProtectedLayout><ESIReport /></ProtectedLayout>} />
        <Route path="/reports/month/labour-welfare" element={<ProtectedLayout><LabourWelfare /></ProtectedLayout>} />
        <Route path="/reports/month/professional-tax" element={<ProtectedLayout><ProfessionalTax /></ProtectedLayout>} />
        <Route path="/reports/month/overtime" element={<ProtectedLayout><OvertimeReport /></ProtectedLayout>} />
        <Route path="/reports/month/bank-statement" element={<ProtectedLayout><BankStatement /></ProtectedLayout>} />
        <Route path="/reports/month/arrear" element={<ProtectedLayout><ArrearReport /></ProtectedLayout>} />
        <Route path="/reports/month/full-final" element={<ProtectedLayout><FullFinal /></ProtectedLayout>} />
        <Route path="/reports/contractor/register" element={<ProtectedLayout><ContractorRegister /></ProtectedLayout>} />
        <Route path="/reports/contractor/payslip" element={<ProtectedLayout><ContractorPaySlip /></ProtectedLayout>} />
        <Route path="/reports/lwf/register" element={<ProtectedLayout><LWFRegister /></ProtectedLayout>} />
        <Route path="/reports/lwf/challan" element={<ProtectedLayout><LWFChallan /></ProtectedLayout>} />
        <Route path="/reports/mis/department" element={<ProtectedLayout><DepartmentSummary /></ProtectedLayout>} />
        <Route path="/reports/mis/cost-centre" element={<ProtectedLayout><CostCentreReport /></ProtectedLayout>} />
        <Route path="/reports/mis/head-count" element={<ProtectedLayout><HeadCountReport /></ProtectedLayout>} />
        <Route path="/reports/bonus/register" element={<ProtectedLayout><BonusRegister /></ProtectedLayout>} />
        <Route path="/reports/bonus/calculation" element={<ProtectedLayout><BonusCalculation /></ProtectedLayout>} />
        <Route path="/reports/labour/form-a" element={<ProtectedLayout><FormA /></ProtectedLayout>} />
        <Route path="/reports/labour/form-b" element={<ProtectedLayout><FormB /></ProtectedLayout>} />
        <Route path="/reports/labour/form-c" element={<ProtectedLayout><FormC /></ProtectedLayout>} />
        <Route path="/reports/labour/form-d" element={<ProtectedLayout><FormD /></ProtectedLayout>} />
        <Route path="/reports/labour/form-h" element={<ProtectedLayout><FormH /></ProtectedLayout>} />

        <Route
          path="/setup"
          element={
            <ProtectedLayout>
              <CompanySetup />
            </ProtectedLayout>
          }
        />
        <Route
          path="/setup/allowance"
          element={
            <ProtectedLayout>
              <SetupAllowance />
            </ProtectedLayout>
          }
        />
        <Route
          path="/setup/deduction"
          element={
            <ProtectedLayout>
              <SetupDeduction />
            </ProtectedLayout>
          }
        />
        <Route
          path="/setup/attendance"
          element={
            <ProtectedLayout>
              <SetupAttendance />
            </ProtectedLayout>
          }
        />

        {/* Masters routes */}
        <Route path="/masters/department"  element={<ProtectedLayout><DepartmentMaster /></ProtectedLayout>} />
        <Route path="/masters/designation" element={<ProtectedLayout><DesignationMaster /></ProtectedLayout>} />
        <Route path="/masters/branch"      element={<ProtectedLayout><BranchMaster /></ProtectedLayout>} />

        {/* Data Maintenance routes */}
        <Route path="/data-maintenance/emoluments/salary"       element={<ProtectedLayout><EmolumentsSalary /></ProtectedLayout>} />
        <Route path="/data-maintenance/deductions"              element={<ProtectedLayout><DeductionsPage /></ProtectedLayout>} />
        <Route path="/data-maintenance/esi-limit"               element={<ProtectedLayout><EsiLimitPage /></ProtectedLayout>} />
        <Route path="/data-maintenance/kyc/statutory-numbers"   element={<ProtectedLayout><StatutoryNumbers /></ProtectedLayout>} />
        <Route path="/data-maintenance/kyc/statutory-status"    element={<ProtectedLayout><StatutoryStatus /></ProtectedLayout>} />
        <Route path="/data-maintenance/kyc/salary-ot-type"      element={<ProtectedLayout><SalaryOtType /></ProtectedLayout>} />
        <Route path="/data-maintenance/master/icard"            element={<ProtectedLayout><IcardPage /></ProtectedLayout>} />
        <Route path="/data-maintenance/*"                       element={<ProtectedLayout><DataMaintenancePlaceholder title="Coming Soon" /></ProtectedLayout>} />

        <Route
          path="/settings"
          element={
            <ProtectedLayout>
              <SettingsPage />
            </ProtectedLayout>
          }
        />

        <Route
          path="/network"
          element={
            <ProtectedLayout>
              <NetworkPage />
            </ProtectedLayout>
          }
        />

        <Route
          path="/import"
          element={
            <ProtectedLayout>
              <ImportPage />
            </ProtectedLayout>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
