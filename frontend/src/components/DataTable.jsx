import React, { useState } from 'react';
import { EmptyState } from './EmptyState';
import { LoadingSpinner } from './LoadingSpinner';

export const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'No records match your criteria.',
  pageSize = 10,
  keyExtractor = (item) => item.id,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentData = data.slice(startIndex, startIndex + pageSize);

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                style={{
                  textAlign: col.align || 'left',
                  width: col.width || 'auto',
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {currentData.map((row, rowIdx) => (
            <tr key={keyExtractor(row) || rowIdx}>
              {columns.map((col, colIdx) => (
                <td
                  key={colIdx}
                  style={{
                    textAlign: col.align || 'left',
                  }}
                >
                  {col.render ? col.render(row, startIndex + rowIdx) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.65rem 0.85rem',
            borderTop: '1px solid #e2e8f0',
            fontSize: '0.78rem',
            color: '#64748b',
            background: '#f8fafc',
          }}
        >
          <span>
            Showing {startIndex + 1} to {Math.min(startIndex + pageSize, data.length)} of {data.length} entries
          </span>
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <button
              className="btn btn-outline btn-sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span style={{ padding: '0 0.35rem', fontWeight: 600, color: '#334155' }}>
              {currentPage} of {totalPages}
            </span>
            <button
              className="btn btn-outline btn-sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
