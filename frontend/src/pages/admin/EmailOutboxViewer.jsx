import React, { useEffect, useState } from 'react';
import { Layout } from '../../layouts/Layout';
import { StatusBadge } from '../../components/StatusBadge';
import { DataTable } from '../../components/DataTable';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorState } from '../../components/ErrorState';
import api from '../../services/api';

export const EmailOutboxViewer = () => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchOutbox();
  }, [statusFilter]);

  const fetchOutbox = async () => {
    setLoading(true);
    setError('');
    try {
      let url = '/api/admin/email-outbox';
      if (statusFilter) {
        url += `?status=${statusFilter}`;
      }
      const res = await api.get(url);
      setEmails(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load email outbox.');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'ID',
      accessor: 'id',
      render: (e) => <span style={{ fontWeight: 600, color: '#2563eb' }}>#EML-{e.id}</span>,
    },
    {
      header: 'Recipient',
      render: (e) => (
        <div>
          <strong style={{ color: '#0f172a' }}>{e.recipient_email}</strong>
          {e.recipient_user_id && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>User #{e.recipient_user_id}</div>}
        </div>
      ),
    },
    {
      header: 'Subject & Event',
      render: (e) => (
        <div>
          <div style={{ color: '#0f172a', fontWeight: 500, fontSize: '0.825rem' }}>{e.subject}</div>
          <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#f8fafc', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>
            {e.event_type}
          </span>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (e) => <StatusBadge status={e.status} />,
    },
    {
      header: 'Retries',
      accessor: 'retry_count',
      render: (e) => <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{e.retry_count} / 3</span>,
    },
    {
      header: 'Created At',
      render: (e) => (
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
          {new Date(e.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
        </span>
      ),
    },
  ];

  return (
    <Layout
      pageTitle="Email Outbox"
      breadcrumbs={[{ label: 'Home' }, { label: 'Admin' }, { label: 'Email Outbox' }]}
    >
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Asynchronous Email Outbox Queue
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem', marginBottom: 0 }}>
            Reliable transactional email queue with automatic retries and dead-letter protection.
          </p>
        </div>

        <button className="btn btn-outline btn-sm" onClick={fetchOutbox}>
          Refresh Outbox
        </button>
      </div>

      {/* Filter */}
      <div className="card" style={{ padding: '0.85rem 1rem', marginBottom: '1rem' }}>
        <div className="filter-bar" style={{ margin: 0 }}>
          <label className="form-label" style={{ margin: 0, fontSize: '0.78rem' }}>Filter by Status:</label>
          <select
            className="form-input"
            style={{ width: 'auto', minWidth: '180px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending Only</option>
            <option value="SENT">Sent Only</option>
            <option value="FAILED">Failed Only</option>
          </select>

          <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#64748b' }}>
            Total Emails in Queue: <strong>{emails.length}</strong>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Checking transactional email queue..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchOutbox} />
      ) : (
        <DataTable
          columns={columns}
          data={emails}
          pageSize={10}
          emptyTitle="Outbox Clean"
          emptyDescription="No email messages in this outbox queue state."
        />
      )}
    </Layout>
  );
};
