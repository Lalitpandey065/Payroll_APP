import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DataMaintenanceGrid from '../../components/DataMaintenanceGrid';
import { useCompanyStore } from '../../store/company.store';

const MONTH_TYPES = [
  { value: 'Month',   label: 'Month' },
  { value: 'Daily',   label: 'Daily' },
  { value: 'Hourly',  label: 'Hourly' },
];

const OT_TYPES = [
  { value: 'Salary',    label: 'On Salary' },
  { value: 'Basic',     label: 'On Basic' },
  { value: 'BasicDA',   label: 'On Basic+DA' },
  { value: 'Gross',     label: 'On Gross' },
  { value: 'Manual',    label: 'Manual' },
];

const COLUMNS = [
  { key: 'id_no',      label: 'ID #',        width: 70,  readOnly: true },
  { key: 'name',       label: 'Name',         width: 160, readOnly: true },
  { key: 'branch',     label: 'Branch',       width: 110, readOnly: true },
  { key: 'month_type', label: 'Salary Type',  width: 120, type: 'select', options: MONTH_TYPES },
  { key: 'ot_type',    label: 'OT Type',      width: 130, type: 'select', options: OT_TYPES },
];

export default function SalaryOtType() {
  
  const navigate = useNavigate();
  const activeCompany = useCompanyStore(state => state.activeCompany);
  const companyId = activeCompany?.id;

  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    window.api.dataMaintenance.getSalaryOtType(companyId)
      .then(res => { if (res.success) setRows(res.data); else setError(res.error); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [companyId]);

  const handleSave = async (changedRows) => {
    const res = await window.api.dataMaintenance.saveSalaryOtType(companyId, changedRows);
    if (!res.success) throw new Error(res.error);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '6px 12px', fontSize: 12 }}>{error}</div>}
      <DataMaintenanceGrid
        title="Data Maintenance — KYC / Salary & OT Type"
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
