import React, { useEffect, useState } from 'react';
import { Layout } from '../../layouts/Layout';
import { StatusBadge } from '../../components/StatusBadge';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { DisputeTimeline } from '../../components/DisputeTimeline';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorState } from '../../components/ErrorState';
import api from '../../services/api';

export const StudentDisputes = () => {
  const [disputes, setDisputes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Status Filter Tabs
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Detail Modal
  const [selectedDisputeDetail, setSelectedDisputeDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    setLoading(true);
    setError('');
    try {
      const [dispRes, courseRes] = await Promise.all([
        api.get('/api/student/disputes'),
        api.get('/api/courses'),
      ]);
      setDisputes(dispRes.data);
      setCourses(courseRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch disputes.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetailModal = async (disputeId) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/api/student/disputes/${disputeId}`);
      setSelectedDisputeDetail(res.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to load dispute details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetailModal = () => {
    setSelectedDisputeDetail(null);
  };

  const getCourse = (courseId) => courses.find((c) => c.id === courseId);

  const filteredDisputes = disputes.filter((d) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'OPEN') return d.status === 'OPEN';
    if (statusFilter === 'IN_REVIEW') return d.status === 'IN_REVIEW';
    if (statusFilter === 'RESOLVED') return d.status === 'RESOLVED';
    if (statusFilter === 'REJECTED') return d.status === 'REJECTED';
    if (statusFilter === 'ESCALATED') return ['ESCALATED_TO_HOD', 'ESCALATED_TO_ADMIN'].includes(d.status);
    return true;
  });

  const formatSLA = (dueAt, status) => {
    if (['RESOLVED', 'REJECTED'].includes(status)) {
      return <span style={{ color: '#059669', fontSize: '0.75rem', fontWeight: 500 }}>Completed</span>;
    }
    if (!dueAt) return <span style={{ color: '#64748b' }}>—</span>;
    const diffHours = Math.round((new Date(dueAt) - new Date()) / (1000 * 60 * 60));
    if (diffHours < 0) {
      return (
        <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.75rem' }}>
          Breached ({Math.abs(diffHours)}h ago)
        </span>
      );
    }
    return (
      <span style={{ color: diffHours < 12 ? '#d97706' : '#2563eb', fontWeight: 500, fontSize: '0.75rem' }}>
        {diffHours}h remaining
      </span>
    );
  };

  const columns = [
    {
      header: 'ID',
      accessor: 'id',
      render: (d) => <span style={{ fontWeight: 600, color: '#2563eb' }}>#DSP-{d.id}</span>,
    },
    {
      header: 'Course',
      render: (d) => {
        const c = getCourse(d.course_id);
        return (
          <div>
            <strong style={{ color: '#0f172a' }}>{c ? c.name : `Course #${d.course_id}`}</strong>
            {c && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{c.code}</div>}
          </div>
        );
      },
    },
    {
      header: 'Reason',
      render: (d) => (
        <span
          style={{
            maxWidth: '220px',
            display: 'inline-block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={d.reason}
        >
          {d.reason}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (d) => <StatusBadge status={d.status} />,
    },
    {
      header: 'SLA Window',
      render: (d) => formatSLA(d.due_at, d.status),
    },
    {
      header: 'Last Updated',
      render: (d) => (
        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
          {new Date(d.updated_at || d.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Action',
      align: 'right',
      render: (d) => (
        <button
          className="btn btn-outline btn-sm"
          onClick={() => handleOpenDetailModal(d.id)}
        >
          View
        </button>
      ),
    },
  ];

  return (
    <Layout
      pageTitle="Disputes & SLA"
      breadcrumbs={[{ label: 'Home' }, { label: 'Student' }, { label: 'Disputes' }]}
    >
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Attendance Disputes
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem', marginBottom: 0 }}>
            Track dispute resolution stages, SLA countdowns, and official faculty audit logs.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="tabs">
        {[
          { id: 'ALL', label: `All (${disputes.length})` },
          { id: 'OPEN', label: `Open (${disputes.filter((d) => d.status === 'OPEN').length})` },
          { id: 'IN_REVIEW', label: `In Review (${disputes.filter((d) => d.status === 'IN_REVIEW').length})` },
          { id: 'ESCALATED', label: `Escalated (${disputes.filter((d) => ['ESCALATED_TO_HOD', 'ESCALATED_TO_ADMIN'].includes(d.status)).length})` },
          { id: 'RESOLVED', label: `Resolved (${disputes.filter((d) => d.status === 'RESOLVED').length})` },
          { id: 'REJECTED', label: `Rejected (${disputes.filter((d) => d.status === 'REJECTED').length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${statusFilter === tab.id ? 'active' : ''}`}
            onClick={() => setStatusFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner message="Fetching dispute records..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchDisputes} />
      ) : (
        <DataTable
          columns={columns}
          data={filteredDisputes}
          pageSize={10}
          emptyTitle="No Disputes Found"
          emptyDescription="There are no attendance disputes under this filter category."
        />
      )}

      {/* Dispute Details Modal - 2 Column SaaS layout */}
      <Modal
        isOpen={Boolean(selectedDisputeDetail)}
        onClose={handleCloseDetailModal}
        title={selectedDisputeDetail ? `Dispute #DSP-${selectedDisputeDetail.id}` : 'Dispute Details'}
        subtitle={selectedDisputeDetail ? getCourse(selectedDisputeDetail.course_id)?.name : ''}
        maxWidth="760px"
      >
        {selectedDisputeDetail && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem' }}>
            {/* Left: Dispute Core Info */}
            <div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.85rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Current Status</span>
                  <StatusBadge status={selectedDisputeDetail.status} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Course</span>
                  <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>
                    {getCourse(selectedDisputeDetail.course_id)?.name || `Course #${selectedDisputeDetail.course_id}`}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Record ID</span>
                  <span style={{ fontSize: '0.825rem', color: '#334155' }}>#{selectedDisputeDetail.attendance_record_id}</span>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', color: '#64748b' }}>Student Justification / Reason</label>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem', fontSize: '0.85rem', color: '#0f172a', lineHeight: 1.45 }}>
                  "{selectedDisputeDetail.reason}"
                </div>
              </div>

              {selectedDisputeDetail.resolution_remarks && (
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', color: '#64748b' }}>Official Resolution Remarks</label>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem', fontSize: '0.85rem', color: '#0f172a', lineHeight: 1.45 }}>
                    {selectedDisputeDetail.resolution_remarks}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Meta & Activity Timeline */}
            <div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.85rem', marginBottom: '1rem', fontSize: '0.8rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                  Dispute Details
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ color: '#64748b' }}>Submitted:</span>
                  <span style={{ color: '#0f172a' }}>{new Date(selectedDisputeDetail.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ color: '#64748b' }}>SLA Deadline:</span>
                  <span style={{ color: '#0f172a' }}>{selectedDisputeDetail.due_at ? new Date(selectedDisputeDetail.due_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>SLA Status:</span>
                  <span>{formatSLA(selectedDisputeDetail.due_at, selectedDisputeDetail.status)}</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                  Audit Activity
                </div>
                <DisputeTimeline events={selectedDisputeDetail.audit_events || []} />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};
