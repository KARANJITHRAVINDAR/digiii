import React from 'react';

export const EmptyState = ({
  title = 'No records found',
  description = 'There are no items to display at this moment.',
  actionLabel,
  onAction,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1.5rem',
        textAlign: 'center',
        background: '#ffffff',
        border: '1px dashed #cbd5e1',
        borderRadius: '6px',
        margin: '0.75rem 0',
      }}
    >
      <div style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>
        {title}
      </div>
      <p style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '340px', lineHeight: 1.4, marginBottom: actionLabel ? '0.85rem' : 0 }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button className="btn btn-primary btn-sm" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
};
