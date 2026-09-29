import React from 'react';

export const ErrorState = ({
  title = 'An error occurred',
  message = 'Failed to load content from the server. Please try again.',
  onRetry,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        textAlign: 'center',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '6px',
        margin: '0.75rem 0',
      }}
    >
      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#991b1b', marginBottom: '0.25rem' }}>
        {title}
      </div>
      <p style={{ fontSize: '0.8rem', color: '#b91c1c', maxWidth: '380px', lineHeight: 1.4, marginBottom: onRetry ? '0.85rem' : 0 }}>
        {message}
      </p>
      {onRetry && (
        <button className="btn btn-outline btn-sm" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
};
