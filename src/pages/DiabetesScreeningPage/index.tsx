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

  // Fiscal Year Utilities
  const getCurrentFiscalYear = (): number => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1; // 1-indexed (1-12)
    // If October or later, it belongs to the next fiscal year
    const fiscalYearGregorian = month >= 10 ? year + 1 : year;
    return fiscalYearGregorian + 543; // Convert to Buddhist Era (B.E.)
  };

  const getFiscalYearRange = (yearBE: number) => {
    const gYear = yearBE - 543;
    const startDate = `${gYear - 1}-10-01`;
    const endDate = `${gYear}-09-30`;
    return { startDate, endDate };
  };

  const getRandomDateWithin = (startStr: string, endStr: string, seed: number) => {
    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();
    const range = end - start;
    const pseudoRandom = Math.abs(Math.sin(seed)) % 1;
    const time = start + pseudoRandom * range;
    return new Date(time).toISOString().split('T')[0];
  };

  const getMockDataForFY = (yearBE: number) => {
    const patientsCount = 120 + (yearBE % 7) * 15;
    const abnormalCount = 35 + (yearBE % 5) * 8;
    const footCount = 85 + (yearBE % 9) * 10;
    const abiCount = 70 + (yearBE % 8) * 12;

    const hba1cResults = [];
    const prevHba1cResults = [];
    const footAssessments = [];
    const abiAssessments = [];

    const { startDate, endDate } = getFiscalYearRange(yearBE);
    const { startDate: prevStartDate, endDate: prevEndDate } = getFiscalYearRange(yearBE - 1);

    for (let i = 1; i <= patientsCount; i++) {
      const patientId = `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`;
      const testDate = getRandomDateWithin(startDate, endDate, i);
      const isAbnormal = i <= abnormalCount / 2;
      const hba1cVal = isAbnormal
        ? (7.0 + (i % 5) * 0.4).toFixed(1)
        : (5.0 + (i % 4) * 0.4).toFixed(1);

      hba1cResults.push({
        patient_id: patientId,
        test_date: testDate,
        result_value: hba1cVal
      });

      // Previous year HbA1c results for comparison
      if (i % 3 !== 0) {
        const prevDate = getRandomDateWithin(prevStartDate, prevEndDate, i + 100);
        let prevVal;
        if (i % 3 === 1) { // Current is increased, so prev was lower
          prevVal = (parseFloat(hba1cVal) - 0.6).toFixed(1);
        } else if (i % 3 === 2) { // Current is decreased, so prev was higher
          prevVal = (parseFloat(hba1cVal) + 0.5).toFixed(1);
        } else { // Unchanged
          prevVal = hba1cVal;
        }
        prevHba1cResults.push({
          patient_id: patientId,
          test_date: prevDate,
          result_value: prevVal
        });
      }
    }

    // Foot assessments
    for (let i = 1; i <= footCount; i++) {
      const patientId = `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`;
      const examDate = getRandomDateWithin(startDate, endDate, i + 50);
      const resultStatus = (i % 8 === 0) ? 'ผิดปกติ' : 'ปกติ';
      footAssessments.push({
        patient_id: patientId,
        exam_date: examDate,
        result_status: resultStatus
      });
    }

    // ABI assessments
    for (let i = 1; i <= abiCount; i++) {
      const patientId = `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`;
      const examDate = getRandomDateWithin(startDate, endDate, i + 80);
      const resultStatus = (i % 9 === 0) ? 'ผิดปกติ' : 'ปกติ';
      abiAssessments.push({
        patient_id: patientId,
        exam_date: examDate,
        result_status: resultStatus
      });
    }

    return { hba1cResults, prevHba1cResults, footAssessments, abiAssessments };
  };

  const [selectedYear, setSelectedYear] = useState<number>(() => getCurrentFiscalYear());
  const [hba1cResults, setHba1cResults] = useState<any[]>([]);
  const [latestHbA1cMap, setLatestHbA1cMap] = useState<Map<string, any>>(new Map());
  const [prevHbA1cMap, setPrevHbA1cMap] = useState<Map<string, any>>(new Map());
  const [stats, setStats] = useState({
    totalHbA1c: 0,
    totalAbnormal: 0,
    totalFoot: 0,
    totalAbi: 0,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [dbWarning, setDbWarning] = useState<boolean>(false);

  const fetchAllRows = async (
    table: string,
    selectQuery: string,
    buildQuery: (q: any) => any
  ): Promise<any[]> => {
    let allRows: any[] = [];
    const batchSize = 1000;
    
    // Fetch total count matching the query parameters
    let baseQuery = supabase.from(table).select('*', { count: 'exact', head: true });
    baseQuery = buildQuery(baseQuery);
    
    const { count, error: countErr } = await baseQuery;
    if (countErr) throw countErr;
    
    const total = count ?? 0;
    if (total === 0) return [];
    
    // Page through records in chunks of 1000
    for (let offset = 0; offset < total; offset += batchSize) {
      let query = supabase.from(table).select(selectQuery);
      query = buildQuery(query);
      
      const { data, error } = await query
        .range(offset, offset + batchSize - 1);
        
      if (error) throw error;
      if (data) {
        allRows = allRows.concat(data);
      }
    }
    return allRows;
  };

  const fetchDiabetesData = async (year: number) => {
    setLoading(true);
    setError('');
    try {
      const { startDate, endDate } = getFiscalYearRange(year);
      const { startDate: prevStart, endDate: prevEnd } = getFiscalYearRange(year - 1);

      // Check database connectivity first
      const { error: testErr } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      if (testErr) {
        if (testErr.message.includes('public.patients') || testErr.message.includes('schema cache')) {
          setDbWarning(true);
        }
        throw testErr;
      } else {
        setDbWarning(false);
      }

      if (import.meta.env.DEV && !import.meta.env.VITE_SUPABASE_URL) {
        // Fallback local mock filtering
        const mock = getMockDataForFY(year);
        
        const hba1cPatientIds = new Set(mock.hba1cResults.map(r => r.patient_id));
        const map = new Map<string, any>();
        mock.hba1cResults.forEach(r => {
          const existing = map.get(r.patient_id);
          if (!existing || new Date(r.test_date) > new Date(existing.test_date)) {
            map.set(r.patient_id, r);
          }
        });

        const prevMap = new Map<string, any>();
        mock.prevHba1cResults.forEach(r => {
          const existing = prevMap.get(r.patient_id);
          if (!existing || new Date(r.test_date) > new Date(existing.test_date)) {
            prevMap.set(r.patient_id, r);
          }
        });

        const abnormalPatientIds = new Set<string>();
        map.forEach((r, pid) => {
          if (parseFloat(r.result_value) >= 7.0) {
            abnormalPatientIds.add(pid);
          }
        });
        mock.footAssessments.forEach(r => {
          if (r.result_status === 'ผิดปกติ') {
            abnormalPatientIds.add(r.patient_id);
          }
        });
        mock.abiAssessments.forEach(r => {
          if (r.result_status === 'ผิดปกติ') {
            abnormalPatientIds.add(r.patient_id);
          }
        });

        const footPatientIds = new Set(mock.footAssessments.map(r => r.patient_id));
        const abiPatientIds = new Set(mock.abiAssessments.map(r => r.patient_id));

        setHba1cResults(mock.hba1cResults);
        setLatestHbA1cMap(map);
        setPrevHbA1cMap(prevMap);

        setStats({
          totalHbA1c: hba1cPatientIds.size,
          totalAbnormal: abnormalPatientIds.size,
          totalFoot: footPatientIds.size,
          totalAbi: abiPatientIds.size,
        });
        setLoading(false);
        return;
      }

      // Production Supabase fetching with auto-pagination for limits > 1000
      // 1. Current year completed HbA1c
      const hba1cRows = await fetchAllRows(
        'patient_lab_results',
        'patient_id, result_value, test_date',
        (q) => q
          .eq('test_name', 'Hemoglobin A1C')
          .eq('status', 'completed')
          .gte('test_date', startDate)
          .lte('test_date', endDate)
      );

      // 2. Previous year completed HbA1c (for trend)
      const prevHba1cRows = await fetchAllRows(
        'patient_lab_results',
        'patient_id, result_value, test_date',
        (q) => q
          .eq('test_name', 'Hemoglobin A1C')
          .eq('status', 'completed')
          .gte('test_date', prevStart)
          .lte('test_date', prevEnd)
      );

      // 3. Current year foot assessments
      const footRows = await fetchAllRows(
        'patient_foot_assessments',
        'patient_id, result_status, exam_date',
        (q) => q
          .gte('exam_date', startDate)
          .lte('exam_date', endDate)
      );

      // 4. Current year ABI assessments
      const abiRows = await fetchAllRows(
        'patient_abi_assessments',
        'patient_id, result_status, exam_date',
        (q) => q
          .gte('exam_date', startDate)
          .lte('exam_date', endDate)
      );


      // Group and get latest HbA1c per patient for current year
      const hba1cPatientIds = new Set<string>();
      const map = new Map<string, any>();
      (hba1cRows || []).forEach(r => {
        hba1cPatientIds.add(r.patient_id);
        const existing = map.get(r.patient_id);
        if (!existing || new Date(r.test_date) > new Date(existing.test_date)) {
          map.set(r.patient_id, r);
        }
      });

      // Group and get latest HbA1c per patient for previous year
      const prevMap = new Map<string, any>();
      (prevHba1cRows || []).forEach(r => {
        const existing = prevMap.get(r.patient_id);
        if (!existing || new Date(r.test_date) > new Date(existing.test_date)) {
          prevMap.set(r.patient_id, r);
        }
      });

      // Abnormal logic: HbA1c >= 7 or foot abnormal or ABI abnormal
      const abnormalPatientIds = new Set<string>();
      map.forEach((r, pid) => {
        if (parseFloat(r.result_value) >= 7.0) {
          abnormalPatientIds.add(pid);
        }
      });
      (footRows || []).forEach(r => {
        if (r.result_status === 'ผิดปกติ') {
          abnormalPatientIds.add(r.patient_id);
        }
      });
      (abiRows || []).forEach(r => {
        if (r.result_status === 'ผิดปกติ') {
          abnormalPatientIds.add(r.patient_id);
        }
      });

      const footPatientIds = new Set((footRows || []).map(r => r.patient_id));
      const abiPatientIds = new Set((abiRows || []).map(r => r.patient_id));

      setHba1cResults(hba1cRows || []);
      setLatestHbA1cMap(map);
      setPrevHbA1cMap(prevMap);

      setStats({
        totalHbA1c: hba1cPatientIds.size,
        totalAbnormal: abnormalPatientIds.size,
        totalFoot: footPatientIds.size,
        totalAbi: abiPatientIds.size,
      });

    } catch (err: any) {
      console.warn('[DiabetesScreening] Could not load stats:', err.message);
      setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
      
      if (import.meta.env.DEV) {
        const mock = getMockDataForFY(year);
        const hba1cPatientIds = new Set(mock.hba1cResults.map(r => r.patient_id));
        const map = new Map<string, any>();
        mock.hba1cResults.forEach(r => {
          const existing = map.get(r.patient_id);
          if (!existing || new Date(r.test_date) > new Date(existing.test_date)) {
            map.set(r.patient_id, r);
          }
        });
        const prevMap = new Map<string, any>();
        mock.prevHba1cResults.forEach(r => {
          const existing = prevMap.get(r.patient_id);
          if (!existing || new Date(r.test_date) > new Date(existing.test_date)) {
            prevMap.set(r.patient_id, r);
          }
        });

        const abnormalPatientIds = new Set<string>();
        map.forEach((r, pid) => {
          if (parseFloat(r.result_value) >= 7.0) {
            abnormalPatientIds.add(pid);
          }
        });
        mock.footAssessments.forEach(r => {
          if (r.result_status === 'ผิดปกติ') {
            abnormalPatientIds.add(r.patient_id);
          }
        });
        mock.abiAssessments.forEach(r => {
          if (r.result_status === 'ผิดปกติ') {
            abnormalPatientIds.add(r.patient_id);
          }
        });

        setHba1cResults(mock.hba1cResults);
        setLatestHbA1cMap(map);
        setPrevHbA1cMap(prevMap);

        setStats({
          totalHbA1c: hba1cPatientIds.size,
          totalAbnormal: abnormalPatientIds.size,
          totalFoot: mock.footAssessments.length,
          totalAbi: mock.abiAssessments.length,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiabetesData(selectedYear);
  }, [selectedYear]);

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
          <p style={{ color: 'var(--text-secondary)' }}>เมื่อรัน SQL สคริปต์เสร็จแล้ว กรุณกดปุ่มรีเฟรชด้านล่างเพื่อเริ่มใช้งาน</p>
          <button className="btn btn-primary" onClick={() => fetchDiabetesData(selectedYear)} style={{ width: 'auto', marginTop: '1rem' }}>
            รีเฟรชระบบตรวจจับ
          </button>
        </div>
      );
    }

    return (
      <div>
        {view === 'summary' && (
          <DmSummaryView
            selectedYear={selectedYear}
            hba1cResults={hba1cResults}
            latestHbA1cMap={latestHbA1cMap}
            prevHbA1cMap={prevHbA1cMap}
            loading={loading}
            error={error}
          />
        )}
        {view === 'hba1c-fbs' && <DmHbA1cFbsView onBack={goToSummary} />}
        {view === 'monofilament' && <DmMonofilamentView onBack={goToSummary} />}
        {view === 'abi' && <DmAbiView onBack={goToSummary} />}
        {view === 'import-lab' && <ImportLabPage onRefreshStats={() => fetchDiabetesData(selectedYear)} />}
      </div>
    );
  };

  const currentFY = getCurrentFiscalYear();
  const years = Array.from({ length: 5 }, (_, i) => currentFY + 1 - i);

  return (
    <DashboardLayout activeMenu="diabetes-screening" activeSubMenu={view} title="คัดกรองเบาหวาน">
      {/* Fiscal Year Selector Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
          ภาพรวมคัดกรองตามปีงบประมาณ
        </h2>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            transition: 'border-color 0.2s ease',
            outline: 'none'
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
        >
          {years.map(y => (
            <option key={y} value={y}>ปีงบประมาณ {y}</option>
          ))}
        </select>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        {/* Box 1 */}
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-color)',
          borderTop: '4px solid var(--primary)',
          borderRadius: '0.75rem',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-sm)',
          cursor: 'default'
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            padding: '0.75rem 1rem',
            fontSize: '0.8125rem',
            fontWeight: 700,
            color: 'var(--text-secondary)'
          }}>
            ยอดผู้ป่วยเบาหวานทั้งหมดที่มีในระบบ
          </div>
          <div style={{
            padding: '1.25rem 1rem',
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            background: 'var(--bg-elevated)'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>
              {loading ? '...' : stats.totalHbA1c.toLocaleString()}
            </div>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ราย</span>
          </div>
        </div>

        {/* Box 2 */}
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-color)',
          borderTop: '4px solid var(--danger)',
          borderRadius: '0.75rem',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-sm)',
          cursor: 'default'
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.03)',
            borderBottom: '1px solid var(--border-color)',
            padding: '0.75rem 1rem',
            fontSize: '0.8125rem',
            fontWeight: 700,
            color: 'var(--text-secondary)'
          }}>
            ยอดผู้ป่วยเบาหวานที่มีความผิดปกติทั้งหมดในระบบ
          </div>
          <div style={{
            padding: '1.25rem 1rem',
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            background: 'rgba(239, 68, 68, 0.01)'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--danger)' }}>
              {loading ? '...' : stats.totalAbnormal.toLocaleString()}
            </div>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ราย</span>
          </div>
        </div>

        {/* Box 3 */}
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-color)',
          borderTop: '4px solid var(--accent-2)',
          borderRadius: '0.75rem',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-sm)',
          cursor: 'default'
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            padding: '0.75rem 1rem',
            fontSize: '0.8125rem',
            fontWeight: 700,
            color: 'var(--text-secondary)'
          }}>
            ยอดผู้ป่วยเบาหวานที่ได้รับการตรวจเท้าทั้งหมด
          </div>
          <div style={{
            padding: '1.25rem 1rem',
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            background: 'var(--bg-elevated)'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-2)' }}>
              {loading ? '...' : stats.totalFoot.toLocaleString()}
            </div>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ราย</span>
          </div>
        </div>

        {/* Box 4 */}
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-color)',
          borderTop: '4px solid var(--success)',
          borderRadius: '0.75rem',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-sm)',
          cursor: 'default'
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            padding: '0.75rem 1rem',
            fontSize: '0.8125rem',
            fontWeight: 700,
            color: 'var(--text-secondary)'
          }}>
            ยอดผู้ป่วยเบาหวานที่ได้รับการตรวจ ABI ทั้งหมด
          </div>
          <div style={{
            padding: '1.25rem 1rem',
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            background: 'var(--bg-elevated)'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>
              {loading ? '...' : stats.totalAbi.toLocaleString()}
            </div>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ราย</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        {renderContent()}
      </div>
    </DashboardLayout>
  );
};

export default DiabetesScreeningPage;
