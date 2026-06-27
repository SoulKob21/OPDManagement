import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PatientsPage from './PatientsPage';
import AppointmentsPage from './AppointmentsPage';
import QueuePage from './QueuePage';
import DoctorsPage from './DoctorsPage';
import MedicineDeliveryPage from './MedicineDeliveryPage';
import PermissionsPage from './PermissionsPage';
import ChangePasswordPage from './ChangePasswordPage';
import ImportLabPage from './ImportLabPage';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';

export const DashboardPage: React.FC = () => {
  const location = useLocation();
  const { allowedMenus } = useAuth();
  
  const isAllowed = (menu: string) => {
    if (allowedMenus === null) return true;
    return allowedMenus.includes(menu);
  };
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'overview' | 'patients' | 'appointments' | 'queues' | 'doctors' | 'deliveries' | 'permissions' | 'change-password' | 'import-lab'>(() => {
    if (location.state && (location.state as any).activeTab) {
      return (location.state as any).activeTab;
    }
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['overview', 'patients', 'appointments', 'queues', 'doctors', 'deliveries', 'permissions', 'change-password', 'import-lab'].includes(tabParam)) {
      return tabParam as any;
    }
    return 'overview';
  });

  // Sync tab status with URL changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['overview', 'patients', 'appointments', 'queues', 'doctors', 'deliveries', 'permissions', 'change-password', 'import-lab'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    } else if (location.state && (location.state as any).activeTab) {
      setActiveTab((location.state as any).activeTab);
    } else {
      setActiveTab('overview');
    }
  }, [location]);

  
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
      const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

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
      case 'permissions':
        return <PermissionsPage />;
      case 'change-password':
        return <ChangePasswordPage />;
      case 'import-lab':
        return <ImportLabPage onRefreshStats={fetchStats} />;

      case 'overview':
      default:
        return (
          <div className="dashboard-card">
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '-0.2px' }}>
              ยินดีต้อนรับเข้าสู่ระบบ OPD MED
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
    <DashboardLayout activeMenu={activeTab} title="แดชบอร์ดหลัก (OPD)">
      {/* Stats row */}
      <div className="stats-row">
        <div 
          className="stat-card card-patients" 
          style={{ cursor: isAllowed('patients') ? 'pointer' : 'default', opacity: isAllowed('patients') ? 1 : 0.6 }} 
          onClick={() => !dbWarning && isAllowed('patients') && setActiveTab('patients')}
        >
          <div className="stat-value">{loadingStats ? '...' : stats.totalPatients}</div>
          <div className="stat-label">ระเบียนผู้ป่วยทั้งหมด</div>
        </div>
        <div 
          className="stat-card card-appointments" 
          style={{ cursor: isAllowed('appointments') ? 'pointer' : 'default', opacity: isAllowed('appointments') ? 1 : 0.6 }} 
          onClick={() => !dbWarning && isAllowed('appointments') && setActiveTab('appointments')}
        >
          <div className="stat-value">{loadingStats ? '...' : stats.todayAppointments}</div>
          <div className="stat-label">นัดหมายตรวจวันนี้</div>
        </div>
        <div 
          className="stat-card card-queues" 
          style={{ cursor: isAllowed('queues') ? 'pointer' : 'default', opacity: isAllowed('queues') ? 1 : 0.6 }} 
          onClick={() => !dbWarning && isAllowed('queues') && setActiveTab('queues')}
        >
          <div className="stat-value">{loadingStats ? '...' : stats.activeQueues}</div>
          <div className="stat-label">คิวที่ยังบริการไม่เสร็จ</div>
        </div>
        <div 
          className="stat-card card-deliveries" 
          style={{ cursor: isAllowed('deliveries') ? 'pointer' : 'default', opacity: isAllowed('deliveries') ? 1 : 0.6 }} 
          onClick={() => !dbWarning && isAllowed('deliveries') && setActiveTab('deliveries')}
        >
          <div className="stat-value">{loadingStats ? '...' : stats.todayDeliveries}</div>
          <div className="stat-label">รายการส่งยาออกวันนี้</div>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        {renderContent()}
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;

