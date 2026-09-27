import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DataMaintenanceGrid from '../../components/DataMaintenanceGrid';
import { useCompanyStore } from '../../store/company.store';

const YES_NO = [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }];

const COLUMNS = [
  { key: 'id_no',         label: 'ID #',          width: 70,  readOnly: true },
  { key: 'name',          label: 'Name',           width: 150, readOnly: true },
  { key: 'branch',        label: 'Branch',         width: 100, readOnly: true },
  { key: 'epf_status',    label: 'EPF',            width: 70,  type: 'select', options: YES_NO },
  { key: 'pension_status',label: 'Pension',        width: 80,  type: 'select', options: YES_NO },
  { key: 'edli_status',   label: 'EDLI',           width: 70,  type: 'select', options: YES_NO },
  { key: 'esi_status',    label: 'ESI',            width: 70,  type: 'select', options: YES_NO },
  { key: 'lwf_status',    label: 'LWF',            width: 70,  type: 'select', options: YES_NO },
  { key: 'pt_status',     label: 'Prof.Tax',       width: 80,  type: 'select', options: YES_NO },
];

export default function StatutoryStatus() {
  
  const navigate = useNavigate();
  const activeCompany = useCompanyStore(state => state.activeCompany);
  const companyId = activeCompany?.id;

  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    window.api.dataMaintenance.getStatutoryStatus(companyId)
      .then(res => { if (res.success) setRows(res.data); else setError(res.error); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [companyId]);

  const handleSave = async (changedRows) => {
    const res = await window.api.dataMaintenance.saveStatutoryStatus(companyId, changedRows);
    if (!res.success) throw new Error(res.error);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '6px 12px', fontSize: 12 }}>{error}</div>}
      <DataMaintenanceGrid
        title="Data Maintenance — KYC / Statutory Status"
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
