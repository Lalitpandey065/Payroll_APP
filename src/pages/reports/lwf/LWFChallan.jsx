import ReportPageBase from '../ReportPageBase';
export default function LWFChallan() {
  return (
    <ReportPageBase
      title="LWF Challan"
      description="Labour Welfare Fund challan for remittance"
      onGenerate={(companyId, payrollRunId) =>
        window.api.report.generateLWFChallan({ companyId, payrollRunId })
      }
    />
  );
}
