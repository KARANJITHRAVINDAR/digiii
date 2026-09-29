import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../layouts/Layout';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import api from '../services/api';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [attendance, setAttendance] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [attRes, dispRes, courseRes] = await Promise.all([
        api.get('/api/student/attendance'),
        api.get('/api/student/disputes'),
        api.get('/api/courses'),
      ]);
      setAttendance(attRes.data);
      setDisputes(dispRes.data);
      setCourses(courseRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load student dashboard.');
    } finally {
      setLoading(false);
    }
  };

  // Compute overall metrics
  const totalSessions = attendance.length;
  const presentSessions = attendance.filter((a) => a.status === 'PRESENT').length;
  const absentSessions = totalSessions - presentSessions;
  const attendancePercentage = totalSessions > 0 ? ((presentSessions / totalSessions) * 100).toFixed(1) : '100.0';

  const openDisputes = disputes.filter((d) => ['OPEN', 'IN_REVIEW', 'ESCALATED_TO_HOD', 'ESCALATED_TO_ADMIN'].includes(d.status)).length;

  // Compute Course-wise aggregation
  const courseMap = {};
  courses.forEach((c) => {
    courseMap[c.id] = { id: c.id, code: c.code, name: c.name, scheduled: 0, attended: 0 };
  });

  attendance.forEach((rec) => {
    if (!courseMap[rec.course_id]) {
      courseMap[rec.course_id] = { id: rec.course_id, code: `CRS-${rec.course_id}`, name: `Course #${rec.course_id}`, scheduled: 0, attended: 0 };
    }
    courseMap[rec.course_id].scheduled += 1;
    if (rec.status === 'PRESENT') {
      courseMap[rec.course_id].attended += 1;
    }
  });

  const courseStats = Object.values(courseMap).filter((c) => c.scheduled > 0);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <Layout
      pageTitle="Student Dashboard"
      breadcrumbs={[{ label: 'Home' }, { label: 'Student' }, { label: 'Dashboard' }]}
    >
      {/* Page Header */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            {getGreeting()}, {user?.name}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem', marginBottom: 0 }}>
            Overview of your attendance and active disputes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/student/attendance')}>
            View Attendance
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/student/disputes')}>
            Disputes & SLA
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading attendance records..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchDashboardData} />
      ) : (
        <>
          {/* Key Metrics Row */}
          <div className="stat-grid">
            <StatCard
              title="Overall Attendance"
              value={`${attendancePercentage}%`}
              subtitle={`${presentSessions} of ${totalSessions} sessions`}
              variant={Number(attendancePercentage) >= 75 ? 'default' : 'danger'}
            />
            <StatCard
              title="Present"
              value={presentSessions}
              subtitle="Attended sessions"
            />
            <StatCard
              title="Absent"
              value={absentSessions}
              subtitle="Eligible for review"
            />
            <StatCard
              title="Open Disputes"
              value={openDisputes}
              subtitle={`${disputes.length} total disputes raised`}
              onClick={() => navigate('/student/disputes')}
            />
          </div>

          {/* Low Attendance Notice if applicable */}
          {Number(attendancePercentage) < 75 && totalSessions > 0 && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
              <div>
                <strong>Attendance Warning:</strong> Your overall attendance is currently {attendancePercentage}%, which is below the required 75% institutional threshold. Please review your absent records and submit disputes for any discrepancies.
              </div>
            </div>
          )}

          {/* Section 1: Course Attendance Overview Table */}
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div className="card-header">
              <div>
                <div className="card-title">Attendance Overview</div>
                <div className="card-subtitle">Term: AY 2026–2027 ODD</div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/student/attendance')}>
                All Records ({attendance.length})
              </button>
            </div>

            {courseStats.length === 0 ? (
              <EmptyState title="No Course Attendance" description="No attendance records have been registered for your courses yet." />
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Code</th>
                      <th style={{ textAlign: 'center' }}>Attended</th>
                      <th style={{ textAlign: 'center' }}>Scheduled</th>
                      <th style={{ textAlign: 'right' }}>Attendance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseStats.map((c) => {
                      const pct = c.scheduled > 0 ? ((c.attended / c.scheduled) * 100).toFixed(1) : '100.0';
                      const isLow = Number(pct) < 75;
                      return (
                        <tr key={c.id}>
                          <td>
                            <strong style={{ color: '#0f172a' }}>{c.name}</strong>
                          </td>
                          <td style={{ color: '#64748b' }}>{c.code}</td>
                          <td style={{ textAlign: 'center', color: '#0f172a', fontWeight: 500 }}>{c.attended}</td>
                          <td style={{ textAlign: 'center', color: '#64748b' }}>{c.scheduled}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{ fontWeight: 600, color: isLow ? '#dc2626' : '#059669' }}>
                              {pct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Recent Disputes Table */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Recent Disputes</div>
                <div className="card-subtitle">Status of your submitted attendance disputes and SLA tracking</div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/student/disputes')}>
                View All ({disputes.length})
              </button>
            </div>

            {disputes.length === 0 ? (
              <EmptyState
                title="No Disputes Raised"
                description="You have not filed any attendance disputes."
              />
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Course</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Last Updated</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {disputes.slice(0, 5).map((d) => {
                      const c = courses.find((crs) => crs.id === d.course_id);
                      return (
                        <tr key={d.id}>
                          <td>
                            <span style={{ fontWeight: 600, color: '#2563eb' }}>#DSP-{d.id}</span>
                          </td>
                          <td>
                            <strong style={{ color: '#0f172a' }}>{c ? c.name : `Course #${d.course_id}`}</strong>
                          </td>
                          <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.reason}
                          </td>
                          <td>
                            <StatusBadge status={d.status} />
                          </td>
                          <td style={{ color: '#64748b' }}>
                            {new Date(d.updated_at || d.created_at).toLocaleDateString()}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => navigate('/student/disputes')}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </Layout>
  );
};
