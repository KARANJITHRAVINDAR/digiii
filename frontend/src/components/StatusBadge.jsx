import React from 'react';

export const StatusBadge = ({ status }) => {
  if (!status) return null;

  const normalized = String(status).toUpperCase();

  const configMap = {
    // Attendance
    PRESENT: { label: 'Present', bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0', dot: '#059669' },
    ABSENT: { label: 'Absent', bg: '#fef2f2', color: '#991b1b', border: '#fecaca', dot: '#dc2626' },

    // Dispute Statuses
    OPEN: { label: 'Open', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', dot: '#2563eb' },
    IN_REVIEW: { label: 'In Review', bg: '#fffbeb', color: '#92400e', border: '#fde68a', dot: '#d97706' },
    ESCALATED_TO_HOD: { label: 'Escalated to HOD', bg: '#faf5ff', color: '#6b21a8', border: '#e9d5ff', dot: '#9333ea' },
    ESCALATED_TO_ADMIN: { label: 'Escalated to Admin', bg: '#fdf2f8', color: '#9d174d', border: '#fbcfe8', dot: '#db2777' },
    RESOLVED: { label: 'Resolved', bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0', dot: '#059669' },
    REJECTED: { label: 'Rejected', bg: '#fef2f2', color: '#991b1b', border: '#fecaca', dot: '#dc2626' },

    // Roles
    STUDENT: { label: 'Student', bg: '#f8fafc', color: '#334155', border: '#e2e8f0', dot: '#64748b' },
    TEACHER: { label: 'Faculty', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', dot: '#16a34a' },
    HOD: { label: 'HOD', bg: '#faf5ff', color: '#6b21a8', border: '#e9d5ff', dot: '#9333ea' },
    ADMIN: { label: 'Admin', bg: '#f1f5f9', color: '#0f172a', border: '#cbd5e1', dot: '#475569' },

    // Windows & Outbox & Sessions
    SCHEDULED: { label: 'Scheduled', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', dot: '#2563eb' },
    COMPLETED: { label: 'Completed', bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0', dot: '#059669' },
    OPEN_WINDOW: { label: 'Open Window', bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0', dot: '#059669' },
    CLOSED: { label: 'Closed', bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', dot: '#94a3b8' },
    PENDING: { label: 'Pending', bg: '#fffbeb', color: '#92400e', border: '#fde68a', dot: '#d97706' },
    SENT: { label: 'Sent', bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0', dot: '#059669' },
    FAILED: { label: 'Failed', bg: '#fef2f2', color: '#991b1b', border: '#fecaca', dot: '#dc2626' },
  };

  const style = configMap[normalized] || {
    label: normalized.replace(/_/g, ' '),
    bg: '#f8fafc',
    color: '#475569',
    border: '#e2e8f0',
    dot: '#94a3b8',
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.15rem 0.5rem',
        borderRadius: '4px',
        fontSize: '0.72rem',
        fontWeight: 600,
        letterSpacing: '0.01em',
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}
    >
      <span
        style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          backgroundColor: style.dot,
          display: 'inline-block',
        }}
      />
      {style.label}
    </span>
  );
};
