import React, { useEffect, useState } from 'react';
import { Layout } from '../../layouts/Layout';
import { StatusBadge } from '../../components/StatusBadge';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { DisputeTimeline } from '../../components/DisputeTimeline';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorState } from '../../components/ErrorState';
import api from '../../services/api';

export const DisputeMonitor = () => {
  const [disputes, setDisputes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Trigger Worker manual sweep
  const [sweeping, setSweeping] = useState(false);
  const [sweepResult, setSweepResult] = useState('');

  // Timeline Modal
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    setLoading(true);
    setError('');
    try {
      const [dispRes, courseRes, deptRes] = await Promise.all([
        api.get('/api/admin/disputes'),
        api.get('/api/courses'),
        api.get('/api/departments'),
      ]);
      setDisputes(dispRes.data);
      setCourses(courseRes.data);
      setDepartments(deptRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load disputes monitor.');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerSweep = async () => {
    setSweeping(true);
    setSweepResult('');
    try {
      const res = await api.post('/api/admin/trigger-escalation-sweep');
      setSweepResult(`SLA Sweep Completed: Escalated to HOD: ${res.data.escalated_to_hod}, Escalated to Admin: ${res.data.escalated_to_admin}`);
      await fetchDisputes();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to trigger background sweep.');
    } finally {
      setSweeping(false);
    }
  };

  const handleOpenTimeline = async (disputeId) => {
    setTimelineLoading(true);
    try {
      const res = await api.get(`/api/admin/disputes/${disputeId}`);
      setSelectedDispute(res.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to load audit history.');
    } finally {
      setTimelineLoading(false);
    }
  };

  const getCourse = (cId) => courses.find((c) => c.id === cId);
  const getDept = (dId) => departments.find((d) => d.id === dId);

  const filteredDisputes = disputes.filter((d) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'ACTIVE') return ['OPEN', 'IN_REVIEW', 'ESCALATED_TO_HOD', 'ESCALATED_TO_ADMIN'].includes(d.status);
    if (filterStatus === 'RESOLVED') return d.status === 'RESOLVED';
    if (filterStatus === 'REJECTED') return d.status === 'REJECTED';
    return d.status === filterStatus;
  });

  const columns = [
    {
      header: 'ID',
      accessor: 'id',
      render: (d) => <span style={{ fontWeight: 600, color: '#2563eb' }}>#DSP-{d.id}</span>,
    },
    {
      header: 'Course & Dept',
      render: (d) => {
        const c = getCourse(d.course_id);
        const dept = c ? getDept(c.department_id) : null;
        return (
          <div>
            <strong style={{ color: '#0f172a' }}>{c ? c.name : `Course #${d.course_id}`}</strong>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              {dept ? `Dept: ${dept.name}` : 'General'}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Student',
      render: (d) => <span style={{ color: '#0f172a', fontWeight: 500 }}>Student #{d.student_id}</span>,
    },
    {
      header: 'Reason',
      render: (d) => (
        <span style={{ maxWidth: '200px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }} title={d.reason}>
          {d.reason}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (d) => <StatusBadge status={d.status} />,
    },
    {
      header: 'SLA Deadline',
      render: (d) => (
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
          {d.due_at ? new Date(d.due_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      render: (d) => (
        <button
          className="btn btn-outline btn-sm"
          onClick={() => handleOpenTimeline(d.id)}
        >
          Audit Trail
        </button>
      ),
    },
  ];

  return (
    <Layout
      pageTitle="Dispute Monitoring"
      breadcrumbs={[{ label: 'Home' }, { label: 'Admin' }, { label: 'Disputes' }]}
    >
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Campus Dispute & SLA Monitor
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem', marginBottom: 0 }}>
            Full institutional oversight of attendance dispute lifecycles and SLA automation.
          </p>
        </div>

        <button
          className="btn btn-primary btn-sm"
          onClick={handleTriggerSweep}
          disabled={sweeping}
        >
          {sweeping ? 'Running Sweep...' : '⚡ Trigger SLA Sweep'}
        </button>
      </div>

      {sweepResult && (
        <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
          <span>{sweepResult}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'ALL', label: `All (${disputes.length})` },
          { id: 'ACTIVE', label: `Active (${disputes.filter((d) => ['OPEN', 'IN_REVIEW', 'ESCALATED_TO_HOD', 'ESCALATED_TO_ADMIN'].includes(d.status)).length})` },
          { id: 'RESOLVED', label: `Resolved (${disputes.filter((d) => d.status === 'RESOLVED').length})` },
          { id: 'REJECTED', label: `Rejected (${disputes.filter((d) => d.status === 'REJECTED').length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${filterStatus === tab.id ? 'active' : ''}`}
            onClick={() => setFilterStatus(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner message="Monitoring dispute lifecycles..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchDisputes} />
      ) : (
        <DataTable
          columns={columns}
          data={filteredDisputes}
          pageSize={10}
          emptyTitle="No Disputes Found"
          emptyDescription="No disputes found under this filter category."
        />
      )}

      {/* Audit Modal */}
      <Modal
        isOpen={Boolean(selectedDispute)}
        onClose={() => setSelectedDispute(null)}
        title={selectedDispute ? `Dispute #DSP-${selectedDispute.id} Audit Inspection` : ''}
        subtitle="Institutional immutable event log"
        maxWidth="680px"
      >
        {selectedDispute && (
          <div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.85rem', marginBottom: '1rem', fontSize: '0.825rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#64748b' }}>Student Reason:</span>
                <strong style={{ color: '#0f172a' }}>"{selectedDispute.reason}"</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Status:</span>
                <StatusBadge status={selectedDispute.status} />
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
              Audit Events
            </div>
            <DisputeTimeline events={selectedDispute.audit_events || []} />
          </div>
        )}
      </Modal>
    </Layout>
  );
};
