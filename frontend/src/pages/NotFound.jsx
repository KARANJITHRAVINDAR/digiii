import React from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../layouts/Layout';

export const NotFound = () => {
  return (
    <Layout>
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--primary)' }}>404</h1>
        <h2 style={{ marginBottom: '1rem' }}>Page Not Found</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          The requested path does not exist or you do not have authorization to view it.
        </p>
        <Link to="/login" className="btn btn-primary">
          Back to Safety / Sign In
        </Link>
      </div>
    </Layout>
  );
};
