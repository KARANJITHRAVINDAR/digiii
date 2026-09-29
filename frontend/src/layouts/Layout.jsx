import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import api from '../services/api';

export const Layout = ({ children, pageTitle, breadcrumbs = [] }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, location.pathname]);

  const fetchNotifications = async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        api.get('/api/notifications'),
        api.get('/api/notifications/unread-count'),
      ]);
      setNotifications(listRes.data);
      setUnreadCount(countRes.data.unread_count || 0);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const handleMarkRead = async (notifId, e) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/api/notifications/${notifId}/read`);
      await fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/api/notifications/read-all');
      await fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavLinks = () => {
    if (!user) return [];

    switch (user.role) {
      case 'STUDENT':
        return [
          { to: '/student', label: 'Dashboard', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
          { to: '/student/attendance', label: 'My Attendance', icon: 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z' },
          { to: '/student/disputes', label: 'Disputes & SLA', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z' },
          { to: '/student/notifications', label: 'Notifications', icon: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z', badge: unreadCount },
        ];
      case 'TEACHER':
        return [
          { to: '/teacher', label: 'Dashboard', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
          { to: '/teacher/attendance', label: 'Mark Attendance', icon: 'M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z' },
          { to: '/teacher/disputes', label: 'Dispute Inbox', icon: 'M19 3H4.99c-1.11 0-1.98.89-1.98 2L3 19c0 1.1.88 2 1.99 2H19c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H4.99V5H19v10z' },
          { to: '/teacher/notifications', label: 'Notifications', icon: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z', badge: unreadCount },
        ];
      case 'HOD':
        return [
          { to: '/hod', label: 'Dashboard', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
          { to: '/hod/disputes', label: 'Escalations Queue', icon: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z' },
          { to: '/hod/notifications', label: 'Notifications', icon: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z', badge: unreadCount },
        ];
      case 'ADMIN':
        return [
          { to: '/admin', label: 'System Overview', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
          { to: '/admin/users', label: 'User Directory', icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 3s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' },
          { to: '/admin/courses', label: 'Course Directory', icon: 'M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z' },
          { to: '/admin/departments', label: 'Departments', icon: 'M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-5-7L2 9h19L11 3z' },
          { to: '/admin/correction-windows', label: 'Correction Windows', icon: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z' },
          { to: '/admin/disputes', label: 'Dispute Monitor', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z' },
          { to: '/admin/audit', label: 'Audit Logs', icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z' },
          { to: '/admin/email-outbox', label: 'Email Outbox', icon: 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z' },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  return (
    <div className="app-shell">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${sidebarOpenMobile ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="sidebar-logo-icon">D</div>
            <div>
              <div className="sidebar-brand-title">DigiCampus</div>
              <div className="sidebar-brand-sub">Attendance & SLA</div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Navigation</div>
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/student' || link.to === '/teacher' || link.to === '/hod' || link.to === '/admin'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpenMobile(false)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d={link.icon} />
                </svg>
                <span>{link.label}</span>
              </div>
              {link.badge > 0 && (
                <span
                  style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    borderRadius: '9999px',
                    padding: '0.05rem 0.4rem',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                  }}
                >
                  {link.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer / User Profile & Logout */}
        <div className="sidebar-footer">
          {user && (
            <div style={{ marginBottom: '0.65rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: '#e2e8f0',
                    color: '#0f172a',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.email}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <StatusBadge status={user.role} />
                {user.department_id && (
                  <span style={{ fontSize: '0.68rem', color: '#64748b', background: '#f1f5f9', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>
                    Dept #{user.department_id}
                  </span>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="btn btn-outline btn-sm btn-block"
            style={{ fontSize: '0.75rem', padding: '0.35rem' }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-area">
        {/* Top Header */}
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setSidebarOpenMobile(!sidebarOpenMobile)}
              className="btn btn-outline btn-sm"
              style={{ display: 'none' }}
              title="Toggle Menu"
            >
              ☰
            </button>

            {/* Breadcrumb Navigation */}
            <div className="breadcrumb">
              {breadcrumbs.length > 0 ? (
                breadcrumbs.map((b, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <span className="breadcrumb-sep">/</span>}
                    <span className={`breadcrumb-item ${idx === breadcrumbs.length - 1 ? 'active' : ''}`}>
                      {b.label}
                    </span>
                  </React.Fragment>
                ))
              ) : (
                <span className="breadcrumb-item active">{pageTitle || 'DigiCampus'}</span>
              )}
            </div>
          </div>

          {/* Right Header: Notification & User Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Notification Bell Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="btn btn-outline btn-sm"
                style={{ position: 'relative', padding: '0.35rem 0.55rem' }}
                title="Notifications"
              >
                🔔
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      background: '#ef4444',
                      color: '#ffffff',
                      borderRadius: '9999px',
                      padding: '0 4px',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      minWidth: '14px',
                      height: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    width: '320px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    zIndex: 200,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem 0.75rem',
                      borderBottom: '1px solid #e2e8f0',
                      background: '#f8fafc',
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>
                      Notifications ({unreadCount} unread)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.78rem' }}>
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.slice(0, 6).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleMarkRead(n.id)}
                          style={{
                            padding: '0.5rem 0.75rem',
                            borderBottom: '1px solid #f1f5f9',
                            background: (n.read_at || n.is_read) ? '#ffffff' : '#eff6ff',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>
                            {n.title}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '1px', lineHeight: 1.3 }}>
                            {n.message}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div
                    style={{
                      padding: '0.45rem',
                      textAlign: 'center',
                      borderTop: '1px solid #e2e8f0',
                      background: '#f8fafc',
                    }}
                  >
                    <button
                      onClick={() => {
                        setShowNotifDropdown(false);
                        const target = user?.role === 'STUDENT'
                          ? '/student/notifications'
                          : user?.role === 'TEACHER'
                          ? '/teacher/notifications'
                          : user?.role === 'HOD'
                          ? '/hod/notifications'
                          : '/student/notifications';
                        navigate(target);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      View all notifications →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Active User Chip */}
            {user && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.78rem',
                }}
              >
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{user.name}</span>
                <StatusBadge status={user.role} />
              </div>
            )}
          </div>
        </header>

        {/* Page Main Content */}
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
};
