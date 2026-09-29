import React, { useEffect, useState } from 'react';
import { Layout } from '../../layouts/Layout';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorState } from '../../components/ErrorState';
import api from '../../services/api';

export const DepartmentManager = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/departments');
      setDepartments(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load department directory.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setModalError('Please enter both name and code.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      await api.post('/api/admin/departments', {
        name: name.trim(),
        code: code.trim().toUpperCase(),
      });
      setShowCreateModal(false);
      setName('');
      setCode('');
      setSuccessNotice(`Department ${code.trim().toUpperCase()} registered successfully.`);
      await fetchDepartments();
    } catch (err) {
      setModalError(err.response?.data?.detail || 'Failed to register department.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'ID',
      accessor: 'id',
      render: (d) => <span style={{ fontWeight: 600, color: '#2563eb' }}>#{d.id}</span>,
    },
    {
      header: 'Code',
      accessor: 'code',
      render: (d) => <span style={{ fontWeight: 600, color: '#0f172a' }}>{d.code}</span>,
    },
    {
      header: 'Department Name',
      accessor: 'name',
      render: (d) => <strong style={{ color: '#0f172a' }}>{d.name}</strong>,
    },
    {
      header: 'Registered Date',
      render: (d) => <span style={{ color: '#64748b', fontSize: '0.78rem' }}>{new Date(d.created_at).toLocaleDateString()}</span>,
    },
  ];

  return (
    <Layout
      pageTitle="Departments"
      breadcrumbs={[{ label: 'Home' }, { label: 'Admin' }, { label: 'Departments' }]}
    >
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Academic Departments Directory
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem', marginBottom: 0 }}>
            Configure institutional academic units and their escalation hierarchies.
          </p>
        </div>

        <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
          + Add Department
        </button>
      </div>

      {successNotice && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          <span>{successNotice}</span>
        </div>
      )}

      {loading ? (
        <LoadingSpinner message="Fetching departments..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchDepartments} />
      ) : (
        <DataTable
          columns={columns}
          data={departments}
          pageSize={10}
          emptyTitle="No Departments"
          emptyDescription="No academic departments registered."
        />
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Academic Department"
        subtitle="Register a new institutional department"
        maxWidth="440px"
      >
        <form onSubmit={handleCreateDepartment}>
          {modalError && (
            <div className="alert alert-error" style={{ marginBottom: '0.85rem' }}>
              <span>{modalError}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Department Code *</label>
            <input
              type="text"
              className="form-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. CSE or S&H"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Department Full Name *</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Computer Science & Engineering"
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowCreateModal(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Registering...' : 'Save Department'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};
