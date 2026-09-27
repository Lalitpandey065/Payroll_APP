import ReportPageBase from '../ReportPageBase';
export default function HeadCountReport() {
  return (
    <ReportPageBase
      title="Head Count Report"
      description="Employee count by department and status (no payroll run needed)"
      needsRun={false}
      onGenerate={(companyId) =>
        window.api.report.generateHeadCount({ companyId })
      }
    />
  );
}
