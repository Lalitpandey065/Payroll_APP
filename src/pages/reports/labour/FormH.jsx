import ReportPageBase from '../ReportPageBase';
export default function FormH() {
  return (
    <ReportPageBase
      title="Form H — OT Register"
      description="Overtime register as per Factories Act (only OT employees)"
      onGenerate={(companyId, payrollRunId) =>
        window.api.report.generateFormH({ companyId, payrollRunId })
      }
    />
  );
}
