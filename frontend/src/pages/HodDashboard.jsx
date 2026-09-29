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

export const HodDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [escalations, setEscalations] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHodData();
  }, []);

  const fetchHodData = async () => {
    setLoading(true);
    setError('');
    try {
      const [escRes, courseRes] = await Promise.all([
        api.get('/api/hod/disputes'),
        api.get('/api/courses'),
      ]);
      setEscalations(escRes.data);
      setCourses(courseRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load HOD escalation queue.');
    } finally {
      setLoading(false);
    }
  };

  const pendingEscalations = escalations.filter((d) => d.status === 'ESCALATED_TO_HOD').length;
  const resolvedEscalations = escalations.filter((d) => d.status === 'RESOLVED').length;

  const now = new Date();
  const breachedCount = escalations.filter((d) => {
    if (!d.due_at || ['RESOLVED', 'REJECTED'].includes(d.status)) return false;
    return new Date(d.due_at) < now;
  }).length;

  const getCourse = (courseId) => courses.find((c) => c.id === courseId);

  return (
    <Layout
      pageTitle="Department Operations"
      breadcrumbs={[{ label: 'Home' }, { label: 'HOD' }, { label: 'Operations Console' }]}
    >
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Department Operations & Escalation Queue
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem', marginBottom: 0 }}>
            Departmental oversight of SLA-breached course disputes under course ownership policy.
          </p>
        </div>

        <button className="btn btn-primary btn-sm" onClick={() => navigate('/hod/disputes')}>
          Escalations Queue ({pendingEscalations})
        </button>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading departmental escalations..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchHodData} />
      ) : (
        <>
          {/* Metrics */}
          <div className="stat-grid">
            <StatCard
              title="Escalated Cases"
              value={pendingEscalations}
              subtitle="Awaiting HOD review"
              variant={pendingEscalations > 0 ? 'warning' : 'default'}
              onClick={() => navigate('/hod/disputes')}
            />
            <StatCard
              title="Total in Department"
              value={escalations.length}
              subtitle="Course-owned disputes"
            />
            <StatCard
              title="Resolved by HOD"
              value={resolvedEscalations}
              subtitle="Attendance corrected"
              variant="success"
            />
            <StatCard
              title="SLA Breaches"
              value={breachedCount}
              subtitle="Auto-escalates to Admin"
              variant={breachedCount > 0 ? 'danger' : 'default'}
            />
          </div>

          {/* Escalation Queue Table */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Active Escalations Queue</div>
                <div className="card-subtitle">Course-level disputes that exceeded teacher SLA thresholds</div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/hod/disputes')}>
                Manage Queue ({escalations.length})
              </button>
            </div>

            {escalations.length === 0 ? (
              <EmptyState title="Queue Clean" description="No escalated attendance disputes in your department." />
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Course</th>
                      <th>Student ID</th>
                      <th>Status</th>
                      <th>SLA Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {escalations.slice(0, 6).map((d) => {
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
                          <td style={{ color: '#64748b' }}>Student #{d.student_id}</td>
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
                              <span style={{ color: '#2563eb', fontSize: '0.75rem' }}>HOD Stage Active</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => navigate('/hod/disputes')}
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
