import ReportPageBase from '../ReportPageBase';
export default function FormC() {
  return (
    <ReportPageBase
      title="Form C — Service Register"
      description="Employee service book as per Factories Act (no payroll run needed)"
      needsRun={false}
      onGenerate={(companyId) =>
        window.api.report.generateFormC({ companyId })
      }
    />
  );
}
