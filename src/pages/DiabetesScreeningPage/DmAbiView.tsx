import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface DmAbiViewProps {
  onBack: () => void;
}

const getAbiResult = (val: number): { label: string; color: string } => {
  if (val >= 1.0) return { label: 'ปกติ', color: '#10b981' };
  if (val >= 0.9) return { label: 'Borderline', color: '#f59e0b' };
  return { label: 'PAD', color: '#ef4444' };
};

const MOCK_DATA = [
  { id: 1, hn: 'HN-00101', name: 'นายสมชาย ใจดี', doctor: 'นพ.สมศักดิ์ รักษาดี', date: '15/01/2568', abiLt: 1.05, abiRt: 1.02 },
  { id: 2, hn: 'HN-00102', name: 'นางสาวสมหญิง รักสุข', doctor: 'นพ.สมศักดิ์ รักษาดี', date: '15/01/2568', abiLt: 0.85, abiRt: 0.92 },
  { id: 3, hn: 'HN-00103', name: 'นายวิชัย สร้างสรรค์', doctor: 'พญ.วิไล ใจงาม', date: '16/01/2568', abiLt: 0.72, abiRt: 0.68 },
  { id: 4, hn: 'HN-00104', name: 'นางมาลี ดอกไม้', doctor: 'พญ.วิไล ใจงาม', date: '16/01/2568', abiLt: 1.10, abiRt: 1.08 },
  { id: 5, hn: 'HN-00105', name: 'นายประเสริฐ มั่นคง', doctor: 'นพ.สมศักดิ์ รักษาดี', date: '17/01/2568', abiLt: 0.95, abiRt: 0.98 },
  { id: 6, hn: 'HN-00106', name: 'นางสาวพิมพ์ใจ งามตา', doctor: 'นพ.ชาญชัย วิทยา', date: '17/01/2568', abiLt: 0.65, abiRt: 0.70 },
  { id: 7, hn: 'HN-00107', name: 'นายอนุชา พัฒนา', doctor: 'นพ.ชาญชัย วิทยา', date: '18/01/2568', abiLt: 1.15, abiRt: 1.12 },
  { id: 8, hn: 'HN-00108', name: 'นางจันทร์ สว่าง', doctor: 'พญ.วิไล ใจงาม', date: '18/01/2568', abiLt: 0.91, abiRt: 0.88 },
  { id: 9, hn: 'HN-00109', name: 'นายธนกร ศรีสวัสดิ์', doctor: 'นพ.สมศักดิ์ รักษาดี', date: '19/01/2568', abiLt: 0.55, abiRt: 0.60 },
  { id: 10, hn: 'HN-00110', name: 'นางสาวรัตนา แก้วประเสริฐ', doctor: 'นพ.ชาญชัย วิทยา', date: '19/01/2568', abiLt: 1.05, abiRt: 1.03 },
  { id: 11, hn: 'HN-00111', name: 'นายสุรชัย ดีงาม', doctor: 'พญ.วิไล ใจงาม', date: '20/01/2568', abiLt: 0.93, abiRt: 0.94 },
  { id: 12, hn: 'HN-00112', name: 'นางลำพูน สุขสมบัติ', doctor: 'นพ.สมศักดิ์ รักษาดี', date: '20/01/2568', abiLt: 1.02, abiRt: 1.01 },
  { id: 13, hn: 'HN-00113', name: 'นายกิตติ วงษ์สกุล', doctor: 'นพ.ชาญชัย วิทยา', date: '21/01/2568', abiLt: 0.78, abiRt: 0.80 },
  { id: 14, hn: 'HN-00114', name: 'นางสาวอรทัย มีสุข', doctor: 'พญ.วิไล ใจงาม', date: '21/01/2568', abiLt: 0.62, abiRt: 0.58 },
  { id: 15, hn: 'HN-00115', name: 'นายพงษ์ศักดิ์ รุ่งเรือง', doctor: 'นพ.สมศักดิ์ รักษาดี', date: '22/01/2568', abiLt: 1.08, abiRt: 1.10 },
  { id: 16, hn: 'HN-00116', name: 'นางวรรณี ชื่นชม', doctor: 'นพ.ชาญชัย วิทยา', date: '22/01/2568', abiLt: 0.96, abiRt: 0.97 },
  { id: 17, hn: 'HN-00117', name: 'นายเอกชัย ทองดี', doctor: 'พญ.วิไล ใจงาม', date: '23/01/2568', abiLt: 0.70, abiRt: 0.73 },
  { id: 18, hn: 'HN-00118', name: 'นางสาวณัฐมล สมบูรณ์', doctor: 'นพ.สมศักดิ์ รักษาดี', date: '23/01/2568', abiLt: 1.00, abiRt: 0.99 },
  { id: 19, hn: 'HN-00119', name: 'นายธีระ แสงสว่าง', doctor: 'นพ.ชาญชัย วิทยา', date: '24/01/2568', abiLt: 1.12, abiRt: 1.09 },
  { id: 20, hn: 'HN-00120', name: 'นางปราณี ใจสะอาด', doctor: 'พญ.วิไล ใจงาม', date: '24/01/2568', abiLt: 0.48, abiRt: 0.52 },
];

const PAGE_SIZE = 10;

interface PatientInfo {
  id: string;
  hn: string;
  first_name: string;
  last_name: string;
  title: string;
  primary_doctor: string;
}

export const DmAbiView: React.FC<DmAbiViewProps> = ({ onBack }) => {
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const [searchHn, setSearchHn] = useState('');
  const [searching, setSearching] = useState(false);
  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [searchError, setSearchError] = useState('');

  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [abiLt, setAbiLt] = useState('');
  const [abiRt, setAbiRt] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  const totalPages = Math.ceil(MOCK_DATA.length / PAGE_SIZE);
  const pageData = MOCK_DATA.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const ltParsed = parseFloat(abiLt);
  const rtParsed = parseFloat(abiRt);
  const ltInterp = !isNaN(ltParsed) ? getAbiResult(ltParsed) : null;
  const rtInterp = !isNaN(rtParsed) ? getAbiResult(rtParsed) : null;

  const overallResult = () => {
    if (!ltInterp && !rtInterp) return null;
    const vals = [ltParsed, rtParsed].filter(v => !isNaN(v));
    const min = Math.min(...vals);
    return getAbiResult(min);
  };

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
      if (!data) { setSearchError('ไม่พบผู้ป่วย HN: ' + searchHn.trim()); return; }
      setPatient(data);
    } catch (err: any) {
      setSearchError('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async () => {
    if (!patient) return;
    if (!abiLt && !abiRt) { setSaveError('กรุณากรอกค่า ABI อย่างน้อย 1 ข้าง'); return; }
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const overall = overallResult();
      const resultLabel = overall?.label || '-';
      const abiNote = `ABI Lt: ${abiLt || '-'} (${ltInterp?.label || '-'}) | ABI Rt: ${abiRt || '-'} (${rtInterp?.label || '-'})${notes ? ' | ' + notes : ''}`;

      await supabase.from('patient_lab_results').insert({
        patient_id: patient.id,
        test_name: 'ABI (Ankle-Brachial Index)',
        test_date: examDate,
        result_value: resultLabel,
        unit: '',
        reference_range: '≥ 1.0',
        notes: abiNote,
        status: 'completed',
      });

      setSaveSuccess(`บันทึกผล ABI สำเร็จ (HN: ${patient.hn}) — ผล: ${resultLabel}`);
      setAbiLt('');
      setAbiRt('');
      setNotes('');
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
    setAbiLt('');
    setAbiRt('');
    setNotes('');
  };

  if (showForm) {
    const overall = overallResult();
    return (
      <div className="dashboard-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>🫀 บันทึกผลการตรวจคัดกรอง ABI</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0 }}>การตรวจดัชนีวัดความดันโลหิตระหว่างข้อเท้าและแขน เพื่อตรวจคัดกรองและวินิจฉัยโรคหลอดเลือดแดงส่วนปลายตีบตัน</p>
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
            <div style={{ background: 'color-mix(in srgb, var(--primary) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.875rem' }}>
                <div><span style={{ color: 'var(--text-secondary)' }}>ชื่อ-นามสกุล:</span><br /><strong>{patient.title} {patient.first_name} {patient.last_name}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>HN:</span><br /><strong style={{ fontFamily: 'monospace' }}>{patient.hn}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>แพทย์เจ้าของไข้:</span><br /><strong>{patient.primary_doctor}</strong></div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem', maxWidth: 280 }}>
              <label className="form-label">วันที่ตรวจ</label>
              <input type="date" className="form-input" value={examDate} onChange={e => setExamDate(e.target.value)} />
            </div>

            {/* ABI inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
              {/* ABI Lt */}
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.875rem', color: '#6366f1' }}>🦵 ABI ข้อเท้าซ้าย (Left)</h3>
                <div className="form-group" style={{ marginBottom: '0.625rem' }}>
                  <label className="form-label">ค่า ABI (ทศนิยม)</label>
                  <input type="number" step="0.01" min="0" max="2" className="form-input" placeholder="เช่น 0.85"
                    value={abiLt} onChange={e => setAbiLt(e.target.value)} />
                </div>
                {ltInterp && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 8, background: `color-mix(in srgb, ${ltInterp.color} 12%, transparent)`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: ltInterp.color, flexShrink: 0 }}></span>
                    <span style={{ fontWeight: 600, color: ltInterp.color, fontSize: '0.875rem' }}>{ltInterp.label}</span>
                    {ltParsed < 0.9 && <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>(สงสัย PAD)</span>}
                    {ltParsed >= 0.9 && ltParsed < 1.0 && <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>(ต้องติดตาม)</span>}
                  </div>
                )}
              </div>

              {/* ABI Rt */}
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.875rem', color: '#f59e0b' }}>🦵 ABI ข้อเท้าขวา (Right)</h3>
                <div className="form-group" style={{ marginBottom: '0.625rem' }}>
                  <label className="form-label">ค่า ABI (ทศนิยม)</label>
                  <input type="number" step="0.01" min="0" max="2" className="form-input" placeholder="เช่น 0.92"
                    value={abiRt} onChange={e => setAbiRt(e.target.value)} />
                </div>
                {rtInterp && (
                  <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 8, background: `color-mix(in srgb, ${rtInterp.color} 12%, transparent)`, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: rtInterp.color, flexShrink: 0 }}></span>
                    <span style={{ fontWeight: 600, color: rtInterp.color, fontSize: '0.875rem' }}>{rtInterp.label}</span>
                    {rtParsed < 0.9 && <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>(สงสัย PAD)</span>}
                    {rtParsed >= 0.9 && rtParsed < 1.0 && <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>(ต้องติดตาม)</span>}
                  </div>
                )}
              </div>
            </div>

            {/* ABI reference */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>เกณฑ์แปลผล ABI: </strong>
              <span style={{ color: '#10b981', marginRight: 12 }}>≥ 1.0 = ปกติ</span>
              <span style={{ color: '#f59e0b', marginRight: 12 }}>0.9–0.99 = Borderline</span>
              <span style={{ color: '#ef4444' }}>&lt; 0.9 = สงสัย PAD</span>
            </div>

            {/* Overall result */}
            {overall && (
              <div style={{ background: `color-mix(in srgb, ${overall.color} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${overall.color} 30%, transparent)`, borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>{overall.label === 'ปกติ' ? '✅' : overall.label === 'Borderline' ? '⚠️' : '🚨'}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: overall.color }}>สรุปผล: {overall.label}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {overall.label === 'PAD' ? 'แนะนำส่งต่อแพทย์เฉพาะทางและทำการตรวจเพิ่มเติม' : overall.label === 'Borderline' ? 'ควรติดตามอาการและตรวจซ้ำในระยะ 3-6 เดือน' : 'ผลปกติ ควรตรวจคัดกรองซ้ำทุกปี'}
                  </div>
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">หมายเหตุเพิ่มเติม</label>
              <input type="text" className="form-input" placeholder="บันทึกข้อสังเกตอื่นๆ..."
                value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            {saveSuccess && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{saveSuccess}</div>}
            {saveError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{saveError}</div>}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ width: 'auto' }}>
                {saving ? 'กำลังบันทึก...' : '💾 บันทึกผล ABI'}
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
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>🫀 การตรวจคัดกรอง ABI</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0 }}>การตรวจดัชนีวัดความดันโลหิตระหว่างข้อเท้าและแขน เพื่อตรวจคัดกรองโรคหลอดเลือดแดงส่วนปลายตีบตัน (PAD)</p>
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
              {['#', 'HN', 'ชื่อ-นามสกุล', 'แพทย์', 'วันที่ตรวจ', 'ABI ซ้าย', 'แปลผลซ้าย', 'ABI ขวา', 'แปลผลขวา', 'สรุปผล'].map(h => (
                <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid var(--border-color)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map(row => {
              const lt = getAbiResult(row.abiLt);
              const rt = getAbiResult(row.abiRt);
              const overall = getAbiResult(Math.min(row.abiLt, row.abiRt));
              return (
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
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{row.abiLt.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, color: '#fff', background: lt.color }}>{lt.label}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{row.abiRt.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, color: '#fff', background: rt.color }}>{rt.label}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ display: 'inline-block', padding: '0.2rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, color: '#fff', background: overall.color }}>{overall.label}</span>
                  </td>
                </tr>
              );
            })}
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
