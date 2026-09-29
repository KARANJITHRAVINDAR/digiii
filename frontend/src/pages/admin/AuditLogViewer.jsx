import React, { useEffect, useState } from 'react';
import { Layout } from '../../layouts/Layout';
import { DataTable } from '../../components/DataTable';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorState } from '../../components/ErrorState';
import api from '../../services/api';

export const AuditLogViewer = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [eventTypeFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      let url = '/api/admin/audit-logs';
      if (eventTypeFilter) {
        url += `?event_type=${eventTypeFilter}`;
      }
      const res = await api.get(url);
      setAuditLogs(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load system audit logs.');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'ID',
      accessor: 'id',
      render: (a) => <span style={{ fontWeight: 600, color: '#2563eb' }}>#{a.id}</span>,
    },
    {
      header: 'Event Type',
      render: (a) => (
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 600,
            color: '#334155',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            padding: '0.15rem 0.45rem',
            borderRadius: '4px',
          }}
        >
          {a.event_type}
        </span>
      ),
    },
    {
      header: 'Actor',
      render: (a) => <span style={{ color: '#0f172a', fontWeight: 500 }}>User #{a.actor_user_id || 'System'}</span>,
    },
    {
      header: 'Message & Context',
      render: (a) => (
        <div>
          <div style={{ color: '#0f172a', fontSize: '0.825rem' }}>{a.message}</div>
          {a.remarks && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Remarks: {a.remarks}</div>}
        </div>
      ),
    },
    {
      header: 'Dispute / Target',
      render: (a) => (
        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
          {a.dispute_id ? `Dispute #${a.dispute_id}` : a.correction_window_id ? `Window #${a.correction_window_id}` : '—'}
        </span>
      ),
    },
    {
      header: 'Timestamp',
      render: (a) => (
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
          {new Date(a.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
        </span>
      ),
    },
  ];

  return (
    <Layout
      pageTitle="System Audit Logs"
      breadcrumbs={[{ label: 'Home' }, { label: 'Admin' }, { label: 'Audit Logs' }]}
    >
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            System Audit Log & Immutable Ledger
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem', marginBottom: 0 }}>
            Permanent chronological record of every dispute lifecycle transition and administrative mutation.
          </p>
        </div>

        <button className="btn btn-outline btn-sm" onClick={fetchLogs}>
          Refresh Ledger
        </button>
      </div>

      {/* Filter */}
      <div className="card" style={{ padding: '0.85rem 1rem', marginBottom: '1rem' }}>
        <div className="filter-bar" style={{ margin: 0 }}>
          <label className="form-label" style={{ margin: 0, fontSize: '0.78rem' }}>Filter by Event Type:</label>
          <select
            className="form-input"
            style={{ width: 'auto', minWidth: '220px' }}
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
          >
            <option value="">All Event Types</option>
            <option value="DISPUTE_CREATED">DISPUTE_CREATED</option>
            <option value="DISPUTE_ASSIGNED">DISPUTE_ASSIGNED</option>
            <option value="DISPUTE_APPROVED">DISPUTE_APPROVED</option>
            <option value="DISPUTE_REJECTED">DISPUTE_REJECTED</option>
            <option value="ESCALATED_TO_HOD">ESCALATED_TO_HOD</option>
            <option value="ESCALATED_TO_ADMIN">ESCALATED_TO_ADMIN</option>
            <option value="ATTENDANCE_CORRECTED">ATTENDANCE_CORRECTED</option>
            <option value="CORRECTION_WINDOW_OPENED">CORRECTION_WINDOW_OPENED</option>
            <option value="CORRECTION_WINDOW_CLOSED">CORRECTION_WINDOW_CLOSED</option>
          </select>

          <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#64748b' }}>
            Total Audit Records: <strong>{auditLogs.length}</strong>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Querying audit trail..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchLogs} />
      ) : (
        <DataTable
          columns={columns}
          data={auditLogs}
          pageSize={12}
          emptyTitle="No Audit Logs"
          emptyDescription="No events match your current filter."
        />
      )}
    </Layout>
  );
};
