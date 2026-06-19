import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import PatientsPage from './PatientsPage';
import AppointmentsPage from './AppointmentsPage';
import QueuePage from './QueuePage';
import DoctorsPage from './DoctorsPage';
import MedicineDeliveryPage from './MedicineDeliveryPage';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'overview' | 'patients' | 'appointments' | 'queues' | 'doctors' | 'deliveries'>('overview');
  
  // Stats State
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    activeQueues: 0,
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

      setStats({
        totalPatients: totalPat || 0,
        todayAppointments: todayApp || 0,
        activeQueues: actQ || 0,
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
              ยินดีต้อนรับเข้าสู่ระบบจัดการผู้ป่วยนอก (OPD Management)
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
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <div className="dashboard-brand-icon">OPD</div>
          <div className="user-info">
            <h1>ระบบจัดการผู้ป่วยนอก (OPD)</h1>
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
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => !dbWarning && setActiveTab('patients')}>
          <div className="stat-value">{loadingStats ? '...' : stats.totalPatients}</div>
          <div className="stat-label">ระเบียนผู้ป่วยทั้งหมด</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => !dbWarning && setActiveTab('appointments')}>
          <div className="stat-value">{loadingStats ? '...' : stats.todayAppointments}</div>
          <div className="stat-label">นัดหมายตรวจวันนี้</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => !dbWarning && setActiveTab('queues')}>
          <div className="stat-value">{loadingStats ? '...' : stats.activeQueues}</div>
          <div className="stat-label">คิวที่ยังบริการไม่เสร็จ</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ animation: 'pulse 1.5s infinite' }}>●</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>ใช้งาน</span>
          </div>
          <div className="stat-label">สถานะการเชื่อมต่อ</div>
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
              ภาพรวมระบบ
            </button>
            <button
              className={`nav-item ${activeTab === 'patients' ? 'active' : ''}`}
              onClick={() => setActiveTab('patients')}
              disabled={dbWarning}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: -2 }} aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              ลงทะเบียนผู้ป่วย
            </button>
            <button
              className={`nav-item ${activeTab === 'appointments' ? 'active' : ''}`}
              onClick={() => setActiveTab('appointments')}
              disabled={dbWarning}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: -2 }} aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              นัดหมายผู้ป่วย
            </button>
            <button
              className={`nav-item ${activeTab === 'queues' ? 'active' : ''}`}
              onClick={() => setActiveTab('queues')}
              disabled={dbWarning}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: -2 }} aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              จัดการคิว OPD
            </button>

            <button
              className={`nav-item ${activeTab === 'deliveries' ? 'active' : ''}`}
              onClick={() => setActiveTab('deliveries')}
              disabled={dbWarning}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: -2 }} aria-hidden="true">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              ประวัติส่งยา
            </button>

            <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }}></div>

            <button
              className={`nav-item ${activeTab === 'doctors' ? 'active' : ''}`}
              onClick={() => setActiveTab('doctors')}
              disabled={dbWarning}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, verticalAlign: -2 }} aria-hidden="true"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
              จัดการแพทย์
            </button>
          </nav>
        </aside>

        <main>
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;

