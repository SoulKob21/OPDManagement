import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Patient, Doctor } from '../types/opd';
import { TITLES, GENDERS, MEDICAL_RIGHTS, MOCK_DOCTORS } from '../types/opd';
import { BuddhistDateInput } from '../components/BuddhistDateInput';
import { ConfirmModal } from '../components/ConfirmModal';

type ViewMode = 'list' | 'create' | 'edit' | 'detail';

interface PatientFormState {
  hn: string;
  title: string;
  first_name: string;
  last_name: string;
  citizen_id: string;
  passport_number: string;
  gender: string;
  date_of_birth: string;
  phone_number: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  medical_right: string;
  primary_doctor: string;
  allergy_note: string;
  chronic_disease_note: string;
  status: 'active' | 'inactive';
}

const initialFormState: PatientFormState = {
  hn: '',
  title: 'นาย',
  first_name: '',
  last_name: '',
  citizen_id: '',
  passport_number: '',
  gender: 'ชาย',
  date_of_birth: '',
  phone_number: '',
  address: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  medical_right: 'บัตรทอง (หลักประกันสุขภาพถ้วนหน้า)',
  primary_doctor: '',
  allergy_note: '',
  chronic_disease_note: '',
  status: 'active',
};

export const PatientsPage: React.FC<{ onRefreshStats?: () => void }> = ({ onRefreshStats }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Patient for detail/edit
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientHistory, setPatientHistory] = useState<{ appointments: any[]; queues: any[] }>({ appointments: [], queues: [] });
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form State
  const [formData, setFormData] = useState<PatientFormState>(initialFormState);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof PatientFormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  // Custom delete confirmation state
  const [deletePatient, setDeletePatient] = useState<Patient | null>(null);

  // Doctor Autocomplete State
  const [doctorQuery, setDoctorQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [activeDoctorIndex, setActiveDoctorIndex] = useState(-1);
  const [doctorsList, setDoctorsList] = useState<Doctor[]>(() => {
    return [...MOCK_DOCTORS].sort((a, b) => a.id - b.id);
  });

  // Fetch doctors from DB (fallback to MOCK_DOCTORS)
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { data, error } = await supabase
          .from('doctors')
          .select('*')
          .eq('status', 'active')
          .order('id', { ascending: true });
        if (!error && data && data.length > 0) {
          setDoctorsList(data);
        }
      } catch {
        // fallback to MOCK_DOCTORS silently
      }
    };
    fetchDoctors();
  }, []);

  const filteredDoctors = doctorsList.filter((d) => {
    if (!doctorQuery.trim()) return true;
    const q = doctorQuery.toLowerCase();
    return (
      String(d.id).includes(q) ||
      d.name.toLowerCase().includes(q) ||
      d.specialty.toLowerCase().includes(q) ||
      d.license_no.toLowerCase().includes(q)
    );
  });

  const handleSelectDoctor = (doc: Doctor) => {
    setSelectedDoctor(doc);
    setFormData({ ...formData, primary_doctor: doc.name });
    setDoctorQuery('');
    setShowDoctorDropdown(false);
    setActiveDoctorIndex(-1);
  };

  const handleClearDoctor = () => {
    setSelectedDoctor(null);
    setFormData({ ...formData, primary_doctor: '' });
    setDoctorQuery('');
  };

  const handleDoctorKeyDown = (e: React.KeyboardEvent) => {
    if (!showDoctorDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveDoctorIndex(prev => Math.min(prev + 1, filteredDoctors.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveDoctorIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && activeDoctorIndex >= 0) {
      e.preventDefault();
      handleSelectDoctor(filteredDoctors[activeDoctorIndex]);
    } else if (e.key === 'Escape') {
      setShowDoctorDropdown(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (selectedPatient && viewMode === 'detail') {
      fetchPatientHistory(selectedPatient.id);
    }
  }, [selectedPatient, viewMode]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchErr } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setPatients(data || []);
    } catch (err: any) {
      console.error('Error fetching patients:', err);
      setError('ไม่สามารถโหลดข้อมูลผู้ป่วยได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientHistory = async (patientId: string) => {
    try {
      setLoadingHistory(true);
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId)
        .order('appointment_date', { ascending: false })
        .limit(5);

      const { data: queues } = await supabase
        .from('queues')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(5);

      setPatientHistory({ appointments: appointments || [], queues: queues || [] });
    } catch (err) {
      console.error('Error fetching patient history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchPatients();
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const query = `%${searchQuery.trim()}%`;
      const { data, error: searchErr } = await supabase
        .from('patients')
        .select('*')
        .or(`hn.ilike.${query},citizen_id.ilike.${query},passport_number.ilike.${query},first_name.ilike.${query},last_name.ilike.${query},phone_number.ilike.${query}`)
        .order('created_at', { ascending: false });

      if (searchErr) throw searchErr;
      setPatients(data || []);
    } catch (err: any) {
      console.error('Search error:', err);
      setError('เกิดข้อผิดพลาดในการค้นหาข้อมูลผู้ป่วย');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dobString: string): number => {
    if (!dobString) return 0;
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age >= 0 ? age : 0;
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof PatientFormState, string>> = {};

    if (!formData.hn.trim()) errors.hn = 'กรุณาระบุ HN';
    if (!formData.first_name.trim()) errors.first_name = 'กรุณาระบุชื่อจริง';
    if (!formData.primary_doctor.trim()) errors.primary_doctor = 'กรุณาระบุแพทย์เจ้าของไข้';

    // Citizen ID format check (only if provided)
    if (formData.citizen_id.trim() && !/^\d{13}$/.test(formData.citizen_id.trim())) {
      errors.citizen_id = 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const payload = {
        hn: formData.hn.trim(),
        title: formData.title,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        citizen_id: formData.citizen_id || null,
        passport_number: formData.passport_number || null,
        gender: formData.gender,
        date_of_birth: formData.date_of_birth || null,
        phone_number: formData.phone_number || '',
        address: formData.address || '',
        emergency_contact_name: formData.emergency_contact_name || '',
        emergency_contact_phone: formData.emergency_contact_phone || '',
        medical_right: formData.medical_right,
        primary_doctor: formData.primary_doctor.trim(),
        allergy_note: formData.allergy_note || null,
        chronic_disease_note: formData.chronic_disease_note || null,
        status: formData.status,
        updated_at: new Date().toISOString(),
      };

      if (viewMode === 'edit' && selectedPatient) {
        const { data, error: updateErr } = await supabase
          .from('patients')
          .update(payload)
          .eq('id', selectedPatient.id)
          .select();

        if (updateErr) throw updateErr;
        setSuccess('บันทึกข้อมูลผู้ป่วยสำเร็จ');
        setPatients(patients.map(p => p.id === selectedPatient.id ? data[0] : p));
        setSelectedPatient(data[0]);
        setViewMode('detail');
      } else {
        const { data, error: insertErr } = await supabase
          .from('patients')
          .insert(payload)
          .select();

        if (insertErr) throw insertErr;
        setSuccess('เพิ่มผู้ป่วยใหม่สำเร็จ (HN: ' + formData.hn + ')');
        setPatients([data[0], ...patients]);
        setSelectedPatient(data[0]);
        setViewMode('detail');
      }

      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      console.error('Error saving patient:', err);
      setError('ไม่สามารถบันทึกข้อมูลผู้ป่วยได้: ' + (err.message || 'ข้อผิดพลาดเกี่ยวกับสิทธิ์หรือระบบ'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePatient = (patient: Patient) => {
    setDeletePatient(patient);
  };

  const executeDeletePatient = async (patient: Patient) => {
    try {
      setError(null);
      setSuccess(null);
      const { error: deleteErr } = await supabase
        .from('patients')
        .delete()
        .eq('id', patient.id);

      if (deleteErr) throw deleteErr;
      setSuccess(`ลบข้อมูลผู้ป่วย "${patient.title}${patient.first_name} ${patient.last_name}" สำเร็จ`);
      fetchPatients();
      if (viewMode === 'detail') {
        setViewMode('list');
        setSelectedPatient(null);
      }
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      console.error('Error deleting patient:', err);
      setError('ไม่สามารถลบข้อมูลผู้ป่วยได้: ' + (err.message || 'ข้อผิดพลาดระบบ'));
    }
  };

  const goToCreate = () => {
    setFormData(initialFormState);
    setFormErrors({});
    setSelectedPatient(null);
    setSelectedDoctor(null);
    setDoctorQuery('');
    setSuccess(null);
    setError(null);
    setViewMode('create');
  };

  const goToEdit = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData({
      hn: patient.hn,
      title: patient.title,
      first_name: patient.first_name,
      last_name: patient.last_name,
      citizen_id: patient.citizen_id || '',
      passport_number: patient.passport_number || '',
      gender: patient.gender,
      date_of_birth: patient.date_of_birth || '',
      phone_number: patient.phone_number,
      address: patient.address,
      emergency_contact_name: patient.emergency_contact_name,
      emergency_contact_phone: patient.emergency_contact_phone,
      medical_right: patient.medical_right,
      primary_doctor: patient.primary_doctor || '',
      allergy_note: patient.allergy_note || '',
      chronic_disease_note: patient.chronic_disease_note || '',
      status: patient.status,
    });
    // Try to match existing doctor to a mock record
    const matchedDoc = doctorsList.find(d => d.name === patient.primary_doctor) || MOCK_DOCTORS.find(d => d.name === patient.primary_doctor);
    setSelectedDoctor(matchedDoc || null);
    setDoctorQuery('');
    setFormErrors({});
    setSuccess(null);
    setError(null);
    setViewMode('edit');
  };

  const goToDetail = (patient: Patient) => {
    setSelectedPatient(patient);
    setSuccess(null);
    setError(null);
    setViewMode('detail');
  };

  const goToList = () => {
    setViewMode('list');
    setSelectedPatient(null);
    setSuccess(null);
    setError(null);
  };

  // ========= FORM VIEW (Create / Edit) =========
  const renderForm = () => (
    <div style={{ animation: 'fadeIn 0.2s' }}>
      {/* Back button */}
      <button
        className="btn btn-secondary"
        style={{ width: 'auto', marginBottom: '1.25rem', padding: '0.4rem 1rem', fontSize: '0.8125rem' }}
        onClick={goToList}
      >
        ← กลับไปหน้ารายชื่อ
      </button>

      <div className="dashboard-card">
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          {viewMode === 'edit' ? `แก้ไขระเบียนผู้ป่วย — ${selectedPatient?.hn}` : 'ลงทะเบียนผู้ป่วยใหม่'}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Row 1: HN + Primary Doctor + Name */}
          <div className="opd-form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="form-group">
              <label className="form-label">HN (เลขประจำตัวผู้ป่วย) *</label>
              <input
                type="text"
                className="form-input"
                placeholder="เช่น HN-260619-0001"
                value={formData.hn}
                onChange={(e) => setFormData({ ...formData, hn: e.target.value })}
                disabled={viewMode === 'edit'}
              />
              {formErrors.hn && <span className="form-error">{formErrors.hn}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">แพทย์เจ้าของไข้ *</label>
              {selectedDoctor ? (
                <div className="autocomplete-selected-tag">
                  <span className="autocomplete-item-id">{selectedDoctor.id}</span>
                  <span>{selectedDoctor.name} — {selectedDoctor.specialty} ({selectedDoctor.license_no})</span>
                  <button type="button" onClick={handleClearDoctor} title="ล้างแพทย์ที่เลือก">&times;</button>
                </div>
              ) : (
                <div className="autocomplete-wrapper">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="พิมพ์ ID, ชื่อ, สาขา หรือเลขใบอนุญาต เพื่อค้นหาแพทย์..."
                    value={doctorQuery}
                    onChange={(e) => {
                      setDoctorQuery(e.target.value);
                      setShowDoctorDropdown(true);
                      setActiveDoctorIndex(-1);
                    }}
                    onFocus={() => setShowDoctorDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDoctorDropdown(false), 200)}
                    onKeyDown={handleDoctorKeyDown}
                  />
                  {showDoctorDropdown && (
                    <div className="autocomplete-dropdown">
                      {filteredDoctors.length === 0 ? (
                        <div className="autocomplete-empty">ไม่พบแพทย์ที่ตรงกับ "{doctorQuery}"</div>
                      ) : (
                        filteredDoctors.map((doc, idx) => (
                          <div
                            key={doc.id}
                            className={`autocomplete-item ${idx === activeDoctorIndex ? 'active' : ''}`}
                            onMouseDown={() => handleSelectDoctor(doc)}
                          >
                            <span className="autocomplete-item-id">{doc.id}</span>
                            <div className="autocomplete-item-info">
                              <div className="autocomplete-item-name">{doc.name}</div>
                              <div className="autocomplete-item-meta">{doc.specialty} • {doc.license_no}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
              {formErrors.primary_doctor && <span className="form-error">{formErrors.primary_doctor}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">สถานะของคนไข้</label>
              <select
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
              >
                <option value="active">ใช้งานปกติ (Active)</option>
                <option value="inactive">ระงับการใช้งาน (Inactive)</option>
              </select>
            </div>
          </div>

          {/* Divider */}
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }} />
          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem' }}>ข้อมูลส่วนตัว</h4>

          {/* Row 2: Title, First Name, Last Name */}
          <div className="opd-form-grid" style={{ gridTemplateColumns: '140px 1fr 1fr' }}>
            <div className="form-group">
              <label className="form-label">คำนำหน้า</label>
              <select
                className="form-select"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              >
                {TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">ชื่อจริง *</label>
              <input
                type="text"
                className="form-input"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
              {formErrors.first_name && <span className="form-error">{formErrors.first_name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">นามสกุล</label>
              <input
                type="text"
                className="form-input"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>
          </div>

          {/* Row 3: Citizen ID, Passport, Gender, DOB */}
          <div className="opd-form-grid">
            <div className="form-group">
              <label className="form-label">เลขบัตรประชาชน</label>
              <input
                type="text"
                className="form-input"
                maxLength={13}
                placeholder="ตัวเลข 13 หลัก"
                value={formData.citizen_id}
                onChange={(e) => setFormData({ ...formData, citizen_id: e.target.value.replace(/\D/g, '') })}
              />
              {formErrors.citizen_id && <span className="form-error">{formErrors.citizen_id}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">เลขหนังสือเดินทาง (Passport)</label>
              <input
                type="text"
                className="form-input"
                placeholder="ในกรณีที่ไม่ใช่คนไทย"
                value={formData.passport_number}
                onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">เพศ</label>
              <select
                className="form-select"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">วันเดือนปีเกิด</label>
              <BuddhistDateInput
                value={formData.date_of_birth}
                max={new Date().toISOString().split('T')[0]}
                onChange={(d) => setFormData({ ...formData, date_of_birth: d })}
                placeholder="เลือกวันเกิด (พ.ศ.)"
              />
            </div>
          </div>

          {/* Row 4: Contact */}
          <div className="opd-form-grid">
            <div className="form-group">
              <label className="form-label">เบอร์โทรศัพท์</label>
              <input
                type="tel"
                className="form-input"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">สิทธิการรักษา</label>
              <select
                className="form-select"
                value={formData.medical_right}
                onChange={(e) => setFormData({ ...formData, medical_right: e.target.value })}
              >
                {MEDICAL_RIGHTS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">ชื่อผู้ติดต่อฉุกเฉิน</label>
              <input
                type="text"
                className="form-input"
                value={formData.emergency_contact_name}
                onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">เบอร์ผู้ติดต่อฉุกเฉิน</label>
              <input
                type="tel"
                className="form-input"
                value={formData.emergency_contact_phone}
                onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
              />
            </div>
          </div>

          {/* Address */}
          <div className="form-group" style={{ marginTop: '0.25rem' }}>
            <label className="form-label">ที่อยู่ปัจจุบัน</label>
            <textarea
              className="form-textarea"
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          {/* Divider */}
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }} />
          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem' }}>ข้อมูลทางคลินิก</h4>

          <div className="opd-form-grid">
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--danger-foreground)' }}>ข้อมูลการแพ้ยา (ถ้ามี)</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="ระบุยาที่แพ้และอาการ..."
                value={formData.allergy_note}
                onChange={(e) => setFormData({ ...formData, allergy_note: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">โรคประจำตัว (ถ้ามี)</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="ระบุโรคประจำตัว..."
                value={formData.chronic_disease_note}
                onChange={(e) => setFormData({ ...formData, chronic_disease_note: e.target.value })}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
            <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={goToList}>ยกเลิก</button>
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: 'auto' }}>
              {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // ========= DETAIL VIEW =========
  const renderDetail = () => {
    if (!selectedPatient) return null;
    return (
      <div style={{ animation: 'fadeIn 0.2s' }}>
        {/* Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <button
            className="btn btn-secondary"
            style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.8125rem' }}
            onClick={goToList}
          >
            ← กลับไปหน้ารายชื่อ
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-primary"
              style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.8125rem' }}
              onClick={() => goToEdit(selectedPatient)}
            >
              แก้ไขระเบียน
            </button>
            <button
              className="btn btn-danger"
              style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.8125rem' }}
              onClick={() => handleDeletePatient(selectedPatient)}
            >
              ลบระเบียน
            </button>
          </div>
        </div>

        <div className="dashboard-card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {selectedPatient.title}{selectedPatient.first_name} {selectedPatient.last_name}
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            HN: <strong style={{ color: 'var(--primary)' }}>{selectedPatient.hn}</strong>
            {' • '}
            แพทย์เจ้าของไข้: <strong>{selectedPatient.primary_doctor || '—'}</strong>
            {' • '}
            สถานะ: <span className={`badge ${selectedPatient.status === 'active' ? 'badge-status-active' : 'badge-status-inactive'}`} style={{ marginLeft: 4 }}>
              {selectedPatient.status === 'active' ? 'ใช้งานปกติ' : 'ระงับการใช้งาน'}
            </span>
          </p>

          {selectedPatient.allergy_note && (
            <div className="allergy-alert-box">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span>แพ้ยา: {selectedPatient.allergy_note}</span>
            </div>
          )}

          <div className="detail-grid">
            <div className="detail-sidebar-card">
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>ข้อมูลหลัก</p>
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}><strong>HN:</strong> {selectedPatient.hn}</p>
              <p style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}><strong>เลขบัตร:</strong> {selectedPatient.citizen_id || selectedPatient.passport_number || '—'}</p>
              <p style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}><strong>เพศ:</strong> {selectedPatient.gender}</p>
              <p style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}><strong>อายุ:</strong> {selectedPatient.date_of_birth ? `${calculateAge(selectedPatient.date_of_birth)} ปี (${new Date(selectedPatient.date_of_birth).toLocaleDateString('th-TH')})` : '—'}</p>
              <p style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}><strong>เบอร์โทร:</strong> {selectedPatient.phone_number || '—'}</p>
              <p style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}><strong>สิทธิการรักษา:</strong> {selectedPatient.medical_right}</p>
              <p style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}><strong>แพทย์เจ้าของไข้:</strong> {selectedPatient.primary_doctor || '—'}</p>
            </div>

            <div className="detail-main-content">
              <div className="detail-section">
                <h4>ข้อมูลติดต่อและประวัติทางคลินิก</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                  <div>
                    <p><strong>ที่อยู่ปัจจุบัน:</strong></p>
                    <p style={{ color: 'var(--text-secondary)' }}>{selectedPatient.address || '—'}</p>
                  </div>
                  <div>
                    <p><strong>ผู้ติดต่อฉุกเฉิน:</strong></p>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      {selectedPatient.emergency_contact_name ? `${selectedPatient.emergency_contact_name} (${selectedPatient.emergency_contact_phone})` : '—'}
                    </p>
                  </div>
                </div>
                <div style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
                  <p><strong>โรคประจำตัว:</strong></p>
                  <p style={{ color: 'var(--text-secondary)' }}>{selectedPatient.chronic_disease_note || '—'}</p>
                </div>
              </div>

              <div className="detail-section">
                <h4>ประวัติการรักษาสังเขป (นัดหมาย & คิว)</h4>
                {loadingHistory ? (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>กำลังโหลดประวัติ...</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.8125rem' }}>
                    <div>
                      <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>นัดหมายล่าสุด</p>
                      {patientHistory.appointments.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>ไม่มีข้อมูลการนัดหมาย</p>
                      ) : (
                        <ul style={{ paddingLeft: '1.25rem' }}>
                          {patientHistory.appointments.map((a: any) => (
                            <li key={a.id} style={{ marginBottom: '0.25rem' }}>
                              {a.appointment_date} | {a.department} ({a.doctor_name})
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>ประวัติคิวรักษา</p>
                      {patientHistory.queues.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>ไม่มีข้อมูลประวัติคิว</p>
                      ) : (
                        <ul style={{ paddingLeft: '1.25rem' }}>
                          {patientHistory.queues.map((q: any) => (
                            <li key={q.id} style={{ marginBottom: '0.25rem' }}>
                              คิว {q.queue_number} ({q.queue_date}) - {q.department}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ========= LIST VIEW =========
  const renderList = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>ลงทะเบียนผู้ป่วย (Patient Registration)</h2>
        <button className="btn btn-primary" onClick={goToCreate} style={{ width: 'auto' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
          เพิ่มผู้ป่วยใหม่
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="search-bar">
        <div className="search-input-wrapper">
          <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="ค้นหาด้วย HN, เลขบัตรประชาชน, พาสปอร์ต, ชื่อ-นามสกุล หรือเบอร์โทร..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-secondary" style={{ width: 'auto' }}>ค้นหา</button>
        {searchQuery && (
          <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => { setSearchQuery(''); fetchPatients(); }}>
            ล้างตัวกรอง
          </button>
        )}
      </form>

      {/* Patient Table */}
      <div className="opd-table-container">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <span className="spinner" style={{ display: 'inline-block' }}></span>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>กำลังโหลดข้อมูลผู้ป่วย...</p>
          </div>
        ) : patients.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginBottom: '1rem', opacity: 0.4 }}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            <p style={{ fontWeight: 600 }}>ไม่พบข้อมูลผู้ป่วย</p>
            <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>กรุณากดปุ่ม "เพิ่มผู้ป่วยใหม่" เพื่อเริ่มสร้างระเบียนข้อมูล</p>
          </div>
        ) : (
          <table className="opd-table">
            <thead>
              <tr>
                <th>HN</th>
                <th>ชื่อ-นามสกุล</th>
                <th>แพทย์เจ้าของไข้</th>
                <th>บัตรประชาชน / พาสปอร์ต</th>
                <th>เบอร์โทรศัพท์</th>
                <th>สิทธิการรักษา</th>
                <th>สถานะ</th>
                <th style={{ textAlign: 'right' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr
                  key={patient.id}
                  onClick={() => goToDetail(patient)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{patient.hn}</td>
                  <td>{patient.title}{patient.first_name} {patient.last_name}</td>
                  <td>{patient.primary_doctor || '—'}</td>
                  <td>{patient.citizen_id || patient.passport_number || '—'}</td>
                  <td>{patient.phone_number || '—'}</td>
                  <td>{patient.medical_right.split(' ')[0]}</td>
                  <td>
                    <span className={`badge ${patient.status === 'active' ? 'badge-status-active' : 'badge-status-inactive'}`}>
                      {patient.status === 'active' ? 'ใช้งานปกติ' : 'ระงับการใช้งาน'}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="row-actions">
                      <button
                        className="btn btn-secondary"
                        style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        onClick={() => goToEdit(patient)}
                      >
                        แก้ไข
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        onClick={() => handleDeletePatient(patient)}
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  // ========= MAIN RENDER =========
  return (
    <div>
      {/* Notifications */}
      {success && (
        <div className="alert alert-success" role="alert">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="alert alert-danger" role="alert">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>{error}</span>
        </div>
      )}

      {(viewMode === 'create' || viewMode === 'edit') && renderForm()}
      {viewMode === 'detail' && renderDetail()}
      {viewMode === 'list' && renderList()}

      <ConfirmModal
        isOpen={deletePatient !== null}
        onClose={() => setDeletePatient(null)}
        onConfirm={() => {
          if (deletePatient !== null) {
            executeDeletePatient(deletePatient);
          }
        }}
        title="ยืนยันการลบระเบียนผู้ป่วย"
        message={
          deletePatient && (
            <>
              คุณต้องการลบระเบียนผู้ป่วย <strong>"{deletePatient.title}${deletePatient.first_name} ${deletePatient.last_name}" (HN: {deletePatient.hn})</strong> ใช่หรือไม่?
              <br />
              การดำเนินการนี้จะลบประวัติการนัดหมายและคิวทั้งหมดของผู้ป่วยรายนี้ด้วยและไม่สามารถกู้คืนได้
            </>
          )
        }
        confirmText="ลบระเบียน"
        cancelText="ยกเลิก"
      />
    </div>
  );
};

export default PatientsPage;
