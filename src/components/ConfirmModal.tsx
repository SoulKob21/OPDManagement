import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'ยืนยันการลบ',
  cancelText = 'ยกเลิก',
  type = 'danger',
}) => {
  if (!isOpen) return null;

  const iconColor = type === 'danger' ? 'var(--danger)' : type === 'warning' ? '#f59e0b' : 'var(--primary)';
  const iconBg = type === 'danger' ? 'var(--danger-bg)' : type === 'warning' ? 'rgba(245, 158, 11, 0.08)' : 'var(--primary-subtle)';
  const btnBg = type === 'danger' ? 'var(--danger)' : type === 'warning' ? '#f59e0b' : 'var(--primary)';

  return (
    <div className="opd-modal-overlay" style={{ zIndex: 10000 }} onClick={onClose}>
      <div 
        className="opd-modal" 
        style={{ maxWidth: '440px', padding: '2rem 1.75rem', borderRadius: 'var(--radius-lg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          {/* Circular Icon */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '64px', height: '64px', borderRadius: '50%',
            background: iconBg, color: iconColor, marginBottom: '1.25rem'
          }}>
            {type === 'danger' && (
              <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
              </svg>
            )}
            {type === 'warning' && (
              <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3ZM12 9v4M12 17h.01" />
              </svg>
            )}
            {type === 'info' && (
              <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
              </svg>
            )}
          </div>

          {/* Title */}
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.625rem', letterSpacing: '-0.3px' }}>
            {title}
          </h3>

          {/* Message */}
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.75rem' }}>
            {message}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', width: '100%', gap: '0.75rem' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              style={{ flex: 1 }}
            >
              {cancelText}
            </button>
            <button 
              type="button" 
              className="btn" 
              onClick={() => {
                onConfirm();
                onClose();
              }}
              style={{ 
                flex: 1, 
                background: btnBg, 
                color: 'white',
                border: 'none',
                boxShadow: type === 'danger' ? '0 4px 12px rgba(239, 68, 68, 0.2)' : 'none'
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
