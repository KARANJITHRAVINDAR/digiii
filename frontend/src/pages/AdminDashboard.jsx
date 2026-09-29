import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../layouts/Layout';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import api from '../services/api';

export const AdminDashboard = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAdminOverview();
  }, []);

  const fetchAdminOverview = async () => {
    setLoading(true);
    setError('');
    try {
      const [uRes, cRes, dRes, aRes] = await Promise.all([
        api.get('/api/admin/users'),
        api.get('/api/courses'),
        api.get('/api/admin/disputes'),
        api.get('/api/admin/audit-logs'),
      ]);
      setUsers(uRes.data);
      setCourses(cRes.data);
      setDisputes(dRes.data);
      setAuditLogs(aRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load administrative overview.');
    } finally {
      setLoading(false);
    }
  };

  const studentsCount = users.filter((u) => u.role === 'STUDENT' && u.is_active).length;
  const facultyCount = users.filter((u) => (u.role === 'TEACHER' || u.role === 'HOD') && u.is_active).length;
  const activeCoursesCount = courses.length;
  const openDisputes = disputes.filter((d) => ['OPEN', 'IN_REVIEW', 'ESCALATED_TO_HOD', 'ESCALATED_TO_ADMIN'].includes(d.status)).length;

  const now = new Date();
  const slaBreaches = disputes.filter((d) => {
    if (!d.due_at || ['RESOLVED', 'REJECTED'].includes(d.status)) return false;
    return new Date(d.due_at) < now;
  }).length;

  return (
    <Layout
      pageTitle="Institutional Overview"
      breadcrumbs={[{ label: 'Home' }, { label: 'Admin' }, { label: 'System Overview' }]}
    >
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            System Operations & Institutional Console
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem', marginBottom: 0 }}>
            Real-time telemetry, dispute SLA health, audit trail monitoring, and user management.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin/audit')}>
            Audit Logs
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/disputes')}>
            Dispute Monitor ({openDisputes})
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Aggregating campus system metrics..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchAdminOverview} />
      ) : (
        <>
          {/* Top 5 Metrics */}
          <div className="stat-grid">
            <StatCard
              title="Enrolled Students"
              value={studentsCount}
              subtitle="Active accounts"
              onClick={() => navigate('/admin/users')}
            />
            <StatCard
              title="Active Faculty"
              value={facultyCount}
              subtitle="Teachers & HODs"
              onClick={() => navigate('/admin/users')}
            />
            <StatCard
              title="Active Courses"
              value={activeCoursesCount}
              subtitle="Current academic term"
              onClick={() => navigate('/admin/courses')}
            />
            <StatCard
              title="Open Disputes"
              value={openDisputes}
              subtitle={`${disputes.length} total lifetime`}
              variant={openDisputes > 0 ? 'warning' : 'default'}
              onClick={() => navigate('/admin/disputes')}
            />
            <StatCard
              title="SLA Breaches"
              value={slaBreaches}
              subtitle="Automatic escalations"
              variant={slaBreaches > 0 ? 'danger' : 'default'}
              onClick={() => navigate('/admin/disputes')}
            />
          </div>

          {/* Dispute Operations & System Activity Split */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '1.25rem' }}>
            {/* Section 1: Dispute Operations */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Dispute Operations</div>
                  <div className="card-subtitle">Active attendance disputes and escalation statuses</div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin/disputes')}>
                  View All ({disputes.length})
                </button>
              </div>

              {disputes.length === 0 ? (
                <EmptyState title="No Active Disputes" description="No disputes recorded across campus." />
              ) : (
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Course</th>
                        <th>Status</th>
                        <th>Last Activity</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {disputes.slice(0, 6).map((d) => (
                        <tr key={d.id}>
                          <td>
                            <span style={{ fontWeight: 600, color: '#2563eb' }}>#DSP-{d.id}</span>
                          </td>
                          <td style={{ color: '#0f172a', fontWeight: 500 }}>
                            Course #{d.course_id}
                          </td>
                          <td>
                            <StatusBadge status={d.status} />
                          </td>
                          <td style={{ color: '#64748b', fontSize: '0.75rem' }}>
                            {new Date(d.updated_at || d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => navigate('/admin/disputes')}
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section 2: System Activity / Audit Events */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">System Activity</div>
                  <div className="card-subtitle">Immutable audit trail of system events and mutations</div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin/audit')}>
                  Full Log ({auditLogs.length})
                </button>
              </div>

              {auditLogs.length === 0 ? (
                <EmptyState title="No Events Recorded" description="Audit log ledger is currently clean." />
              ) : (
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Event</th>
                        <th>Message</th>
                        <th style={{ textAlign: 'right' }}>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.slice(0, 6).map((a) => (
                        <tr key={a.id}>
                          <td>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', background: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '3px' }}>
                              {a.event_type}
                            </span>
                          </td>
                          <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem', color: '#0f172a' }}>
                            {a.message}
                          </td>
                          <td style={{ textAlign: 'right', color: '#64748b', fontSize: '0.75rem' }}>
                            {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
};
