import React from 'react';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  variant = 'default', // 'default' | 'primary' | 'success' | 'warning' | 'danger'
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        padding: '1rem 1.15rem',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseOver={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = '#cbd5e1';
          e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.08)';
        }
      }}
      onMouseOut={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = '#e2e8f0';
          e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
        }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {title}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem', lineHeight: 1.15 }}>
            {value}
          </div>
        </div>
        {icon && (
          <div
            style={{
              fontSize: '1rem',
              color: '#64748b',
              padding: '0.25rem',
              borderRadius: '4px',
              background: '#f8fafc',
              border: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#64748b' }}>
          {trend && (
            <span style={{ color: trend > 0 ? '#059669' : '#dc2626', fontWeight: 600 }}>
              {trend > 0 ? `+${trend}%` : `${trend}%`}
            </span>
          )}
          {subtitle && <span>{subtitle}</span>}
          {trendLabel && <span>{trendLabel}</span>}
        </div>
      )}
    </div>
  );
};
