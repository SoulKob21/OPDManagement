import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface DmHbA1cFbsViewProps {
  onBack: () => void;
}

// ── Mock data (20 rows) ──────────────────────────────────────
const MOCK_DATA = [
  { id: 1, hn: 'HN-00101', name: 'นายสมชาย ใจดี', doctor: 'นพ.สมศักดิ์ รักษาดี', date: '15/01/2568', hba1c: 6.8, fbs: 132, result: 'เสี่ยงสูง', resultColor: '#f59e0b' },
  { id: 2, hn: 'HN-00102', name: 'นางสาวสมหญิง รักสุข', doctor: 'นพ.สมศักดิ์ รักษาดี', date: '15/01/2568', hba1c: 5.4, fbs: 95, result: 'ปกติ', resultColor: '#10b981' },
  { id: 3, hn: 'HN-00103', name: 'นายวิชัย สร้างสรรค์', doctor: 'พญ.วิไล ใจงาม', date: '16/01/2568', hba1c: 8.2, fbs: 185, result: 'DM ยืนยัน', resultColor: '#ef4444' },
  { id: 4, hn: 'HN-00104', name: 'นางมาลี ดอกไม้', doctor: 'พญ.วิไล ใจงาม', date: '16/01/2568', hba1c: 6.0, fbs: 110, result: 'เสี่ยงปานกลาง', resultColor: '#f59e0b' },
  { id: 5, hn: 'HN-00105', name: 'นายประเสริฐ มั่นคง', doctor: 'นพ.สมศักดิ์ รักษาดี', date: '17/01/2568', hba1c: 5.2, fbs: 88, result: 'ปกติ', resultColor: '#10b981' },
  { id: 6, hn: 'HN-00106', name: 'นางสาวพิมพ์ใจ งามตา', doctor: 'นพ.ชาญชัย วิทยา', date: '17/01/2568', hba1c: 7.5, fbs: 156, result: 'DM ยืนยัน', resultColor: '#ef4444' },
  { id: 7, hn: 'HN-00107', name: 'นายอนุชา พัฒนา', doctor: 'นพ.ชาญชัย วิทยา', date: '18/01/2568', hba1c: 5.8, fbs: 102, result: 'ปกติ', resultColor: '#10b981' },
  { id: 8, hn: 'HN-00108', name: 'นางจันทร์ สว่าง', doctor: 'พญ.วิไล ใจงาม', date: '18/01/2568', hba1c: 6.5, fbs: 128, result: 'เสี่ยงสูง', resultColor: '#f59e0b' },
  { id: 9, hn: 'HN-00109', name: 'นายธนกร ศรีสวัสดิ์', doctor: 'นพ.สมศักดิ์ รักษาดี', date: '19/01/2568', hba1c: 9.1, fbs: 210, result: 'DM ยืนยัน', resultColor: '#ef4444' },
  { id: 10, hn: 'HN-00110', name: 'นางสาวรัตนา แก้วประเสริฐ', doctor: 'นพ.ชาญชัย วิทยา', date: '19/01/2568', hba1c: 5.6, fbs: 98, result: 'ปกติ', resultColor: '#10b981' },
  { id: 11, hn: 'HN-00111', name: 'นายสุรชัย ดีงาม', doctor: 'พญ.วิไล ใจงาม', date: '20/01/2568', hba1c: 7.0, fbs: 140, result: 'เสี่ยงสูง', resultColor: '#f59e0b' },
  { id: 12, hn: 'HN-00112', name: 'นางลำพูน สุขสมบัติ', doctor: 'นพ.สมศักดิ์ รักษาดี', date: '20/01/2568', hba1c: 6.2, fbs: 115, result: 'เสี่ยงปานกลาง', resultColor: '#f59e0b' },
  { id: 13, hn: 'HN-00113', name: 'นายกิตติ วงษ์สกุล', doctor: 'นพ.ชาญชัย วิทยา', date: '21/01/2568', hba1c: 5.0, fbs: 82, result: 'ปกติ', resultColor: '#10b981' },
  { id: 14, hn: 'HN-00114', name: 'นางสาวอรทัย มีสุข', doctor: 'พญ.วิไล ใจงาม', date: '21/01/2568', hba1c: 8.8, fbs: 195, result: 'DM ยืนยัน', resultColor: '#ef4444' },
  { id: 15, hn: 'HN-00115', name: 'นายพงษ์ศักดิ์ รุ่งเรือง', doctor: 'นพ.สมศักดิ์ รักษาดี', date: '22/01/2568', hba1c: 6.4, fbs: 120, result: 'เสี่ยงปานกลาง', resultColor: '#f59e0b' },
  { id: 16, hn: 'HN-00116', name: 'นางวรรณี ชื่นชม', doctor: 'นพ.ชาญชัย วิทยา', date: '22/01/2568', hba1c: 5.3, fbs: 90, result: 'ปกติ', resultColor: '#10b981' },
  { id: 17, hn: 'HN-00117', name: 'นายเอกชัย ทองดี', doctor: 'พญ.วิไล ใจงาม', date: '23/01/2568', hba1c: 7.8, fbs: 168, result: 'DM ยืนยัน', resultColor: '#ef4444' },
  { id: 18, hn: 'HN-00118', name: 'นางสาวณัฐมล สมบูรณ์', doctor: 'นพ.สมศักดิ์ รักษาดี', date: '23/01/2568', hba1c: 6.1, fbs: 108, result: 'เสี่ยงปานกลาง', resultColor: '#f59e0b' },
  { id: 19, hn: 'HN-00119', name: 'นายธีระ แสงสว่าง', doctor: 'นพ.ชาญชัย วิทยา', date: '24/01/2568', hba1c: 5.7, fbs: 100, result: 'ปกติ', resultColor: '#10b981' },
  { id: 20, hn: 'HN-00120', name: 'นางปราณี ใจสะอาด', doctor: 'พญ.วิไล ใจงาม', date: '24/01/2568', hba1c: 10.2, fbs: 248, result: 'DM ยืนยัน', resultColor: '#ef4444' },
];

const PAGE_SIZE = 10;

interface PatientInfo {
  id: string;
  hn: string;
  first_name: string;
  last_name: string;
  title: string;
  primary_doctor: string;
  latestHba1c?: { result_value: string; test_date: string } | null;
  latestFbs?: { result_value: string; test_date: string } | null;
}

export const DmHbA1cFbsView: React.FC<DmHbA1cFbsViewProps> = ({ onBack }) => {
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  // Form states
  const [searchHn, setSearchHn] = useState('');
  const [searching, setSearching] = useState(false);
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [searchError, setSearchError] = useState('');

  const [hba1cDate, setHba1cDate] = useState(new Date().toISOString().split('T')[0]);
  const [hba1cValue, setHba1cValue] = useState('');
  const [fbsDate, setFbsDate] = useState(new Date().toISOString().split('T')[0]);
  const [fbsValue, setFbsValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  const totalPages = Math.ceil(MOCK_DATA.length / PAGE_SIZE);
  const pageData = MOCK_DATA.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const searchPatient = async () => {
    if (!searchHn.trim()) return;
    setSearching(true);
    setSearchError('');
    setPatient(null);
    setSaveSuccess('');
    setSaveError('');

    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, hn, first_name, last_name, title, primary_doctor')
        .eq('hn', searchHn.trim())
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setSearchError('ไม่พบผู้ป่วย HN: ' + searchHn.trim() + ' ในระบบ');
        return;
      }

      // Fetch latest HbA1c
      const { data: hba1cData } = await supabase
        .from('patient_lab_results')
        .select('result_value, test_date')
        .eq('patient_id', data.id)
        .eq('test_name', 'Hemoglobin A1C')
        .order('test_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch latest FBS
      const { data: fbsData } = await supabase
        .from('patient_lab_results')
        .select('result_value, test_date')
        .eq('patient_id', data.id)
        .eq('test_name', 'Fasting Blood Sugar')
        .order('test_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      setPatient({ ...data, latestHba1c: hba1cData, latestFbs: fbsData });
    } catch (err: any) {
      setSearchError('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async () => {
    if (!patient) return;
    if (!hba1cValue && !fbsValue) {
      setSaveError('กรุณากรอกผล HbA1c หรือ FBS อย่างน้อย 1 ค่า');
      return;
    }
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      const inserts: any[] = [];
      if (hba1cValue.trim()) {
        inserts.push({
          patient_id: patient.id,
          test_name: 'Hemoglobin A1C',
          test_date: hba1cDate,
          result_value: hba1cValue.trim(),
          unit: '%',
          reference_range: '< 7.0',
          status: 'completed',
          notes: 'บันทึกจากหน้าคัดกรองเบาหวาน',
        });
      }
      if (fbsValue.trim()) {
        inserts.push({
          patient_id: patient.id,
          test_name: 'Fasting Blood Sugar',
          test_date: fbsDate,
          result_value: fbsValue.trim(),
          unit: 'mg/dL',
          reference_range: '70-100',
          status: 'completed',
          notes: 'บันทึกจากหน้าคัดกรองเบาหวาน',
        });
      }

      if (inserts.length > 0) {
        const { error } = await supabase.from('patient_lab_results').insert(inserts);
        if (error) throw error;
      }

      setSaveSuccess(`บันทึกผลตรวจสำเร็จ ${inserts.length} รายการ (HN: ${patient.hn})`);
      setHba1cValue('');
      setFbsValue('');
      setHba1cDate(new Date().toISOString().split('T')[0]);
      setFbsDate(new Date().toISOString().split('T')[0]);
      // Re-fetch latest
      searchPatient();
    } catch (err: any) {
      setSaveError('บันทึกไม่สำเร็จ: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setSearchHn('');
    setPatient(null);
    setSearchError('');
    setSaveSuccess('');
    setSaveError('');
    setHba1cValue('');
    setFbsValue('');
  };

  if (showForm) {
    return (
      <div className="dashboard-card">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>🩸 บันทึกผล HbA1C และ FBS</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0 }}>กรอกผลการตรวจ Hemoglobin A1C และ Fasting Blood Sugar</p>
          </div>
          <button className="btn btn-secondary" onClick={resetForm} style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8125rem' }}>← กลับรายการ</button>
        </div>

        {/* Search */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <label style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>ค้นหาผู้ป่วยด้วย HN</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="form-input"
              style={{ flex: 1 }}
              placeholder="เช่น HN-00101"
              value={searchHn}
              onChange={e => setSearchHn(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchPatient()}
            />
            <button className="btn btn-primary" onClick={searchPatient} disabled={searching} style={{ width: 'auto', whiteSpace: 'nowrap' }}>
              {searching ? 'กำลังค้นหา...' : '🔍 ค้นหา'}
            </button>
          </div>
          {searchError && <p style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: '0.5rem' }}>{searchError}</p>}
        </div>

        {/* Patient Info */}
        {patient && (
          <>
            <div style={{ background: 'color-mix(in srgb, var(--primary) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.875rem' }}>
                <div><span style={{ color: 'var(--text-secondary)' }}>ชื่อ-นามสกุล:</span><br /><strong>{patient.title} {patient.first_name} {patient.last_name}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>HN:</span><br /><strong style={{ fontFamily: 'monospace' }}>{patient.hn}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>แพทย์เจ้าของไข้:</span><br /><strong>{patient.primary_doctor}</strong></div>
              </div>
            </div>

            {/* Lab Form */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
              {/* HbA1c */}
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: '#6366f1' }}>📊 Hemoglobin A1C (%)</h3>
                {patient.latestHba1c && (
                  <div style={{ background: 'color-mix(in srgb, #6366f1 8%, transparent)', border: '1px solid color-mix(in srgb, #6366f1 20%, transparent)', borderRadius: 8, padding: '0.625rem 0.875rem', marginBottom: '0.875rem', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>ผลล่าสุด ({patient.latestHba1c.test_date}):</span>
                    <span style={{ fontWeight: 700, marginLeft: 8, color: parseFloat(patient.latestHba1c.result_value) >= 7 ? '#ef4444' : '#10b981' }}>
                      {patient.latestHba1c.result_value}%
                    </span>
                  </div>
                )}
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">วันที่สั่งตรวจ</label>
                  <input type="date" className="form-input" value={hba1cDate} onChange={e => setHba1cDate(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">ผล HbA1c (%) <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>— เว้นว่างถ้าไม่มีผล</span></label>
                  <input type="number" step="0.1" min="0" max="20" className="form-input" placeholder="เช่น 7.5" value={hba1cValue} onChange={e => setHba1cValue(e.target.value)} />
                </div>
              </div>

              {/* FBS */}
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: '#f59e0b' }}>🩺 Fasting Blood Sugar (mg/dL)</h3>
                {patient.latestFbs && (
                  <div style={{ background: 'color-mix(in srgb, #f59e0b 8%, transparent)', border: '1px solid color-mix(in srgb, #f59e0b 20%, transparent)', borderRadius: 8, padding: '0.625rem 0.875rem', marginBottom: '0.875rem', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>ผลล่าสุด ({patient.latestFbs.test_date}):</span>
                    <span style={{ fontWeight: 700, marginLeft: 8, color: parseFloat(patient.latestFbs.result_value) > 100 ? '#ef4444' : '#10b981' }}>
                      {patient.latestFbs.result_value} mg/dL
                    </span>
                  </div>
                )}
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">วันที่สั่งตรวจ</label>
                  <input type="date" className="form-input" value={fbsDate} onChange={e => setFbsDate(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">ผล FBS (mg/dL) <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>— เว้นว่างถ้าไม่มีผล</span></label>
                  <input type="number" step="1" min="0" max="600" className="form-input" placeholder="เช่น 126" value={fbsValue} onChange={e => setFbsValue(e.target.value)} />
                </div>
              </div>
            </div>

            {saveSuccess && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{saveSuccess}</div>}
            {saveError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{saveError}</div>}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ width: 'auto' }}>
                {saving ? 'กำลังบันทึก...' : '💾 บันทึกผลตรวจ'}
              </button>
              <button className="btn btn-secondary" onClick={resetForm} style={{ width: 'auto' }}>ยกเลิก</button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── List View ──────────────────────────────────────────────
  return (
    <div className="dashboard-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>🩸 การตรวจ HbA1C และ FBS</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0 }}>รายการผลตรวจ Hemoglobin A1C และ Fasting Blood Sugar</p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            เพิ่มข้อมูลการตรวจ
          </button>
          <button className="btn btn-secondary" onClick={onBack} style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8125rem' }}>← กลับหน้าสรุป</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)' }}>
              {['#', 'HN', 'ชื่อ-นามสกุล', 'แพทย์', 'วันที่ตรวจ', 'HbA1c (%)', 'FBS (mg/dL)', 'ผลคัดกรอง'].map(h => (
                <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid var(--border-color)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map(row => (
              <tr key={row.id}
                style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s', cursor: 'default' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{row.id}</td>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600 }}>{row.hn}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{row.name}</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.775rem' }}>{row.doctor}</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{row.date}</td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: row.hba1c >= 7 ? '#ef4444' : row.hba1c >= 6.5 ? '#f59e0b' : '#10b981' }}>{row.hba1c}</td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: row.fbs > 125 ? '#ef4444' : row.fbs > 100 ? '#f59e0b' : '#10b981' }}>{row.fbs}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ display: 'inline-block', padding: '0.2rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, color: '#fff', background: row.resultColor }}>{row.result}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8125rem' }}>
        <span style={{ color: 'var(--text-secondary)' }}>แสดง {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, MOCK_DATA.length)} จาก {MOCK_DATA.length} รายการ</span>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <button className="btn btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>‹ ก่อนหน้า</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} className={`btn ${p === page ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPage(p)} style={{ width: 32, padding: '0.35rem 0', fontSize: '0.8rem', minWidth: 32 }}>{p}</button>
          ))}
          <button className="btn btn-secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>ถัดไป ›</button>
        </div>
      </div>
    </div>
  );
};
