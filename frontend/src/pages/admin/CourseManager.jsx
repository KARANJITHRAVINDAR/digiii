import React, { useEffect, useState } from 'react';
import { Layout } from '../../layouts/Layout';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorState } from '../../components/ErrorState';
import api from '../../services/api';

export const CourseManager = () => {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [courseRes, deptRes, userRes] = await Promise.all([
        api.get('/api/courses'),
        api.get('/api/departments'),
        api.get('/api/admin/users').catch(() => ({ data: [] })),
      ]);
      setCourses(courseRes.data);
      setDepartments(deptRes.data);
      setTeachers(userRes.data.filter((u) => u.role === 'TEACHER' || u.role === 'HOD'));
      if (deptRes.data.length > 0 && !departmentId) {
        setDepartmentId(String(deptRes.data[0].id));
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch course catalog.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || !departmentId) {
      setModalError('Please fill in code, name, and department.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      await api.post('/api/admin/courses', {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        department_id: parseInt(departmentId, 10),
        teacher_id: teacherId ? parseInt(teacherId, 10) : null,
      });
      setShowCreateModal(false);
      setCode('');
      setName('');
      setTeacherId('');
      setSuccessNotice(`Course ${code.trim().toUpperCase()} created successfully.`);
      await fetchData();
    } catch (err) {
      setModalError(err.response?.data?.detail || 'Failed to create course.');
    } finally {
      setSubmitting(false);
    }
  };

  const getDept = (deptId) => departments.find((d) => d.id === deptId);
  const getTeacher = (tId) => teachers.find((t) => t.id === tId);

  const columns = [
    {
      header: 'Code',
      accessor: 'code',
      render: (c) => <span style={{ fontWeight: 600, color: '#2563eb' }}>{c.code}</span>,
    },
    {
      header: 'Course Name',
      accessor: 'name',
      render: (c) => <strong style={{ color: '#0f172a' }}>{c.name}</strong>,
    },
    {
      header: 'Department (Owner)',
      render: (c) => {
        const d = getDept(c.department_id);
        return <span style={{ color: '#475569', fontSize: '0.8rem' }}>{d ? `${d.code} — ${d.name}` : `Dept #${c.department_id}`}</span>;
      },
    },
    {
      header: 'Lead Faculty',
      render: (c) => {
        const t = getTeacher(c.teacher_id);
        return <span style={{ color: '#0f172a', fontSize: '0.8rem' }}>{t ? t.name : 'Unassigned'}</span>;
      },
    },
  ];

  return (
    <Layout
      pageTitle="Course Directory"
      breadcrumbs={[{ label: 'Home' }, { label: 'Admin' }, { label: 'Courses' }]}
    >
      <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Curriculum & Course Directory
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.2rem', marginBottom: 0 }}>
            Establish course-department ownership hierarchy for dispute SLA escalation routing.
          </p>
        </div>

        <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
          + Create New Course
        </button>
      </div>

      {successNotice && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          <span>{successNotice}</span>
        </div>
      )}

      {loading ? (
        <LoadingSpinner message="Fetching course catalog..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : (
        <DataTable
          columns={columns}
          data={courses}
          pageSize={10}
          emptyTitle="No Courses Registered"
          emptyDescription="No academic courses have been created in the system."
        />
      )}

      {/* Create Course Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Register New Course"
        subtitle="Specify course ownership department for SLA routing"
        maxWidth="480px"
      >
        <form onSubmit={handleCreateCourse}>
          {modalError && (
            <div className="alert alert-error" style={{ marginBottom: '0.85rem' }}>
              <span>{modalError}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Course Code *</label>
            <input
              type="text"
              className="form-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. CS301 or MA101"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Course Title / Name *</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Database Management Systems"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Owner Department *</label>
            <select
              className="form-input"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              required
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
            <div className="form-helper">
              Disputes for this course will strictly escalate to this department's HOD.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Lead Faculty (Instructor)</label>
            <select
              className="form-input"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.email})
                </option>
              ))}
            </select>
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
              {submitting ? 'Registering...' : 'Register Course'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};
