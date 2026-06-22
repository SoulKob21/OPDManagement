import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Appointment, Patient, QueuePriority } from '../types/opd';
import { DEPARTMENTS, APPOINTMENT_STATUS_LABELS } from '../types/opd';
import { BuddhistDateInput } from '../components/BuddhistDateInput';

interface AppointmentFormState {
  patient_id: string;
  appointment_date: string;
  appointment_time: string;
  department: string;
  doctor_name: string;
  reason: string;
  note: string;
  status: Appointment['status'];
}

const initialFormState: AppointmentFormState = {
  patient_id: '',
  appointment_date: '',
  appointment_time: '',
  department: 'อายุรกรรม (Medicine)',
  doctor_name: '',
  reason: '',
  note: '',
  status: 'scheduled',
};

export const AppointmentsPage: React.FC<{ onRefreshStats?: () => void }> = ({ onRefreshStats }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters State
  const [filterDate, setFilterDate] = useState('');
  const [filterPatientQuery, setFilterPatientQuery] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [formData, setFormData] = useState<AppointmentFormState>(initialFormState);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof AppointmentFormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  // Patient Search inside modal
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [searchedPatients, setSearchedPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchingPatients, setSearchingPatients] = useState(false);

  // Check-in state for automatically generating a queue
  const [checkingInApp, setCheckingInApp] = useState<Appointment | null>(null);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [checkInPriority, setCheckInPriority] = useState<QueuePriority>('normal');
  const [creatingQueue, setCreatingQueue] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Join with patients details
      const { data, error: fetchErr } = await supabase
        .from('appointments')
        .select('*, patients(*)')
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (fetchErr) throw fetchErr;
      setAppointments(data || []);
    } catch (err: any) {
      console.error('Error fetching appointments:', err);
      setError('ไม่สามารถโหลดข้อมูลนัดหมายได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchPatients = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientSearchQuery.trim()) return;

    try {
      setSearchingPatients(true);
      const query = `%${patientSearchQuery.trim()}%`;
      const { data, error: searchErr } = await supabase
        .from('patients')
        .select('*')
        .or(`hn.ilike.${query},first_name.ilike.${query},last_name.ilike.${query},phone_number.ilike.${query}`)
        .eq('status', 'active')
        .limit(10);

      if (searchErr) throw searchErr;
      setSearchedPatients(data || []);
    } catch (err) {
      console.error('Error searching patients:', err);
    } finally {
      setSearchingPatients(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof AppointmentFormState, string>> = {};

    if (!formData.patient_id) errors.patient_id = 'กรุณาเลือกผู้ป่วย';
    if (!formData.appointment_date) errors.appointment_date = 'กรุณาระบุวันที่นัดหมาย';
    if (!formData.appointment_time) errors.appointment_time = 'กรุณาระบุเวลานัดหมาย';
    if (!formData.doctor_name.trim()) errors.doctor_name = 'กรุณาระบุชื่อแพทย์';
    if (!formData.reason.trim()) errors.reason = 'กรุณาระบุเหตุผลการนัดหมาย';

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

      if (editingAppointment) {
        // Edit flow
        const { error: updateErr } = await supabase
          .from('appointments')
          .update({
            patient_id: formData.patient_id,
            appointment_date: formData.appointment_date,
            appointment_time: formData.appointment_time,
            department: formData.department,
            doctor_name: formData.doctor_name,
            reason: formData.reason,
            note: formData.note || null,
            status: formData.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingAppointment.id);

        if (updateErr) throw updateErr;
        setSuccess('บันทึกการแก้ไขนัดหมายสำเร็จ');
      } else {
        // Create flow
        const { error: insertErr } = await supabase
          .from('appointments')
          .insert({
            patient_id: formData.patient_id,
            appointment_date: formData.appointment_date,
            appointment_time: formData.appointment_time,
            department: formData.department,
            doctor_name: formData.doctor_name,
            reason: formData.reason,
            note: formData.note || null,
            status: 'scheduled',
          });

        if (insertErr) throw insertErr;
        setSuccess('สร้างนัดหมายสำเร็จ');
      }

      setIsModalOpen(false);
      fetchAppointments();
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      console.error('Error saving appointment:', err);
      setError('ไม่สามารถบันทึกข้อมูลนัดหมายได้: ' + (err.message || 'ข้อผิดพลาดระบบ'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAppointment = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('คุณต้องการยกเลิกนัดหมายนี้ใช่หรือไม่?')) return;

    try {
      setError(null);
      setSuccess(null);
      const { error: cancelErr } = await supabase
        .from('appointments')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (cancelErr) throw cancelErr;
      setSuccess('ยกเลิกนัดหมายสำเร็จ');
      fetchAppointments();
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      console.error('Error cancelling appointment:', err);
      setError('ไม่สามารถยกเลิกนัดหมายได้: ' + err.message);
    }
  };

  const handleOpenCheckIn = (app: Appointment, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckingInApp(app);
    setCheckInPriority('normal');
    setIsCheckInModalOpen(true);
  };

  const handleExecuteCheckIn = async () => {
    if (!checkingInApp) return;

    try {
      setCreatingQueue(true);
      setError(null);
      setSuccess(null);

      const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

      // 1. Generate daily queue number
      // Query count of queues created today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { count, error: qCountErr } = await supabase
        .from('queues')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay.toISOString());

      if (qCountErr) throw qCountErr;

      const sequence = (count || 0) + 1;
      const queueNumber = `Q-${String(sequence).padStart(3, '0')}`;

      // 2. Insert into queues
      const { error: insertQErr } = await supabase
        .from('queues')
        .insert({
          queue_number: queueNumber,
          patient_id: checkingInApp.patient_id,
          appointment_id: checkingInApp.id,
          queue_date: todayStr,
          department: checkingInApp.department,
          priority: checkInPriority,
          status: 'waiting_screening', // After check-in, send to screening room
        });

      if (insertQErr) throw insertQErr;

      // 3. Update appointment status to checked_in
      const { error: updateAppErr } = await supabase
        .from('appointments')
        .update({ status: 'checked_in', updated_at: new Date().toISOString() })
        .eq('id', checkingInApp.id);

      if (updateAppErr) throw updateAppErr;

      setSuccess(`เช็คอินสำเร็จ คิวที่ได้รับ: ${queueNumber}`);
      setIsCheckInModalOpen(false);
      setCheckingInApp(null);
      fetchAppointments();
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      console.error('Error checking in:', err);
      setError('ไม่สามารถสร้างคิวเช็คอินได้: ' + err.message);
    } finally {
      setCreatingQueue(false);
    }
  };

  const openCreateModal = () => {
    setEditingAppointment(null);
    setSelectedPatient(null);
    setPatientSearchQuery('');
    setSearchedPatients([]);
    setFormData(initialFormState);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (app: Appointment, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAppointment(app);
    setSelectedPatient(app.patients || null);
    setFormData({
      patient_id: app.patient_id,
      appointment_date: app.appointment_date,
      appointment_time: app.appointment_time.slice(0, 5), // Keep HH:MM
      department: app.department,
      doctor_name: app.doctor_name,
      reason: app.reason,
      note: app.note || '',
      status: app.status,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Local Filter Logic
  const filteredAppointments = appointments.filter((app) => {
    if (filterDate && app.appointment_date !== filterDate) return false;
    if (filterDept && app.department !== filterDept) return false;
    if (filterStatus && app.status !== filterStatus) return false;
    
    if (filterPatientQuery.trim()) {
      const patient = app.patients;
      if (!patient) return false;
      const query = filterPatientQuery.toLowerCase();
      const matchHN = patient.hn.toLowerCase().includes(query);
      const matchName = `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(query);
      const matchPhone = patient.phone_number.includes(query);
      return matchHN || matchName || matchPhone;
    }
    
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>นัดหมายผู้ป่วย (Appointments)</h2>
        <button className="btn btn-primary" onClick={openCreateModal} style={{ width: 'auto' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>
          สร้างนัดหมาย
        </button>
      </div>

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

      {/* Filter Bar */}
      <div className="dashboard-card" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
        <h4 style={{ fontSize: '0.8125rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem', letterSpacing: '0.5px' }}>ตัวกรองนัดหมาย</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>วันที่นัดหมาย</label>
            <BuddhistDateInput
              value={filterDate}
              onChange={(d) => setFilterDate(d)}
              placeholder="เลือกวันที่ (พ.ศ.)"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>ค้นหาผู้ป่วย</label>
            <input
              type="text"
              className="form-input"
              placeholder="HN หรือ ชื่อ หรือเบอร์โทร..."
              value={filterPatientQuery}
              onChange={(e) => setFilterPatientQuery(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>แผนก</label>
            <select
              className="form-select"
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
            >
              <option value="">ทั้งหมด</option>
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>{d.split(' ')[0]}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>สถานะ</label>
            <select
              className="form-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">ทั้งหมด</option>
              {Object.entries(APPOINTMENT_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        {(filterDate || filterPatientQuery || filterDept || filterStatus) && (
          <div style={{ textAlign: 'right', marginTop: '0.75rem' }}>
            <button
              className="btn btn-secondary"
              style={{ width: 'auto', padding: '0.35rem 0.875rem', fontSize: '0.75rem' }}
              onClick={() => {
                setFilterDate('');
                setFilterPatientQuery('');
                setFilterDept('');
                setFilterStatus('');
              }}
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        )}
      </div>

      {/* Appointment Table */}
      <div className="opd-table-container">
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <span className="spinner" style={{ display: 'inline-block' }}></span>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>กำลังโหลดข้อมูลนัดหมาย...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginBottom: '1rem', opacity: 0.4 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <p style={{ fontWeight: 600 }}>ไม่พบข้อมูลนัดหมาย</p>
            <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>กรุณากดปุ่ม "สร้างนัดหมาย" เพื่อลงคิวสำหรับผู้ป่วย</p>
          </div>
        ) : (
          <table className="opd-table">
            <thead>
              <tr>
                <th>วัน-เวลานัด</th>
                <th>ผู้ป่วย (HN)</th>
                <th>แผนก</th>
                <th>แพทย์ผู้รักษา</th>
                <th>สาเหตุการนัด</th>
                <th>สถานะ</th>
                <th style={{ textAlign: 'right' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((app) => (
                <tr key={app.id}>
                  <td style={{ fontWeight: 700 }}>
                    {new Date(app.appointment_date).toLocaleDateString('th-TH')} <br />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{app.appointment_time.slice(0, 5)} น.</span>
                  </td>
                  <td>
                    {app.patients ? (
                      <>
                        <strong>{app.patients.title}{app.patients.first_name} {app.patients.last_name}</strong> <br />
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>HN: {app.patients.hn}</span>
                      </>
                    ) : '—'}
                  </td>
                  <td>{app.department.split(' ')[0]}</td>
                  <td>{app.doctor_name}</td>
                  <td>{app.reason}</td>
                  <td>
                    <span className={`badge ${
                      app.status === 'scheduled' ? 'badge-status-waiting' :
                      app.status === 'checked_in' ? 'badge-status-active' :
                      app.status === 'completed' ? 'badge-status-completed' :
                      'badge-status-cancelled'
                    }`}>
                      {APPOINTMENT_STATUS_LABELS[app.status]}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      {app.status === 'scheduled' && (
                        <>
                          <button
                            className="btn btn-primary"
                            style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.75rem', background: 'var(--success)' }}
                            onClick={(e) => handleOpenCheckIn(app, e)}
                          >
                            เช็คอินคิว
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                            onClick={(e) => openEditModal(app, e)}
                          >
                            แก้ไข
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                            onClick={(e) => handleCancelAppointment(app.id, e)}
                          >
                            ยกเลิก
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal Form */}
      {isModalOpen && (
        <div className="opd-modal-overlay">
          <div className="opd-modal">
            <div className="opd-modal-header">
              <h3>{editingAppointment ? 'แก้ไขรายการนัดหมาย' : 'สร้างนัดหมายใหม่'}</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            
            <div className="opd-modal-body">
              {/* Patient Lookup Section (Disabled when editing) */}
              {!editingAppointment && (
                <div className="dashboard-card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
                  <h4 style={{ fontSize: '0.8125rem', marginBottom: '0.5rem' }}>ค้นหาเพื่อเลือกคนไข้ *</h4>
                  <form onSubmit={handleSearchPatients} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="ป้อน HN, ชื่อคนไข้ หรือเบอร์โทร..."
                      value={patientSearchQuery}
                      onChange={(e) => setPatientSearchQuery(e.target.value)}
                    />
                    <button type="submit" disabled={searchingPatients} className="btn btn-secondary" style={{ width: 'auto' }}>
                      {searchingPatients ? '...' : 'ค้นหา'}
                    </button>
                  </form>

                  {/* Search Results */}
                  {searchedPatients.length > 0 && (
                    <div style={{ marginTop: '0.75rem', maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                      {searchedPatients.map(p => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedPatient(p);
                            setFormData({ ...formData, patient_id: p.id });
                            setSearchedPatients([]);
                          }}
                          style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.8125rem' }}
                          className="nav-item"
                        >
                          <strong>{p.title}{p.first_name} {p.last_name}</strong> (HN: {p.hn}) - {p.phone_number}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Selected Patient display */}
              {selectedPatient && (
                <div style={{ background: 'var(--primary-subtle)', border: '1px solid var(--primary-glow)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                  <strong>คนไข้ที่เลือก:</strong> {selectedPatient.title}{selectedPatient.first_name} {selectedPatient.last_name} (HN: {selectedPatient.hn})
                  {selectedPatient.allergy_note && (
                    <span style={{ display: 'block', color: 'var(--danger-foreground)', fontSize: '0.75rem', fontWeight: 600, marginTop: '0.25rem' }}>
                      ⚠️ แพ้ยา: {selectedPatient.allergy_note}
                    </span>
                  )}
                </div>
              )}
              {formErrors.patient_id && <span className="form-error" style={{ display: 'block', marginBottom: '1rem' }}>{formErrors.patient_id}</span>}

              {/* Core form */}
              <form onSubmit={handleSubmit}>
                <div className="opd-form-grid">
                  <div className="form-group">
                    <label className="form-label">วันที่นัดหมาย *</label>
                    <BuddhistDateInput
                      value={formData.appointment_date}
                      min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                      onChange={(d) => setFormData({ ...formData, appointment_date: d })}
                      placeholder="เลือกวันนัดหมาย (พ.ศ.)"
                    />
                    {formErrors.appointment_date && <span className="form-error">{formErrors.appointment_date}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">เวลานัดหมาย *</label>
                    <input
                      type="time"
                      className="form-input"
                      value={formData.appointment_time}
                      onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                    />
                    {formErrors.appointment_time && <span className="form-error">{formErrors.appointment_time}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">แผนกรักษา *</label>
                    <select
                      className="form-select"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">แพทย์ผู้นัดรักษา *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="เช่น นพ.สมศักดิ์ รักดี"
                      value={formData.doctor_name}
                      onChange={(e) => setFormData({ ...formData, doctor_name: e.target.value })}
                    />
                    {formErrors.doctor_name && <span className="form-error">{formErrors.doctor_name}</span>}
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                  <label className="form-label">เหตุผลการนัดหมาย *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="ระบุอาการสำคัญ หรือนัดเพื่อทำอะไร..."
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  />
                  {formErrors.reason && <span className="form-error">{formErrors.reason}</span>}
                </div>

                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                  <label className="form-label">หมายเหตุเพิ่มเติม</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="บันทึกรายละเอียดแพทย์หรือเจ้าหน้าที่..."
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  />
                </div>

                {editingAppointment && (
                  <div className="form-group" style={{ marginTop: '1.25rem' }}>
                    <label className="form-label">สถานะการนัดหมาย *</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Appointment['status'] })}
                    >
                      {Object.entries(APPOINTMENT_STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="opd-modal-footer" style={{ border: 'none', padding: '1.5rem 0 0 0' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: 'auto' }}
                    onClick={() => setIsModalOpen(false)}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary"
                    style={{ width: 'auto' }}
                  >
                    {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Check-In Modal Dialog */}
      {isCheckInModalOpen && checkingInApp && (
        <div className="opd-modal-overlay">
          <div className="opd-modal" style={{ maxWidth: '400px' }}>
            <div className="opd-modal-header">
              <h3>เช็คอินเข้ารับการรักษา</h3>
              <button className="close-btn" onClick={() => { setIsCheckInModalOpen(false); setCheckingInApp(null); }}>&times;</button>
            </div>
            <div className="opd-modal-body">
              <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                ยืนยันการเช็คอินของคนไข้ <strong>{checkingInApp.patients?.title}{checkingInApp.patients?.first_name} {checkingInApp.patients?.last_name}</strong>
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                แผนก: {checkingInApp.department.split(' ')[0]} <br />
                แพทย์นัด: {checkingInApp.doctor_name}
              </p>

              <div className="form-group" style={{ marginTop: '1.25rem' }}>
                <label className="form-label">ระดับความเร่งด่วน (Priority) *</label>
                <select
                  className="form-select"
                  value={checkInPriority}
                  onChange={(e) => setCheckInPriority(e.target.value as QueuePriority)}
                >
                  <option value="normal">ปกติ (Normal)</option>
                  <option value="urgent">เร่งด่วน (Urgent)</option>
                  <option value="elderly">ผู้สูงอายุ (Elderly)</option>
                  <option value="vip">VIP</option>
                </select>
              </div>
            </div>
            <div className="opd-modal-footer">
              <button
                className="btn btn-secondary"
                style={{ width: 'auto' }}
                onClick={() => { setIsCheckInModalOpen(false); setCheckingInApp(null); }}
              >
                ยกเลิก
              </button>
              <button
                className="btn btn-primary"
                style={{ width: 'auto', background: 'var(--success)' }}
                disabled={creatingQueue}
                onClick={handleExecuteCheckIn}
              >
                {creatingQueue ? 'กำลังออกบัตรคิว...' : 'ยืนยันและออกบัตรคิว'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;
