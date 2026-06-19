import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PasswordInput } from '../components/PasswordInput';

export const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  // Password requirements checklist
  const hasMinLength = password.length >= 12;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;

  // Check if we have a valid session (Supabase handles link recovery by logging the user in automatically)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setHasSession(true);
        } else {
          setHasSession(false);
          setError('Invalid or expired password reset session. Please request a new link.');
        }
      } catch (err) {
        setHasSession(false);
        setError('Error establishing password reset session.');
      } finally {
        setSessionChecked(true);
      }
    };

    checkSession();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!hasSession) {
      setError('Cannot reset password without an active session. Please request a new link.');
      return;
    }

    if (!isPasswordValid) {
      setError('Please ensure your password meets all requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);

      // Update the user's password in Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        if (import.meta.env.DEV) {
          console.warn('[Auth Development] Password update failed:', updateError.message);
        }
        setError('Failed to update password. Link may have expired.');
        setLoading(false);
        return;
      }

      // Success
      setMessage('Password updated successfully. Logging you out for security...');
      
      // Perform security clean up: sign out and redirect
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/login', { replace: true });
      }, 3000);

    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[Auth Development] Password update exception:', err);
      }
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (!sessionChecked) {
    return (
      <main className="main-content">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="spinner" aria-hidden="true" style={{ margin: '0 auto 1rem auto' }}></div>
          <p>Verifying recovery session...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-logo">OPD</span>
          <h1 className="auth-title">Update Password</h1>
          <p className="auth-subtitle">Set a secure password for your account</p>
        </div>

        {error && (
          <div 
            className="alert alert-danger" 
            role="alert" 
            aria-live="assertive"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div 
            className="alert alert-success" 
            role="alert" 
            aria-live="polite"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>{message}</span>
          </div>
        )}

        {hasSession && !message && (
          <form onSubmit={handleReset} noValidate>
            <PasswordInput
              id="new-password"
              name="new-password"
              label="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              disabled={loading}
            />

            <PasswordInput
              id="confirm-password"
              name="confirm-password"
              label="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              disabled={loading}
            />

            {/* Password requirements visual validation checklist */}
            <div className="password-requirements">
              <p>Password requirements:</p>
              
              <div className={`requirement-item ${hasMinLength ? 'valid' : 'invalid'}`}>
                <span className="requirement-icon" aria-hidden="true">{hasMinLength ? '✓' : '✗'}</span>
                At least 12 characters
              </div>
              
              <div className={`requirement-item ${hasUppercase ? 'valid' : 'invalid'}`}>
                <span className="requirement-icon" aria-hidden="true">{hasUppercase ? '✓' : '✗'}</span>
                At least one uppercase letter (A-Z)
              </div>
              
              <div className={`requirement-item ${hasLowercase ? 'valid' : 'invalid'}`}>
                <span className="requirement-icon" aria-hidden="true">{hasLowercase ? '✓' : '✗'}</span>
                At least one lowercase letter (a-z)
              </div>
              
              <div className={`requirement-item ${hasNumber ? 'valid' : 'invalid'}`}>
                <span className="requirement-icon" aria-hidden="true">{hasNumber ? '✓' : '✗'}</span>
                At least one number (0-9)
              </div>
              
              <div className={`requirement-item ${hasSpecialChar ? 'valid' : 'invalid'}`}>
                <span className="requirement-icon" aria-hidden="true">{hasSpecialChar ? '✓' : '✗'}</span>
                At least one special character (!@#$ etc.)
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isPasswordValid || password !== confirmPassword}
              className="btn btn-primary"
              style={{ marginTop: '1.5rem' }}
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        )}

        {!hasSession && (
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <a href="/login" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
              Return to Login
            </a>
          </div>
        )}
      </div>
    </main>
  );
};

export default ResetPasswordPage;
