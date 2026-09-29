import React, { useEffect, useState } from 'react';
import { Layout } from '../../layouts/Layout';
import { StatusBadge } from '../../components/StatusBadge';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorState } from '../../components/ErrorState';
import api from '../../services/api';

export const StudentAttendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Dispute creation modal
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [attRes, courseRes] = await Promise.all([
        api.get('/api/student/attendance'),
        api.get('/api/courses'),
      ]);
      setAttendance(attRes.data);
      setCourses(courseRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load attendance records.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDisputeModal = (record) => {
    setSelectedRecord(record);
    setDisputeReason('');
    setModalError('');
    setSuccessMsg('');
  };

  const handleCloseDisputeModal = () => {
    setSelectedRecord(null);
    setDisputeReason('');
    setModalError('');
  };

  const handleRaiseDisputeSubmit = async (e) => {
    e.preventDefault();
    if (!disputeReason.trim()) {
      setModalError('Please enter a specific reason for your dispute.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      await api.post('/api/student/disputes', {
        attendance_record_id: selectedRecord.id,
        reason: disputeReason.trim(),
      });
      setSuccessMsg(`Dispute successfully filed for record #${selectedRecord.id}. Assigned to course teacher with 48h SLA.`);
      handleCloseDisputeModal();
      await fetchData();
    } catch (err) {
      setModalError(err.response?.data?.detail || 'Failed to submit dispute.');
    } finally {
      setSubmitting(false);
    }
  };

  const getCourse = (courseId) => courses.find((c) => c.id === courseId);

  const filteredRecords = attendance.filter((rec) => {
    if (selectedCourseFilter !== 'ALL' && String(rec.course_id) !== String(selectedCourseFilter)) {
      return false;
    }
    if (selectedStatusFilter !== 'ALL' && rec.status !== selectedStatusFilter) {
      return false;
    }
    return true;
  });

  const columns = [
    {
      header: 'Date',
      accessor: 'attendance_date',
      render: (r) => <span style={{ fontWeight: 500, color: '#0f172a' }}>{r.attendance_date}</span>,
    },
    {
      header: 'Course',
      render: (r) => {
        const c = getCourse(r.course_id);
        return (
          <div>
            <strong style={{ color: '#0f172a' }}>{c ? c.name : `Course #${r.course_id}`}</strong>
            {c && <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '0.35rem' }}>({c.code})</span>}
          </div>
        );
      },
    },
    {
      header: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      header: 'Dispute Status',
      render: (r) => {
        if (r.has_active_dispute) {
          return <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#d97706' }}>Active Dispute</span>;
        }
        return <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>—</span>;
      },
    },
    {
      header: 'Action',
      align: 'right',
      render: (r) => {
        if (r.status === 'ABSENT' && !r.has_active_dispute) {
          return (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => handleOpenDisputeModal(r)}
            >
              Raise Dispute
            </button>
          );
        }
        return null;
      },
    },
  ];

  return (
    <Layout
      pageTitle="My Attendance"
      breadcrumbs={[{ label: 'Home' }, { label: 'Student' }, { label: 'Attendance' }]}
    >
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            My Attendance
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem', marginBottom: 0 }}>
            Term: AY 2026–2027 ODD • Verified institutional attendance records
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="card" style={{ padding: '0.85rem 1rem', marginBottom: '1rem' }}>
        <div className="filter-bar" style={{ margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label className="form-label" style={{ margin: 0, fontSize: '0.78rem' }}>Course:</label>
            <select
              className="form-input"
              style={{ width: 'auto', minWidth: '180px' }}
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
            >
              <option value="ALL">All Enrolled Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label className="form-label" style={{ margin: 0, fontSize: '0.78rem' }}>Status:</label>
            <select
              className="form-input"
              style={{ width: 'auto', minWidth: '130px' }}
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Present Only</option>
              <option value="ABSENT">Absent Only</option>
            </select>
          </div>

          <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#64748b' }}>
            Showing <strong>{filteredRecords.length}</strong> of <strong>{attendance.length}</strong> sessions
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Fetching attendance history..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : (
        <DataTable
          columns={columns}
          data={filteredRecords}
          pageSize={10}
          emptyTitle="No Attendance Records"
          emptyDescription="No attendance records match your active filters."
        />
      )}

      {/* Raise Dispute Modal */}
      <Modal
        isOpen={Boolean(selectedRecord)}
        onClose={handleCloseDisputeModal}
        title="Raise Attendance Dispute"
        subtitle={selectedRecord ? `Session Date: ${selectedRecord.attendance_date}` : ''}
        maxWidth="480px"
      >
        {selectedRecord && (
          <form onSubmit={handleRaiseDisputeSubmit}>
            {modalError && (
              <div className="alert alert-error" style={{ marginBottom: '0.85rem' }}>
                <span>{modalError}</span>
              </div>
            )}

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.825rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#64748b' }}>Course:</span>
                <strong style={{ color: '#0f172a' }}>{getCourse(selectedRecord.course_id)?.name || `Course #${selectedRecord.course_id}`}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#64748b' }}>Recorded Status:</span>
                <StatusBadge status={selectedRecord.status} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Assigned Reviewer:</span>
                <span style={{ color: '#334155', fontWeight: 500 }}>Course Instructor (48h SLA)</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Dispute Reason / Justification <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                className="form-input"
                rows={4}
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Explain why you were marked absent erroneously (e.g. attended lecture, on-duty approval, lab session discrepancy)..."
                required
                autoFocus
              />
              <div className="form-helper">
                Dispute will be routed directly to the course teacher under institutional SLA monitoring.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-outline" onClick={handleCloseDisputeModal} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Dispute'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </Layout>
  );
};
