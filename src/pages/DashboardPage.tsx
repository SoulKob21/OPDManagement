import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import PatientsPage from './PatientsPage';
import AppointmentsPage from './AppointmentsPage';
import QueuePage from './QueuePage';
import DoctorsPage from './DoctorsPage';
import MedicineDeliveryPage from './MedicineDeliveryPage';
import logoImg from '../assets/LOGO.png';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'overview' | 'patients' | 'appointments' | 'queues' | 'doctors' | 'deliveries'>('overview');

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
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    activeQueues: 0,
    todayDeliveries: 0,
  });
  const [loadingStats, setLoadingStats] = useState(false);
  const [dbWarning, setDbWarning] = useState<boolean>(false);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const todayStr = new Date().toISOString().split('T')[0];

      // Fetch patient count
      const { count: totalPat, error: err1 } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      if (err1) {
        if (err1.message.includes('public.patients') || err1.message.includes('schema cache')) {
          setDbWarning(true);
        }
        throw err1;
      } else {
        setDbWarning(false);
      }

      // Fetch today's appointments
      const { count: todayApp } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('appointment_date', todayStr);

      // Fetch active queues (non-completed and non-cancelled)
      const { count: actQ } = await supabase
        .from('queues')
        .select('*', { count: 'exact', head: true })
        .eq('queue_date', todayStr)
        .neq('status', 'completed')
        .neq('status', 'cancelled');

      // Fetch today's medicine deliveries
      const { count: todayDel } = await supabase
        .from('medicine_deliveries')
        .select('*', { count: 'exact', head: true })
        .eq('delivery_date', todayStr);

      setStats({
        totalPatients: totalPat || 0,
        todayAppointments: todayApp || 0,
        activeQueues: actQ || 0,
        todayDeliveries: todayDel || 0,
      });
    } catch (err) {
      console.warn('[Dashboard] Could not load stats, tables might not exist yet.');
    } finally {
      setLoadingStats(false);
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
      console.error('[Dashboard] Error logging out:', err);
      setLoggingOut(false);
    }
  };

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

    switch (activeTab) {
      case 'patients':
        return <PatientsPage onRefreshStats={fetchStats} />;
      case 'appointments':
        return <AppointmentsPage onRefreshStats={fetchStats} />;
      case 'queues':
        return <QueuePage onRefreshStats={fetchStats} />;
      case 'doctors':
        return <DoctorsPage onRefreshStats={fetchStats} />;
      case 'deliveries':
        return <MedicineDeliveryPage onRefreshStats={fetchStats} />;
      case 'overview':
      default:
        return (
          <div className="dashboard-card">
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '-0.2px' }}>
              ยินดีต้อนรับเข้าสู่ระบบจัดการผู้ป่วยนอก สถาบันบำราศนราดูร
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem', fontSize: '0.875rem' }}>
              เซสชันได้รับการปกป้องและรักษาความปลอดภัยอย่างถูกต้อง เลือกเมนูด้านซ้ายเพื่อเริ่มต้นทำรายการ
            </p>

            <div className="dashboard-placeholder" style={{ padding: '2rem 1rem' }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
              </svg>
              <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginTop: '0.5rem' }}>ระบบพร้อมใช้งาน</p>
              <p style={{ fontSize: '0.8125rem', marginTop: '0.375rem', color: 'var(--text-secondary)' }}>
                ท่านสามารถลงทะเบียนคนไข้ใหม่, กำหนดวันนัดหมายแพทย์ล่วงหน้า, และดำเนินการรันลำดับคิวประจำวันได้ทันที
              </p>
            </div>
          </div>
        );
    }
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
          <img src={logoImg} alt="สถาบันบำราศนราดูร Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', background: '#fff', borderRadius: '50%', padding: '2px', marginRight: '0.625rem' }} />
          <div className="user-info">
            <h1>สถาบันบำราศนราดูร</h1>
            <span className="user-email">{user?.email}</span>
          </div>
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
        <div className="stat-card card-patients" style={{ cursor: 'pointer' }} onClick={() => !dbWarning && setActiveTab('patients')}>
          <div className="stat-value">{loadingStats ? '...' : stats.totalPatients}</div>
          <div className="stat-label">ระเบียนผู้ป่วยทั้งหมด</div>
        </div>
        <div className="stat-card card-appointments" style={{ cursor: 'pointer' }} onClick={() => !dbWarning && setActiveTab('appointments')}>
          <div className="stat-value">{loadingStats ? '...' : stats.todayAppointments}</div>
          <div className="stat-label">นัดหมายตรวจวันนี้</div>
        </div>
        <div className="stat-card card-queues" style={{ cursor: 'pointer' }} onClick={() => !dbWarning && setActiveTab('queues')}>
          <div className="stat-value">{loadingStats ? '...' : stats.activeQueues}</div>
          <div className="stat-label">คิวที่ยังบริการไม่เสร็จ</div>
        </div>
        <div className="stat-card card-deliveries" style={{ cursor: 'pointer' }} onClick={() => !dbWarning && setActiveTab('deliveries')}>
          <div className="stat-value">{loadingStats ? '...' : stats.todayDeliveries}</div>
          <div className="stat-label">รายการส่งยาออกวันนี้</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <aside>
          <nav className="dashboard-nav" aria-label="Dashboard Navigation">
            <button
              className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: -2 }} aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              <span>ภาพรวมระบบ</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'patients' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('patients');
                if (window.innerWidth <= 768) setIsMenuCollapsed(true);
              }}
              disabled={dbWarning}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: -2 }} aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>ลงทะเบียนผู้ป่วย</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'appointments' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('appointments');
                if (window.innerWidth <= 768) setIsMenuCollapsed(true);
              }}
              disabled={dbWarning}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: -2 }} aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span>นัดหมายผู้ป่วย</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'queues' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('queues');
                if (window.innerWidth <= 768) setIsMenuCollapsed(true);
              }}
              disabled={dbWarning}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: -2 }} aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              <span>จัดการคิว OPD</span>
            </button>

            <button
              className={`nav-item ${activeTab === 'deliveries' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('deliveries');
                if (window.innerWidth <= 768) setIsMenuCollapsed(true);
              }}
              disabled={dbWarning}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: -2 }} aria-hidden="true">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              <span>ประวัติส่งยา</span>
            </button>

            <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }}></div>

            <button
              className={`nav-item ${activeTab === 'doctors' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('doctors');
                if (window.innerWidth <= 768) setIsMenuCollapsed(true);
              }}
              disabled={dbWarning}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: -2 }} aria-hidden="true"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
              <span>จัดการแพทย์</span>
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

        <div>
          Contact Facebook: <a href="https://www.facebook.com/supinya.poseng" target="_blank" rel="noopener noreferrer" style={{
            color: 'var(--primary)',
            textDecoration: 'none',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--primary)')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: 'middle' }}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            supinya.poseng
          </a>
        </div>
      </footer>
    </div>
  );
};

export default DashboardPage;

