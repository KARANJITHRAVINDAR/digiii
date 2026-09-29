import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../layouts/Layout';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD' | 'READ'

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/notifications');
      setNotifications(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch notifications.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString(), is_read: true } : n))
    );
    try {
      await api.patch(`/api/notifications/${id}/read`);
      await fetchNotifications();
    } catch (err) {
      console.error(err);
      await fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: new Date().toISOString(), is_read: true }))
    );
    try {
      await api.post('/api/notifications/read-all');
      await fetchNotifications();
    } catch (err) {
      console.error(err);
      await fetchNotifications();
    }
  };

  const isItemRead = (n) => Boolean(n.read_at || n.is_read);

  const filteredNotifications = notifications.filter((n) => {
    const read = isItemRead(n);
    if (filter === 'UNREAD') return !read;
    if (filter === 'READ') return read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !isItemRead(n)).length;

  return (
    <Layout
      pageTitle="Notifications"
      breadcrumbs={[{ label: 'Home' }, { label: 'Notifications' }]}
    >
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Notification Center
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem', marginBottom: 0 }}>
            Real-time alerts for dispute status updates, SLA escalations, and attendance corrections.
          </p>
        </div>

        {unreadCount > 0 && (
          <button className="btn btn-outline btn-sm" onClick={handleMarkAllRead}>
            Mark All as Read ({unreadCount})
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="tabs">
        {[
          { id: 'ALL', label: `All (${notifications.length})` },
          { id: 'UNREAD', label: `Unread (${unreadCount})` },
          { id: 'READ', label: `Read (${notifications.length - unreadCount})` },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${filter === tab.id ? 'active' : ''}`}
            onClick={() => setFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner message="Loading notifications..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchNotifications} />
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          title="No notifications yet."
          description="You're all caught up with your attendance and dispute updates."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filteredNotifications.map((n) => {
            const isRead = isItemRead(n);
            return (
              <div
                key={n.id}
                className="card"
                style={{
                  padding: '0.85rem 1.15rem',
                  borderLeft: isRead ? '1px solid #e2e8f0' : '3px solid #2563eb',
                  background: isRead ? '#ffffff' : '#f8fafc',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '1rem',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>{n.title}</strong>
                    {!isRead && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#2563eb', background: '#eff6ff', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>
                        NEW
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.825rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
                    {n.message}
                  </p>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                    {new Date(n.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                  {!isRead && (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleMarkRead(n.id)}
                    >
                      Mark as read
                    </button>
                  )}
                  {n.dispute_id && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        if (!isRead) handleMarkRead(n.id);
                        const target = user?.role === 'STUDENT'
                          ? '/student/disputes'
                          : user?.role === 'TEACHER'
                          ? '/teacher/disputes'
                          : user?.role === 'HOD'
                          ? '/hod/disputes'
                          : '/admin/disputes';
                        navigate(target);
                      }}
                    >
                      View Dispute
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
};
