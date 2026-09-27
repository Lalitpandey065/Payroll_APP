import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Construction, ArrowLeft } from 'lucide-react';

export default function DataMaintenancePlaceholder({ title = 'Coming Soon' }) {
  const navigate = useNavigate();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: 14, color: '#64748b'
    }}>
      <Construction size={48} color="#94a3b8" />
      <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{title}</div>
      <div style={{ fontSize: 13 }}>This page is under construction.</div>
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
          padding: '7px 16px', background: '#1e3a5f', color: '#fff',
          border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 13
        }}
      >
        <ArrowLeft size={14} /> Go Back
      </button>
    </div>
  );
}
