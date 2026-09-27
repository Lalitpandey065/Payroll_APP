import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DataMaintenanceGrid from '../../components/DataMaintenanceGrid';
import { useCompanyStore } from '../../store/company.store';

const COLUMNS = [
  { key: 'sys_no',      label: 'Sys#',         width: 55,  readOnly: true, align: 'center' },
  { key: 'id_no',       label: 'Old ID #',     width: 80,  readOnly: true },
  { key: 'new_id',      label: 'New ID #',     width: 90,  type: 'text' },
  { key: 'name',        label: 'Name',          width: 160, readOnly: true },
  { key: 'branch',      label: 'Branch',        width: 110, readOnly: true },
  { key: 'department',  label: 'Department',    width: 120, readOnly: true },
  { key: 'designation', label: 'Designation',   width: 120, readOnly: true },
  { key: 'joining_date',label: 'DOJ',           width: 90,  readOnly: true },
  { key: 'salary_type', label: 'Sal.Type',      width: 80,  readOnly: true },
  { key: 'basic',       label: 'Basic',         width: 80,  readOnly: true, align: 'right' },
  { key: 'gross',       label: 'Gross',         width: 90,  readOnly: true, align: 'right' },
];

export default function IcardPage() {
  
  const navigate = useNavigate();
  const activeCompany = useCompanyStore(state => state.activeCompany);
  const companyId = activeCompany?.id;

  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    window.api.dataMaintenance.getIcardList(companyId)
      .then(res => { if (res.success) setRows(res.data); else setError(res.error); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [companyId]);

  const handleSave = async (changedRows) => {
    const res = await window.api.dataMaintenance.saveIcard(companyId, changedRows);
    if (!res.success) throw new Error(res.error);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '6px 12px', fontSize: 12 }}>{error}</div>}
      <div style={{ background: '#fef9c3', borderBottom: '1px solid #fde047', padding: '4px 12px', fontSize: 11, color: '#713f12', flexShrink: 0 }}>
        ⚠️ Changing the ID # here will update the employee code permanently. Only the <strong>New ID #</strong> column is editable.
      </div>
      <DataMaintenanceGrid
        title="Data Maintenance — Master / I-Card"
        columns={COLUMNS}
        rows={rows}
        loading={loading}
        onSave={handleSave}
        onExit={() => navigate(-1)}
        pageSize={25}
        searchKeys={['id_no', 'new_id', 'name', 'branch']}
      />
    </div>
  );
}
