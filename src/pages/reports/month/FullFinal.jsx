import ReportPageBase from '../ReportPageBase';
export default function FullFinal() {
  return (
    <ReportPageBase
      title="Full & Final Settlement"
      description="Separated employee settlement statement"
      onGenerate={(companyId, payrollRunId) =>
        window.api.report.generateFullFinal({ companyId, payrollRunId })
      }
    />
  );
}
