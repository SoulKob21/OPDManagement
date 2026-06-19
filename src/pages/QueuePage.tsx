import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Queue, Patient, Appointment, QueuePriority, QueueStatus } from '../types/opd';
import { DEPARTMENTS, PRIORITY_LABELS, QUEUE_STATUS_LABELS } from '../types/opd';

export const QueuePage: React.FC<{ onRefreshStats?: () => void }> = ({ onRefreshStats }) => {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Active view: 'board' (บอร์ดบริหารคิว) or 'table' (ตารางคิวทั้งหมด)
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [filterDept, setFilterDept] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Walk-in modal state
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [searchedPatients, setSearchedPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [walkInDept, setWalkInDept] = useState('อายุรกรรม (Medicine)');
  const [walkInPriority, setWalkInPriority] = useState<QueuePriority>('normal');
  const [creatingWalkIn, setCreatingWalkIn] = useState(false);

  // Appointment check-in modal state
  const [isAppListOpen, setIsAppListOpen] = useState(false);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Appointment | null>(null);
  const [appPriority, setAppPriority] = useState<QueuePriority>('normal');
  const [creatingAppQueue, setCreatingAppQueue] = useState(false);

  // Cancel Modal State
  const [cancellingQueue, setCancellingQueue] = useState<Queue | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  useEffect(() => {
    fetchDailyQueues();
  }, []);

  const fetchDailyQueues = async () => {
    try {
      setLoading(true);
      setError(null);
      const todayStr = new Date().toISOString().split('T')[0];

      // Fetch today's queues
      const { data, error: qErr } = await supabase
        .from('queues')
        .select('*, patients(*), appointments(*)')
        .eq('queue_date', todayStr)
        .order('created_at', { ascending: true });

      if (qErr) throw qErr;
      setQueues(data || []);
    } catch (err: any) {
      console.error('Error fetching queues:', err);
      setError('ไม่สามารถโหลดข้อมูลคิวได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const generateQueueNumber = async (): Promise<string> => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { count, error: countErr } = await supabase
      .from('queues')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfDay.toISOString());

    if (countErr) {
      console.warn('Error fetching queue count, fallback', countErr);
    }
    const seq = (count || 0) + 1;
    return `Q-${String(seq).padStart(3, '0')}`;
  };

  const handleSearchPatients = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientSearch.trim()) return;

    try {
      setSearchingPatients(true);
      const query = `%${patientSearch.trim()}%`;
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

  const handleCreateWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      alert('กรุณาเลือกคนไข้');
      return;
    }

    try {
      setCreatingWalkIn(true);
      setError(null);
      setSuccess(null);

      const qNum = await generateQueueNumber();
      const todayStr = new Date().toISOString().split('T')[0];

      const { data, error: insertErr } = await supabase
        .from('queues')
        .insert({
          queue_number: qNum,
          patient_id: selectedPatient.id,
          queue_date: todayStr,
          department: walkInDept,
          priority: walkInPriority,
          status: 'waiting_registration', // Start at registration
        })
        .select('*, patients(*)');

      if (insertErr) throw insertErr;

      setSuccess(`สร้างคิว Walk-in สำเร็จ: หมายเลข ${qNum}`);
      setQueues([...queues, data[0]]);
      setIsWalkInOpen(false);
      setSelectedPatient(null);
      setPatientSearch('');
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      console.error('Error walk-in queue:', err);
      setError('ไม่สามารถบันทึกข้อมูลคิวได้: ' + err.message);
    } finally {
      setCreatingWalkIn(false);
    }
  };

  const fetchTodayAppointments = async () => {
    try {
      setLoadingApps(true);
      const todayStr = new Date().toISOString().split('T')[0];

      // Fetch appointments for today that are scheduled and not already checked in
      const { data, error: appErr } = await supabase
        .from('appointments')
        .select('*, patients(*)')
        .eq('appointment_date', todayStr)
        .eq('status', 'scheduled');

      if (appErr) throw appErr;
      setTodayAppointments(data || []);
    } catch (err) {
      console.error('Error fetching today appointments:', err);
    } finally {
      setLoadingApps(false);
    }
  };

  const openAppModal = () => {
    setSelectedApp(null);
    setAppPriority('normal');
    fetchTodayAppointments();
    setIsAppListOpen(true);
  };

  const handleCreateFromAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) {
      alert('กรุณาเลือกรายการนัดหมาย');
      return;
    }

    try {
      setCreatingAppQueue(true);
      setError(null);
      setSuccess(null);

      const qNum = await generateQueueNumber();
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Create queue
      const { data, error: insertErr } = await supabase
        .from('queues')
        .insert({
          queue_number: qNum,
          patient_id: selectedApp.patient_id,
          appointment_id: selectedApp.id,
          queue_date: todayStr,
          department: selectedApp.department,
          priority: appPriority,
          status: 'waiting_screening', // Directly to screening because appointment is already pre-registered
        })
        .select('*, patients(*)');

      if (insertErr) throw insertErr;

      // 2. Update appointment to checked_in
      const { error: updateAppErr } = await supabase
        .from('appointments')
        .update({ status: 'checked_in', updated_at: new Date().toISOString() })
        .eq('id', selectedApp.id);

      if (updateAppErr) throw updateAppErr;

      setSuccess(`สร้างคิวจากนัดหมายสำเร็จ: หมายเลข ${qNum}`);
      setQueues([...queues, data[0]]);
      setIsAppListOpen(false);
      setSelectedApp(null);
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      console.error('Error creating queue from appointment:', err);
      setError('ไม่สามารถสร้างคิวจากนัดหมายได้: ' + err.message);
    } finally {
      setCreatingAppQueue(false);
    }
  };

  // Status transitions helper
  const handleUpdateStatus = async (queueId: string, nextStatus: QueueStatus) => {
    try {
      setError(null);
      setSuccess(null);

      const updatePayload: any = {
        status: nextStatus,
        updated_at: new Date().toISOString(),
      };

      if (nextStatus === 'in_consultation') {
        updatePayload.called_time = new Date().toISOString();
      } else if (nextStatus === 'completed') {
        updatePayload.completed_time = new Date().toISOString();
      }

      const { data, error: updateErr } = await supabase
        .from('queues')
        .update(updatePayload)
        .eq('id', queueId)
        .select('*, patients(*), appointments(*)');

      if (updateErr) throw updateErr;

      setSuccess(`อัปเดตสถานะคิว ${data[0].queue_number} เป็น "${QUEUE_STATUS_LABELS[nextStatus]}" สำเร็จ`);
      setQueues(queues.map(q => q.id === queueId ? data[0] : q));
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      console.error('Error updating queue status:', err);
      setError('ไม่สามารถอัปเดตสถานะคิวได้: ' + err.message);
    }
  };

  // Skip queue (sends patient back to waiting_screening or waiting_doctor depending on status)
  const handleSkipQueue = async (q: Queue) => {
    let targetStatus: QueueStatus = 'waiting_screening';
    if (q.status === 'in_consultation') {
      targetStatus = 'waiting_doctor'; // put back in line
    }
    await handleUpdateStatus(q.id, targetStatus);
  };

  // Open Cancel modal
  const openCancelModal = (q: Queue, e: React.MouseEvent) => {
    e.stopPropagation();
    setCancellingQueue(q);
    setCancelReason('');
    setIsCancelModalOpen(true);
  };

  const handleCancelQueue = async () => {
    if (!cancellingQueue) return;
    if (!cancelReason.trim()) {
      alert('กรุณากรอกเหตุผลที่ยกเลิกคิว');
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      const { data, error: cancelErr } = await supabase
        .from('queues')
        .update({
          status: 'cancelled',
          cancelled_reason: cancelReason.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', cancellingQueue.id)
        .select('*, patients(*), appointments(*)');

      if (cancelErr) throw cancelErr;

      // If this queue had an appointment, reset appointment status to 'scheduled' so they can re-register
      if (cancellingQueue.appointment_id) {
        await supabase
          .from('appointments')
          .update({ status: 'scheduled', updated_at: new Date().toISOString() })
          .eq('id', cancellingQueue.appointment_id);
      }

      setSuccess(`ยกเลิกคิว ${cancellingQueue.queue_number} สำเร็จ`);
      setQueues(queues.map(q => q.id === cancellingQueue.id ? data[0] : q));
      setIsCancelModalOpen(false);
      setCancellingQueue(null);
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      console.error('Error cancelling queue:', err);
      setError('ไม่สามารถยกเลิกคิวได้: ' + err.message);
    }
  };

  // Filter local queue records
  const filteredQueues = queues.filter(q => {
    if (filterDept && q.department !== filterDept) return false;
    
    if (searchQuery.trim()) {
      const qNumMatch = q.queue_number.toLowerCase().includes(searchQuery.toLowerCase());
      const patient = q.patients;
      if (!patient) return false;
      const nameMatch = `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchQuery.toLowerCase());
      const hnMatch = patient.hn.toLowerCase().includes(searchQuery.toLowerCase());
      return qNumMatch || nameMatch || hnMatch;
    }
    return true;
  });

  // Grouped Queues for Board View (excluding completed and cancelled)
  const activeQueues = filteredQueues.filter(q => q.status !== 'completed' && q.status !== 'cancelled');

  const boardColumns = {
    screening: {
      title: 'ลงทะเบียน & คัดกรอง',
      statuses: ['waiting_registration', 'waiting_screening'],
      queues: activeQueues.filter(q => q.status === 'waiting_registration' || q.status === 'waiting_screening'),
    },
    waiting_doc: {
      title: 'รอพบแพทย์',
      statuses: ['waiting_doctor'],
      queues: activeQueues.filter(q => q.status === 'waiting_doctor'),
    },
    consultation: {
      title: 'ห้องตรวจแพทย์',
      statuses: ['in_consultation'],
      queues: activeQueues.filter(q => q.status === 'in_consultation'),
    },
    payment_pharmacy: {
      title: 'ชำระเงิน & รับยา',
      statuses: ['waiting_payment', 'waiting_pharmacy'],
      queues: activeQueues.filter(q => q.status === 'waiting_payment' || q.status === 'waiting_pharmacy'),
    },
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>จัดการคิว OPD (Queue Management)</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={openAppModal} style={{ width: 'auto' }}>
            สร้างคิวจากนัดหมาย
          </button>
          <button className="btn btn-primary" onClick={() => setIsWalkInOpen(true)} style={{ width: 'auto' }}>
            สร้างคิว Walk-in
          </button>
        </div>
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

      {/* View Mode & Filter Bar */}
      <div className="dashboard-card" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Tab Selection */}
          <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--border-color)', padding: '0.25rem', borderRadius: '8px' }}>
            <button
              className={`nav-item ${viewMode === 'board' ? 'active' : ''}`}
              style={{ padding: '0.375rem 1rem', fontSize: '0.8125rem' }}
              onClick={() => setViewMode('board')}
            >
              บอร์ดคิว (Board View)
            </button>
            <button
              className={`nav-item ${viewMode === 'table' ? 'active' : ''}`}
              style={{ padding: '0.375rem 1rem', fontSize: '0.8125rem' }}
              onClick={() => setViewMode('table')}
            >
              ตารางคิวทั้งหมด (Table View)
            </button>
          </div>

          {/* Quick Filters */}
          <div style={{ display: 'flex', gap: '0.75rem', flexGrow: 1, justifySelf: 'flex-end', maxWidth: '500px' }}>
            <input
              type="text"
              className="form-input"
              style={{ fontSize: '0.8125rem' }}
              placeholder="ค้นหา คิวเลขที่ / ชื่อคนไข้ / HN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              className="form-select"
              style={{ fontSize: '0.8125rem', width: '150px' }}
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
            >
              <option value="">ทุกแผนก</option>
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>{d.split(' ')[0]}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center' }}>
          <span className="spinner" style={{ display: 'inline-block' }}></span>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>กำลังโหลดข้อมูลคิวประจำวันนี้...</p>
        </div>
      ) : (
        <>
          {/* Board View */}
          {viewMode === 'board' && (
            <div className="queue-board-columns">
              {Object.entries(boardColumns).map(([key, col]) => (
                <div key={key} className="queue-column">
                  <div className="queue-column-header">
                    <span>{col.title}</span>
                    <span className="queue-column-count">{col.queues.length}</span>
                  </div>

                  <div className="queue-card-list">
                    {col.queues.length === 0 ? (
                      <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
                        ไม่มีคิวอยู่ในขั้นตอนนี้
                      </div>
                    ) : (
                      col.queues.map((q) => (
                        <div key={q.id} className="queue-ticket-card">
                          <div className="queue-ticket-header">
                            <span className="queue-ticket-number">{q.queue_number}</span>
                            <span className={`badge badge-priority-${q.priority}`} style={{ fontSize: '0.625rem' }}>
                              {PRIORITY_LABELS[q.priority]}
                            </span>
                          </div>

                          <div className="queue-ticket-patient">
                            {q.patients ? `${q.patients.title}${q.patients.first_name} ${q.patients.last_name}` : '—'}
                          </div>

                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            HN: {q.patients?.hn} <br />
                            แผนก: {q.department.split(' ')[0]}
                            {q.patients?.allergy_note && (
                              <span style={{ display: 'block', color: 'var(--danger)', fontWeight: 600, marginTop: '0.25rem' }}>
                                ⚠️ แพ้ยา: {q.patients.allergy_note}
                              </span>
                            )}
                          </div>

                          <div className="queue-ticket-footer">
                            {/* Dropdown status update for flexibility */}
                            <select
                              value={q.status}
                              onChange={(e) => handleUpdateStatus(q.id, e.target.value as QueueStatus)}
                              style={{ padding: '0.25rem', fontSize: '0.7rem', border: '1px solid var(--border-color)', borderRadius: '4px', flexGrow: 1 }}
                            >
                              {Object.entries(QUEUE_STATUS_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                              ))}
                            </select>

                            {/* Direct call action buttons based on stages */}
                            {(q.status === 'waiting_registration' || q.status === 'waiting_screening') && (
                              <button
                                className="btn btn-primary"
                                style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.7rem', background: 'var(--success)' }}
                                onClick={() => handleUpdateStatus(q.id, 'waiting_doctor')}
                              >
                                ส่งคัดกรอง
                              </button>
                            )}

                            {q.status === 'waiting_doctor' && (
                              <button
                                className="btn btn-primary"
                                style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                onClick={() => handleUpdateStatus(q.id, 'in_consultation')}
                              >
                                เรียกพบแพทย์
                              </button>
                            )}

                            {q.status === 'in_consultation' && (
                              <button
                                className="btn btn-primary"
                                style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.7rem', background: 'var(--accent)' }}
                                onClick={() => handleUpdateStatus(q.id, 'waiting_payment')}
                              >
                                ตรวจเสร็จ
                              </button>
                            )}

                            {(q.status === 'waiting_payment' || q.status === 'waiting_pharmacy') && (
                              <button
                                className="btn btn-primary"
                                style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.7rem', background: 'var(--success)' }}
                                onClick={() => handleUpdateStatus(q.id, 'completed')}
                              >
                                ปิดเคส
                              </button>
                            )}

                            {/* Cancel button */}
                            <button
                              className="btn btn-danger"
                              style={{ width: 'auto', padding: '0.25rem', borderRadius: '4px' }}
                              title="ยกเลิกคิวนี้"
                              onClick={(e) => openCancelModal(q, e)}
                            >
                              &times;
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="opd-table-container">
              {filteredQueues.length === 0 ? (
                <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <p style={{ fontWeight: 600 }}>ไม่พบข้อมูลคิวสำหรับวันนี้</p>
                </div>
              ) : (
                <table className="opd-table">
                  <thead>
                    <tr>
                      <th>ลำดับคิว</th>
                      <th>คนไข้ (HN)</th>
                      <th>แผนก</th>
                      <th>ความเร่งด่วน</th>
                      <th>สถานะ</th>
                      <th>เวลารับบัตร</th>
                      <th>เวลาพบแพทย์ / ปิดเคส</th>
                      <th>หมายเหตุ / เหตุผลยกเลิก</th>
                      <th style={{ textAlign: 'right' }}>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQueues.map((q) => (
                      <tr key={q.id}>
                        <td style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary)' }}>{q.queue_number}</td>
                        <td>
                          {q.patients ? (
                            <>
                              <strong>{q.patients.title}{q.patients.first_name} {q.patients.last_name}</strong> <br />
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>HN: {q.patients.hn}</span>
                            </>
                          ) : '—'}
                        </td>
                        <td>{q.department.split(' ')[0]}</td>
                        <td>
                          <span className={`badge badge-priority-${q.priority}`}>
                            {PRIORITY_LABELS[q.priority]}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${
                            q.status === 'completed' ? 'badge-status-completed' :
                            q.status === 'cancelled' ? 'badge-status-cancelled' :
                            'badge-status-waiting'
                          }`}>
                            {QUEUE_STATUS_LABELS[q.status]}
                          </span>
                        </td>
                        <td>{new Date(q.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</td>
                        <td>
                          {q.called_time ? (
                            <span style={{ fontSize: '0.75rem' }}>พบแพทย์: {new Date(q.called_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
                          ) : '—'}
                          {q.completed_time && (
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--success)' }}>ปิดเคส: {new Date(q.completed_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
                          )}
                        </td>
                        <td style={{ color: 'var(--danger-foreground)', fontSize: '0.75rem' }}>
                          {q.cancelled_reason || (q.patients?.allergy_note ? `แพ้ยา: ${q.patients.allergy_note}` : '—')}
                        </td>
                        <td>
                          <div className="row-actions">
                            {q.status !== 'completed' && q.status !== 'cancelled' && (
                              <>
                                <button
                                  className="btn btn-secondary"
                                  style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                  onClick={() => handleSkipQueue(q)}
                                >
                                  ข้ามคิว
                                </button>
                                <button
                                  className="btn btn-danger"
                                  style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                  onClick={(e) => openCancelModal(q, e)}
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
          )}
        </>
      )}

      {/* Walk-in Queue Modal */}
      {isWalkInOpen && (
        <div className="opd-modal-overlay">
          <div className="opd-modal">
            <div className="opd-modal-header">
              <h3>ออกคิว Walk-in</h3>
              <button className="close-btn" onClick={() => setIsWalkInOpen(false)}>&times;</button>
            </div>
            <div className="opd-modal-body">
              <div className="dashboard-card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
                <h4 style={{ fontSize: '0.8125rem', marginBottom: '0.5rem' }}>ค้นหาคนไข้ *</h4>
                <form onSubmit={handleSearchPatients} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="ป้อน HN, ชื่อ หรือเบอร์โทรศัพท์..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                  />
                  <button type="submit" disabled={searchingPatients} className="btn btn-secondary" style={{ width: 'auto' }}>
                    {searchingPatients ? '...' : 'ค้นหา'}
                  </button>
                </form>

                {searchedPatients.length > 0 && (
                  <div style={{ marginTop: '0.75rem', maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    {searchedPatients.map(p => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPatient(p);
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

              <form onSubmit={handleCreateWalkIn}>
                <div className="opd-form-grid">
                  <div className="form-group">
                    <label className="form-label">แผนกรักษา *</label>
                    <select
                      className="form-select"
                      value={walkInDept}
                      onChange={(e) => setWalkInDept(e.target.value)}
                    >
                      {DEPARTMENTS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">ความเร่งด่วน *</label>
                    <select
                      className="form-select"
                      value={walkInPriority}
                      onChange={(e) => setWalkInPriority(e.target.value as QueuePriority)}
                    >
                      <option value="normal">ปกติ (Normal)</option>
                      <option value="urgent">เร่งด่วน (Urgent)</option>
                      <option value="elderly">ผู้สูงอายุ (Elderly)</option>
                      <option value="vip">VIP</option>
                    </select>
                  </div>
                </div>

                <div className="opd-modal-footer" style={{ border: 'none', padding: '1.5rem 0 0 0' }}>
                  <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setIsWalkInOpen(false)}>ยกเลิก</button>
                  <button type="submit" disabled={creatingWalkIn} className="btn btn-primary" style={{ width: 'auto' }}>
                    {creatingWalkIn ? 'กำลังออกบัตรคิว...' : 'ออกบัตรคิว Walk-in'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Queue Selection Modal */}
      {isAppListOpen && (
        <div className="opd-modal-overlay">
          <div className="opd-modal">
            <div className="opd-modal-header">
              <h3>ออกคิวจากนัดหมายประจำวันนี้</h3>
              <button className="close-btn" onClick={() => setIsAppListOpen(false)}>&times;</button>
            </div>
            <div className="opd-modal-body">
              {loadingApps ? (
                <p>กำลังดึงข้อมูลนัดหมาย...</p>
              ) : todayAppointments.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  ไม่มีนัดหมายคงค้างที่ต้องเช็คอินในวันนี้
                </div>
              ) : (
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '1.25rem' }}>
                  {todayAppointments.map(app => (
                    <div
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      style={{
                        padding: '0.625rem',
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        background: selectedApp?.id === app.id ? 'var(--primary-subtle)' : 'transparent',
                        fontSize: '0.8125rem',
                      }}
                      className="nav-item"
                    >
                      <strong>{app.patients?.title}{app.patients?.first_name} {app.patients?.last_name}</strong> (HN: {app.patients?.hn}) <br />
                      เวลานัด: {app.appointment_time.slice(0, 5)} น. | แผนก: {app.department.split(' ')[0]} | แพทย์: {app.doctor_name}
                    </div>
                  ))}
                </div>
              )}

              {selectedApp && (
                <form onSubmit={handleCreateFromAppointment}>
                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label">ความเร่งด่วน *</label>
                    <select
                      className="form-select"
                      value={appPriority}
                      onChange={(e) => setAppPriority(e.target.value as QueuePriority)}
                    >
                      <option value="normal">ปกติ (Normal)</option>
                      <option value="urgent">เร่งด่วน (Urgent)</option>
                      <option value="elderly">ผู้สูงอายุ (Elderly)</option>
                      <option value="vip">VIP</option>
                    </select>
                  </div>
                  <div className="opd-modal-footer" style={{ border: 'none', padding: '0' }}>
                    <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setIsAppListOpen(false)}>ยกเลิก</button>
                    <button type="submit" disabled={creatingAppQueue} className="btn btn-primary" style={{ width: 'auto' }}>
                      {creatingAppQueue ? 'กำลังเช็คอิน...' : 'ยืนยันการเช็คอินนัดหมาย'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Queue Reason Modal */}
      {isCancelModalOpen && cancellingQueue && (
        <div className="opd-modal-overlay">
          <div className="opd-modal" style={{ maxWidth: '400px' }}>
            <div className="opd-modal-header">
              <h3>ยืนยันการยกเลิกคิว</h3>
              <button className="close-btn" onClick={() => { setIsCancelModalOpen(false); setCancellingQueue(null); }}>&times;</button>
            </div>
            <div className="opd-modal-body">
              <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                กรุณาระบุเหตุผลการยกเลิกคิวของหมายเลข <strong>{cancellingQueue.queue_number}</strong> ({cancellingQueue.patients?.first_name}):
              </p>
              <div className="form-group">
                <label className="form-label">เหตุผลที่ยกเลิก *</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  required
                  placeholder="เช่น คนไข้ไม่ประสงค์ตรวจแล้ว, นัดผิดเวลา, ติดต่อคนไข้ไม่ได้..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
            </div>
            <div className="opd-modal-footer">
              <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => { setIsCancelModalOpen(false); setCancellingQueue(null); }}>ยกเลิก</button>
              <button className="btn btn-danger" style={{ width: 'auto' }} onClick={handleCancelQueue}>ยืนยันยกเลิกคิว</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueuePage;
