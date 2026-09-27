import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DataMaintenanceGrid from '../../components/DataMaintenanceGrid';
import { useCompanyStore } from '../../store/company.store';

const YES_NO = [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }];

const COLUMNS = [
  { key: 'id_no',         label: 'ID #',         width: 70,  readOnly: true },
  { key: 'name',          label: 'Name',          width: 150, readOnly: true },
  { key: 'branch',        label: 'Branch',        width: 100, readOnly: true },
  { key: 'advance',       label: 'Advance',       width: 80,  type: 'number', align: 'right' },
  { key: 'loan',          label: 'Loan',          width: 80,  type: 'number', align: 'right' },
  { key: 'tds',           label: 'TDS',           width: 80,  type: 'number', align: 'right' },
  { key: 'vol_pf',        label: 'Vol PF (₹)',    width: 85,  type: 'number', align: 'right' },
  { key: 'vol_pf_percent',label: 'Vol PF (%)',    width: 85,  type: 'number', align: 'right' },
  { key: 'food',          label: 'Food',          width: 75,  type: 'number', align: 'right' },
  { key: 'transport',     label: 'Transport',     width: 85,  type: 'number', align: 'right' },
  { key: 'ded_03',        label: 'Ded-03',        width: 75,  type: 'number', align: 'right' },
  { key: 'ded_04',        label: 'Ded-04',        width: 75,  type: 'number', align: 'right' },
];

export default function DeductionsPage() {
  
  const navigate = useNavigate();
  const activeCompany = useCompanyStore(state => state.activeCompany);
  const companyId = activeCompany?.id;

  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    window.api.dataMaintenance.getDeductions(companyId)
      .then(res => { if (res.success) setRows(res.data); else setError(res.error); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [companyId]);

  const handleSave = async (changedRows) => {
    const res = await window.api.dataMaintenance.saveDeductions(companyId, changedRows);
    if (!res.success) throw new Error(res.error);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '6px 12px', fontSize: 12 }}>{error}</div>}
      <DataMaintenanceGrid
        title="Data Maintenance — Deductions"
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
