import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Patient, Doctor } from '../../types/opd';
import { MOCK_DOCTORS } from '../../types/opd';
import { BuddhistDateInput } from '../../components/BuddhistDateInput';

interface DmMonofilamentViewProps {
  onBack: () => void;
}

const MOCK_DATA = [
  { id: 1,  hn: 'HN-00101', name: 'นายสมชาย ใจดี',           doctor: 'นพ.สมศักดิ์ รักษาดี', date: '15/01/2568', diseases: 'DM, HT',      ltResult: 'ปกติ',              rtResult: 'ปกติ',              summary: 'ปกติ',    summaryColor: '#10b981' },
  { id: 2,  hn: 'HN-00102', name: 'นางสาวสมหญิง รักสุข',     doctor: 'นพ.สมศักดิ์ รักษาดี', date: '15/01/2568', diseases: 'DM',           ltResult: 'ผิดปกติ 2 ตำแหน่ง', rtResult: 'ปกติ',              summary: 'ผิดปกติ', summaryColor: '#ef4444' },
  { id: 3,  hn: 'HN-00103', name: 'นายวิชัย สร้างสรรค์',     doctor: 'พญ.วิไล ใจงาม',        date: '16/01/2568', diseases: 'DM, DLP',      ltResult: 'ปกติ',              rtResult: 'ผิดปกติ 3 ตำแหน่ง', summary: 'ผิดปกติ', summaryColor: '#ef4444' },
  { id: 4,  hn: 'HN-00104', name: 'นางมาลี ดอกไม้',          doctor: 'พญ.วิไล ใจงาม',        date: '16/01/2568', diseases: 'DM, HT, DLP',  ltResult: 'ปกติ',              rtResult: 'ปกติ',              summary: 'ปกติ',    summaryColor: '#10b981' },
  { id: 5,  hn: 'HN-00105', name: 'นายประเสริฐ มั่นคง',      doctor: 'นพ.สมศักดิ์ รักษาดี', date: '17/01/2568', diseases: 'DM',           ltResult: 'ปกติ',              rtResult: 'ปกติ',              summary: 'ปกติ',    summaryColor: '#10b981' },
  { id: 6,  hn: 'HN-00106', name: 'นางสาวพิมพ์ใจ งามตา',    doctor: 'นพ.ชาญชัย วิทยา',     date: '17/01/2568', diseases: 'DM, CKD',      ltResult: 'ผิดปกติ 4 ตำแหน่ง', rtResult: 'ผิดปกติ 4 ตำแหน่ง', summary: 'ผิดปกติ', summaryColor: '#ef4444' },
  { id: 7,  hn: 'HN-00107', name: 'นายอนุชา พัฒนา',          doctor: 'นพ.ชาญชัย วิทยา',     date: '18/01/2568', diseases: 'DM',           ltResult: 'ปกติ',              rtResult: 'ปกติ',              summary: 'ปกติ',    summaryColor: '#10b981' },
  { id: 8,  hn: 'HN-00108', name: 'นางจันทร์ สว่าง',         doctor: 'พญ.วิไล ใจงาม',        date: '18/01/2568', diseases: 'DM, HT',       ltResult: 'ปกติ',              rtResult: 'ผิดปกติ 1 ตำแหน่ง', summary: 'ผิดปกติ', summaryColor: '#ef4444' },
  { id: 9,  hn: 'HN-00109', name: 'นายธนกร ศรีสวัสดิ์',      doctor: 'นพ.สมศักดิ์ รักษาดี', date: '19/01/2568', diseases: 'DM, DLP, HT',  ltResult: 'ปกติ',              rtResult: 'ปกติ',              summary: 'ปกติ',    summaryColor: '#10b981' },
  { id: 10, hn: 'HN-00110', name: 'นางสาวรัตนา แก้วประเสริฐ', doctor: 'นพ.ชาญชัย วิทยา',  date: '19/01/2568', diseases: 'DM',           ltResult: 'ปกติ',              rtResult: 'ปกติ',              summary: 'ปกติ',    summaryColor: '#10b981' },
  { id: 11, hn: 'HN-00111', name: 'นายสุรชัย ดีงาม',          doctor: 'พญ.วิไล ใจงาม',        date: '20/01/2568', diseases: 'DM, HT',       ltResult: 'ผิดปกติ 2 ตำแหน่ง', rtResult: 'ปกติ',              summary: 'ผิดปกติ', summaryColor: '#ef4444' },
  { id: 12, hn: 'HN-00112', name: 'นางลำพูน สุขสมบัติ',      doctor: 'นพ.สมศักดิ์ รักษาดี', date: '20/01/2568', diseases: 'DM, CKD',      ltResult: 'ปกติ',              rtResult: 'ปกติ',              summary: 'ปกติ',    summaryColor: '#10b981' },
  { id: 13, hn: 'HN-00113', name: 'นายกิตติ วงษ์สกุล',       doctor: 'นพ.ชาญชัย วิทยา',     date: '21/01/2568', diseases: 'DM',           ltResult: 'ปกติ',              rtResult: 'ปกติ',              summary: 'ปกติ',    summaryColor: '#10b981' },
  { id: 14, hn: 'HN-00114', name: 'นางสาวอรทัย มีสุข',        doctor: 'พญ.วิไล ใจงาม',        date: '21/01/2568', diseases: 'DM, DLP',      ltResult: 'ผิดปกติ 3 ตำแหน่ง', rtResult: 'ผิดปกติ 2 ตำแหน่ง', summary: 'ผิดปกติ', summaryColor: '#ef4444' },
  { id: 15, hn: 'HN-00115', name: 'นายพงษ์ศักดิ์ รุ่งเรือง',  doctor: 'นพ.สมศักดิ์ รักษาดี', date: '22/01/2568', diseases: 'DM',           ltResult: 'ปกติ',              rtResult: 'ปกติ',              summary: 'ปกติ',    summaryColor: '#10b981' },
  { id: 16, hn: 'HN-00116', name: 'นางวรรณี ชื่นชม',          doctor: 'นพ.ชาญชัย วิทยา',     date: '22/01/2568', diseases: 'DM, HT',       ltResult: 'ปกติ',              rtResult: 'ปกติ',              summary: 'ปกติ',    summaryColor: '#10b981' },
  { id: 17, hn: 'HN-00117', name: 'นายเอกชัย ทองดี',          doctor: 'พญ.วิไล ใจงาม',        date: '23/01/2568', diseases: 'DM, DLP, HT',  ltResult: 'ผิดปกติ 5 ตำแหน่ง', rtResult: 'ผิดปกติ 4 ตำแหน่ง', summary: 'ผิดปกติ', summaryColor: '#ef4444' },
  { id: 18, hn: 'HN-00118', name: 'นางสาวณัฐมล สมบูรณ์',     doctor: 'นพ.สมศักดิ์ รักษาดี', date: '23/01/2568', diseases: 'DM',           ltResult: 'ปกติ',              rtResult: 'ปกติ',              summary: 'ปกติ',    summaryColor: '#10b981' },
  { id: 19, hn: 'HN-00119', name: 'นายธีระ แสงสว่าง',         doctor: 'นพ.ชาญชัย วิทยา',     date: '24/01/2568', diseases: 'DM, CKD',      ltResult: 'ปกติ',              rtResult: 'ปกติ',              summary: 'ปกติ',    summaryColor: '#10b981' },
  { id: 20, hn: 'HN-00120', name: 'นางปราณี ใจสะอาด',         doctor: 'พญ.วิไล ใจงาม',        date: '24/01/2568', diseases: 'DM, HT, DLP',  ltResult: 'ผิดปกติ 6 ตำแหน่ง', rtResult: 'ผิดปกติ 5 ตำแหน่ง', summary: 'ผิดปกติ', summaryColor: '#ef4444' },
];

const PAGE_SIZE = 10;
const TODAY = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

interface FootResult { status: 'normal' | 'abnormal'; positions: string; detail: string; }

interface PatientFormState {
  hn: string; title: string; first_name: string; last_name: string;
  gender: string; phone_number: string; address: string;
  emergency_contact_name: string; emergency_contact_phone: string;
  medical_right: string; primary_doctor: string;
  citizen_id: string; passport_number: string; date_of_birth: string;
  allergy_note: string; chronic_disease_note: string;
  status: 'active' | 'inactive';
}
const initialPatientForm: PatientFormState = {
  hn: '', title: 'นาย', first_name: '', last_name: '',
  gender: 'ชาย', phone_number: '', address: '',
  emergency_contact_name: '', emergency_contact_phone: '',
  medical_right: 'บัตรทอง (หลักประกันสุขภาพถ้วนหน้า)',
  primary_doctor: 'กรุณาเลือกแพทย์เจ้าของไข้ใหม่',
  citizen_id: '', passport_number: '', date_of_birth: '',
  allergy_note: '', chronic_disease_note: '', status: 'active',
};

const parseTitleAndName = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return { title: 'นาย', first_name: '', last_name: '' };
  const dotMatch = trimmed.match(/^([ก-ฮa-zA-Z\.]+\.)\s*(.*)$/);
  if (dotMatch) {
    const parts = dotMatch[2].trim().split(/\s+/);
    return { title: dotMatch[1], first_name: parts[0] || '', last_name: parts.slice(1).join(' ') };
  }
  const standardTitles = ['นางสาว', 'นาง', 'นาย', 'เด็กหญิง', 'เด็กชาย', 'พระภิกษุ', 'พระ', 'คุณ'];
  let title = 'นาย'; let rest = trimmed;
  for (const t of standardTitles) { if (rest.startsWith(t)) { title = t; rest = rest.slice(t.length).trim(); break; } }
  const parts = rest.split(/\s+/);
  return { title, first_name: parts[0] || '', last_name: parts.slice(1).join(' ') };
};
const genderFromTitle = (title: string) => {
  if (['นาย', 'เด็กชาย'].some(t => title.includes(t))) return 'ชาย';
  if (['นาง', 'นางสาว', 'เด็กหญิง'].some(t => title.includes(t))) return 'หญิง';
  return 'อื่นๆ';
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
            onChange={() => onChange({ ...value, status: s })} style={{ accentColor: s === 'normal' ? '#10b981' : '#ef4444' }} />
          <span style={{ color: s === 'normal' ? '#10b981' : '#ef4444' }}>{s === 'normal' ? '✅ ปกติ' : '❌ ผิดปกติ'}</span>
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

export const DmMonofilamentView: React.FC<DmMonofilamentViewProps> = ({ onBack }) => {
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  // Patient search
  const [hnQuery, setHnQuery] = useState('');
  const [searchingHn, setSearchingHn] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [patientNotFound, setPatientNotFound] = useState(false);
  const [miniPatientForm, setMiniPatientForm] = useState<PatientFormState>(initialPatientForm);
  const [fullNameInput, setFullNameInput] = useState('');
  const [showExtraFields, setShowExtraFields] = useState(false);
  const [lastAppointmentDate, setLastAppointmentDate] = useState(TODAY);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Doctor autocomplete
  const [doctorQuery, setDoctorQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [activeDoctorIndex, setActiveDoctorIndex] = useState(-1);
  const [doctorsList, setDoctorsList] = useState<Doctor[]>([...MOCK_DOCTORS]);

  // Exam form
  const [examDate, setExamDate] = useState(TODAY);
  const [editedDiseases, setEditedDiseases] = useState('');
  const [ltResult, setLtResult] = useState<FootResult>({ status: 'normal', positions: '', detail: '' });
  const [rtResult, setRtResult] = useState<FootResult>({ status: 'normal', positions: '', detail: '' });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  const totalPages = Math.ceil(MOCK_DATA.length / PAGE_SIZE);
  const pageData = MOCK_DATA.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    supabase.from('doctors').select('*').eq('status', 'active').order('id').then(({ data }) => {
      if (data && data.length > 0) setDoctorsList(data);
    });
  }, []);

  useEffect(() => {
    if (!selectedPatient) { setEditedDiseases(''); return; }
    const fetchPatient = async () => {
      supabase.from('appointments').select('appointment_date').eq('patient_id', selectedPatient.id)
        .order('appointment_date', { ascending: false }).limit(1).then(({ data }) => {
          setLastAppointmentDate(data?.[0]?.appointment_date || TODAY);
        });
      const { data: diseaseData } = await supabase.from('patient_diseases').select('disease_name')
        .eq('patient_id', selectedPatient.id).eq('status', 'active');
      const diseaseStr = diseaseData?.map((d: any) => d.disease_name).join(', ') || selectedPatient.chronic_disease_note || '';
      setEditedDiseases(diseaseStr);
    };
    fetchPatient();
  }, [selectedPatient]);

  const filteredDoctors = doctorsList.filter(d => {
    if (!doctorQuery.trim()) return true;
    const q = doctorQuery.toLowerCase();
    return String(d.id).includes(q) || d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q);
  });
  const handleSelectDoctor = (doc: Doctor) => {
    setSelectedDoctor(doc); setMiniPatientForm(p => ({ ...p, primary_doctor: doc.name }));
    setDoctorQuery(''); setShowDoctorDropdown(false); setActiveDoctorIndex(-1);
  };
  const handleClearDoctor = () => {
    setSelectedDoctor(null); setMiniPatientForm(p => ({ ...p, primary_doctor: '' })); setDoctorQuery('');
  };
  const handleDoctorKeyDown = (e: React.KeyboardEvent) => {
    if (!showDoctorDropdown) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveDoctorIndex(p => Math.min(p + 1, filteredDoctors.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveDoctorIndex(p => Math.max(p - 1, 0)); }
    else if (e.key === 'Enter' && activeDoctorIndex >= 0) { e.preventDefault(); handleSelectDoctor(filteredDoctors[activeDoctorIndex]); }
    else if (e.key === 'Escape') setShowDoctorDropdown(false);
  };

  const handleSearchHn = async (query: string) => {
    setHnQuery(query); setPatientNotFound(false); setSelectedPatient(null);
    if (!query.trim()) { setSearchResults([]); setShowSearchResults(false); return; }
    try {
      setSearchingHn(true);
      const q = `%${query.trim()}%`;
      const { data } = await supabase.from('patients').select('*')
        .or(`hn.ilike.${q},first_name.ilike.${q},last_name.ilike.${q}`).eq('status', 'active').limit(8);
      setSearchResults(data || []); setShowSearchResults(true);
      if ((!data || data.length === 0) && query.trim().length >= 2) {
        setPatientNotFound(true);
        setMiniPatientForm({ ...initialPatientForm, hn: query.trim() });
        setLastAppointmentDate(TODAY);
      }
    } catch { } finally { setSearchingHn(false); }
  };
  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient); setHnQuery(patient.hn);
    setSearchResults([]); setShowSearchResults(false); setPatientNotFound(false);
  };
  const handleFullNameChange = (value: string) => {
    setFullNameInput(value);
    const parsed = parseTitleAndName(value);
    setMiniPatientForm(prev => ({ ...prev, ...parsed, gender: genderFromTitle(parsed.title) }));
  };

  const handleSave = async () => {
    const errors: Record<string, string> = {};
    if (!selectedPatient && !patientNotFound) errors.patient = 'กรุณาค้นหาและเลือกคนไข้';
    if (patientNotFound && !selectedPatient) {
      if (!miniPatientForm.hn.trim()) errors.hn = 'กรุณาระบุ HN';
      if (!miniPatientForm.first_name.trim()) errors.first_name = 'กรุณาระบุชื่อ';
    }
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true); setSaveError(''); setSaveSuccess('');
    try {
      let patientId = selectedPatient?.id;

      if (patientNotFound && !selectedPatient) {
        const { data: newPat, error: patErr } = await supabase.from('patients').insert({
          hn: miniPatientForm.hn.trim(), title: miniPatientForm.title,
          first_name: miniPatientForm.first_name.trim(), last_name: miniPatientForm.last_name.trim(),
          gender: miniPatientForm.gender, phone_number: miniPatientForm.phone_number.trim() || '',
          address: miniPatientForm.address.trim() || '',
          emergency_contact_name: miniPatientForm.emergency_contact_name.trim() || '',
          emergency_contact_phone: miniPatientForm.emergency_contact_phone.trim() || '',
          medical_right: miniPatientForm.medical_right,
          primary_doctor: miniPatientForm.primary_doctor.trim() || 'กรุณาเลือกแพทย์เจ้าของไข้ใหม่',
          status: 'active',
        }).select().single();
        if (patErr) throw patErr;
        patientId = newPat.id;
      }
      if (!patientId) throw new Error('ไม่พบข้อมูลคนไข้');

      // Update diseases
      if (editedDiseases && selectedPatient) {
        await supabase.from('patients').update({ chronic_disease_note: editedDiseases }).eq('id', patientId);
      }

      // Save appointment
      if (lastAppointmentDate) {
        const { data: existApps } = await supabase.from('appointments').select('*').eq('patient_id', patientId)
          .order('appointment_date', { ascending: false }).limit(1);
        if (existApps && existApps.length > 0) {
          await supabase.from('appointments').update({ appointment_date: lastAppointmentDate, updated_at: new Date().toISOString() }).eq('id', existApps[0].id);
        } else {
          await supabase.from('appointments').insert({
            patient_id: patientId, appointment_date: lastAppointmentDate,
            appointment_time: '09:00:00', department: 'อายุรกรรม (Medicine)',
            doctor_name: selectedPatient?.primary_doctor || miniPatientForm.primary_doctor || 'ไม่ระบุแพทย์',
            reason: 'บันทึกผล Monofilament', status: 'completed',
          });
        }
      }

      const ltNote = ltResult.status === 'normal' ? 'ปกติ' : `ผิดปกติ ${ltResult.positions} ตำแหน่ง${ltResult.detail ? ': ' + ltResult.detail : ''}`;
      const rtNote = rtResult.status === 'normal' ? 'ปกติ' : `ผิดปกติ ${rtResult.positions} ตำแหน่ง${rtResult.detail ? ': ' + rtResult.detail : ''}`;
      const isAbnormal = ltResult.status === 'abnormal' || rtResult.status === 'abnormal';

      await supabase.from('patient_lab_results').insert({
        patient_id: patientId, test_name: 'Monofilament Foot Screening', test_date: examDate,
        result_value: isAbnormal ? 'ผิดปกติ' : 'ปกติ', unit: '', reference_range: 'ปกติ',
        notes: `Lt: ${ltNote} | Rt: ${rtNote}`, status: 'completed',
      });

      setSaveSuccess(`บันทึกผลการตรวจเท้าสำเร็จ — วันนัดล่าสุด: ${lastAppointmentDate}`);
      setLtResult({ status: 'normal', positions: '', detail: '' });
      setRtResult({ status: 'normal', positions: '', detail: '' });
    } catch (err: any) {
      setSaveError('บันทึกไม่สำเร็จ: ' + err.message);
    } finally { setSaving(false); }
  };

  const resetForm = () => {
    setShowForm(false); setHnQuery(''); setSelectedPatient(null);
    setSearchResults([]); setPatientNotFound(false);
    setMiniPatientForm(initialPatientForm); setFullNameInput('');
    setShowExtraFields(false); setLastAppointmentDate(TODAY);
    setSelectedDoctor(null); setDoctorQuery('');
    setExamDate(TODAY); setEditedDiseases('');
    setLtResult({ status: 'normal', positions: '', detail: '' });
    setRtResult({ status: 'normal', positions: '', detail: '' });
    setSaveSuccess(''); setSaveError(''); setFormErrors({});
  };

  const DoctorAutocomplete = () => (
    selectedDoctor ? (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.75rem', height: '38px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--primary-glow)', background: 'var(--bg-surface-solid)' }}>
        <span style={{ fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'var(--primary-subtle)', color: 'var(--primary)', borderRadius: '4px', fontWeight: 600, marginRight: '6px' }}>{selectedDoctor.id}</span>
          {selectedDoctor.name}
        </span>
        <button type="button" onClick={handleClearDoctor} style={{ border: 'none', background: 'transparent', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
      </div>
    ) : (
      <div style={{ position: 'relative' }}>
        <input type="text" className="form-input" placeholder="พิมพ์ ID, ชื่อ หรือสาขาเพื่อค้นหาแพทย์..."
          value={doctorQuery}
          onChange={e => { setDoctorQuery(e.target.value); setShowDoctorDropdown(true); setActiveDoctorIndex(-1); }}
          onFocus={() => setShowDoctorDropdown(true)}
          onBlur={() => setTimeout(() => setShowDoctorDropdown(false), 200)}
          onKeyDown={handleDoctorKeyDown}
        />
        {showDoctorDropdown && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--bg-surface-solid)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-lg)', maxHeight: '200px', overflowY: 'auto' }}>
            {filteredDoctors.length === 0 ? (
              <div style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>ไม่พบแพทย์ที่ตรงกับ "{doctorQuery}"</div>
            ) : filteredDoctors.map((doc, idx) => (
              <div key={doc.id} className={`autocomplete-item ${idx === activeDoctorIndex ? 'active' : ''}`}
                onMouseDown={() => handleSelectDoctor(doc)}
                style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'var(--primary-subtle)', color: 'var(--primary)', borderRadius: '4px', fontWeight: 600 }}>{doc.id}</span>
                <div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{doc.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{doc.specialty}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  );

  if (showForm) {
    return (
      <div style={{ animation: 'fadeIn 0.2s' }}>
        <button className="btn btn-secondary" style={{ width: 'auto', marginBottom: '1.25rem', padding: '0.4rem 1rem', fontSize: '0.8125rem' }} onClick={resetForm}>
          ← กลับรายการ
        </button>

        <div className="dashboard-card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem' }}>🦶 บันทึกผลการตรวจคัดกรองเท้าด้วย Monofilament</h2>

          {/* Step 1 */}
          <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-color)', marginBottom: '1.5rem', background: 'var(--primary-subtle)' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--primary)' }}>
              ขั้นตอนที่ 1: ค้นหาคนไข้ (กรอก HN หรือชื่อ)
            </h4>

            {selectedPatient ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-solid)', border: '1.5px solid var(--primary-glow)' }}>
                  <div>
                    <strong style={{ color: 'var(--primary)' }}>HN: {selectedPatient.hn}</strong>
                    <span style={{ marginLeft: '0.75rem' }}>{selectedPatient.title}{selectedPatient.first_name} {selectedPatient.last_name}</span>
                    <span style={{ marginLeft: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>แพทย์: {selectedPatient.primary_doctor || '—'}</span>
                  </div>
                  <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
                    onClick={() => { setSelectedPatient(null); setHnQuery(''); setPatientNotFound(false); setEditedDiseases(''); }}>
                    เปลี่ยนคนไข้
                  </button>
                </div>
                <div style={{ marginTop: '0.75rem', maxWidth: '300px' }}>
                  <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 600 }}>วันนัดหมายล่าสุด (พ.ศ.)</label>
                  <BuddhistDateInput value={lastAppointmentDate} onChange={setLastAppointmentDate} placeholder="แก้ไขวันนัดหมายล่าสุด" />
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="text" className="form-input" placeholder="พิมพ์ HN หรือชื่อคนไข้เพื่อค้นหา..."
                    value={hnQuery} onChange={e => handleSearchHn(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                    onBlur={() => setTimeout(() => setShowSearchResults(false), 200)} />
                  {searchingHn && <span style={{ alignSelf: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>กำลังค้นหา...</span>}
                </div>
                {showSearchResults && searchResults.length > 0 && (
                  <div className="autocomplete-dropdown" style={{ zIndex: 50 }}>
                    {searchResults.map(p => (
                      <div key={p.id} className="autocomplete-item" onMouseDown={() => handleSelectPatient(p)}>
                        <span className="autocomplete-item-id" style={{ fontSize: '0.625rem', minWidth: 36 }}>{p.hn}</span>
                        <div className="autocomplete-item-info">
                          <div className="autocomplete-item-name">{p.title}{p.first_name} {p.last_name}</div>
                          <div className="autocomplete-item-meta">แพทย์: {p.primary_doctor || '—'} • {p.phone_number || '—'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {formErrors.patient && <span className="form-error">{formErrors.patient}</span>}
              </div>
            )}

            {/* New Patient Form */}
            {patientNotFound && !selectedPatient && (
              <div style={{ marginTop: '1rem', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1.5px dashed var(--accent)', background: 'rgba(139,92,246,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--accent)' }}>ไม่พบคนไข้ในระบบ — กรอกข้อมูลเพื่อลงทะเบียนคนไข้ใหม่</span>
                </div>
                <div className="opd-form-grid" style={{ gridTemplateColumns: '160px 1fr' }}>
                  <div className="form-group">
                    <label className="form-label">HN *</label>
                    <input type="text" className="form-input" value={miniPatientForm.hn} style={{ fontWeight: 700 }}
                      onChange={e => setMiniPatientForm({ ...miniPatientForm, hn: e.target.value })} />
                    {formErrors.hn && <span className="form-error">{formErrors.hn}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">ชื่อ-นามสกุล * <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.75rem' }}>(พิมพ์ชื่อเต็มพร้อมคำนำหน้า)</span></label>
                    <input type="text" className="form-input" placeholder="เช่น นายสมชาย ใจดี" value={fullNameInput} onChange={e => handleFullNameChange(e.target.value)} />
                    {formErrors.first_name && <span className="form-error">{formErrors.first_name}</span>}
                  </div>
                </div>
                <div className="opd-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="form-group">
                    <label className="form-label">แพทย์เจ้าของไข้</label>
                    <DoctorAutocomplete />
                  </div>
                  <div className="form-group">
                    <label className="form-label">วันนัดหมายล่าสุด</label>
                    <BuddhistDateInput value={lastAppointmentDate} onChange={setLastAppointmentDate} placeholder="เลือกวันนัดหมายล่าสุด (พ.ศ.)" />
                  </div>
                </div>
                {(miniPatientForm.title || miniPatientForm.first_name) && (
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--primary-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>แยกอัตโนมัติ:</span>
                    <span>คำนำหน้า <strong>{miniPatientForm.title}</strong></span>
                    <span>ชื่อ <strong>{miniPatientForm.first_name || '—'}</strong></span>
                    <span>นามสกุล <strong>{miniPatientForm.last_name || '—'}</strong></span>
                    <span>เพศ <strong>{miniPatientForm.gender}</strong></span>
                  </div>
                )}
                <button type="button" onClick={() => setShowExtraFields(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 600, padding: '0.25rem 0' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showExtraFields ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                  {showExtraFields ? 'ซ่อนข้อมูลเพิ่มเติม' : 'กรอกข้อมูลเพิ่มเติม (ไม่บังคับ)'}
                </button>
                {showExtraFields && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <div className="opd-form-grid" style={{ gridTemplateColumns: '120px 1fr 1fr 120px' }}>
                      <div className="form-group"><label className="form-label">คำนำหน้า</label><input type="text" className="form-input" value={miniPatientForm.title} onChange={e => setMiniPatientForm(p => ({ ...p, title: e.target.value, gender: genderFromTitle(e.target.value) }))} /></div>
                      <div className="form-group"><label className="form-label">ชื่อจริง</label><input type="text" className="form-input" value={miniPatientForm.first_name} onChange={e => setMiniPatientForm({ ...miniPatientForm, first_name: e.target.value })} /></div>
                      <div className="form-group"><label className="form-label">นามสกุล</label><input type="text" className="form-input" value={miniPatientForm.last_name} onChange={e => setMiniPatientForm({ ...miniPatientForm, last_name: e.target.value })} /></div>
                      <div className="form-group"><label className="form-label">เพศ</label><select className="form-select" value={miniPatientForm.gender} onChange={e => setMiniPatientForm({ ...miniPatientForm, gender: e.target.value })}>{['ชาย', 'หญิง', 'อื่นๆ'].map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2 — always visible */}
          <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-color)', marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)' }}>
              ขั้นตอนที่ 2: บันทึกผลการตรวจ
            </h4>

            <div className="form-group" style={{ marginBottom: '1rem', maxWidth: 280 }}>
              <label className="form-label">วันที่ตรวจ</label>
              <BuddhistDateInput value={examDate} onChange={setExamDate} />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">
                โรคประจำตัว
                <span style={{ color: 'var(--text-secondary)', fontWeight: 400, marginLeft: 8, fontSize: '0.8rem' }}>— แก้ไขได้ (คั่นด้วยจุลภาค เช่น DM, HT, DLP)</span>
              </label>
              <input type="text" className="form-input" value={editedDiseases}
                onChange={e => setEditedDiseases(e.target.value)} placeholder="DM, HT, DLP..." />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1rem' }}>
              <FootResultInput side="Lt" value={ltResult} onChange={setLtResult} />
              <FootResultInput side="Rt" value={rtResult} onChange={setRtResult} />
            </div>

            {(ltResult.status === 'abnormal' || rtResult.status === 'abnormal') && (
              <div className="alert alert-danger" style={{ marginBottom: '0.5rem' }}>
                <strong>⚠️ พบความผิดปกติ:</strong>
                {ltResult.status === 'abnormal' && <div>เท้าซ้าย: ผิดปกติ {ltResult.positions} ตำแหน่ง {ltResult.detail && `(${ltResult.detail})`}</div>}
                {rtResult.status === 'abnormal' && <div>เท้าขวา: ผิดปกติ {rtResult.positions} ตำแหน่ง {rtResult.detail && `(${rtResult.detail})`}</div>}
              </div>
            )}
          </div>

          {saveSuccess && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{saveSuccess}</div>}
          {saveError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{saveError}</div>}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || (!selectedPatient && !patientNotFound)} style={{ width: 'auto' }}>
              {saving ? 'กำลังบันทึก...' : '💾 บันทึกผลการตรวจ'}
            </button>
            <button className="btn btn-secondary" onClick={resetForm} style={{ width: 'auto' }}>ยกเลิก</button>
          </div>
        </div>
      </div>
    );
  }

  // LIST VIEW
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
              <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
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
            <button key={p} className={`btn ${p === page ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPage(p)} style={{ width: 32, padding: '0.35rem 0', fontSize: '0.8rem', minWidth: 32 }}>{p}</button>
          ))}
          <button className="btn btn-secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>ถัดไป ›</button>
        </div>
      </div>
    </div>
  );
};
