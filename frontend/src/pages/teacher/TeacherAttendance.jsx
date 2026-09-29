import React, { useEffect, useState } from 'react';
import { Layout } from '../../layouts/Layout';
import { StatusBadge } from '../../components/StatusBadge';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorState } from '../../components/ErrorState';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export const TeacherAttendance = () => {
  const { user } = useAuth();

  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create session modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [creatingSession, setCreatingSession] = useState(false);
  const [createError, setCreateError] = useState('');

  // Mark / View attendance modal state
  const [selectedSession, setSelectedSession] = useState(null);
  const [isReadOnlyView, setIsReadOnlyView] = useState(false);
  const [attendanceEntries, setAttendanceEntries] = useState({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [markError, setMarkError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  const getErrorMessage = (err) => {
    if (!err) return 'An unexpected error occurred.';
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => d.msg || (typeof d === 'string' ? d : JSON.stringify(d))).join(', ');
    }
    if (typeof detail === 'object' && detail !== null) {
      return detail.message || JSON.stringify(detail);
    }
    return err.message || 'Operation failed.';
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      const [courseRes, sessRes, studentRes, attRes] = await Promise.all([
        api.get('/api/courses'),
        api.get('/api/attendance/sessions'),
        api.get('/api/teacher/students'),
        api.get('/api/student/attendance').catch(() => ({ data: [] })),
      ]);

      const myCourses = courseRes.data.filter((c) => c.teacher_id === user?.id);
      setCourses(myCourses);
      if (myCourses.length > 0 && !selectedCourseId) {
        setSelectedCourseId(String(myCourses[0].id));
      }
      setSessions(sessRes.data);
      setStudents(studentRes.data || []);
      setAllAttendanceRecords(attRes.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateSession = () => {
    if (courses.length > 0) {
      setSelectedCourseId(String(courses[0].id));
    }
    setSessionDate(new Date().toISOString().split('T')[0]);
    setStartTime('09:00');
    setEndTime('10:00');
    setCreateError('');
    setShowCreateModal(true);
  };

  const handleCreateSessionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) {
      setCreateError('Please select a course.');
      return;
    }

    setCreatingSession(true);
    setCreateError('');

    try {
      const payload = {
        course_id: parseInt(selectedCourseId, 10),
        session_date: sessionDate,
        start_time: startTime,
        end_time: endTime,
      };

      const res = await api.post('/api/attendance/sessions', payload);
      setShowCreateModal(false);
      setSuccessNotice(`Attendance session #${res.data.id} created successfully.`);
      await fetchInitialData();
    } catch (err) {
      setCreateError(getErrorMessage(err));
    } finally {
      setCreatingSession(false);
    }
  };

  const handleOpenMarkModal = (session) => {
    setSelectedSession(session);
    setIsReadOnlyView(false);
    setMarkError('');

    // Prepopulate statuses if existing records exist
    const initialMap = {};
    students.forEach((s) => {
      const existing = allAttendanceRecords.find(
        (r) => r.student_id === s.id && r.course_id === session.course_id && r.attendance_date === session.session_date
      );
      initialMap[s.id] = existing ? existing.status : 'PRESENT';
    });
    setAttendanceEntries(initialMap);
  };

  const handleOpenViewRoster = (session) => {
    setSelectedSession(session);
    setIsReadOnlyView(true);
    setMarkError('');

    const initialMap = {};
    students.forEach((s) => {
      const existing = allAttendanceRecords.find(
        (r) => r.student_id === s.id && r.course_id === session.course_id && r.attendance_date === session.session_date
      );
      initialMap[s.id] = existing ? existing.status : (session.records?.find((r) => r.student_id === s.id)?.status || 'PRESENT');
    });
    setAttendanceEntries(initialMap);
  };

  const handleToggleStudentStatus = (studentId, status) => {
    if (isReadOnlyView) return;
    setAttendanceEntries((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedSession || isReadOnlyView) return;
    setSavingAttendance(true);
    setMarkError('');

    try {
      const records = Object.entries(attendanceEntries).map(([studentId, status]) => ({
        student_id: parseInt(studentId, 10),
        status: status,
      }));

      await api.post(`/api/attendance/sessions/${selectedSession.id}/records`, {
        session_id: selectedSession.id,
        records,
      });

      setSuccessNotice(`Attendance for Session #${selectedSession.id} saved and published successfully.`);
      setSelectedSession(null);
      await fetchInitialData();
    } catch (err) {
      setMarkError(getErrorMessage(err));
    } finally {
      setSavingAttendance(false);
    }
  };

  const getCourse = (courseId) => courses.find((c) => c.id === courseId);

  const columns = [
    {
      header: 'Session',
      accessor: 'id',
      render: (s) => <span style={{ fontWeight: 600, color: '#2563eb' }}>#SES-{s.id}</span>,
    },
    {
      header: 'Course',
      render: (s) => {
        const c = getCourse(s.course_id);
        return (
          <div>
            <strong style={{ color: '#0f172a' }}>{c ? c.name : `Course #${s.course_id}`}</strong>
            {c && <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '0.35rem' }}>({c.code})</span>}
          </div>
        );
      },
    },
    {
      header: 'Date',
      accessor: 'session_date',
      render: (s) => <span style={{ color: '#0f172a', fontWeight: 500 }}>{s.session_date}</span>,
    },
    {
      header: 'Time Slot',
      render: (s) => (
        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
          {s.start_time || '09:00'} – {s.end_time || '10:00'}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (s) => <StatusBadge status={s.status || 'SCHEDULED'} />,
    },
    {
      header: 'Action',
      align: 'right',
      render: (s) => {
        if (s.status === 'COMPLETED') {
          return (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => handleOpenViewRoster(s)}
            >
              View Roster
            </button>
          );
        }
        return (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => handleOpenMarkModal(s)}
          >
            Mark Roster
          </button>
        );
      },
    },
  ];

  return (
    <Layout
      pageTitle="Attendance Sessions"
      breadcrumbs={[{ label: 'Home' }, { label: 'Faculty' }, { label: 'Attendance' }]}
    >
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Lecture Sessions & Attendance Roster
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem', marginBottom: 0 }}>
            Post lecture attendance rosters and register PRESENT / ABSENT marks.
          </p>
        </div>

        <button className="btn btn-primary btn-sm" onClick={handleOpenCreateSession}>
          + New Lecture Session
        </button>
      </div>

      {successNotice && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          <span>{successNotice}</span>
        </div>
      )}

      {loading ? (
        <LoadingSpinner message="Loading attendance roster..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchInitialData} />
      ) : (
        <DataTable
          columns={columns}
          data={sessions}
          pageSize={10}
          emptyTitle="No Sessions Recorded"
          emptyDescription="You have not created any attendance lecture sessions yet."
        />
      )}

      {/* Create Session Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Lecture Session"
        subtitle="Schedule a session to record student attendance"
        maxWidth="460px"
      >
        <form onSubmit={handleCreateSessionSubmit}>
          {createError && (
            <div className="alert alert-error" style={{ marginBottom: '0.85rem' }}>
              <span>{createError}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Course</label>
            <select
              className="form-input"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
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
            <label className="form-label">Session Date</label>
            <input
              type="date"
              className="form-input"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input
                type="time"
                className="form-input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Time</label>
              <input
                type="time"
                className="form-input"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowCreateModal(false)}
              disabled={creatingSession}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={creatingSession}>
              {creatingSession ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Mark / View Attendance Roster Modal */}
      <Modal
        isOpen={Boolean(selectedSession)}
        onClose={() => setSelectedSession(null)}
        title={selectedSession ? `${isReadOnlyView ? 'Published Attendance Roster' : 'Mark Attendance Roster'} — Session #${selectedSession.id}` : ''}
        subtitle={selectedSession ? `${getCourse(selectedSession.course_id)?.name} • ${selectedSession.session_date}` : ''}
        maxWidth="620px"
      >
        {selectedSession && (
          <div>
            {markError && (
              <div className="alert alert-error" style={{ marginBottom: '0.85rem' }}>
                <span>{markError}</span>
              </div>
            )}

            {isReadOnlyView ? (
              <div className="alert alert-info" style={{ marginBottom: '0.85rem' }}>
                🔒 <strong>Finalized & Locked:</strong> This attendance roster has been officially submitted. Under campus governance policy, historical finalized attendance cannot be modified directly. Adjustments require student dispute approval or an authorized administrative correction window.
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Enrolled Students: <strong>{students.length}</strong>
                </span>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      const allPresent = {};
                      students.forEach((s) => (allPresent[s.id] = 'PRESENT'));
                      setAttendanceEntries(allPresent);
                    }}
                  >
                    Mark All Present
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      const allAbsent = {};
                      students.forEach((s) => (allAbsent[s.id] = 'ABSENT'));
                      setAttendanceEntries(allAbsent);
                    }}
                  >
                    Mark All Absent
                  </button>
                </div>
              </div>
            )}

            <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Email</th>
                    <th style={{ textAlign: 'right' }}>Attendance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((st) => (
                    <tr key={st.id}>
                      <td>
                        <strong style={{ color: '#0f172a' }}>{st.name}</strong>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '0.78rem' }}>{st.email}</td>
                      <td style={{ textAlign: 'right' }}>
                        {isReadOnlyView ? (
                          <StatusBadge status={attendanceEntries[st.id] || 'PRESENT'} />
                        ) : (
                          <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                            <button
                              type="button"
                              className={`btn btn-sm ${attendanceEntries[st.id] === 'PRESENT' ? 'btn-success' : 'btn-outline'}`}
                              onClick={() => handleToggleStudentStatus(st.id, 'PRESENT')}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${attendanceEntries[st.id] === 'ABSENT' ? 'btn-danger' : 'btn-outline'}`}
                              onClick={() => handleToggleStudentStatus(st.id, 'ABSENT')}
                            >
                              Absent
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setSelectedSession(null)}
                disabled={savingAttendance}
              >
                {isReadOnlyView ? 'Close' : 'Cancel'}
              </button>
              {!isReadOnlyView && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveAttendance}
                  disabled={savingAttendance}
                >
                  {savingAttendance ? 'Saving Roster...' : 'Save & Publish Attendance'}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};
