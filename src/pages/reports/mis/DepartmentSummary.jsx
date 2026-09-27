import ReportPageBase from '../ReportPageBase';
export default function DepartmentSummary() {
  return (
    <ReportPageBase
      title="Department Summary"
      description="Payroll summary grouped by department"
      onGenerate={(companyId, payrollRunId) =>
        window.api.report.generateDeptSummary({ companyId, payrollRunId })
      }
    />
  );
}
