import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { supabase, TURNSTILE_SITE_KEY, ENABLE_TURNSTILE } from '../lib/supabase';
import { PasswordInput } from '../components/PasswordInput';
import logoImg from '../assets/LOGO.png';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const turnstileRef = useRef<TurnstileInstance>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect path or default to /dashboard
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const validateEmail = (emailStr: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Validate Email
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    // 2. Validate Password
    if (!password) {
      setError('Password is required.');
      return;
    }

    // 3. Validate CAPTCHA Token (Only strictly required in production)
    if (ENABLE_TURNSTILE && !captchaToken && !import.meta.env.DEV) {
      setError('Please complete the security check.');
      return;
    }
 
    try {
      setLoading(true);
 
      // 4. Sign in via Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: (ENABLE_TURNSTILE && captchaToken) ? {
          captchaToken: captchaToken,
        } : undefined,
      });

      // Reset Turnstile on completed attempt (success or failure)
      turnstileRef.current?.reset();
      setCaptchaToken(null);

      if (authError) {
        // Log error message only in dev environment and securely
        if (import.meta.env.DEV) {
          console.warn('[Auth Development] SignIn failed:', authError.message);
        }
        // Display a generic message to the user
        setError('Unable to sign in. Please check your email and password and try again.');
        setLoading(false);
        return;
      }

      if (data.session) {
        // Successful login
        navigate(from, { replace: true });
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[Auth Development] SignIn error:', err);
      }
      setError('An unexpected error occurred. Please try again.');
      turnstileRef.current?.reset();
      setCaptchaToken(null);
      setLoading(false);
    }
  };

  return (
    <main className="main-content">
      <div className="auth-card">
        <div className="auth-header">
          <img src={logoImg} alt="BIDI Logo" className="bidi-logo" style={{ marginBottom: '1.25rem' }} />
          <h1 className="auth-title">OPD MED</h1>
          <p className="auth-subtitle">ระบบจัดการผู้ป่วยนอก (OPD Management)</p>
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

        <form onSubmit={handleLogin} noValidate>
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
              disabled={loading}
              className="form-input"
            />
          </div>

          <PasswordInput
            id="password"
            name="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            disabled={loading}
          />



          {ENABLE_TURNSTILE && (
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
              <div className="alert alert-danger" role="alert">
                Security Widget Key is not configured.
              </div>
            )
          )}

          <button
            type="submit"
            disabled={loading || (ENABLE_TURNSTILE && !captchaToken && !import.meta.env.DEV)}
            className="btn btn-primary"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

          {import.meta.env.DEV && (
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@opd.com');
                    setPassword('Admin@123456!');
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1, borderColor: 'var(--primary)', fontWeight: 600, fontSize: '0.75rem', padding: '0.4rem' }}
                >
                  🔑 Autofill Admin
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      setError(null);
                      const { data, error: authError } = await supabase.auth.signInWithPassword({
                        email: 'admin@opd.com',
                        password: 'Admin@123456!'
                      });
                      if (authError) throw authError;
                      if (data.session) {
                        navigate(from, { replace: true });
                      }
                    } catch (err: any) {
                      setError('Auto-Login failed: ' + (err.message || err));
                      setLoading(false);
                    }
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1, borderColor: 'var(--primary)', fontWeight: 600, fontSize: '0.75rem', padding: '0.4rem' }}
                >
                  ⚡ Auto-Login Admin
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('DEV_BYPASS_LOGIN', 'true');
                  window.location.href = '/dashboard';
                }}
                className="btn btn-secondary"
                style={{ borderColor: 'var(--border-color)', fontWeight: 500, fontSize: '0.75rem', padding: '0.4rem' }}
              >
                📴 Offline Bypass (No DB)
              </button>
            </div>
          )}
        </form>
      </div>
    </main>
  );
};

export default LoginPage;
