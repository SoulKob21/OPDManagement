import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const NotFoundPage: React.FC = () => {
  const { session } = useAuth();

  return (
    <main className="main-content" style={{ textAlign: 'center' }}>
      <div className="auth-card">
        <h1 style={{ fontSize: '4rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}>
          404
        </h1>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
          Page Not Found
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          The page you are looking for does not exist or has been moved.
        </p>
        
        <Link 
          to={session ? "/dashboard" : "/login"} 
          className="btn btn-primary"
          style={{ textDecoration: 'none' }}
        >
          {session ? "Go to Dashboard" : "Return to Login"}
        </Link>
      </div>
    </main>
  );
};

export default NotFoundPage;
