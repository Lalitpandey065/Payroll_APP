import ReportPageBase from '../ReportPageBase';
export default function OvertimeReport() {
  return (
    <ReportPageBase
      title="Overtime Report"
      description="OT hours and OT amount per employee"
      onGenerate={(companyId, payrollRunId) =>
        window.api.report.generateOT({ companyId, payrollRunId })
      }
    />
  );
}
