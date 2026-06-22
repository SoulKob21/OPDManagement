import React from 'react';

interface DmPlaceholderViewProps {
  title: string;
  onBack: () => void;
}

export const DmPlaceholderView: React.FC<DmPlaceholderViewProps> = ({ title, onBack }) => (
  <div className="dashboard-card">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 0 }}>
        {title}
      </h2>
      <button className="btn btn-secondary" onClick={onBack} style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8125rem' }}>
        ← กลับหน้าสรุป
      </button>
    </div>
    <div className="dashboard-placeholder" style={{ padding: '2rem 1rem' }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
      <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginTop: '0.5rem' }}>Coming Soon</p>
      <p style={{ fontSize: '0.8125rem', marginTop: '0.375rem', color: 'var(--text-secondary)' }}>
        ฟีเจอร์นี้กำลังอยู่ในระหว่างการพัฒนา กรุณารอการอัปเดตในเวอร์ชันถัดไป
      </p>
    </div>
  </div>
);
