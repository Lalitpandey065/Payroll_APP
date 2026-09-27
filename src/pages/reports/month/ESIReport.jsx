import ReportPageBase from '../ReportPageBase';
export default function ESIReport() {
  return (
    <ReportPageBase
      title="ESI Report"
      description="Employee & employer ESI contribution register"
      onGenerate={(companyId, payrollRunId) =>
        window.api.report.generateESI({ companyId, payrollRunId })
      }
    />
  );
}
