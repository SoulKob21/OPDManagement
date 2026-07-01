import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import type { Patient, Doctor } from '../../types/opd';
import { MOCK_DOCTORS } from '../../types/opd';
import { BuddhistDateInput } from '../../components/BuddhistDateInput';
import { DiseaseMultiSelect } from '../../components/DiseaseMultiSelect';
import * as XLSX from 'xlsx';

const THAI_MONTHS = [
  { value: '01', label: 'มกราคม' }, { value: '02', label: 'กุมภาพันธ์' },
  { value: '03', label: 'มีนาคม' }, { value: '04', label: 'เมษายน' },
  { value: '05', label: 'พฤษภาคม' }, { value: '06', label: 'มิถุนายน' },
  { value: '07', label: 'กรกฎาคม' }, { value: '08', label: 'สิงหาคม' },
  { value: '09', label: 'กันยายน' }, { value: '10', label: 'ตุลาคม' },
  { value: '11', label: 'พฤศจิกายน' }, { value: '12', label: 'ธันวาคม' },
];

const thStyle: React.CSSProperties = {
  padding: '0.75rem 0.875rem',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: '0.75rem',
  whiteSpace: 'nowrap',
  color: '#fff',
  borderBottom: '2px solid rgba(255,255,255,0.15)',
  letterSpacing: '0.02em',
};

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, options, placeholder = 'ทั้งหมด' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const selectedOption = options.find(o => String(o.value) === String(value));

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          height: '36px',
          padding: '0.375rem 2rem 0.375rem 0.75rem',
          borderRadius: 'var(--radius-sm)',
          border: '1.5px solid ' + (isOpen ? 'var(--border-focus)' : 'var(--border-color)'),
          background: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          fontSize: '0.8125rem',
          fontWeight: 600,
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 3px var(--primary-glow)' : 'none',
          transition: 'all 0.15s ease',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
            position: 'absolute',
            right: '0.75rem',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 150,
            width: '100%',
            maxHeight: '220px',
            overflowY: 'auto',
            background: 'var(--bg-surface-solid)',
            border: '1.5px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            padding: '4px',
          }}
        >
          {options.map(opt => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(String(opt.value));
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: isSelected ? 'var(--primary)' : 'transparent',
                  color: isSelected ? 'white' : 'var(--text-primary)',
                  fontSize: '0.8125rem',
                  fontWeight: isSelected ? 700 : 500,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                  display: 'block',
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.background = 'var(--bg-primary)';
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};


interface DmMonofilamentViewProps {
  onBack: () => void;
}

const MOCK_DATA = [
  { id: 1,  hn: 'HN-00101', name: 'นายสมชาย ใจดี',           doctor: 'นพ.สมศักดิ์ รักษาดี', date: '15/01/2568', diseases: 'DM, HT',      ltResult: 'ปกติ',              rtResult: 'ปกติ',              pulseResult: 'ปกติ', remarks: '—', summary: 'ปกติ',    summaryColor: '#10b981' },
  { id: 2,  hn: 'HN-00102', name: 'นางสาวสมหญิง รักสุข',     doctor: 'นพ.สมศักดิ์ รักษาดี', date: '15/01/2568', diseases: 'DM',           ltResult: 'ผิดปกติ 2 ตำแหน่ง', rtResult: 'ปกติ',              pulseResult: 'ปกติ', remarks: '[Wagner: Grade 1] ชาที่ปลายนิ้วโป้งเท้าซ้าย', summary: 'ผิดปกติ', summaryColor: '#ef4444' },
  { id: 3,  hn: 'HN-00103', name: 'นายวิชัย สร้างสรรค์',     doctor: 'พญ.วิไล ใจงาม',        date: '16/01/2568', diseases: 'DM, DLP',      ltResult: 'ปกติ',              rtResult: 'ผิดปกติ 3 ตำแหน่ง', pulseResult: 'ผิดปกติเท้าขวา (Dorsalis pedis)', remarks: '[Wagner: Grade 2] มีแผลกดทับที่ส้นเท้าขวา', summary: 'ผิดปกติ', summaryColor: '#ef4444' },
  { id: 4,  hn: 'HN-00104', name: 'นางมาลี ดอกไม้',          doctor: 'พญ.วิไล ใจงาม',        date: '16/01/2568', diseases: 'DM, HT, DLP',  ltResult: 'ปกติ',              rtResult: 'ปกติ',              pulseResult: 'ปกติ', remarks: '—', summary: 'ปกติ',    summaryColor: '#10b981' },
  { id: 5,  hn: 'HN-00105', name: 'นายประเสริฐ มั่นคง',      doctor: 'นพ.สมศักดิ์ รักษาดี', date: '17/01/2568', diseases: 'DM',           ltResult: 'ปกติ',              rtResult: 'ปกติ',              pulseResult: 'ปกติ', remarks: '—', summary: 'ปกติ',    summaryColor: '#10b981' },
  { id: 6,  hn: 'HN-00106', name: 'นางสาวพิมพ์ใจ งามตา',    doctor: 'นพ.ชาญชัย วิทยา',     date: '17/01/2568', diseases: 'DM, CKD',      ltResult: 'ผิดปกติ 4 ตำแหน่ง', rtResult: 'ผิดปกติ 4 ตำแหน่ง', pulseResult: 'ผิดปกติทั้ง 2 ข้าง', remarks: '[Wagner: Grade 3] แผลติดเชื้อบริเวณฝ่าเท้าซ้าย', summary: 'ผิดปกติ', summaryColor: '#ef4444' },
  { id: 7,  hn: 'HN-00107', name: 'นายอนุชา พัฒนา',          doctor: 'นพ.ชาญชัย วิทยา',     date: '18/01/2568', diseases: 'DM',           ltResult: 'ปกติ',              rtResult: 'ปกติ',              pulseResult: 'ปกติ', remarks: '—', summary: 'ปกติ',    summaryColor: '#10b981' },
  { id: 8,  hn: 'HN-00108', name: 'นางจันทร์ สว่าง',         doctor: 'พญ.วิไล ใจงาม',        date: '18/01/2568', diseases: 'DM, HT',       ltResult: 'ปกติ',              rtResult: 'ผิดปกติ 1 ตำแหน่ง', pulseResult: 'ปกติ', remarks: '[Wagner: Grade 1] ผิวหนังเท้าแห้งและชาเล็กน้อย', summary: 'ผิดปกติ', summaryColor: '#ef4444' },
  { id: 9,  hn: 'HN-00109', name: 'นายธนกร ศรีสวัสดิ์',      doctor: 'นพ.สมศักดิ์ รักษาดี', date: '19/01/2568', diseases: 'DM, DLP, HT',  ltResult: 'ปกติ',              rtResult: 'ปกติ',              pulseResult: 'ปกติ', remarks: '—', summary: 'ปกติ',    summaryColor: '#10b981' },
  { id: 10, hn: 'HN-00110', name: 'นางสาวรัตนา แก้วประเสริฐ', doctor: 'นพ.ชาญชัย วิทยา',  date: '19/01/2568', diseases: 'DM',           ltResult: 'ปกติ',              rtResult: 'ปกติ',              pulseResult: 'ปกติ', remarks: '—', summary: 'ปกติ',    summaryColor: '#10b981' },
  { id: 11, hn: 'HN-00111', name: 'นายสุรชัย ดีงาม',          doctor: 'พญ.วิไล ใจงาม',        date: '20/01/2568', diseases: 'DM, HT',       ltResult: 'ผิดปกติ 2 ตำแหน่ง', rtResult: 'ปกติ',              pulseResult: 'ผิดปกติเท้าซ้าย (Posterior tibial)', remarks: '[Wagner: Grade 2] คลองชีพจรเท้าซ้ายได้เบา', summary: 'ผิดปกติ', summaryColor: '#ef4444' },
  { id: 12, hn: 'HN-00112', name: 'นางลำพูน สุขสมบัติ',      doctor: 'นพ.สมศักดิ์ รักษาดี', date: '20/01/2568', diseases: 'DM, CKD',      ltResult: 'ปกติ',              rtResult: 'ปกติ',              pulseResult: 'ปกติ', remarks: '—', summary: 'ปกติ',    summaryColor: '#10b981' },
  { id: 13, hn: 'HN-00113', name: 'นายกิตติ วงษ์สกุล',       doctor: 'นพ.ชาญชัย วิทยา',     date: '21/01/2568', diseases: 'DM',           ltResult: 'ปกติ',              rtResult: 'ปกติ',              pulseResult: 'ปกติ', remarks: '—', summary: 'ปกติ',    summaryColor: '#10b981' },
  { id: 14, hn: 'HN-00114', name: 'นางสาวอรทัย มีสุข',        doctor: 'พญ.วิไล ใจงาม',        date: '21/01/2568', diseases: 'DM, DLP',      ltResult: 'ผิดปกติ 3 ตำแหน่ง', rtResult: 'ผิดปกติ 2 ตำแหน่ง', pulseResult: 'ผิดปกติเท้าซ้าย (Dorsalis pedis)', remarks: '[Wagner: Grade 4] แผลเนื้อตายแห้งบริเวณนิ้วหัวแม่เท้าขวา', summary: 'ผิดปกติ', summaryColor: '#ef4444' },
  { id: 15, hn: 'HN-00115', name: 'นายพงษ์ศักดิ์ รุ่งเรือง',  doctor: 'นพ.สมศักดิ์ รักษาดี', date: '22/01/2568', diseases: 'DM',           ltResult: 'ปกติ',              rtResult: 'ปกติ',              pulseResult: 'ปกติ', remarks: '—', summary: 'ปกติ',    summaryColor: '#10b981' },
];

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

interface FootPulseState {
  status: 'normal' | 'abnormal';
  dorsalisPedis: boolean;
  posteriorTibial: boolean;
}

interface FootExamJson {
  ltResult?: { status: 'normal' | 'abnormal'; positions: string; detail: string; };
  rtResult?: { status: 'normal' | 'abnormal'; positions: string; detail: string; };
  wagnerGrade?: string;
  pulseLt?: FootPulseState;
  pulseRt?: FootPulseState;
  remarks?: string;
}

const parseFootExamNotes = (notesStr: string): FootExamJson => {
  try {
    if (notesStr && (notesStr.startsWith('{') || notesStr.startsWith('['))) {
      return JSON.parse(notesStr) as FootExamJson;
    }
  } catch (e) {
    console.error('Error parsing foot exam JSON notes:', e);
  }
  
  const res: FootExamJson = {};
  if (!notesStr) return res;
  
  const ltMatch = notesStr.match(/Lt:\s*([^|]+)/);
  if (ltMatch) {
    const text = ltMatch[1].trim();
    if (text.includes('ปกติ') && !text.includes('ผิดปกติ')) {
      res.ltResult = { status: 'normal', positions: '', detail: '' };
    } else {
      const posMatch = text.match(/ผิดปกติ\s*(\d+)/);
      res.ltResult = { status: 'abnormal', positions: posMatch ? posMatch[1] : '1', detail: text };
    }
  }
  
  const rtMatch = notesStr.match(/Rt:\s*(.+)$/);
  if (rtMatch) {
    const text = rtMatch[1].trim();
    if (text.includes('ปกติ') && !text.includes('ผิดปกติ')) {
      res.rtResult = { status: 'normal', positions: '', detail: '' };
    } else {
      const posMatch = text.match(/ผิดปกติ\s*(\d+)/);
      res.rtResult = { status: 'abnormal', positions: posMatch ? posMatch[1] : '1', detail: text };
    }
  }
  
  res.remarks = notesStr;
  return res;
};

const formatPulseSummary = (pulseLt?: FootPulseState, pulseRt?: FootPulseState) => {
  if (!pulseLt && !pulseRt) return '—';
  
  const ltNormal = !pulseLt || pulseLt.status === 'normal';
  const rtNormal = !pulseRt || pulseRt.status === 'normal';
  
  if (ltNormal && rtNormal) return 'ปกติ';
  
  const parts: string[] = [];
  if (!ltNormal && pulseLt) {
    const ltParts: string[] = [];
    if (pulseLt.dorsalisPedis) ltParts.push('Dorsalis pedis');
    if (pulseLt.posteriorTibial) ltParts.push('Posterior tibial');
    parts.push(`ซ้าย: ${ltParts.length > 0 ? ltParts.join(', ') : 'ไม่ระบุตำแหน่ง'}`);
  }
  if (!rtNormal && pulseRt) {
    const rtParts: string[] = [];
    if (pulseRt.dorsalisPedis) rtParts.push('Dorsalis pedis');
    if (pulseRt.posteriorTibial) rtParts.push('Posterior tibial');
    parts.push(`ขวา: ${rtParts.length > 0 ? rtParts.join(', ') : 'ไม่ระบุตำแหน่ง'}`);
  }
  return parts.join(' | ');
};

const formatDbDate = (dateStr: string) => {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0]);
      const month = parts[1];
      const day = parts[2];
      return `${day}/${month}/${year + 543}`;
    }
  } catch (e) {}
  return dateStr;
};

const WAGNER_GRADES = [
  { value: 'Grade 0', label: 'Grade 0: ผิวหนังปกติ ยังไม่มีแผลเปิด แต่อาจพบลักษณะเท้าผิดรูป หรือมีความเสี่ยงต่อการเกิดแผล' },
  { value: 'Grade 1', label: 'Grade 1: แผลตื้น (Superficial ulcer) เกิดเฉพาะบริเวณผิวหนังชั้นนอก โดยแผลยังไม่ลึกถึงชั้นไขมันใต้ผิวหนัง' },
  { value: 'Grade 2', label: 'Grade 2: แผลลึก (Deep ulcer) ลุกลามผ่านชั้นไขมันไปถึงเส้นเอ็น ข้อต่อ หรือกระดูก แต่ยังไม่พบฝี หนอง หรือการติดเชื้อรุนแรงของกระดูก' },
  { value: 'Grade 3', label: 'Grade 3: แผลลึกมากและมีการติดเชื้ออย่างรุนแรง อาจพบฝี หนอง โพรงแผลลึก หรือมีการอักเสบติดเชื้อของกระดูก (Osteomyelitis)' },
  { value: 'Grade 4', label: 'Grade 4: เนื้อตายเน่าเฉพาะส่วน (Localized gangrene) มักพบบริเวณปลายนิ้วเท้าหรือส้นเท้า' },
  { value: 'Grade 5', label: 'Grade 5: เนื้อตายเน่าลุกลามทั่วทั้งเท้า (Extensive gangrene) มีความรุนแรงสูง และอาจจำเป็นต้องพิจารณาตัดเท้าหรือตัดขาตามดุลยพินิจของแพทย์' }
];

const WagnerSelectSearch = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedItem = WAGNER_GRADES.find(g => g.value === value);
  const displayValue = selectedItem ? selectedItem.label : '';

  const filteredGrades = WAGNER_GRADES.filter(g => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return g.value.toLowerCase().includes(q) || g.label.toLowerCase().includes(q);
  });

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <input
        type="text"
        className="form-input"
        placeholder="พิมพ์ค้นหาเกรด (เช่น 0, 1, 2...) หรือเลือกจากรายการ"
        value={isOpen ? search : displayValue}
        onChange={e => {
          if (!isOpen) setIsOpen(true);
          setSearch(e.target.value);
        }}
        onFocus={() => {
          setIsOpen(true);
          setSearch('');
        }}
      />
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'var(--bg-surface-solid)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-lg)',
          maxHeight: '220px',
          overflowY: 'auto',
          marginTop: '4px'
        }}>
          {filteredGrades.length === 0 ? (
            <div style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              ไม่พบผลลัพธ์ "{search}"
            </div>
          ) : (
            filteredGrades.map(g => (
              <div
                key={g.value}
                onClick={() => {
                  onChange(g.value);
                  setIsOpen(false);
                  setSearch('');
                }}
                style={{
                  padding: '0.5rem 0.75rem',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  borderBottom: '1px solid var(--border-color)',
                  background: value === g.value ? 'var(--primary-subtle)' : 'transparent',
                  color: value === g.value ? 'var(--primary)' : 'var(--text-primary)',
                  fontWeight: value === g.value ? 600 : 400,
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = value === g.value ? 'var(--primary-subtle)' : 'transparent'}
              >
                {g.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const FootResultInput = ({ side, value, onChange }: { side: 'Lt' | 'Rt'; value: FootResult; onChange: (v: FootResult) => void }) => (
  <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '1.25rem', border: '1px solid var(--border-color)' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.75rem' }}>
      <span style={{ fontSize: '1.8rem', lineHeight: 1, marginBottom: '0.5rem', display: 'inline-block' }}>🦶</span>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: side === 'Lt' ? '#6366f1' : '#f59e0b' }}>
        เท้า{side === 'Lt' ? 'ซ้าย (Lt.)' : 'ขวา (Rt.)'}
      </h3>
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
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
          <label className="form-label" style={{ fontSize: '0.75rem' }}>จำนวนตำแหน่ง *</label>
          <input type="number" min="1" max="10" className="form-input" placeholder="เช่น 3"
            value={value.positions} onChange={e => onChange({ ...value, positions: e.target.value })} required />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem' }}>ระบุตำแหน่ง (ถ้ามี)</label>
          <input type="text" className="form-input" placeholder="เช่น นิ้วที่ 1, 2..."
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

  // New foot screening states
  const [wagnerGrade, setWagnerGrade] = useState('');
  const [pulseLt, setPulseLt] = useState<{ status: 'normal' | 'abnormal'; dorsalisPedis: boolean; posteriorTibial: boolean }>({
    status: 'normal',
    dorsalisPedis: false,
    posteriorTibial: false,
  });
  const [pulseRt, setPulseRt] = useState<{ status: 'normal' | 'abnormal'; dorsalisPedis: boolean; posteriorTibial: boolean }>({
    status: 'normal',
    dorsalisPedis: false,
    posteriorTibial: false,
  });
  const [remarks, setRemarks] = useState('');
  const [editingId, setEditingId] = useState<string | number | null>(null);

  // DB list states
  const currentYearStr = new Date().getFullYear().toString();
  const currentMonthStr = String(new Date().getMonth() + 1).padStart(2, '0');

  const [filterYear, setFilterYear] = useState(currentYearStr);
  const [filterMonth, setFilterMonth] = useState(currentMonthStr);
  const [filterDate, setFilterDate] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [listError, setListError] = useState('');
  const [dbResults, setDbResults] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);

  // Export states
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMode, setExportMode] = useState<'month' | 'year'>('month');
  const [exportProgress, setExportProgress] = useState(0);
  const [exportMessage, setExportMessage] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportYear, setExportYear] = useState(currentYearStr);
  const [exportMonth, setExportMonth] = useState(currentMonthStr);
  const [exportResult, setExportResult] = useState('');

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: (currentYear + 1) - 2024 + 1 }, (_, i) => {
    const y = 2024 + i;
    return { value: y.toString(), label: (y + 543).toString() };
  });

  const monthOptions = [
    { value: '', label: 'ทั้งหมด' },
    ...THAI_MONTHS.map(m => ({ value: m.value, label: m.label }))
  ];

  const resultOptions = [
    { value: '', label: 'ทั้งหมด' },
    { value: 'ปกติ', label: 'ปกติ' },
    { value: 'ผิดปกติ', label: 'ผิดปกติ' }
  ];

  const pageSizeOptions = [
    { value: '10', label: '10' },
    { value: '20', label: '20' },
    { value: '50', label: '50' }
  ];

  const toThaiDate = (iso: string) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${parseInt(y) + 543}`;
  };

  const fetchListData = async (targetPage: number = page, targetPageSize: number = pageSize) => {
    setListLoading(true); setListError('');
    try {
      // ── DEV: use mock data ──────────────────────────────────
      if (import.meta.env.DEV) {
        await new Promise(r => setTimeout(r, 300)); // simulate network
        const filtered = MOCK_DATA.filter(row => {
          const [d, m, yThai] = row.date.split('/');
          const yGreg = String(parseInt(yThai) - 543);
          if (filterYear && yGreg !== filterYear) return false;
          if (filterMonth && m !== filterMonth) return false;
          if (filterDate) {
            const [fdY, fdM, fdD] = filterDate.split('-');
            if (d !== fdD || m !== fdM || yGreg !== fdY) return false;
          }
          if (filterResult && row.summary !== filterResult) return false;
          return true;
        });
        
        setTotalCount(filtered.length);
        const sliced = filtered.slice((targetPage - 1) * targetPageSize, targetPage * targetPageSize);
        setDbResults(sliced.map((s, idx) => ({
          id: idx + 1,
          hn: s.hn,
          name: s.name,
          doctor: s.doctor,
          test_date: `${String(parseInt(s.date.split('/')[2]) - 543)}-${s.date.split('/')[1]}-${s.date.split('/')[0]}`,
          result_value: s.summary,
          notes: JSON.stringify({
            ltResult: s.ltResult.includes('ปกติ') ? { status: 'normal' } : { status: 'abnormal', positions: s.ltResult.match(/\d+/) ? s.ltResult.match(/\d+/)?.[0] : '1', detail: s.ltResult },
            rtResult: s.rtResult.includes('ปกติ') ? { status: 'normal' } : { status: 'abnormal', positions: s.rtResult.match(/\d+/) ? s.rtResult.match(/\d+/)?.[0] : '1', detail: s.rtResult },
            remarks: s.summary === 'ปกติ' ? '—' : 'ตรวจพบความผิดปกติที่เท้า'
          }),
          patients: {
            hn: s.hn,
            title: '',
            first_name: s.name,
            last_name: '',
            primary_doctor: s.doctor,
            chronic_disease_note: s.diseases
          }
        })));
        setHasSearched(true);
        return;
      }

      // ── PROD: fetch from Supabase with SQL filters ──────────
      let query = supabase
        .from('patient_foot_assessments')
        .select(`
          id,
          exam_date,
          result_status,
          notes,
          patients (
            id,
            hn,
            title,
            first_name,
            last_name,
            primary_doctor,
            chronic_disease_note
          )
        `, { count: 'exact' });

      if (filterYear) {
        if (filterMonth) {
          const yearNum = parseInt(filterYear);
          const monthNum = parseInt(filterMonth);
          const lastDay = new Date(yearNum, monthNum, 0).getDate();
          query = query
            .gte('exam_date', `${filterYear}-${filterMonth}-01`)
            .lte('exam_date', `${filterYear}-${filterMonth}-${String(lastDay).padStart(2, '0')}`);
        } else {
          query = query
            .gte('exam_date', `${filterYear}-01-01`)
            .lte('exam_date', `${filterYear}-12-31`);
        }
      }

      if (filterDate) {
        query = query.eq('exam_date', filterDate);
      }

      if (filterResult) {
        query = query.eq('result_status', filterResult);
      }

      const fromRange = (targetPage - 1) * targetPageSize;
      const toRange = targetPage * targetPageSize - 1;

      const { data, error, count } = await query
        .order('exam_date', { ascending: false })
        .range(fromRange, toRange);

      if (error) throw error;
      setDbResults(data || []);
      setTotalCount(count ?? 0);
      setHasSearched(true);
    } catch (err: any) {
      setListError('โหลดข้อมูลไม่สำเร็จ: ' + err.message);
    } finally {
      setListLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    setExportProgress(0);
    setExportSuccess(false);
    setExportMessage('กำลังเริ่มดึงข้อมูลคัดกรองเท้า...');
    
    try {
      let startDate = '';
      let endDate = '';
      
      if (exportMode === 'month') {
        if (!exportYear || !exportMonth) {
          throw new Error('กรุณาเลือกปีและเดือนก่อนสั่งดาวน์โหลดข้อมูลรายเดือน');
        }
        const yearNum = parseInt(exportYear);
        const monthNum = parseInt(exportMonth);
        const lastDay = new Date(yearNum, monthNum, 0).getDate();
        startDate = `${exportYear}-${exportMonth}-01`;
        endDate = `${exportYear}-${exportMonth}-${String(lastDay).padStart(2, '0')}`;
      } else {
        if (!exportYear) {
          throw new Error('กรุณาเลือกปีก่อนสั่งดาวน์โหลดข้อมูลรายปี');
        }
        startDate = `${exportYear}-01-01`;
        endDate = `${exportYear}-12-31`;
      }
      
      // ── DEV: use mock data ──────────────────────────────────
      if (import.meta.env.DEV) {
        await new Promise(r => setTimeout(r, 600)); // simulate network delay
        
        const filteredMock = MOCK_DATA.filter(row => {
          const [, m, yThai] = row.date.split('/');
          const yGreg = String(parseInt(yThai) - 543);
          if (exportMode === 'month') {
            return yGreg === exportYear && m === exportMonth;
          } else {
            return yGreg === exportYear;
          }
        });
        
        setExportProgress(50);
        setExportMessage(`ค้นพบข้อมูล Mock ${filteredMock.length} รายการ กำลังจัดเตรียม Excel...`);
        await new Promise(r => setTimeout(r, 400));
        
        const excelData = filteredMock.map((r, idx) => ({
          'ลำดับ': idx + 1,
          'HN': r.hn,
          'ชื่อ-นามสกุล': r.name,
          'แพทย์เจ้าของไข้': r.doctor,
          'วันที่ตรวจ': r.date,
          'โรคประจำตัว': r.diseases,
          'เท้าซ้าย (Lt.)': r.ltResult,
          'เท้าขวา (Rt.)': r.rtResult,
          'สรุปผลการประเมินชีพจรที่เท้า': 'ปกติ',
          'สรุปผลการคัดกรอง': r.summary,
          'หมายเหตุ': r.summary === 'ปกติ' ? '—' : 'ตรวจพบความผิดปกติที่เท้า'
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'รายงานคัดกรองเท้า');
        
        const fileLabel = exportMode === 'year' 
          ? `ปี_${parseInt(exportYear) + 543}` 
          : `เดือน_${THAI_MONTHS.find(m => m.value === exportMonth)?.label ?? exportMonth}_${parseInt(exportYear) + 543}`;
        XLSX.writeFile(workbook, `monofilament_screening_${fileLabel}.xlsx`);
        
        setExportProgress(100);
        setExportSuccess(true);
        setExportMessage(`ดาวน์โหลดสำเร็จ! (ข้อมูล Mock) สรุปนำออกแล้วทั้งหมด ${filteredMock.length} รายการ`);
        return;
      }

      // ── PROD: fetch from Supabase in batches ────────────────
      let countQuery = supabase
        .from('patient_foot_assessments')
        .select('id', { count: 'exact', head: true })
        .gte('exam_date', startDate)
        .lte('exam_date', endDate);

      if (exportResult) {
        countQuery = countQuery.eq('result_status', exportResult);
      }

      const { count: total, error: countErr } = await countQuery;
      if (countErr) throw countErr;
      
      if (!total) {
        throw new Error('ไม่พบข้อมูลที่ตรงกับเงื่อนไขที่เลือก');
      }

      setExportProgress(20);
      setExportMessage(`ค้นพบข้อมูลทั้งหมด ${total} รายการ กำลังเริ่มดึงข้อมูล...`);

      let allResults: any[] = [];
      const batchSize = 1000;
      for (let offset = 0; offset < total; offset += batchSize) {
        const progressVal = 20 + Math.round((offset / total) * 60); // 20-80%
        setExportProgress(progressVal);
        setExportMessage(`กำลังดึงประวัติการคัดกรองเท้า... (${offset} จาก ${total} รายการ)`);

        let query = supabase
          .from('patient_foot_assessments')
          .select(`
            exam_date,
            result_status,
            notes,
            patients (
              hn,
              title,
              first_name,
              last_name,
              primary_doctor,
              chronic_disease_note
            )
          `)
          .gte('exam_date', startDate)
          .lte('exam_date', endDate);

        if (exportResult) {
          query = query.eq('result_status', exportResult);
        }

        const { data, error } = await query
          .order('exam_date', { ascending: true })
          .range(offset, offset + batchSize - 1);

        if (error) throw error;
        allResults = [...allResults, ...(data || [])];
      }

      setExportProgress(85);
      setExportMessage('ดึงข้อมูลเสร็จสิ้น กำลังสรุปข้อมูลในรูปแบบ Excel...');

      const excelData = allResults.map((r, idx) => {
        const patient = r.patients;
        const exam = parseFootExamNotes(r.notes);
        
        const ltText = exam.ltResult 
          ? (exam.ltResult.status === 'normal' ? 'ปกติ' : `ผิดปกติ ${exam.ltResult.positions} ตำแหน่ง${exam.ltResult.detail ? ' (' + exam.ltResult.detail + ')' : ''}`)
          : 'ปกติ';
          
        const rtText = exam.rtResult 
          ? (exam.rtResult.status === 'normal' ? 'ปกติ' : `ผิดปกติ ${exam.rtResult.positions} ตำแหน่ง${exam.rtResult.detail ? ' (' + exam.rtResult.detail + ')' : ''}`)
          : 'ปกติ';
          
        const pulseText = formatPulseSummary(exam.pulseLt, exam.pulseRt);
        
        let notesText = exam.remarks || '';
        if (exam.wagnerGrade) {
          notesText = `[Wagner: ${exam.wagnerGrade}] ${notesText}`.trim();
        }

        return {
          'ลำดับ': idx + 1,
          'HN': patient?.hn ?? '',
          'ชื่อ-นามสกุล': `${patient?.title ?? ''}${patient?.first_name ?? ''} ${patient?.last_name ?? ''}`.trim(),
          'แพทย์เจ้าของไข้': patient?.primary_doctor ?? '',
          'วันที่ตรวจ': toThaiDate(r.exam_date ?? ''),
          'โรคประจำตัว': patient?.chronic_disease_note ?? '',
          'เท้าซ้าย (Lt.)': ltText,
          'เท้าขวา (Rt.)': rtText,
          'สรุปผลการประเมินชีพจรที่เท้า': pulseText,
          'สรุปผลการคัดกรอง': r.result_status,
          'หมายเหตุ': notesText || '—'
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'รายงานคัดกรองเท้า');

      const fileLabel = exportMode === 'year' 
        ? `ปี_${parseInt(exportYear) + 543}` 
        : `เดือน_${THAI_MONTHS.find(m => m.value === exportMonth)?.label ?? exportMonth}_${parseInt(exportYear) + 543}`;
      XLSX.writeFile(workbook, `monofilament_screening_${fileLabel}.xlsx`);

      setExportProgress(100);
      setExportSuccess(true);
      setExportMessage(`ดาวน์โหลดสำเร็จ! สรุปนำออกแล้วทั้งหมด ${total} รายการ`);

    } catch (err: any) {
      setExportMessage(`ดาวน์โหลดล้มเหลว: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const displayRows = dbResults.length > 0
    ? dbResults.map((r, index) => {
        const patient = r.patients;
        const exam = parseFootExamNotes(r.notes);
        
        const ltText = exam.ltResult 
          ? (exam.ltResult.status === 'normal' ? 'ปกติ' : `ผิดปกติ ${exam.ltResult.positions} ตำแหน่ง${exam.ltResult.detail ? ' (' + exam.ltResult.detail + ')' : ''}`)
          : 'ปกติ';
          
        const rtText = exam.rtResult 
          ? (exam.rtResult.status === 'normal' ? 'ปกติ' : `ผิดปกติ ${exam.rtResult.positions} ตำแหน่ง${exam.rtResult.detail ? ' (' + exam.rtResult.detail + ')' : ''}`)
          : 'ปกติ';
          
        const pulseText = formatPulseSummary(exam.pulseLt, exam.pulseRt);
        
        let notesText = exam.remarks || '';
        if (exam.wagnerGrade) {
          notesText = `[Wagner: ${exam.wagnerGrade}] ${notesText}`.trim();
        }

        return {
          id: index + 1,
          hn: patient?.hn || '—',
          name: patient ? `${patient.title || ''}${patient.first_name || ''} ${patient.last_name || ''}`.trim() : '—',
          doctor: patient?.primary_doctor || '—',
          date: formatDbDate(r.exam_date),
          diseases: patient?.chronic_disease_note || '—',
          ltResult: ltText,
          rtResult: rtText,
          pulseResult: pulseText,
          remarks: notesText || '—',
          summary: r.result_status,
          summaryColor: r.result_status === 'ปกติ' ? '#10b981' : '#ef4444',
          rawRecord: r
        };
      })
    : MOCK_DATA.map((row, index) => ({
        id: index + 1,
        hn: row.hn,
        name: row.name,
        doctor: row.doctor,
        date: row.date,
        diseases: row.diseases,
        ltResult: row.ltResult,
        rtResult: row.rtResult,
        pulseResult: row.pulseResult || 'ปกติ',
        remarks: row.remarks || '—',
        summary: row.summary,
        summaryColor: row.summaryColor
      }));

  const pageData = displayRows;

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
    if (query.trim().length < 4) { setSearchResults([]); setShowSearchResults(false); return; }
    try {
      setSearchingHn(true);
      const q = `%${query.trim()}%`;
      const { data } = await supabase.from('patients').select('*')
        .or(`hn.ilike.${q},first_name.ilike.${q},last_name.ilike.${q}`).eq('status', 'active').limit(8);
      setSearchResults(data || []); setShowSearchResults(true);
      if ((!data || data.length === 0) && query.trim().length >= 4) {
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
    const hasAbnormalFoot = ltResult.status === 'abnormal' || rtResult.status === 'abnormal';
    if (hasAbnormalFoot && !wagnerGrade) {
      errors.wagner = 'กรุณาระบุระดับความรุนแรงของแผล (Wagner Classification)';
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
          chronic_disease_note: editedDiseases,
          status: 'active',
        }).select().single();
        if (patErr) throw patErr;
        patientId = newPat.id;
      }
      if (!patientId) throw new Error('ไม่พบข้อมูลคนไข้');

      // Update diseases
      if (selectedPatient) {
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

      const isAbnormal = ltResult.status === 'abnormal' || rtResult.status === 'abnormal';
      const notesJson = {
        ltResult,
        rtResult,
        wagnerGrade: isAbnormal ? wagnerGrade : undefined,
        pulseLt,
        pulseRt,
        remarks: remarks.trim()
      };
      
      const serializedNotes = JSON.stringify(notesJson);

      if (editingId) {
        const isMockUuid = typeof editingId === 'number' || (typeof editingId === 'string' && !editingId.includes('-'));
        if (!isMockUuid) {
          const { error: saveErr } = await supabase
            .from('patient_foot_assessments')
            .update({
              exam_date: examDate,
              result_status: isAbnormal ? 'ผิดปกติ' : 'ปกติ',
              notes: serializedNotes,
            })
            .eq('id', editingId);
          if (saveErr) throw saveErr;
        }
        setSaveSuccess(`แก้ไขผลการตรวจเท้าสำเร็จ — วันนัดล่าสุด: ${lastAppointmentDate}`);
      } else {
        await supabase.from('patient_foot_assessments').insert({
          patient_id: patientId,
          exam_date: examDate,
          result_status: isAbnormal ? 'ผิดปกติ' : 'ปกติ',
          notes: serializedNotes,
        });
        setSaveSuccess(`บันทึกผลการตรวจเท้าสำเร็จ — วันนัดล่าสุด: ${lastAppointmentDate}`);
      }
      
      // Reset form states
      setLtResult({ status: 'normal', positions: '', detail: '' });
      setRtResult({ status: 'normal', positions: '', detail: '' });
      setWagnerGrade('');
      setPulseLt({ status: 'normal', dorsalisPedis: false, posteriorTibial: false });
      setPulseRt({ status: 'normal', dorsalisPedis: false, posteriorTibial: false });
      setRemarks('');
      setEditingId(null);
      
      // Reload table
      fetchListData();
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
    setWagnerGrade('');
    setPulseLt({ status: 'normal', dorsalisPedis: false, posteriorTibial: false });
    setPulseRt({ status: 'normal', dorsalisPedis: false, posteriorTibial: false });
    setRemarks('');
    setEditingId(null);
    setSaveSuccess(''); setSaveError(''); setFormErrors({});
  };

  const handleStartEdit = (row: any) => {
    if (row.rawRecord) {
      const r = row.rawRecord;
      setEditingId(r.id);
      const patient = r.patients;
      if (patient) {
        setSelectedPatient({
          id: patient.id,
          hn: patient.hn,
          title: patient.title || '',
          first_name: patient.first_name || '',
          last_name: patient.last_name || '',
          gender: patient.gender || 'ชาย',
          phone_number: patient.phone_number || '',
          address: patient.address || '',
          emergency_contact_name: patient.emergency_contact_name || '',
          emergency_contact_phone: patient.emergency_contact_phone || '',
          medical_right: patient.medical_right || '',
          primary_doctor: patient.primary_doctor || '',
          chronic_disease_note: patient.chronic_disease_note || '',
          status: 'active'
        } as any);
        setHnQuery(patient.hn);
      }
      setExamDate(r.exam_date);
      
      const exam = parseFootExamNotes(r.notes);
      setLtResult(exam.ltResult || { status: 'normal', positions: '', detail: '' });
      setRtResult(exam.rtResult || { status: 'normal', positions: '', detail: '' });
      setWagnerGrade(exam.wagnerGrade || '');
      setPulseLt(exam.pulseLt || { status: 'normal', dorsalisPedis: false, posteriorTibial: false });
      setPulseRt(exam.pulseRt || { status: 'normal', dorsalisPedis: false, posteriorTibial: false });
      setRemarks(exam.remarks || '');
    } else {
      setEditingId(row.id);
      setSelectedPatient(null);
      setHnQuery(row.hn);
      setPatientNotFound(true);
      setMiniPatientForm({
        ...initialPatientForm,
        hn: row.hn,
        first_name: row.name,
      });
      setFullNameInput(row.name);
      
      const parseSide = (val: string) => {
        if (val === 'ปกติ') return { status: 'normal' as const, positions: '', detail: '' };
        const positions = val.match(/\d+/) ? val.match(/\d+/)?.[0] || '1' : '1';
        return { status: 'abnormal' as const, positions, detail: val };
      };
      setLtResult(parseSide(row.ltResult));
      setRtResult(parseSide(row.rtResult));
      
      const wagnerMatch = row.remarks.match(/Wagner:\s*(?:Grade\s*)?(\d+)/i);
      setWagnerGrade(wagnerMatch ? wagnerMatch[1] : '');
      
      const cleanRemarks = row.remarks.replace(/\[Wagner:[^\]]+\]\s*/i, '');
      setRemarks(cleanRemarks === '—' ? '' : cleanRemarks);
      
      const parsePulse = (side: 'ซ้าย' | 'ขวา') => {
        const hasSide = row.pulseResult.includes(side) || row.pulseResult.includes('ทั้ง 2 ข้าง');
        if (!hasSide) return { status: 'normal' as const, dorsalisPedis: false, posteriorTibial: false };
        return {
          status: 'abnormal' as const,
          dorsalisPedis: row.pulseResult.toLowerCase().includes('dorsalis'),
          posteriorTibial: row.pulseResult.toLowerCase().includes('posterior'),
        };
      };
      setPulseLt(parsePulse('ซ้าย'));
      setPulseRt(parsePulse('ขวา'));
    }
    
    setShowForm(true);
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

            <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🩺</span>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>โรคประจำตัวคนไข้:</span>
              </div>
              <div style={{ width: '100%', marginTop: '0.25rem' }}>
                <DiseaseMultiSelect
                  value={editedDiseases}
                  onChange={setEditedDiseases}
                />
              </div>
            </div>

            {/* Foot Ulcer Assessment Block */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '1.25rem', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🩹 การประเมินแผลบริเวณเท้า (Foot Ulcer Assessment)
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <FootResultInput side="Lt" value={ltResult} onChange={setLtResult} />
                <FootResultInput side="Rt" value={rtResult} onChange={setRtResult} />
              </div>

              {/* พบความผิดปกติ เอาไว้ก่อน Wagner Classification */}
              {(ltResult.status === 'abnormal' || rtResult.status === 'abnormal') && (
                <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
                  <strong>⚠️ พบความผิดปกติ:</strong>
                  {ltResult.status === 'abnormal' && <div>เท้าซ้าย: ผิดปกติ {ltResult.positions} ตำแหน่ง {ltResult.detail && `(${ltResult.detail})`}</div>}
                  {rtResult.status === 'abnormal' && <div>เท้าขวา: ผิดปกติ {rtResult.positions} ตำแหน่ง {rtResult.detail && `(${rtResult.detail})`}</div>}
                </div>
              )}

              {(ltResult.status === 'abnormal' || rtResult.status === 'abnormal') && (
                <div style={{ background: 'var(--bg-surface-solid)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <h5 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    🏥 การประเมินและจำแนกระดับความรุนแรงของแผลที่เท้า (Wagner Classification)
                  </h5>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8125rem' }}>ระดับความรุนแรงของแผล *</label>
                    <WagnerSelectSearch value={wagnerGrade} onChange={setWagnerGrade} />
                    {formErrors.wagner && <span className="form-error" style={{ marginTop: '0.25rem', display: 'block' }}>{formErrors.wagner}</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Pulse Evaluation & Remarks Block */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '1.25rem', marginTop: '1.25rem', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)' }}>
                💓 การประเมินชีพจรบริเวณเท้าทั้ง 2 ข้าง (2 ตำแหน่ง)
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                {/* Left Pulse */}
                <div style={{ background: 'var(--bg-surface-solid)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <h5 style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.75rem', color: '#6366f1' }}>ชีพจรเท้าซ้าย (Lt.)</h5>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                    {(['normal', 'abnormal'] as const).map(s => (
                      <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: pulseLt.status === s ? 600 : 400 }}>
                        <input type="radio" name="pulse-lt-status" checked={pulseLt.status === s}
                          onChange={() => setPulseLt({ ...pulseLt, status: s, ...(s === 'normal' ? { dorsalisPedis: false, posteriorTibial: false } : {}) })} />
                        <span>{s === 'normal' ? 'ปกติ' : 'ไม่ปกติ'}</span>
                      </label>
                    ))}
                  </div>
                  {pulseLt.status === 'abnormal' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ตำแหน่งชีพจรที่ไม่ปกติ:</span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', fontSize: '0.8125rem' }}>
                        <input type="checkbox" checked={pulseLt.dorsalisPedis}
                          onChange={e => setPulseLt({ ...pulseLt, dorsalisPedis: e.target.checked })} />
                        <span>Dorsalis pedis</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', fontSize: '0.8125rem' }}>
                        <input type="checkbox" checked={pulseLt.posteriorTibial}
                          onChange={e => setPulseLt({ ...pulseLt, posteriorTibial: e.target.checked })} />
                        <span>Posterior tibial</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Right Pulse */}
                <div style={{ background: 'var(--bg-surface-solid)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <h5 style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.75rem', color: '#f59e0b' }}>ชีพจรเท้าขวา (Rt.)</h5>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                    {(['normal', 'abnormal'] as const).map(s => (
                      <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: pulseRt.status === s ? 600 : 400 }}>
                        <input type="radio" name="pulse-rt-status" checked={pulseRt.status === s}
                          onChange={() => setPulseRt({ ...pulseRt, status: s, ...(s === 'normal' ? { dorsalisPedis: false, posteriorTibial: false } : {}) })} />
                        <span>{s === 'normal' ? 'ปกติ' : 'ไม่ปกติ'}</span>
                      </label>
                    ))}
                  </div>
                  {pulseRt.status === 'abnormal' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ตำแหน่งชีพจรที่ไม่ปกติ:</span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', fontSize: '0.8125rem' }}>
                        <input type="checkbox" checked={pulseRt.dorsalisPedis}
                          onChange={e => setPulseRt({ ...pulseRt, dorsalisPedis: e.target.checked })} />
                        <span>Dorsalis pedis</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', fontSize: '0.8125rem' }}>
                        <input type="checkbox" checked={pulseRt.posteriorTibial}
                          onChange={e => setPulseRt({ ...pulseRt, posteriorTibial: e.target.checked })} />
                        <span>Posterior tibial</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Remarks Textarea inside Pulse Block */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8125rem' }}>รายละเอียด/คำอธิบายเพิ่มเติม</label>
                <textarea 
                  className="form-textarea" 
                  rows={2} 
                  placeholder="ระบุรายละเอียดเพิ่มเติม หรือพยาธิสภาพของเท้าที่พบ..."
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                />
              </div>
            </div>
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

      {/* Criteria Legend */}
      <div style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(16,185,129,0.06) 100%)', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
        <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.95rem' }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#6366f1' }}></span>
          เกณฑ์การคัดกรองเท้าด้วย Monofilament
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', paddingLeft: '1rem' }}>
          <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#10b981', marginRight: 8, verticalAlign: 'middle' }}></span><strong>ปกติ:</strong> ตรวจรับรู้สัมผัส Monofilament ครบทุกตำแหน่งปกติทั้ง 2 ข้าง</span>
          <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#ef4444', marginRight: 8, verticalAlign: 'middle' }}></span><strong>ผิดปกติ:</strong> ตรวจพบสูญเสียการรับรู้สัมผัส (ตรวจไม่พบ) ตั้งแต่ 1 ตำแหน่งขึ้นไปข้างใดข้างหนึ่ง</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', alignItems: 'flex-end', marginBottom: '1rem', padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '180px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>ปี (พ.ศ.)</label>
          <CustomSelect value={filterYear} onChange={val => { setFilterYear(val); setPage(1); }} options={yearOptions} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '180px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>เดือน</label>
          <CustomSelect value={filterMonth} onChange={val => { setFilterMonth(val); setPage(1); }} options={monthOptions} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '180px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>วันที่ตรวจ (พ.ศ.)</label>
          <BuddhistDateInput value={filterDate} onChange={val => { setFilterDate(val); setPage(1); }} placeholder="ทั้งหมด (พ.ศ.)" style={{ height: '36px', minHeight: '36px' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', width: '180px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>ผลการคัดกรอง</label>
          <CustomSelect value={filterResult} onChange={val => { setFilterResult(val); setPage(1); }} options={resultOptions} />
        </div>
        <button
          className="btn"
          onClick={() => {
            setFilterYear(currentYearStr);
            setFilterMonth(currentMonthStr);
            setFilterDate('');
            setFilterResult('');
            setPage(1);
            setDbResults([]);
            setHasSearched(false);
          }}
          style={{
            width: 'auto',
            padding: '0.375rem 0.875rem',
            fontSize: '0.8rem',
            height: '36px',
            alignSelf: 'flex-end',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            color: 'var(--danger-foreground)',
            background: 'var(--danger-bg)',
            border: '1.5px solid var(--danger-border)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#fecdd3';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--danger-bg)';
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          ล้างตัวกรอง
        </button>
        <button
          className="btn btn-primary"
          onClick={() => fetchListData(1, pageSize)}
          disabled={listLoading}
          style={{
            width: 'auto',
            padding: '0.375rem 1rem',
            fontSize: '0.8rem',
            height: '36px',
            alignSelf: 'flex-end',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: listLoading ? 'rotate(360deg)' : 'none', transition: 'transform 0.5s' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          ค้นหา
        </button>
        <button
          className="btn"
          onClick={() => {
            setExportYear(filterYear || currentYearStr);
            setExportMonth(filterMonth || currentMonthStr);
            setExportResult(filterResult);
            setExportSuccess(false);
            setExportProgress(0);
            setExportMessage('');
            setExporting(false);
            setShowExportModal(true);
          }}
          style={{
            width: 'auto',
            padding: '0.375rem 1rem',
            fontSize: '0.8rem',
            height: '36px',
            alignSelf: 'flex-end',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#059669';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '#10b981';
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          นำออก Excel
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginLeft: 'auto', width: '90px' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>แสดงต่อหน้า</label>
          <CustomSelect value={String(pageSize)} onChange={val => { const newSize = Number(val); setPageSize(newSize); setPage(1); fetchListData(1, newSize); }} options={pageSizeOptions} />
        </div>
      </div>

      {/* Table */}
      {listError && (
        <div style={{ marginBottom: '0.75rem', padding: '0.75rem 1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', color: '#dc2626', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>⚠️ {listError}</span>
          <button className="btn btn-secondary" onClick={() => fetchListData()} style={{ width: 'auto', padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>ลองใหม่</button>
        </div>
      )}
      {(() => {
        const totalPages = Math.ceil(totalCount / pageSize);
        return (
          <>
            <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%)' }}>
                    <th style={{ ...thStyle, width: 52, textAlign: 'center' }}>ลำดับ</th>
                    <th style={thStyle}>HN</th>
                    <th style={thStyle}>ชื่อ-สกุล</th>
                    <th style={thStyle}>แพทย์เจ้าของไข้</th>
                    <th style={thStyle}>วันที่ตรวจ</th>
                    <th style={thStyle}>โรคประจำตัว</th>
                    <th style={thStyle}>เท้าซ้าย (Lt.)</th>
                    <th style={thStyle}>เท้าขวา (Rt.)</th>
                    <th style={thStyle}>สรุปผลการประเมินชีพจรที่เท้า</th>
                    <th style={thStyle}>หมายเหตุ</th>
                    <th style={{ ...thStyle, width: 80, textAlign: 'center' }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {!hasSearched ? (
                    <tr>
                      <td colSpan={11} style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        🔍 กรุณากดปุ่ม <strong>"ค้นหา"</strong> ด้านบนเพื่อแสดงรายการผลตรวจ
                      </td>
                    </tr>
                  ) : listLoading ? (
                    <tr>
                      <td colSpan={11} style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        ⏳ กำลังโหลดข้อมูลคัดกรองเท้า...
                      </td>
                    </tr>
                  ) : pageData.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        ไม่พบข้อมูลการตรวจคัดกรองเท้า
                      </td>
                    </tr>
                  ) : (
                    pageData.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', textAlign: 'center' }}>{(page - 1) * pageSize + idx + 1}</td>
                        <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600 }}>{row.hn}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{row.name}</td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.775rem' }}>{row.doctor}</td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{row.date}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                            {row.diseases && row.diseases !== '—' ? (
                              row.diseases.split(',').map((d: any) => (
                                <span key={d} style={{ background: 'var(--primary)', color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{d.trim()}</span>
                              ))
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: row.ltResult.includes('ผิดปกติ') ? '#ef4444' : '#10b981', fontWeight: 600 }}>{row.ltResult}</td>
                        <td style={{ padding: '0.75rem 1rem', color: row.rtResult.includes('ผิดปกติ') ? '#ef4444' : '#10b981', fontWeight: 600 }}>{row.rtResult}</td>
                        <td style={{ padding: '0.75rem 1rem', color: row.pulseResult.includes('ซ้าย') || row.pulseResult.includes('ขวา') || row.pulseResult.includes('ไม่ปกติ') ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                          {row.pulseResult}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{row.remarks}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => handleStartEdit(row)}
                            style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                          >
                            ✏️ แก้ไข
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {hasSearched && pageData.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>แสดง {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} จาก {totalCount} รายการ</span>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <button className="btn btn-secondary" onClick={() => { const newPage = Math.max(1, page - 1); setPage(newPage); fetchListData(newPage, pageSize); }} disabled={page === 1} style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>‹ ก่อนหน้า</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} className={`btn ${p === page ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setPage(p); fetchListData(p, pageSize); }} style={{ width: 32, padding: '0.35rem 0', fontSize: '0.8rem', minWidth: 32 }}>{p}</button>
                  ))}
                  <button className="btn btn-secondary" onClick={() => { const newPage = Math.min(totalPages, page + 1); setPage(newPage); fetchListData(newPage, pageSize); }} disabled={page === totalPages} style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>ถัดไป ›</button>
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Export to Excel Modal */}
      {showExportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: 'var(--bg-surface-solid)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '440px', padding: '1.5rem', boxShadow: 'var(--shadow-2xl)', display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', animation: 'scaleUp 0.2s ease-out' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.25rem 0' }}>📂 ส่งออกรายงานคัดกรองเท้า (Excel)</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>กรุณาเลือกปีกิจกรรมและรูปแบบขอบเขตของข้อมูลที่ท่านต้องการนำออก</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>ปี (พ.ศ.)</label>
                  <CustomSelect value={exportYear} onChange={setExportYear} options={yearOptions} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>เดือน</label>
                  <CustomSelect value={exportMonth} onChange={setExportMonth} options={monthOptions.filter(o => o.value !== '')} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>คัดกรองด้วยสถานะ</label>
                <CustomSelect value={exportResult} onChange={setExportResult} options={resultOptions} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}>ช่วงเวลานำออก</label>
                <div
                  onClick={() => !exporting && setExportMode('month')}
                  style={{
                    border: exportMode === 'month' ? '2px solid #10b981' : '1.5px solid var(--border-color)',
                    background: exportMode === 'month' ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.875rem',
                    cursor: exporting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: exportMode === 'month' ? '#10b981' : 'var(--text-primary)' }}>รายเดือน</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    เฉพาะ {THAI_MONTHS.find(m => m.value === exportMonth)?.label ?? exportMonth} พ.ศ. {parseInt(exportYear) + 543}
                  </span>
                </div>

                <div
                  onClick={() => !exporting && setExportMode('year')}
                  style={{
                    border: exportMode === 'year' ? '2px solid #10b981' : '1.5px solid var(--border-color)',
                    background: exportMode === 'year' ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.875rem',
                    cursor: exporting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: exportMode === 'year' ? '#10b981' : 'var(--text-primary)' }}>รายปี</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    รวมทั้งปี พ.ศ. {parseInt(exportYear) + 543} (รองรับขนาด &gt;1,000 แถว)
                  </span>
                </div>
              </div>
            </div>

            {/* Progress Section */}
            {(exporting || exportProgress > 0 || exportMessage) && (
              <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                  <span style={{ color: exportSuccess ? '#10b981' : 'var(--text-primary)' }}>
                    {exportSuccess ? '🎉 ดาวน์โหลดสำเร็จ' : exporting ? '⏳ กำลังทำงาน...' : 'ℹ️ รอเริ่มการดาวน์โหลด'}
                  </span>
                  <span>{exportProgress}%</span>
                </div>
                <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${exportProgress}%`,
                    height: '100%',
                    background: exportSuccess ? '#10b981' : 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
                    borderRadius: '9999px',
                    transition: 'width 0.2s ease-out'
                  }}></div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-word' }}>{exportMessage}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
              <button
                className="btn btn-secondary"
                disabled={exporting}
                onClick={() => setShowExportModal(false)}
                style={{ width: 'auto', padding: '0.45rem 1.25rem', fontSize: '0.85rem' }}
              >
                {exportSuccess ? 'ปิด' : 'ยกเลิก'}
              </button>
              {!exportSuccess && (
                <button
                  className="btn"
                  disabled={exporting}
                  onClick={handleExportExcel}
                  style={{
                    width: 'auto',
                    padding: '0.45rem 1.5rem',
                    fontSize: '0.85rem',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    cursor: exporting ? 'not-allowed' : 'pointer',
                    opacity: exporting ? 0.7 : 1
                  }}
                >
                  {exporting ? 'กำลังส่งคำขอ...' : 'ดาวน์โหลด Excel'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
