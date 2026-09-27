import ReportPageBase from '../ReportPageBase';
export default function EPFReport() {
  return (
    <ReportPageBase
      title="EPF Report"
      description="Employee & employer EPF / EPS / EDLI contribution register"
      onGenerate={(companyId, payrollRunId) =>
        window.api.report.generateEPF({ companyId, payrollRunId })
      }
    />
  );
}
