import ReportPageBase from '../ReportPageBase';
export default function FormA() {
  return (
    <ReportPageBase
      title="Form A — Muster Roll"
      description="Attendance register as per Factories Act"
      onGenerate={(companyId, payrollRunId) =>
        window.api.report.generateFormA({ companyId, payrollRunId })
      }
    />
  );
}
