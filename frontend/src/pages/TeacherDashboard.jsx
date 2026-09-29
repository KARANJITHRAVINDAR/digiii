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

export const TeacherDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [disputes, setDisputes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
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
      setError(err.response?.data?.detail || 'Failed to load teacher dashboard.');
    } finally {
      setLoading(false);
    }
  };

  // Metrics
  const openDisputes = disputes.filter((d) => ['OPEN', 'IN_REVIEW'].includes(d.status)).length;
  const resolvedCount = disputes.filter((d) => d.status === 'RESOLVED').length;
  const rejectedCount = disputes.filter((d) => d.status === 'REJECTED').length;

  const now = new Date();
  const dueTodayCount = disputes.filter((d) => {
    if (!d.due_at || ['RESOLVED', 'REJECTED'].includes(d.status)) return false;
    const dueDate = new Date(d.due_at);
    const diffHours = (dueDate - now) / (1000 * 60 * 60);
    return diffHours >= 0 && diffHours <= 24;
  }).length;

  const breachedCount = disputes.filter((d) => {
    if (!d.due_at || ['RESOLVED', 'REJECTED'].includes(d.status)) return false;
    return new Date(d.due_at) < now;
  }).length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getCourse = (courseId) => courses.find((c) => c.id === courseId);

  return (
    <Layout
      pageTitle="Faculty Dashboard"
      breadcrumbs={[{ label: 'Home' }, { label: 'Faculty' }, { label: 'Dashboard' }]}
    >
      {/* Header */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            {getGreeting()}, {user?.name}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem', marginBottom: 0 }}>
            You have <strong>{openDisputes} disputes</strong> requiring attention in your queue.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/teacher/attendance')}>
            Mark Attendance
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/teacher/disputes')}>
            Dispute Inbox ({openDisputes})
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading faculty dispute queue..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchTeacherData} />
      ) : (
        <>
          {/* Metrics Row */}
          <div className="stat-grid">
            <StatCard
              title="Open Disputes"
              value={openDisputes}
              subtitle="Assigned to your queue"
              variant={openDisputes > 0 ? 'warning' : 'default'}
              onClick={() => navigate('/teacher/disputes')}
            />
            <StatCard
              title="Due Today"
              value={dueTodayCount}
              subtitle="SLA expires within 24h"
              variant={dueTodayCount > 0 ? 'warning' : 'default'}
            />
            <StatCard
              title="Resolved"
              value={resolvedCount}
              subtitle={`${rejectedCount} rejected`}
              variant="success"
            />
            <StatCard
              title="SLA Breaches"
              value={breachedCount}
              subtitle="Auto-escalating to HOD"
              variant={breachedCount > 0 ? 'danger' : 'default'}
            />
          </div>

          {/* Dispute Inbox Section */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Dispute Inbox</div>
                <div className="card-subtitle">Pending student attendance claims assigned to you</div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/teacher/disputes')}>
                Manage Inbox ({disputes.length})
              </button>
            </div>

            {disputes.length === 0 ? (
              <EmptyState title="Inbox Clean" description="No attendance disputes currently assigned to your queue." />
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Course</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>SLA Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {disputes.slice(0, 6).map((d) => {
                      const c = getCourse(d.course_id);
                      const isBreached = d.due_at && new Date(d.due_at) < now && !['RESOLVED', 'REJECTED'].includes(d.status);
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
                          <td>
                            {isBreached ? (
                              <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.75rem' }}>
                                Breached
                              </span>
                            ) : ['RESOLVED', 'REJECTED'].includes(d.status) ? (
                              <span style={{ color: '#059669', fontSize: '0.75rem' }}>Closed</span>
                            ) : (
                              <span style={{ color: '#2563eb', fontSize: '0.75rem' }}>Active SLA</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => navigate('/teacher/disputes')}
                            >
                              Review
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
