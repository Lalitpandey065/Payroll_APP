import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import DataMaintenanceGrid from '../../components/DataMaintenanceGrid';
import { useCompanyStore } from '../../store/company.store';

const COLUMNS = [
  { key: 'id_no',      label: 'ID #',        width: 70,  readOnly: true },
  { key: 'name',       label: 'Name',         width: 140, readOnly: true },
  { key: 'father_name',label: "Father's Name",width: 140, readOnly: true },
  { key: 'joining_date',label: 'DOJ',         width: 90,  readOnly: true },
  { key: 'epf_status', label: 'EPF',          width: 55,  readOnly: true },
  { key: 'uan',        label: 'UAN',          width: 120, type: 'text' },
  { key: 'epf_no',     label: 'EPF No.',      width: 120, type: 'text' },
  { key: 'esi_status', label: 'ESI',          width: 55,  readOnly: true },
  { key: 'esic_no',    label: 'ESIC No.',     width: 120, type: 'text' },
  { key: 'lwf_status', label: 'LWF',          width: 55,  readOnly: true },
  { key: 'lwf_no',     label: 'LWF No.',      width: 110, type: 'text' },
  { key: 'pt_status',  label: 'PTax',         width: 55,  readOnly: true },
  { key: 'ptax_no',    label: 'PTax No.',     width: 110, type: 'text' },
];

export default function StatutoryNumbers() {
  
  const navigate = useNavigate();
  const activeCompany = useCompanyStore(state => state.activeCompany);
  const companyId = activeCompany?.id;
  const companyName = activeCompany?.name || 'Company';

  const [rows,      setRows]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    window.api.dataMaintenance.getStatutoryNumbers(companyId)
      .then(res => { if (res.success) setRows(res.data); else setError(res.error); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [companyId]);

  const handleSave = async (changedRows) => {
    const res = await window.api.dataMaintenance.saveStatutoryNumbers(companyId, changedRows);
    if (!res.success) throw new Error(res.error);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await window.api.dataMaintenance.exportStatutoryNumbers(companyId, companyName);
      if (!res.success) alert('Export failed: ' + res.error);
    } catch (e) { alert('Export error: ' + e.message); }
    finally { setExporting(false); }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '6px 12px', fontSize: 12 }}>{error}</div>}

      {/* extra toolbar for Export */}
      <div style={{ background: '#f1f5f9', padding: '5px 12px', display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 12px', background: '#0f766e', color: '#fff',
            border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600
          }}
        >
          <Download size={13} />
          {exporting ? 'Exporting…' : 'Export Excel'}
        </button>
      </div>

      <DataMaintenanceGrid
        title="Data Maintenance — KYC / Statutory Numbers"
        columns={COLUMNS}
        rows={rows}
        loading={loading}
        onSave={handleSave}
        onExit={() => navigate(-1)}
        pageSize={25}
        searchKeys={['id_no', 'name', 'uan', 'epf_no', 'esic_no']}
      />
    </div>
  );
}
