import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IndianRupee, Plus, Settings, Eye, Check } from 'lucide-react';
import { useCompanyStore } from '../../store/company.store';
import TopBar from '../../components/layout/TopBar';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { formatDate } from '../../utils/formatters';

export default function StructureList() {
  const navigate = useNavigate();
  const activeCompany = useCompanyStore(state => state.activeCompany);

  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeCompany) {
      loadStructures();
    }
  }, [activeCompany]);

  const loadStructures = async () => {
    setLoading(true);
    try {
      const response = await window.api.salary.getAll({ company_id: activeCompany.id });
      if (response.success) {
        setStructures(response.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const headers = [
    { label: 'Structure Name' },
    { label: 'Description' },
    { label: 'Calculation basis' },
    { label: 'Effective From' },
    { label: 'Status' },
    { label: 'Actions', align: 'right' }
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[var(--bg-base)]">
      <TopBar title="Salary Structures" />

      {/* Body container */}
      <div className="flex-1 p-6 space-y-6 min-h-0 overflow-y-scroll">
        
        {/* Header */}
        <div className="flex items-center justify-between text-left">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Salary Breakdowns & Templates
            </h2>
            <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">
              Configure CTC-based templates and assign individual allowances matrices
            </p>
          </div>
          {activeCompany && (
            <Button 
              onClick={() => navigate('/salary/new')} 
              variant="primary"
              icon={Plus}
            >
              Add Structure
            </Button>
          )}
        </div>

        {!activeCompany ? (
          <Card className="text-center py-16">
            <IndianRupee className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-base font-bold text-[var(--text-primary)]">No Active Company Context</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-sm mx-auto">
              Please select or create an operating company context first on the Executive Dashboard before managing salary structures templates!
            </p>
            <Button 
              onClick={() => navigate('/')} 
              variant="primary" 
              className="mt-6"
              size="sm"
            >
              Select Active Company
            </Button>
          </Card>
        ) : (
          <>
            {structures.length === 0 ? (
              <Card className="text-center py-16">
                <IndianRupee className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">No Custom Structures</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1.5">
                  Every company starts with a default "Standard Structure" pre-seeded with all 12 Indian compliance components.
                </p>
                <Button 
                  onClick={() => navigate('/salary/new')} 
                  variant="primary" 
                  className="mt-6"
                  size="sm"
                >
                  Create Custom Structure
                </Button>
              </Card>
            ) : (
              <Table headers={headers} className="text-left">
                {structures.map(s => (
                  <tr key={s.id} className="hover:bg-[var(--bg-hover)] transition-colors duration-150">
                    
                    {/* Name */}
                    <td className="px-4 py-4 font-semibold text-[var(--text-primary)]">
                      {s.name}
                    </td>

                    {/* Description */}
                    <td className="px-4 py-4 text-xs text-[var(--text-secondary)] max-w-xs truncate">
                      {s.description || 'No description provided.'}
                    </td>

                    {/* Calculation Basis */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent-light)] text-[var(--accent)] text-xs font-semibold uppercase tracking-wider">
                        {s.is_ctc_based === 1 ? 'CTC Based' : 'Fixed Slabs'}
                      </span>
                    </td>

                    {/* Effective date */}
                    <td className="px-4 py-4 text-xs font-semibold text-[var(--text-secondary)] font-mono">
                      {formatDate(s.effective_from)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <Badge status={s.is_active === 1 ? 'active' : 'inactive'}>
                        {s.is_active === 1 ? 'Active' : 'Archived'}
                      </Badge>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <Button
                        onClick={() => navigate(`/salary/edit/${s.id}`)}
                        variant="secondary"
                        size="sm"
                        icon={Settings}
                      >
                        Breakdown Config
                      </Button>
                    </td>

                  </tr>
                ))}
              </Table>
            )}
          </>
        )}

      </div>
    </div>
  );
}
