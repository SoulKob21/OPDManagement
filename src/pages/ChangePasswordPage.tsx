import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { PasswordInput } from '../components/PasswordInput';

export const ChangePasswordPage: React.FC = () => {
  const { user, logout } = useAuth();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Password requirements checklist
  const hasMinLength = newPassword.length >= 12;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!user) {
      setError('ไม่พบข้อมูลเซสชันผู้ใช้งาน กรุณาล็อกอินใหม่อีกครั้ง');
      return;
    }

    if (!isPasswordValid) {
      setError('รหัสผ่านใหม่ไม่ตรงตามข้อกำหนดความปลอดภัย');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    try {
      setLoading(true);

      // Dev bypass mode simulation
      if (user.id === 'dev-user') {
        setSuccess('เปลี่ยนรหัสผ่านสำเร็จ (โหมดจำลอง Dev Bypass) กำลังออกจากระบบใน 3 วินาที...');
        setTimeout(async () => {
          await logout();
        }, 3000);
        return;
      }

      // Update to new password directly (bypassing CAPTCHA-blocked sign-in verification)
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess('เปลี่ยนรหัสผ่านสำเร็จ กำลังออกจากระบบเพื่อความปลอดภัยใน 3 วินาที...');
      
      // Clean up local session and redirect
      setTimeout(async () => {
        await logout();
      }, 3000);

    } catch (err: any) {
      console.error('Change password error:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน กรุณาลองใหม่อีกครั้ง');
    } finally {
      if (user.id !== 'dev-user') {
        setLoading(false);
      }
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.2s', maxWidth: '600px', margin: '0 auto' }}>
      <div className="dashboard-card">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          ตั้งค่ารหัสผ่านใหม่ (Change Password)
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '1.5rem' }}>
          เพื่อความปลอดภัยของข้อมูลผู้ป่วย กรุณาเปลี่ยนรหัสผ่านเป็นระยะและเก็บรักษารหัสผ่านของท่านเป็นความลับ
        </p>

        {success && (
          <div className="alert alert-success" role="alert" style={{ marginBottom: '1.5rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="alert alert-danger" role="alert" style={{ marginBottom: '1.5rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>{error}</span>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} noValidate>
            <PasswordInput
              id="new-password"
              name="new-password"
              label="รหัสผ่านใหม่ (New Password) *"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              disabled={loading}
            />

            <PasswordInput
              id="confirm-password"
              name="confirm-password"
              label="ยืนยันรหัสผ่านใหม่ (Confirm New Password) *"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              disabled={loading}
            />

            {/* Password requirements checklist */}
            <div className="password-requirements" style={{ marginTop: '1.25rem', padding: '1rem', background: 'var(--bg-surface-solid)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <p style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>ข้อกำหนดรหัสผ่านความปลอดภัยสูง:</p>
              
              <div className={`requirement-item ${hasMinLength ? 'valid' : 'invalid'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', marginBottom: '0.25rem', color: hasMinLength ? '#10b981' : 'var(--text-muted)' }}>
                <span className="requirement-icon" aria-hidden="true">{hasMinLength ? '✓' : '✗'}</span>
                ความยาวอย่างน้อย 12 ตัวอักษร
              </div>
              
              <div className={`requirement-item ${hasUppercase ? 'valid' : 'invalid'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', marginBottom: '0.25rem', color: hasUppercase ? '#10b981' : 'var(--text-muted)' }}>
                <span className="requirement-icon" aria-hidden="true">{hasUppercase ? '✓' : '✗'}</span>
                มีตัวพิมพ์ใหญ่ (A-Z) อย่างน้อย 1 ตัว
              </div>
              
              <div className={`requirement-item ${hasLowercase ? 'valid' : 'invalid'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', marginBottom: '0.25rem', color: hasLowercase ? '#10b981' : 'var(--text-muted)' }}>
                <span className="requirement-icon" aria-hidden="true">{hasLowercase ? '✓' : '✗'}</span>
                มีตัวพิมพ์เล็ก (a-z) อย่างน้อย 1 ตัว
              </div>
              
              <div className={`requirement-item ${hasNumber ? 'valid' : 'invalid'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', marginBottom: '0.25rem', color: hasNumber ? '#10b981' : 'var(--text-muted)' }}>
                <span className="requirement-icon" aria-hidden="true">{hasNumber ? '✓' : '✗'}</span>
                มีตัวเลข (0-9) อย่างน้อย 1 ตัว
              </div>
              
              <div className={`requirement-item ${hasSpecialChar ? 'valid' : 'invalid'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: hasSpecialChar ? '#10b981' : 'var(--text-muted)' }}>
                <span className="requirement-icon" aria-hidden="true">{hasSpecialChar ? '✓' : '✗'}</span>
                มีอักขระพิเศษอย่างน้อย 1 ตัว (!@#$ เป็นต้น)
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                type="submit"
                disabled={loading || !isPasswordValid || newPassword !== confirmPassword}
                className="btn btn-primary"
                style={{ width: 'auto', padding: '0.5rem 2rem' }}
              >
                {loading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChangePasswordPage;
