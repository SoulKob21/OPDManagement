import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { DmSummaryView } from './DmSummaryView';
import { DmScreeningListView } from './DmScreeningListView';
import { DmPlaceholderView } from './DmPlaceholderView';

import logoImg from '../../assets/LOGO.png';

type DmView = 'summary' | 'mock1' | 'mock2' | 'mock3';

export const DiabetesScreeningPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [view, setView] = useState<DmView>('summary');

  // Sidebar collapsible state
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(() => {
    return window.innerWidth <= 768;
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsMenuCollapsed(true);
      } else if (window.innerWidth > 768 && window.innerWidth < 1200) {
        setIsMenuCollapsed(true);
      } else {
        setIsMenuCollapsed(false);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Stats State
  const [dbWarning, setDbWarning] = useState<boolean>(false);

  const fetchStats = async () => {
    try {
      // Fetch patient count to check database connection
      const { error } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      if (error) {
        if (error.message.includes('public.patients') || error.message.includes('schema cache')) {
          setDbWarning(true);
        }
        throw error;
      } else {
        setDbWarning(false);
      }
    } catch (err) {
      console.warn('[DiabetesScreening] Could not load stats, tables might not exist yet.');
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
    } catch (err) {
      console.error('[DiabetesScreening] Error logging out:', err);
      setLoggingOut(false);
    }
  };

  const goToSummary = () => setView('summary');

  const renderContent = () => {
    if (dbWarning) {
      return (
        <div className="dashboard-card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
          <div className="alert alert-danger" style={{ display: 'inline-flex', marginBottom: '1.5rem', textAlign: 'left' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginRight: 8 }} aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div>
              <strong>ฐานข้อมูลยังไม่พร้อมใช้งาน!</strong> <br />
              กรุณาคัดลอกโค้ด SQL จากไฟล์ <a href="file:///f:/Github/OPDManagement/supabase/opd-schema.sql" style={{ color: 'inherit', fontWeight: 'bold', textDecoration: 'underline' }}>supabase/opd-schema.sql</a> ไปวางและรันในหน้า <strong>SQL Editor</strong> ของบอร์ดควบคุม Supabase ของท่านเสียก่อน เพื่อสร้างตารางระบบและสิทธิ์การเข้าถึง (RLS)
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>เมื่อรัน SQL สคริปต์เสร็จแล้ว กรุณากดปุ่มรีเฟรชด้านล่างเพื่อเริ่มใช้งาน</p>
          <button className="btn btn-primary" onClick={fetchStats} style={{ width: 'auto', marginTop: '1rem' }}>
            รีเฟรชระบบตรวจจับ
          </button>
        </div>
      );
    }

    return (
      <div>
        {view === 'summary' && <DmSummaryView />}
        {view === 'mock1' && <DmScreeningListView onBack={goToSummary} />}
        {view === 'mock2' && <DmPlaceholderView title="Mock Menu 2" onBack={goToSummary} />}
        {view === 'mock3' && <DmPlaceholderView title="Mock Menu 3" onBack={goToSummary} />}
      </div>
    );
  };

  return (
    <div className={`dashboard-container ${isMenuCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile Sidebar Overlay Backdrop */}
      {!isMenuCollapsed && window.innerWidth <= 768 && (
        <div className="mobile-sidebar-overlay" onClick={() => setIsMenuCollapsed(true)} />
      )}

      <header className="dashboard-header">
        <div className="dashboard-brand">
          <button 
            onClick={() => setIsMenuCollapsed(!isMenuCollapsed)} 
            className="menu-toggle-btn"
            aria-label="Toggle Sidebar"
            style={{ marginRight: '0.5rem' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <img src={logoImg} alt="BIDI Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', background: '#fff', borderRadius: '50%', padding: '2px', marginRight: '0.625rem' }} />
          <div className="user-info">
            <h1>OPD MED</h1>
            <span className="user-email">{user?.email}</span>
          </div>
        </div>

        {/* Top-level Navigation tabs */}
        <div className="header-nav-tabs" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/dashboard')}
            className="top-nav-btn"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '0.375rem',
              color: 'rgba(255, 255, 255, 0.85)',
              padding: '0.4rem 0.875rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'; e.currentTarget.style.color = '#ffffff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = 'rgba(255, 255, 255, 0.85)'; }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <span>แดชบอร์ดหลัก (OPD)</span>
          </button>
          <button
            onClick={() => navigate('/DiabetesScreeningPage')}
            className="top-nav-btn active"
            style={{
              background: 'rgba(255, 255, 255, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              borderRadius: '0.375rem',
              color: '#ffffff',
              padding: '0.4rem 0.875rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              transition: 'all 0.2s',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>คัดกรองเบาหวาน</span>
          </button>
        </div>

        <div className="header-actions">
          <span className="badge badge-protected">เข้ารหัสปลอดภัย</span>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="btn btn-secondary"
            style={{ width: 'auto', padding: '0.5rem 1.125rem', fontSize: '0.8125rem' }}
          >
            {loggingOut ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, margin: 0 }} aria-hidden="true"></span>
                กำลังออกจากระบบ…
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                ออกจากระบบ
              </>
            )}
          </button>
        </div>
      </header>

      {/* Stats row */}
      <div className="stats-row">
        <div className="stat-card card-patients" style={{ cursor: 'pointer' }} onClick={() => setView('mock1')}>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>1,248</div>
          <div className="stat-label">ผู้ป่วยคัดกรองทั้งหมด</div>
        </div>
        <div className="stat-card card-queues" style={{ cursor: 'pointer' }} onClick={() => setView('mock2')}>
          <div className="stat-value" style={{ color: 'var(--accent-2)' }}>327</div>
          <div className="stat-label">พบความเสี่ยงสูง</div>
        </div>
        <div className="stat-card card-deliveries" style={{ cursor: 'pointer' }} onClick={() => setView('mock3')}>
          <div className="stat-value" style={{ color: 'var(--success)' }}>921</div>
          <div className="stat-label">ปกติ / ความเสี่ยงต่ำ</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '5px solid var(--danger)' }}>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>89</div>
          <div className="stat-label">วินิจฉัย DM ยืนยัน</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <aside>
          <nav className="dashboard-nav" aria-label="Dashboard Navigation">
            {/* Diabetes Screening dashboard navigation */}
            <button
              className={`nav-item ${view === 'summary' ? 'active' : ''}`}
              onClick={() => setView('summary')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: -2 }} aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>สรุปรายปี</span>
            </button>
            <button
              className={`nav-item ${view === 'mock1' ? 'active' : ''}`}
              onClick={() => setView('mock1')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: -2 }} aria-hidden="true">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              <span>Mock Menu 1</span>
            </button>
            <button
              className={`nav-item ${view === 'mock2' ? 'active' : ''}`}
              onClick={() => setView('mock2')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: -2 }} aria-hidden="true">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              <span>Mock Menu 2</span>
            </button>
            <button
              className={`nav-item ${view === 'mock3' ? 'active' : ''}`}
              onClick={() => setView('mock3')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: -2 }} aria-hidden="true">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              <span>Mock Menu 3</span>
            </button>
          </nav>
        </aside>

        <main>
          {renderContent()}
        </main>
      </div>

      <footer className="dashboard-footer" style={{
        marginTop: '3.5rem',
        paddingTop: '1.5rem',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        fontSize: '0.8125rem',
        color: 'var(--text-secondary)',
        position: 'relative',
        zIndex: 2
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span>Powered by</span>
          <div className="tech-badges-container">
            <span className="tech-badge chatgpt" title="ChatGPT">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: 'middle' }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              ChatGPT
            </span>
            <span className="tech-badge gemini" title="Gemini">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ verticalAlign: 'middle' }}><path d="M12 2c0 5.523 4.477 10 10 10-5.523 0-10 4.477-10 10 0-5.523-4.477-10-10-10 5.523 0 10-4.477 10-10z"/></svg>
              Gemini
            </span>
            <span className="tech-badge claude" title="Claude">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: 'middle' }}><path d="M12 2v20M2 12h20M5.636 5.636l12.728 12.728M5.636 18.364L18.364 5.636"/></svg>
              Claude
            </span>
            <span className="tech-badge github" title="GitHub">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: 'middle' }}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
              GitHub
            </span>
            <span className="tech-badge cloudflare" title="Cloudflare">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: 'middle' }}><path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42-1.04-1.21-1.88-2.22-2.39S11.66 8.01 10.6 8.5C8.07 9.68 6.5 12.3 6.5 15c0 .34.02.67.06 1A4.5 4.5 0 0 0 11 20.5c.81 0 1.6-.2 2.3-.59.7.39 1.49.59 2.3.59h1.9"/></svg>
              Cloudflare
            </span>
            <span className="tech-badge supabase" title="Supabase">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ verticalAlign: 'middle' }}><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              Supabase
            </span>
          </div>
        </div>
        
        <div>
          Developed by <strong style={{ color: 'var(--text-primary)' }}>Imanity21</strong>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: 'middle' }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          โทร: 02-5903000 ต่อ 3543
        </div>
      </footer>
    </div>
  );
};

export default DiabetesScreeningPage;
