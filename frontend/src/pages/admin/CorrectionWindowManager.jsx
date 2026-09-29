import React, { useEffect, useState } from 'react';
import { Layout } from '../../layouts/Layout';
import { StatusBadge } from '../../components/StatusBadge';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorState } from '../../components/ErrorState';
import api from '../../services/api';

export const CorrectionWindowManager = () => {
  const [windows, setWindows] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Open Window Modal
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [courseId, setCourseId] = useState('');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [opensAt, setOpensAt] = useState(new Date().toISOString().slice(0, 16));
  const [closesAt, setClosesAt] = useState(new Date(Date.now() + 48 * 3600 * 1000).toISOString().slice(0, 16));
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Close Window Confirm
  const [closeTarget, setCloseTarget] = useState(null);
  const [closing, setClosing] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [winRes, courseRes] = await Promise.all([
        api.get('/api/admin/correction-windows'),
        api.get('/api/courses'),
      ]);
      setWindows(winRes.data);
      setCourses(courseRes.data);
      if (courseRes.data.length > 0 && !courseId) {
        setCourseId(String(courseRes.data[0].id));
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load correction windows.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWindow = async (e) => {
    e.preventDefault();
    if (!courseId || !targetDate || !opensAt || !closesAt || !reason.trim()) {
      setModalError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      await api.post('/api/admin/correction-windows', {
        course_id: parseInt(courseId, 10),
        target_attendance_date: targetDate,
        opens_at: new Date(opensAt).toISOString(),
        closes_at: new Date(closesAt).toISOString(),
        reason: reason.trim(),
      });
      setShowOpenModal(false);
      setReason('');
      setSuccessNotice(`Correction window for Course #${courseId} opened successfully.`);
      await fetchData();
    } catch (err) {
      setModalError(err.response?.data?.detail || 'Failed to open correction window.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmClose = async () => {
    if (!closeTarget) return;
    setClosing(true);

    try {
      await api.post(`/api/admin/correction-windows/${closeTarget.id}/close`);
      setSuccessNotice(`Correction window #${closeTarget.id} closed.`);
      setCloseTarget(null);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to close correction window.');
    } finally {
      setClosing(false);
    }
  };

  const getCourse = (cId) => courses.find((c) => c.id === cId);

  const columns = [
    {
      header: 'ID',
      accessor: 'id',
      render: (w) => <span style={{ fontWeight: 600, color: '#2563eb' }}>#WIN-{w.id}</span>,
    },
    {
      header: 'Course',
      render: (w) => {
        const c = getCourse(w.course_id);
        return (
          <div>
            <strong style={{ color: '#0f172a' }}>{c ? c.name : `Course #${w.course_id}`}</strong>
            {c && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{c.code}</div>}
          </div>
        );
      },
    },
    {
      header: 'Target Date',
      accessor: 'target_attendance_date',
      render: (w) => <span style={{ color: '#0f172a', fontWeight: 500 }}>{w.target_attendance_date}</span>,
    },
    {
      header: 'Open Period',
      render: (w) => (
        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
          <div>From: {new Date(w.opens_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
          <div>To: {new Date(w.closes_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (w) => <StatusBadge status={w.status === 'OPEN' ? 'OPEN_WINDOW' : 'CLOSED'} />,
    },
    {
      header: 'Reason',
      render: (w) => (
        <span style={{ maxWidth: '180px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }} title={w.reason}>
          {w.reason}
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      render: (w) => {
        if (w.status === 'OPEN') {
          return (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setCloseTarget(w)}
            >
              Close Window
            </button>
          );
        }
        return <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Closed</span>;
      },
    },
  ];

  return (
    <Layout
      pageTitle="Correction Windows"
      breadcrumbs={[{ label: 'Home' }, { label: 'Admin' }, { label: 'Correction Windows' }]}
    >
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Attendance Correction Windows
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem', marginBottom: 0 }}>
            Authorize time-limited correction windows for historical attendance record modifications.
          </p>
        </div>

        <button className="btn btn-primary btn-sm" onClick={() => setShowOpenModal(true)}>
          + Open Correction Window
        </button>
      </div>

      {successNotice && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          <span>{successNotice}</span>
        </div>
      )}

      {loading ? (
        <LoadingSpinner message="Fetching correction windows..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : (
        <DataTable
          columns={columns}
          data={windows}
          pageSize={10}
          emptyTitle="No Correction Windows"
          emptyDescription="No attendance correction windows have been authorized."
        />
      )}

      {/* Open Window Modal */}
      <Modal
        isOpen={showOpenModal}
        onClose={() => setShowOpenModal(false)}
        title="Authorize Attendance Correction Window"
        subtitle="Specify course, target date, and validity duration"
        maxWidth="500px"
      >
        <form onSubmit={handleOpenWindow}>
          {modalError && (
            <div className="alert alert-error" style={{ marginBottom: '0.85rem' }}>
              <span>{modalError}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Course *</label>
            <select
              className="form-input"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              required
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Target Attendance Date *</label>
            <input
              type="date"
              className="form-input"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Opens At *</label>
              <input
                type="datetime-local"
                className="form-input"
                value={opensAt}
                onChange={(e) => setOpensAt(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Closes At *</label>
              <input
                type="datetime-local"
                className="form-input"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Administrative Reason *</label>
            <textarea
              className="form-input"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Special dispensation granted for sports event OD..."
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowOpenModal(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Opening...' : 'Open Window'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Close Confirm */}
      <ConfirmDialog
        isOpen={Boolean(closeTarget)}
        title={`Close Correction Window #WIN-${closeTarget?.id}`}
        message="Are you sure you want to close this correction window ahead of its scheduled deadline? Any pending modifications will be disallowed."
        confirmLabel="Close Window"
        confirmVariant="danger"
        loading={closing}
        onConfirm={handleConfirmClose}
        onCancel={() => setCloseTarget(null)}
      />
    </Layout>
  );
};
