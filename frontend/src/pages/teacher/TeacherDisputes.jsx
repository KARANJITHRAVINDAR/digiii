import React, { useEffect, useState } from 'react';
import { Layout } from '../../layouts/Layout';
import { StatusBadge } from '../../components/StatusBadge';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DisputeTimeline } from '../../components/DisputeTimeline';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorState } from '../../components/ErrorState';
import api from '../../services/api';

export const TeacherDisputes = () => {
  const [disputes, setDisputes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal states
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    setLoading(true);
    setError('');
    try {
      const [dispRes, courseRes] = await Promise.all([
        api.get('/api/teacher/disputes'),
        api.get('/api/courses'),
      ]);
      setDisputes(dispRes.data);
      setCourses(courseRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load assigned disputes.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTimeline = async (disputeId) => {
    setActionError('');
    try {
      const res = await api.get(`/api/teacher/disputes/${disputeId}`);
      setSelectedDispute(res.data);
      setShowTimelineModal(true);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to fetch dispute detail.');
    }
  };

  const handleOpenApprove = async (dispute) => {
    setActionError('');
    try {
      const res = await api.get(`/api/teacher/disputes/${dispute.id}`);
      setSelectedDispute(res.data);
      setShowApproveConfirm(true);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to load dispute.');
    }
  };

  const handleConfirmApprove = async () => {
    if (!selectedDispute) return;
    setActionProcessing(true);
    setActionError('');

    try {
      await api.post(`/api/teacher/disputes/${selectedDispute.id}/approve`);
      setShowApproveConfirm(false);
      setSuccessNotice(`Dispute #DSP-${selectedDispute.id} approved. Attendance record updated to PRESENT.`);
      setSelectedDispute(null);
      await fetchDisputes();
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Failed to approve dispute.');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleOpenReject = async (dispute) => {
    setActionError('');
    setRejectionReason('');
    try {
      const res = await api.get(`/api/teacher/disputes/${dispute.id}`);
      setSelectedDispute(res.data);
      setShowRejectModal(true);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to load dispute.');
    }
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setActionError('Please provide a specific rejection justification.');
      return;
    }
    setActionProcessing(true);
    setActionError('');

    try {
      await api.post(`/api/teacher/disputes/${selectedDispute.id}/reject`, {
        reason: rejectionReason.trim(),
      });
      setShowRejectModal(false);
      setSuccessNotice(`Dispute #DSP-${selectedDispute.id} rejected.`);
      setSelectedDispute(null);
      await fetchDisputes();
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Failed to reject dispute.');
    } finally {
      setActionProcessing(false);
    }
  };

  const getCourse = (courseId) => courses.find((c) => c.id === courseId);

  const filteredDisputes = disputes.filter((d) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'PENDING') return ['OPEN', 'IN_REVIEW'].includes(d.status);
    if (filterStatus === 'RESOLVED') return d.status === 'RESOLVED';
    if (filterStatus === 'REJECTED') return d.status === 'REJECTED';
    if (filterStatus === 'ESCALATED') return ['ESCALATED_TO_HOD', 'ESCALATED_TO_ADMIN'].includes(d.status);
    return true;
  });

  const formatSLA = (dueAt, status) => {
    if (['RESOLVED', 'REJECTED'].includes(status)) {
      return <span style={{ color: '#059669', fontSize: '0.75rem' }}>Closed</span>;
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
      header: 'Reason / Claim',
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
      header: 'Actions',
      align: 'right',
      render: (d) => {
        const canAct = ['OPEN', 'IN_REVIEW'].includes(d.status);
        return (
          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => handleOpenTimeline(d.id)}
            >
              Audit
            </button>
            {canAct && (
              <>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => handleOpenApprove(d)}
                >
                  Approve
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleOpenReject(d)}
                >
                  Reject
                </button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <Layout
      pageTitle="Dispute Inbox"
      breadcrumbs={[{ label: 'Home' }, { label: 'Faculty' }, { label: 'Disputes' }]}
    >
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Dispute Review Queue
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem', marginBottom: 0 }}>
            Review student attendance claims with authoritative approval or rejection.
          </p>
        </div>
      </div>

      {successNotice && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          <span>{successNotice}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="tabs">
        {[
          { id: 'ALL', label: `All (${disputes.length})` },
          { id: 'PENDING', label: `Pending Action (${disputes.filter((d) => ['OPEN', 'IN_REVIEW'].includes(d.status)).length})` },
          { id: 'RESOLVED', label: `Approved (${disputes.filter((d) => d.status === 'RESOLVED').length})` },
          { id: 'REJECTED', label: `Rejected (${disputes.filter((d) => d.status === 'REJECTED').length})` },
          { id: 'ESCALATED', label: `Escalated (${disputes.filter((d) => ['ESCALATED_TO_HOD', 'ESCALATED_TO_ADMIN'].includes(d.status)).length})` },
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
        <LoadingSpinner message="Fetching dispute inbox..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchDisputes} />
      ) : (
        <DataTable
          columns={columns}
          data={filteredDisputes}
          pageSize={10}
          emptyTitle="Inbox Clean"
          emptyDescription="There are no disputes matching this filter category."
        />
      )}

      {/* Approve Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showApproveConfirm}
        title={`Approve Dispute #DSP-${selectedDispute?.id}`}
        message={`Are you sure you want to approve this dispute? The student's attendance record will be atomically updated from ABSENT to PRESENT and audit logs will be permanently ledgered.`}
        confirmLabel="Approve Dispute"
        confirmVariant="success"
        loading={actionProcessing}
        onConfirm={handleConfirmApprove}
        onCancel={() => setShowApproveConfirm(false)}
      />

      {/* Reject Modal with Mandatory Reason */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title={`Reject Dispute #DSP-${selectedDispute?.id}`}
        subtitle="Mandatory faculty rejection justification"
        maxWidth="480px"
      >
        <form onSubmit={handleConfirmReject}>
          {actionError && (
            <div className="alert alert-error" style={{ marginBottom: '0.85rem' }}>
              <span>{actionError}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              Rejection Justification <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              className="form-input"
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="State the academic or attendance rationale for rejecting this dispute..."
              required
              autoFocus
            />
            <div className="form-helper">
              The student will receive an official notification with these remarks.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowRejectModal(false)}
              disabled={actionProcessing}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={actionProcessing}>
              {actionProcessing ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Audit Timeline Modal */}
      <Modal
        isOpen={showTimelineModal}
        onClose={() => setShowTimelineModal(false)}
        title={selectedDispute ? `Dispute #DSP-${selectedDispute.id} Audit Trail` : 'Audit Details'}
        subtitle={selectedDispute ? getCourse(selectedDispute.course_id)?.name : ''}
        maxWidth="680px"
      >
        {selectedDispute && (
          <div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.85rem', marginBottom: '1rem', fontSize: '0.825rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#64748b' }}>Student Justification:</span>
                <strong style={{ color: '#0f172a' }}>"{selectedDispute.reason}"</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#64748b' }}>Current Status:</span>
                <StatusBadge status={selectedDispute.status} />
              </div>
              {selectedDispute.resolution_remarks && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Remarks:</span>
                  <span style={{ color: '#0f172a' }}>{selectedDispute.resolution_remarks}</span>
                </div>
              )}
            </div>

            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
              Immutable Audit Events
            </div>
            <DisputeTimeline events={selectedDispute.audit_events || []} />
          </div>
        )}
      </Modal>
    </Layout>
  );
};
