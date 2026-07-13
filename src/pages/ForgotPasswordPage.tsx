import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { supabase, TURNSTILE_SITE_KEY, ENABLE_TURNSTILE } from '../lib/supabase';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const turnstileRef = useRef<TurnstileInstance>(null);

  const validateEmail = (emailStr: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    // 1. Validate Email
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    // 2. Validate CAPTCHA Token
    if (ENABLE_TURNSTILE && !captchaToken) {
      setError('Please complete the security check.');
      return;
    }

    try {
      setLoading(true);

      const redirectToUrl = `${window.location.origin}/reset-password`;

      // 3. Reset password request
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectToUrl,
        ...(ENABLE_TURNSTILE && captchaToken ? { captchaToken } : {}), // pass Turnstile token
      });

      // Reset Turnstile on completed attempt
      turnstileRef.current?.reset();
      setCaptchaToken(null);

      if (resetError) {
        if (import.meta.env.DEV) {
          console.warn('[Auth Development] Reset password failed:', resetError.message);
        }
        // Still display the generic success message to prevent user enumeration
      }

      // Always show generic success message
      setMessage('If an account exists for that email address, password-reset instructions have been sent.');
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[Auth Development] Reset password exception:', err);
      }
      setError('An unexpected error occurred. Please try again.');
      turnstileRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="main-content">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-logo">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block' }}>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <h1 className="auth-title">สถาบันบำราศนราดูร</h1>
          <p className="auth-subtitle">กู้คืนรหัสผ่าน (Reset Password)</p>
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

        <form onSubmit={handleReset} noValidate>
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={loading || !!message}
              className="form-input"
            />
          </div>

          {ENABLE_TURNSTILE && !message ? (
            TURNSTILE_SITE_KEY ? (
              <div className="turnstile-container">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={TURNSTILE_SITE_KEY}
                  options={{
                    theme: 'auto',
                  }}
                  onSuccess={(token) => setCaptchaToken(token)}
                  onError={() => {
                    setError('Security check failed to load. Please try refreshing.');
                    setCaptchaToken(null);
                  }}
                  onExpire={() => {
                    setError('Security check session expired. Please verify again.');
                    setCaptchaToken(null);
                  }}
                />
              </div>
            ) : (
              <div className="alert alert-danger" role="alert" style={{ marginBottom: '1.25rem' }}>
                Security Widget Key is not configured.
              </div>
            )
          ) : null}

          <button
            type="submit"
            disabled={loading || (ENABLE_TURNSTILE && !captchaToken) || !!message}
            className="btn btn-primary"
            style={{ marginBottom: '1.25rem' }}
          >
            {loading ? 'Sending Request...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login" className="auth-link">
            Back to Sign In
          </Link>
        </div>
      </div>
    </main>
  );
};

export default ForgotPasswordPage;
