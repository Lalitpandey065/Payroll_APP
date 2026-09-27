import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DataMaintenanceGrid from '../../components/DataMaintenanceGrid';
import { useCompanyStore } from '../../store/company.store';

const COLUMNS = [
  { key: 'id_no',      label: 'ID #',       width: 70,  readOnly: true },
  { key: 'name',       label: 'Name',        width: 160, readOnly: true },
  { key: 'branch',     label: 'Branch',      width: 110, readOnly: true },
  { key: 'esi_status', label: 'ESI Status',  width: 90,  readOnly: true },
  { key: 'esi_limit',  label: 'ESI Limit (₹)', width: 110, type: 'number', align: 'right' },
];

export default function EsiLimitPage() {
  
  const navigate = useNavigate();
  const activeCompany = useCompanyStore(state => state.activeCompany);
  const companyId = activeCompany?.id;

  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    window.api.dataMaintenance.getEsiLimits(companyId)
      .then(res => { if (res.success) setRows(res.data); else setError(res.error); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [companyId]);

  const handleSave = async (changedRows) => {
    const res = await window.api.dataMaintenance.saveEsiLimits(companyId, changedRows);
    if (!res.success) throw new Error(res.error);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '6px 12px', fontSize: 12 }}>{error}</div>}
      <DataMaintenanceGrid
        title="Data Maintenance — ESI Limit"
        columns={COLUMNS}
        rows={rows}
        loading={loading}
        onSave={handleSave}
        onExit={() => navigate(-1)}
        pageSize={25}
        searchKeys={['id_no', 'name', 'branch']}
      />
    </div>
  );
}
