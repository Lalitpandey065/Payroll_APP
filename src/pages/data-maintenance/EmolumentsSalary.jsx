import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DataMaintenanceGrid from '../../components/DataMaintenanceGrid';
import { useCompanyStore } from '../../store/company.store';

const COLUMNS = [
  { key: 'id_no',    label: 'ID #',       width: 70,  readOnly: true },
  { key: 'name',     label: 'Name',        width: 150, readOnly: true },
  { key: 'branch',   label: 'Branch',      width: 100, readOnly: true },
  { key: 'basic',    label: 'Basic',       width: 80,  type: 'number', align: 'right' },
  { key: 'hra',      label: 'HRA',         width: 80,  type: 'number', align: 'right' },
  { key: 'convey',   label: 'Conveyance',  width: 90,  type: 'number', align: 'right' },
  { key: 'hea',      label: 'HEA',         width: 70,  type: 'number', align: 'right' },
  { key: 'spl_all',  label: 'Spl All.',    width: 75,  type: 'number', align: 'right' },
  { key: 'medical',  label: 'Medical',     width: 75,  type: 'number', align: 'right' },
  { key: 'cca',      label: 'CCA',         width: 65,  type: 'number', align: 'right' },
  { key: 'perf_bon', label: 'Perf.Bon',    width: 80,  type: 'number', align: 'right' },
  { key: 'all_01',   label: 'All-01',      width: 70,  type: 'number', align: 'right' },
  { key: 'all_02',   label: 'All-02',      width: 70,  type: 'number', align: 'right' },
  { key: 'all_03',   label: 'All-03',      width: 70,  type: 'number', align: 'right' },
];

export default function EmolumentsSalary() {
  
  const navigate = useNavigate();
  const activeCompany = useCompanyStore(state => state.activeCompany);
  const companyId = activeCompany?.id;

  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    window.api.dataMaintenance.getEmolumentsSalary(companyId)
      .then(res => {
        if (res.success) setRows(res.data);
        else setError(res.error);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [companyId]);

  const handleSave = async (changedRows) => {
    const res = await window.api.dataMaintenance.saveEmolumentsSalary(companyId, changedRows);
    if (!res.success) throw new Error(res.error);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '6px 12px', fontSize: 12 }}>
          {error}
        </div>
      )}
      <DataMaintenanceGrid
        title="Data Maintenance — Emoluments / Salary"
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
