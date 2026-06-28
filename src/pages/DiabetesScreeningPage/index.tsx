import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { DmSummaryView } from './DmSummaryView';
import { DmHbA1cFbsView } from './DmHbA1cFbsView';
import { DmMonofilamentView } from './DmMonofilamentView';
import { DmAbiView } from './DmAbiView';
import ImportLabPage from '../ImportLabPage';
import { DashboardLayout } from '../../components/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';

type DmView = 'summary' | 'hba1c-fbs' | 'monofilament' | 'abi' | 'import-lab';

export const DiabetesScreeningPage: React.FC = () => {
  const location = useLocation();
  const { allowedMenus } = useAuth();

  // Navigation Subview State
  const [view, setView] = useState<DmView>(() => {
    const params = new URLSearchParams(location.search);
    const viewParam = params.get('view');
    if (viewParam && ['summary', 'hba1c-fbs', 'monofilament', 'abi', 'import-lab'].includes(viewParam)) {
      return viewParam as DmView;
    }
    if (allowedMenus !== null && !allowedMenus.includes('diabetes-screening') && allowedMenus.includes('import-lab')) {
      return 'import-lab';
    }
    return 'summary';
  });

  // Sync view state with URL view query changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const viewParam = params.get('view');
    if (viewParam && ['summary', 'hba1c-fbs', 'monofilament', 'abi', 'import-lab'].includes(viewParam)) {
      setView(viewParam as DmView);
    } else {
      if (allowedMenus !== null && !allowedMenus.includes('diabetes-screening') && allowedMenus.includes('import-lab')) {
        setView('import-lab');
      } else {
        setView('summary');
      }
    }
  }, [location.search, allowedMenus]);

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
        {view === 'hba1c-fbs' && <DmHbA1cFbsView onBack={goToSummary} />}
        {view === 'monofilament' && <DmMonofilamentView onBack={goToSummary} />}
        {view === 'abi' && <DmAbiView onBack={goToSummary} />}
        {view === 'import-lab' && <ImportLabPage onRefreshStats={fetchStats} />}
      </div>
    );
  };

  return (
    <DashboardLayout activeMenu="diabetes-screening" activeSubMenu={view} title="คัดกรองเบาหวาน">
      {/* Stats row */}
      <div className="stats-row">
        <div className="stat-card card-patients" style={{ cursor: 'pointer' }} onClick={() => setView('hba1c-fbs')}>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>1,248</div>
          <div className="stat-label">ผู้ป่วยคัดกรองทั้งหมด</div>
        </div>
        <div className="stat-card card-queues" style={{ cursor: 'pointer' }} onClick={() => setView('monofilament')}>
          <div className="stat-value" style={{ color: 'var(--accent-2)' }}>327</div>
          <div className="stat-label">พบความเสี่ยงสูง</div>
        </div>
        <div className="stat-card card-deliveries" style={{ cursor: 'pointer' }} onClick={() => setView('abi')}>
          <div className="stat-value" style={{ color: 'var(--success)' }}>921</div>
          <div className="stat-label">ปกติ / ความเสี่ยงต่ำ</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '5px solid var(--danger)' }}>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>89</div>
          <div className="stat-label">วินิจฉัย DM ยืนยัน</div>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        {renderContent()}
      </div>
    </DashboardLayout>
  );
};

export default DiabetesScreeningPage;
