import React from 'react';

export const LoadingSpinner = ({ message = 'Loading...', size = 'md' }) => {
  const sizeMap = {
    sm: '18px',
    md: '28px',
    lg: '36px',
  };

  const spinnerSize = sizeMap[size] || sizeMap.md;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1.5rem',
        gap: '0.65rem',
        color: '#64748b',
      }}
    >
      <div
        style={{
          width: spinnerSize,
          height: spinnerSize,
          border: '2px solid #e2e8f0',
          borderTopColor: '#2563eb',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      {message && <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{message}</span>}
    </div>
  );
};
