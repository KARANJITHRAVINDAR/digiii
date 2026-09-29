import React from 'react';
import { StatusBadge } from './StatusBadge';

export const DisputeTimeline = ({ events = [] }) => {
  if (!events || events.length === 0) {
    return (
      <div style={{ padding: '0.85rem', color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic' }}>
        No audit activity recorded yet.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', paddingLeft: '1.25rem', margin: '0.5rem 0' }}>
      {/* Vertical timeline connector */}
      <div
        style={{
          position: 'absolute',
          top: '6px',
          bottom: '6px',
          left: '5px',
          width: '1px',
          background: '#cbd5e1',
        }}
      />

      {events.map((ev, index) => (
        <div key={ev.id || index} style={{ position: 'relative', marginBottom: '0.85rem' }}>
          {/* Node Dot */}
          <div
            style={{
              position: 'absolute',
              left: '-1.25rem',
              top: '5px',
              width: '11px',
              height: '11px',
              borderRadius: '50%',
              background: '#ffffff',
              border: '2px solid #2563eb',
              zIndex: 1,
            }}
          />

          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '0.65rem 0.85rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
              <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>
                {ev.event_type.replace(/_/g, ' ')}
              </strong>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {new Date(ev.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </div>

            <p style={{ margin: '0.25rem 0', fontSize: '0.8rem', color: '#475569', lineHeight: 1.4 }}>
              {ev.message}
            </p>

            {ev.remarks && (
              <div
                style={{
                  marginTop: '0.35rem',
                  padding: '0.35rem 0.55rem',
                  background: '#fef2f2',
                  borderLeft: '2px solid #dc2626',
                  borderRadius: '3px',
                  fontSize: '0.75rem',
                  color: '#991b1b',
                }}
              >
                <strong>Remarks:</strong> {ev.remarks}
              </div>
            )}

            {(ev.previous_status || ev.new_status) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.35rem' }}>
                {ev.previous_status && <StatusBadge status={ev.previous_status} />}
                {ev.previous_status && ev.new_status && <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>→</span>}
                {ev.new_status && <StatusBadge status={ev.new_status} />}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
