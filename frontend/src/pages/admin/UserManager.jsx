import React, { useEffect, useState } from 'react';
import { Layout } from '../../layouts/Layout';
import { StatusBadge } from '../../components/StatusBadge';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorState } from '../../components/ErrorState';
import api from '../../services/api';

export const UserManager = () => {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Create User Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [departmentId, setDepartmentId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Toggle User Active state
  const [toggleUserTarget, setToggleUserTarget] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');

  useEffect(() => {
    fetchUsersAndDepts();
  }, [searchQuery, roleFilter, deptFilter]);

  const fetchUsersAndDepts = async () => {
    setLoading(true);
    setError('');
    try {
      let url = `/api/admin/users?`;
      if (searchQuery.trim()) url += `query=${encodeURIComponent(searchQuery.trim())}&`;
      if (roleFilter) url += `role=${roleFilter}&`;
      if (deptFilter) url += `department_id=${deptFilter}&`;

      const [userRes, deptRes] = await Promise.all([
        api.get(url),
        api.get('/api/departments'),
      ]);
      setUsers(userRes.data);
      setDepartments(deptRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch user directory.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setModalError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      await api.post('/api/admin/users', {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        department_id: departmentId ? parseInt(departmentId, 10) : null,
      });
      setShowCreateModal(false);
      setName('');
      setEmail('');
      setPassword('');
      setSuccessNotice(`User ${name.trim()} (${role}) provisioned successfully.`);
      await fetchUsersAndDepts();
    } catch (err) {
      setModalError(err.response?.data?.detail || 'Failed to create user account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmToggleActive = async () => {
    if (!toggleUserTarget) return;
    setToggling(true);

    try {
      await api.patch(`/api/admin/users/${toggleUserTarget.id}`, {
        is_active: !toggleUserTarget.is_active,
      });
      setSuccessNotice(`User #${toggleUserTarget.id} status updated to ${!toggleUserTarget.is_active ? 'Active' : 'Inactive'}.`);
      setToggleUserTarget(null);
      await fetchUsersAndDepts();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update user status.');
    } finally {
      setToggling(false);
    }
  };

  const getDept = (deptId) => departments.find((d) => d.id === deptId);

  const columns = [
    {
      header: 'ID',
      accessor: 'id',
      render: (u) => <span style={{ fontWeight: 600, color: '#2563eb' }}>#{u.id}</span>,
    },
    {
      header: 'Name',
      render: (u) => (
        <div>
          <strong style={{ color: '#0f172a' }}>{u.name}</strong>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{u.email}</div>
        </div>
      ),
    },
    {
      header: 'Role',
      render: (u) => <StatusBadge status={u.role} />,
    },
    {
      header: 'Department',
      render: (u) => {
        const d = getDept(u.department_id);
        return <span style={{ color: '#475569', fontSize: '0.8rem' }}>{d ? `${d.code} — ${d.name}` : 'Institutional / General'}</span>;
      },
    },
    {
      header: 'Account Status',
      render: (u) => (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.15rem 0.45rem',
            borderRadius: '4px',
            fontSize: '0.72rem',
            fontWeight: 600,
            background: u.is_active ? '#ecfdf5' : '#fef2f2',
            color: u.is_active ? '#065f46' : '#991b1b',
            border: `1px solid ${u.is_active ? '#a7f3d0' : '#fecaca'}`,
          }}
        >
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: u.is_active ? '#059669' : '#dc2626' }} />
          {u.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      render: (u) => (
        <button
          className={`btn btn-sm ${u.is_active ? 'btn-outline' : 'btn-success'}`}
          onClick={() => setToggleUserTarget(u)}
        >
          {u.is_active ? 'Deactivate' : 'Activate'}
        </button>
      ),
    },
  ];

  return (
    <Layout
      pageTitle="User Directory"
      breadcrumbs={[{ label: 'Home' }, { label: 'Admin' }, { label: 'Users' }]}
    >
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            User Accounts & RBAC Directory
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem', marginBottom: 0 }}>
            Provision campus accounts, assign institutional roles, and manage access privileges.
          </p>
        </div>

        <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
          + Provision New User
        </button>
      </div>

      {successNotice && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          <span>{successNotice}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '0.85rem 1rem', marginBottom: '1rem' }}>
        <div className="filter-bar" style={{ margin: 0 }}>
          <input
            type="text"
            className="form-input"
            style={{ width: '220px' }}
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select
            className="form-input"
            style={{ width: 'auto' }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="STUDENT">Student</option>
            <option value="TEACHER">Teacher</option>
            <option value="HOD">HOD</option>
            <option value="ADMIN">Admin</option>
          </select>

          <select
            className="form-input"
            style={{ width: 'auto' }}
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {d.name}
              </option>
            ))}
          </select>

          <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#64748b' }}>
            Total Users: <strong>{users.length}</strong>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Searching user directory..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchUsersAndDepts} />
      ) : (
        <DataTable
          columns={columns}
          data={users}
          pageSize={10}
          emptyTitle="No Users Found"
          emptyDescription="No campus users match your search parameters."
        />
      )}

      {/* Provision User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Provision Campus User"
        subtitle="Create a new student, faculty, HOD, or administrator account"
        maxWidth="480px"
      >
        <form onSubmit={handleCreateUser}>
          {modalError && (
            <div className="alert alert-error" style={{ marginBottom: '0.85rem' }}>
              <span>{modalError}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Institutional Email *</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. user@digiicampus.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Initial Password *</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Assigned Role *</label>
              <select
                className="form-input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
                <option value="HOD">Head of Dept (HOD)</option>
                <option value="ADMIN">System Administrator</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Department</label>
              <select
                className="form-input"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                <option value="">None / General</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </select>
            </div>
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
              {submitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Deactivate / Activate Dialog */}
      <ConfirmDialog
        isOpen={Boolean(toggleUserTarget)}
        title={toggleUserTarget?.is_active ? `Deactivate User #${toggleUserTarget?.id}` : `Activate User #${toggleUserTarget?.id}`}
        message={`Are you sure you want to ${toggleUserTarget?.is_active ? 'deactivate' : 'reactivate'} ${toggleUserTarget?.name} (${toggleUserTarget?.email})?`}
        confirmLabel={toggleUserTarget?.is_active ? 'Deactivate' : 'Activate'}
        confirmVariant={toggleUserTarget?.is_active ? 'danger' : 'success'}
        loading={toggling}
        onConfirm={handleConfirmToggleActive}
        onCancel={() => setToggleUserTarget(null)}
      />
    </Layout>
  );
};
