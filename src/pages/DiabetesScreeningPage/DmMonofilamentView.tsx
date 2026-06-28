import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface DmMonofilamentViewProps {
  onBack: () => void;
}

const MOCK_DATA = [
  { id: 1, hn: 'HN-00101', name: 'นายสมชาย ใจดี', doctor: 'นพ.สมศักดิ์ รักษาดี', date: '15/01/2568', diseases: 'DM, HT', ltResult: 'ปกติ', rtResult: 'ปกติ', summary: 'ปกติ', summaryColor: '#10b981' },
  { id: 2, hn: 'HN-00102', name: 'นางสาวสมหญิง รักสุข', doctor: 'นพ.สมศักดิ์ รักษาดี', date: '15/01/2568', diseases: 'DM', ltResult: 'ผิดปกติ 2 ตำแหน่ง', rtResult: 'ปกติ', summary: 'ผิดปกติ', summaryColor: '#ef4444' },
  { id: 3, hn: 'HN-00103', name: 'นายวิชัย สร้างสรรค์', doctor: 'พญ.วิไล ใจงาม', date: '16/01/2568', diseases: 'DM, DLP', ltResult: 'ปกติ', rtResult: 'ผิดปกติ 3 ตำแหน่ง', summary: 'ผิดปกติ', summaryColor: '#ef4444' },
  { id: 4, hn: 'HN-00104', name: 'นางมาลี ดอกไม้', doctor: 'พญ.วิไล ใจงาม', date: '16/01/2568', diseases: 'DM, HT, DLP', ltResult: 'ปกติ', rtResult: 'ปกติ', summary: 'ปกติ', summaryColor: '#10b981' },
  { id: 5, hn: 'HN-00105', name: 'นายประเสริฐ มั่นคง', doctor: 'นพ.สมศักดิ์ รักษาดี', date: '17/01/2568', diseases: 'DM', ltResult: 'ปกติ', rtResult: 'ปกติ', summary: 'ปกติ', summaryColor: '#10b981' },
  { id: 6, hn: 'HN-00106', name: 'นางสาวพิมพ์ใจ งามตา', doctor: 'นพ.ชาญชัย วิทยา', date: '17/01/2568', diseases: 'DM, CKD', ltResult: 'ผิดปกติ 4 ตำแหน่ง', rtResult: 'ผิดปกติ 4 ตำแหน่ง', summary: 'ผิดปกติ', summaryColor: '#ef4444' },
  { id: 7, hn: 'HN-00107', name: 'นายอนุชา พัฒนา', doctor: 'นพ.ชาญชัย วิทยา', date: '18/01/2568', diseases: 'DM', ltResult: 'ปกติ', rtResult: 'ปกติ', summary: 'ปกติ', summaryColor: '#10b981' },
  { id: 8, hn: 'HN-00108', name: 'นางจันทร์ สว่าง', doctor: 'พญ.วิไล ใจงาม', date: '18/01/2568', diseases: 'DM, HT', ltResult: 'ปกติ', rtResult: 'ผิดปกติ 1 ตำแหน่ง', summary: 'ผิดปกติ', summaryColor: '#ef4444' },
  { id: 9, hn: 'HN-00109', name: 'นายธนกร ศรีสวัสดิ์', doctor: 'นพ.สมศักดิ์ รักษาดี', date: '19/01/2568', diseases: 'DM, DLP, HT', ltResult: 'ปกติ', rtResult: 'ปกติ', summary: 'ปกติ', summaryColor: '#10b981' },
  { id: 10, hn: 'HN-00110', name: 'นางสาวรัตนา แก้วประเสริฐ', doctor: 'นพ.ชาญชัย วิทยา', date: '19/01/2568', diseases: 'DM', ltResult: 'ปกติ', rtResult: 'ปกติ', summary: 'ปกติ', summaryColor: '#10b981' },
  { id: 11, hn: 'HN-00111', name: 'นายสุรชัย ดีงาม', doctor: 'พญ.วิไล ใจงาม', date: '20/01/2568', diseases: 'DM, HT', ltResult: 'ผิดปกติ 2 ตำแหน่ง', rtResult: 'ปกติ', summary: 'ผิดปกติ', summaryColor: '#ef4444' },
  { id: 12, hn: 'HN-00112', name: 'นางลำพูน สุขสมบัติ', doctor: 'นพ.สมศักดิ์ รักษาดี', date: '20/01/2568', diseases: 'DM, CKD', ltResult: 'ปกติ', rtResult: 'ปกติ', summary: 'ปกติ', summaryColor: '#10b981' },
  { id: 13, hn: 'HN-00113', name: 'นายกิตติ วงษ์สกุล', doctor: 'นพ.ชาญชัย วิทยา', date: '21/01/2568', diseases: 'DM', ltResult: 'ปกติ', rtResult: 'ปกติ', summary: 'ปกติ', summaryColor: '#10b981' },
  { id: 14, hn: 'HN-00114', name: 'นางสาวอรทัย มีสุข', doctor: 'พญ.วิไล ใจงาม', date: '21/01/2568', diseases: 'DM, DLP', ltResult: 'ผิดปกติ 3 ตำแหน่ง', rtResult: 'ผิดปกติ 2 ตำแหน่ง', summary: 'ผิดปกติ', summaryColor: '#ef4444' },
  { id: 15, hn: 'HN-00115', name: 'นายพงษ์ศักดิ์ รุ่งเรือง', doctor: 'นพ.สมศักดิ์ รักษาดี', date: '22/01/2568', diseases: 'DM', ltResult: 'ปกติ', rtResult: 'ปกติ', summary: 'ปกติ', summaryColor: '#10b981' },
  { id: 16, hn: 'HN-00116', name: 'นางวรรณี ชื่นชม', doctor: 'นพ.ชาญชัย วิทยา', date: '22/01/2568', diseases: 'DM, HT', ltResult: 'ปกติ', rtResult: 'ปกติ', summary: 'ปกติ', summaryColor: '#10b981' },
  { id: 17, hn: 'HN-00117', name: 'นายเอกชัย ทองดี', doctor: 'พญ.วิไล ใจงาม', date: '23/01/2568', diseases: 'DM, DLP, HT', ltResult: 'ผิดปกติ 5 ตำแหน่ง', rtResult: 'ผิดปกติ 4 ตำแหน่ง', summary: 'ผิดปกติ', summaryColor: '#ef4444' },
  { id: 18, hn: 'HN-00118', name: 'นางสาวณัฐมล สมบูรณ์', doctor: 'นพ.สมศักดิ์ รักษาดี', date: '23/01/2568', diseases: 'DM', ltResult: 'ปกติ', rtResult: 'ปกติ', summary: 'ปกติ', summaryColor: '#10b981' },
  { id: 19, hn: 'HN-00119', name: 'นายธีระ แสงสว่าง', doctor: 'นพ.ชาญชัย วิทยา', date: '24/01/2568', diseases: 'DM, CKD', ltResult: 'ปกติ', rtResult: 'ปกติ', summary: 'ปกติ', summaryColor: '#10b981' },
  { id: 20, hn: 'HN-00120', name: 'นางปราณี ใจสะอาด', doctor: 'พญ.วิไล ใจงาม', date: '24/01/2568', diseases: 'DM, HT, DLP', ltResult: 'ผิดปกติ 6 ตำแหน่ง', rtResult: 'ผิดปกติ 5 ตำแหน่ง', summary: 'ผิดปกติ', summaryColor: '#ef4444' },
];

const PAGE_SIZE = 10;

interface FootResult {
  status: 'normal' | 'abnormal';
  positions: string;
  detail: string;
}

interface PatientInfo {
  id: string;
  hn: string;
  first_name: string;
  last_name: string;
  title: string;
  primary_doctor: string;
  diseases: string;
  diseaseList: Array<{ id: string; disease_name: string; status: string }>;
}

export const DmMonofilamentView: React.FC<DmMonofilamentViewProps> = ({ onBack }) => {
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const [searchHn, setSearchHn] = useState('');
  const [searching, setSearching] = useState(false);
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [searchError, setSearchError] = useState('');

  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [editedDiseases, setEditedDiseases] = useState('');
  const [ltResult, setLtResult] = useState<FootResult>({ status: 'normal', positions: '', detail: '' });
  const [rtResult, setRtResult] = useState<FootResult>({ status: 'normal', positions: '', detail: '' });
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
        .select('id, hn, first_name, last_name, title, primary_doctor, chronic_disease_note')
        .eq('hn', searchHn.trim())
        .maybeSingle();

      if (error) throw error;
      if (!data) { setSearchError('ไม่พบผู้ป่วย HN: ' + searchHn.trim()); return; }

      const { data: diseaseData } = await supabase
        .from('patient_diseases')
        .select('id, disease_name, status')
        .eq('patient_id', data.id)
        .eq('status', 'active');

      const diseaseList = diseaseData || [];
      const diseaseStr = diseaseList.map((d: any) => d.disease_name).join(', ') || data.chronic_disease_note || '';

      setPatient({ ...data, diseases: diseaseStr, diseaseList });
      setEditedDiseases(diseaseStr);
    } catch (err: any) {
      setSearchError('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async () => {
    if (!patient) return;
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      // Update chronic_disease_note
      if (editedDiseases !== patient.diseases) {
        await supabase.from('patients').update({ chronic_disease_note: editedDiseases }).eq('id', patient.id);

        // Sync patient_diseases table
        const newDiseases = editedDiseases.split(',').map(d => d.trim()).filter(d => d);
        if (newDiseases.length > 0) {
          const existingNames = patient.diseaseList.map((d: any) => d.disease_name);
          const toInsert = newDiseases.filter(d => !existingNames.includes(d));
          if (toInsert.length > 0) {
            await supabase.from('patient_diseases').insert(
              toInsert.map(name => ({ patient_id: patient.id, disease_name: name, status: 'active' }))
            );
          }
        }
      }

      // Build result note
      const ltNote = ltResult.status === 'normal' ? 'ปกติ' : `ผิดปกติ ${ltResult.positions} ตำแหน่ง${ltResult.detail ? ': ' + ltResult.detail : ''}`;
      const rtNote = rtResult.status === 'normal' ? 'ปกติ' : `ผิดปกติ ${rtResult.positions} ตำแหน่ง${rtResult.detail ? ': ' + rtResult.detail : ''}`;
      const isAbnormal = ltResult.status === 'abnormal' || rtResult.status === 'abnormal';
      const resultValue = isAbnormal ? 'ผิดปกติ' : 'ปกติ';

      await supabase.from('patient_lab_results').insert({
        patient_id: patient.id,
        test_name: 'Monofilament Foot Screening',
        test_date: examDate,
        result_value: resultValue,
        unit: '',
        reference_range: 'ปกติ',
        notes: `Lt: ${ltNote} | Rt: ${rtNote}`,
        status: 'completed',
      });

      setSaveSuccess(`บันทึกผลการตรวจเท้าสำเร็จ (HN: ${patient.hn})`);
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
    setLtResult({ status: 'normal', positions: '', detail: '' });
    setRtResult({ status: 'normal', positions: '', detail: '' });
  };

  const FootResultInput = ({ side, value, onChange }: { side: 'Lt' | 'Rt'; value: FootResult; onChange: (v: FootResult) => void }) => (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '1.25rem' }}>
      <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: side === 'Lt' ? '#6366f1' : '#f59e0b' }}>
        🦶 เท้า {side === 'Lt' ? 'ซ้าย (Left)' : 'ขวา (Right)'}
      </h3>
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
        {(['normal', 'abnormal'] as const).map(s => (
          <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: value.status === s ? 700 : 400 }}>
            <input type="radio" name={`foot-${side}`} value={s} checked={value.status === s}
              onChange={() => onChange({ ...value, status: s })}
              style={{ accentColor: s === 'normal' ? '#10b981' : '#ef4444' }} />
            <span style={{ color: s === 'normal' ? '#10b981' : '#ef4444' }}>
              {s === 'normal' ? '✅ ปกติ' : '❌ ผิดปกติ'}
            </span>
          </label>
        ))}
      </div>
      {value.status === 'abnormal' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', marginTop: '0.5rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">จำนวนตำแหน่ง</label>
            <input type="number" min="1" max="10" className="form-input" placeholder="เช่น 3"
              value={value.positions} onChange={e => onChange({ ...value, positions: e.target.value })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">ระบุตำแหน่ง (ถ้ามี)</label>
            <input type="text" className="form-input" placeholder="เช่น นิ้วที่ 1, 2, 3..."
              value={value.detail} onChange={e => onChange({ ...value, detail: e.target.value })} />
          </div>
        </div>
      )}
    </div>
  );

  if (showForm) {
    return (
      <div className="dashboard-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>🦶 บันทึกผลการตรวจคัดกรองเท้าด้วย Monofilament</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0 }}>ตรวจความรู้สึกที่เท้าเพื่อคัดกรองภาวะแทรกซ้อนทางเท้าในผู้ป่วยเบาหวาน</p>
          </div>
          <button className="btn btn-secondary" onClick={resetForm} style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8125rem' }}>← กลับรายการ</button>
        </div>

        {/* Search */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <label style={{ fontWeight: 600, fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>ค้นหาผู้ป่วยด้วย HN</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input className="form-input" style={{ flex: 1 }} placeholder="เช่น HN-00101"
              value={searchHn} onChange={e => setSearchHn(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchPatient()} />
            <button className="btn btn-primary" onClick={searchPatient} disabled={searching} style={{ width: 'auto', whiteSpace: 'nowrap' }}>
              {searching ? 'กำลังค้นหา...' : '🔍 ค้นหา'}
            </button>
          </div>
          {searchError && <p style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: '0.5rem' }}>{searchError}</p>}
        </div>

        {patient && (
          <>
            {/* Patient info */}
            <div style={{ background: 'color-mix(in srgb, var(--primary) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.875rem' }}>
                <div><span style={{ color: 'var(--text-secondary)' }}>ชื่อ-นามสกุล:</span><br /><strong>{patient.title} {patient.first_name} {patient.last_name}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>HN:</span><br /><strong style={{ fontFamily: 'monospace' }}>{patient.hn}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>แพทย์เจ้าของไข้:</span><br /><strong>{patient.primary_doctor}</strong></div>
              </div>
            </div>

            {/* Exam date */}
            <div className="form-group" style={{ marginBottom: '1.25rem', maxWidth: 280 }}>
              <label className="form-label">วันที่ตรวจ</label>
              <input type="date" className="form-input" value={examDate} onChange={e => setExamDate(e.target.value)} />
            </div>

            {/* Diseases (editable) */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">
                โรคประจำตัว
                <span style={{ color: 'var(--text-secondary)', fontWeight: 400, marginLeft: 8, fontSize: '0.8rem' }}>— แก้ไขได้ (คั่นด้วยจุลภาค เช่น DM, HT, DLP)</span>
              </label>
              <input type="text" className="form-input" value={editedDiseases}
                onChange={e => setEditedDiseases(e.target.value)} placeholder="DM, HT, DLP..." />
            </div>

            {/* Foot results */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <FootResultInput side="Lt" value={ltResult} onChange={setLtResult} />
              <FootResultInput side="Rt" value={rtResult} onChange={setRtResult} />
            </div>

            {/* Result summary preview */}
            {(ltResult.status === 'abnormal' || rtResult.status === 'abnormal') && (
              <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                <strong>⚠️ พบความผิดปกติ:</strong>
                {ltResult.status === 'abnormal' && <div>เท้าซ้าย: ผิดปกติ {ltResult.positions} ตำแหน่ง {ltResult.detail && `(${ltResult.detail})`}</div>}
                {rtResult.status === 'abnormal' && <div>เท้าขวา: ผิดปกติ {rtResult.positions} ตำแหน่ง {rtResult.detail && `(${rtResult.detail})`}</div>}
              </div>
            )}

            {saveSuccess && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{saveSuccess}</div>}
            {saveError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{saveError}</div>}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ width: 'auto' }}>
                {saving ? 'กำลังบันทึก...' : '💾 บันทึกผลการตรวจ'}
              </button>
              <button className="btn btn-secondary" onClick={resetForm} style={{ width: 'auto' }}>ยกเลิก</button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="dashboard-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>🦶 การตรวจคัดกรองเท้าด้วย Monofilament</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0 }}>รายการผลการตรวจความรู้สึกที่เท้าในผู้ป่วยเบาหวาน</p>
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
              {['#', 'HN', 'ชื่อ-นามสกุล', 'แพทย์', 'วันที่ตรวจ', 'โรคประจำตัว', 'เท้าซ้าย (Lt)', 'เท้าขวา (Rt)', 'สรุปผล'].map(h => (
                <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid var(--border-color)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map(row => (
              <tr key={row.id}
                style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{row.id}</td>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600 }}>{row.hn}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{row.name}</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.775rem' }}>{row.doctor}</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{row.date}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                    {row.diseases.split(',').map(d => (
                      <span key={d} style={{ background: 'var(--primary)', color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{d.trim()}</span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '0.75rem 1rem', color: row.ltResult.includes('ผิดปกติ') ? '#ef4444' : '#10b981', fontWeight: 600 }}>{row.ltResult}</td>
                <td style={{ padding: '0.75rem 1rem', color: row.rtResult.includes('ผิดปกติ') ? '#ef4444' : '#10b981', fontWeight: 600 }}>{row.rtResult}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ display: 'inline-block', padding: '0.2rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, color: '#fff', background: row.summaryColor }}>{row.summary}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
