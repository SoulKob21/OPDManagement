import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

// ============================================================
// TYPES
// ============================================================
interface ExcelRow {
  service_date: string;
  hn: string;
  full_name: string;
  order_date: string;
  hba1c_result: string;
  _rowIndex: number;
  _error?: string;
}

interface ImportLogEntry {
  rowIndex: number;
  hn: string;
  name: string;
  status: 'success' | 'skipped' | 'error' | 'created';
  message: string;
}

interface ImportSummary {
  total: number;
  success: number;
  created: number;
  skipped: number;
  errors: number;
}

// ============================================================
// HELPERS
// ============================================================

// Parse Excel date serial or string to YYYY-MM-DD
const parseExcelDate = (raw: any): string => {
  if (!raw) return '';
  if (typeof raw === 'number') {
    const d = XLSX.SSF.parse_date_code(raw);
    if (!d) return '';
    const y = d.y;
    const m = String(d.m).padStart(2, '0');
    const dy = String(d.d).padStart(2, '0');
    return `${y}-${m}-${dy}`;
  }
  const str = String(raw).trim();
  // Handle DD/MM/YYYY or D/M/YYYY (Buddhist or Gregorian)
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    let year = parseInt(dmyMatch[3]);
    // Buddhist year correction
    if (year > 2400) year -= 543;
    const mo = String(dmyMatch[2]).padStart(2, '0');
    const dy = String(dmyMatch[1]).padStart(2, '0');
    return `${year}-${mo}-${dy}`;
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
  return str;
};

// Parse "นายสมชาย ใจดี" → { title, first_name, last_name }
const parseName = (fullName: string) => {
  const prefixes = ['นาย', 'นาง', 'น.ส.', 'นางสาว', 'ด.ช.', 'ด.ญ.'];
  let title = '';
  let remaining = fullName.trim();

  for (const p of prefixes) {
    if (remaining.startsWith(p)) {
      title = p;
      remaining = remaining.slice(p.length).trim();
      break;
    }
  }

  const parts = remaining.split(/\s+/);
  const first_name = parts[0] || remaining;
  const last_name = parts.slice(1).join(' ') || '';
  return { title, first_name, last_name };
};

// Generate a unique HN (fallback when HN missing)
const generateHN = (hn: string) => hn.trim() || `IMPORT-${Date.now()}`;

// ============================================================
// COMPONENT
// ============================================================
interface ImportLabPageProps {
  onRefreshStats?: () => void;
}

const ImportLabPage: React.FC<ImportLabPageProps> = ({ onRefreshStats }) => {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<ExcelRow[]>([]);
  const [allRows, setAllRows] = useState<ExcelRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [logs, setLogs] = useState<ImportLogEntry[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [duplicateMode, setDuplicateMode] = useState<'skip' | 'overwrite'>('skip');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // ── Template Download ──────────────────────────────────────
  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['วันที่รับบริการ', 'HN', 'ชื่อ - นามสกุล', 'วันที่สั่ง (วันตรวจแลป)', 'ผล Lab Hemoglobin A1C'],
      ['15/06/2025', 'HN-00001', 'นายสมชาย ใจดี', '14/06/2025', '7.5'],
      ['15/06/2025', 'HN-00002', 'น.ส.สมหญิง รักสุขภาพ', '14/06/2025', '6.2'],
    ]);
    // Column widths
    ws['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 24 }, { wch: 22 }, { wch: 22 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lab HbA1C');
    XLSX.writeFile(wb, 'template_lab_hba1c.xlsx');
  };

  // ── Parse Excel ────────────────────────────────────────────
  const parseFile = (file: File) => {
    setFileName(file.name);
    setPreviewRows([]);
    setAllRows([]);
    setValidationErrors([]);
    setLogs([]);
    setSummary(null);
    setProgress(0);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<any>(sheet, { header: 1, defval: '' });

        // Skip header row (row 0)
        const rows: ExcelRow[] = [];
        const errors: string[] = [];

        for (let i = 1; i < raw.length; i++) {
          const r = raw[i];
          // Skip completely empty rows
          if (!r[0] && !r[1] && !r[2] && !r[3] && !r[4]) continue;

          const hn = String(r[1] ?? '').trim();
          const service_date = parseExcelDate(r[0]);
          const full_name = String(r[2] ?? '').trim();
          const order_date = parseExcelDate(r[3]);
          const hba1c_result = String(r[4] ?? '').trim();

          let rowError = '';
          if (!hn) rowError += `แถว ${i + 1}: ไม่มี HN; `;
          if (!service_date) rowError += `แถว ${i + 1}: วันที่รับบริการไม่ถูกต้อง; `;
          if (!hba1c_result || isNaN(parseFloat(hba1c_result))) {
            rowError += `แถว ${i + 1}: ผล HbA1C ไม่ใช่ตัวเลข; `;
          }
          if (rowError) errors.push(rowError);

          rows.push({ service_date, hn, full_name, order_date, hba1c_result, _rowIndex: i + 1, _error: rowError || undefined });
        }

        setAllRows(rows);
        setPreviewRows(rows.slice(0, 10));
        setValidationErrors(errors);
      } catch (err) {
        setValidationErrors(['ไม่สามารถอ่านไฟล์ Excel ได้ กรุณาตรวจสอบรูปแบบไฟล์']);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Drag & Drop ────────────────────────────────────────────
  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  // ── Import Logic ───────────────────────────────────────────
  const runImport = async () => {
    if (allRows.length === 0) return;
    const validRows = allRows.filter(r => !r._error);
    if (validRows.length === 0) return;

    setImporting(true);
    setLogs([]);
    setSummary(null);
    setProgress(0);
    setProgressTotal(validRows.length);

    const importLogs: ImportLogEntry[] = [];
    let successCount = 0;
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    const addLog = (entry: ImportLogEntry) => {
      importLogs.push(entry);
      setLogs([...importLogs]);
      setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    };

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      setProgress(i + 1);

      try {
        // ── Step 1: Find or create patient ──
        let patientId: string;
        const { data: existing, error: findErr } = await supabase
          .from('patients')
          .select('id, hn, first_name, last_name')
          .eq('hn', row.hn)
          .maybeSingle();

        if (findErr) throw new Error('ค้นหาผู้ป่วยล้มเหลว: ' + findErr.message);

        if (existing) {
          patientId = existing.id;
        } else {
          // Create new patient
          const { title, first_name, last_name } = parseName(row.full_name);
          const { data: created, error: createErr } = await supabase
            .from('patients')
            .insert({
              hn: generateHN(row.hn),
              title: title || 'นาย',
              first_name: first_name || row.full_name,
              last_name: last_name || '-',
              primary_doctor: 'กรุณาเลือกแพทย์เจ้าของไข้ใหม่',
              status: 'active',
              gender: title === 'นาย' || title === 'ด.ช.' ? 'ชาย' : 'หญิง',
              phone_number: '',
              address: '',
              emergency_contact_name: '',
              emergency_contact_phone: '',
              medical_right: 'ไม่ระบุ',
            })
            .select()
            .single();

          if (createErr) throw new Error('สร้างผู้ป่วยใหม่ล้มเหลว: ' + createErr.message);
          patientId = created.id;
          createdCount++;
          addLog({
            rowIndex: row._rowIndex,
            hn: row.hn,
            name: row.full_name,
            status: 'created',
            message: `✨ สร้างคนไข้ใหม่สำเร็จ (HN: ${row.hn})`,
          });
        }

        // ── Step 2: Upsert appointment ──
        if (row.service_date) {
          const { data: existApp } = await supabase
            .from('appointments')
            .select('id')
            .eq('patient_id', patientId)
            .eq('appointment_date', row.service_date)
            .maybeSingle();

          if (!existApp) {
            await supabase.from('appointments').insert({
              patient_id: patientId,
              appointment_date: row.service_date,
              appointment_type: 'walk-in',
              status: 'completed',
              notes: 'นำเข้าจาก Excel - Lab HbA1C',
            });
          }
        }

        // ── Step 3: Lab result duplicate check ──
        const testDate = row.order_date || row.service_date;
        const { data: existLab } = await supabase
          .from('patient_lab_results')
          .select('id')
          .eq('patient_id', patientId)
          .eq('test_name', 'Hemoglobin A1C')
          .eq('test_date', testDate)
          .maybeSingle();

        if (existLab) {
          if (duplicateMode === 'skip') {
            skippedCount++;
            addLog({
              rowIndex: row._rowIndex,
              hn: row.hn,
              name: row.full_name,
              status: 'skipped',
              message: `⏭️ ข้ามแถว - มีผล HbA1C วันที่ ${testDate} อยู่แล้ว`,
            });
            continue;
          } else {
            // Overwrite
            await supabase
              .from('patient_lab_results')
              .update({
                result_value: row.hba1c_result,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existLab.id);

            successCount++;
            addLog({
              rowIndex: row._rowIndex,
              hn: row.hn,
              name: row.full_name,
              status: 'success',
              message: `🔄 อัปเดตผล HbA1C = ${row.hba1c_result}% (วันที่: ${testDate})`,
            });
            continue;
          }
        }

        // ── Step 4: Insert lab result ──
        const { error: labErr } = await supabase.from('patient_lab_results').insert({
          patient_id: patientId,
          test_name: 'Hemoglobin A1C',
          test_date: testDate,
          result_value: row.hba1c_result,
          unit: '%',
          reference_range: '< 7.0',
          notes: 'นำเข้าจาก Excel',
          status: 'completed',
        });

        if (labErr) throw new Error('บันทึกผล Lab ล้มเหลว: ' + labErr.message);

        successCount++;
        addLog({
          rowIndex: row._rowIndex,
          hn: row.hn,
          name: row.full_name,
          status: 'success',
          message: `✅ บันทึกผล HbA1C = ${row.hba1c_result}% สำเร็จ (วันที่: ${testDate})`,
        });
      } catch (err: any) {
        errorCount++;
        addLog({
          rowIndex: row._rowIndex,
          hn: row.hn,
          name: row.full_name,
          status: 'error',
          message: `❌ ข้อผิดพลาด: ${err.message || 'Unknown error'}`,
        });
      }
    }

    setSummary({
      total: validRows.length,
      success: successCount,
      created: createdCount,
      skipped: skippedCount,
      errors: errorCount,
    });
    setImporting(false);
    if (onRefreshStats) onRefreshStats();
  };

  const resetAll = () => {
    setFileName(null);
    setPreviewRows([]);
    setAllRows([]);
    setValidationErrors([]);
    setLogs([]);
    setSummary(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const progressPercent = progressTotal > 0 ? Math.round((progress / progressTotal) * 100) : 0;

  // ── RENDER ─────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div className="dashboard-card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              📥 นำเข้าข้อมูล Lab Hemoglobin A1C
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              อัพโหลดไฟล์ Excel เพื่อนำเข้าผลตรวจ HbA1C เข้าสู่ระบบฐานข้อมูล
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'auto', whiteSpace: 'nowrap' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            ดาวน์โหลด Template Excel
          </button>
        </div>

        {/* Column guide */}
        <div style={{ marginTop: '1rem', background: 'var(--bg-secondary)', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>โครงสร้างคอลัมน์ Excel:</strong>{' '}
          <span style={{ display: 'inline-flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: 4 }}>
            {['A: วันที่รับบริการ', 'B: HN', 'C: ชื่อ - นามสกุล', 'D: วันที่สั่ง (วันตรวจแลป)', 'E: ผล Lab HbA1C'].map(c => (
              <span key={c} style={{ background: 'var(--primary)', color: '#fff', borderRadius: 4, padding: '1px 8px', fontWeight: 500 }}>{c}</span>
            ))}
          </span>
        </div>
      </div>

      {/* Duplicate Mode */}
      <div className="dashboard-card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>⚙️ ตัวเลือกกรณีข้อมูลซ้ำ</h3>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {(['skip', 'overwrite'] as const).map(mode => (
            <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
              <input
                type="radio"
                name="duplicateMode"
                value={mode}
                checked={duplicateMode === mode}
                onChange={() => setDuplicateMode(mode)}
                style={{ accentColor: 'var(--primary)' }}
              />
              {mode === 'skip' ? '⏭️ ข้ามแถวซ้ำ (ปลอดภัย)' : '🔄 เขียนทับค่าเดิม (Overwrite)'}
            </label>
          ))}
        </div>
      </div>

      {/* Upload Zone */}
      {!fileName && (
        <div
          className="dashboard-card"
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--primary)' : 'var(--border-color)'}`,
            background: dragging ? 'color-mix(in srgb, var(--primary) 5%, transparent)' : 'var(--bg-secondary)',
            borderRadius: 12,
            padding: '3rem 2rem',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '1.25rem',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', opacity: 0.8 }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p style={{ fontWeight: 600, marginBottom: '0.375rem' }}>ลากวางไฟล์ Excel ที่นี่</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>หรือคลิกเพื่อเลือกไฟล์ .xlsx / .xls</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={onFileChange}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* File loaded */}
      {fileName && !importing && !summary && (
        <div className="dashboard-card" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success, #22c55e)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              <span style={{ fontWeight: 600 }}>{fileName}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                ({allRows.length} แถวข้อมูล, {allRows.filter(r => !r._error).length} แถวถูกต้อง)
              </span>
            </div>
            <button onClick={resetAll} className="btn btn-secondary" style={{ width: 'auto', padding: '0.35rem 0.875rem', fontSize: '0.8rem' }}>
              เปลี่ยนไฟล์
            </button>
          </div>

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <div className="alert alert-danger" style={{ marginBottom: '1rem', fontSize: '0.8125rem' }}>
              <strong>พบข้อผิดพลาดในข้อมูล ({validationErrors.length} แถว) — แถวเหล่านี้จะถูกข้ามในการนำเข้า:</strong>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
                {validationErrors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                {validationErrors.length > 5 && <li>...และอีก {validationErrors.length - 5} รายการ</li>}
              </ul>
            </div>
          )}

          {/* Preview table */}
          <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              แสดง {previewRows.length} แถวแรก (Preview)
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {['#', 'วันที่รับบริการ', 'HN', 'ชื่อ - นามสกุล', 'วันที่สั่ง', 'ผล HbA1C (%)', 'สถานะ'].map(h => (
                    <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', background: row._error ? 'color-mix(in srgb, #ef4444 8%, transparent)' : 'transparent' }}>
                    <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>{row._rowIndex}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{row.service_date || <span style={{ color: '#ef4444' }}>ไม่ระบุ</span>}</td>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{row.hn || <span style={{ color: '#ef4444' }}>ไม่ระบุ</span>}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{row.full_name}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{row.order_date}</td>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: parseFloat(row.hba1c_result) >= 7.0 ? '#ef4444' : '#22c55e' }}>
                      {row.hba1c_result}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      {row._error
                        ? <span style={{ color: '#ef4444', fontWeight: 600 }}>❌ มีข้อผิดพลาด</span>
                        : <span style={{ color: '#22c55e' }}>✅ ถูกต้อง</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {allRows.length > 10 && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'center' }}>
                ...และอีก {allRows.length - 10} แถว (ไม่แสดงในตัวอย่าง)
              </p>
            )}
          </div>

          {/* Import button */}
          <button
            onClick={runImport}
            disabled={allRows.filter(r => !r._error).length === 0}
            className="btn btn-primary"
            style={{ width: 'auto' }}
          >
            🚀 เริ่มนำเข้าข้อมูล ({allRows.filter(r => !r._error).length} แถว)
          </button>
        </div>
      )}

      {/* Progress & Log */}
      {(importing || logs.length > 0) && (
        <div className="dashboard-card" style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem' }}>
            {importing ? '⏳ กำลังนำเข้าข้อมูล...' : '📋 ผลการนำเข้าข้อมูล'}
          </h3>

          {/* Progress bar */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
              <span>{importing ? `กำลังประมวลผลแถวที่ ${progress} จาก ${progressTotal}` : 'เสร็จสิ้น'}</span>
              <span style={{ fontWeight: 600 }}>{progressPercent}%</span>
            </div>
            <div style={{ height: 10, background: 'var(--border-color)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: importing
                  ? 'linear-gradient(90deg, var(--primary), #818cf8)'
                  : '#22c55e',
                borderRadius: 999,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>

          {/* Log list */}
          <div style={{ maxHeight: 320, overflowY: 'auto', background: 'var(--bg-secondary)', borderRadius: 8, padding: '0.75rem', fontSize: '0.8rem', fontFamily: 'monospace' }}>
            {logs.map((log, i) => (
              <div key={i} style={{
                padding: '0.25rem 0',
                color: log.status === 'error' ? '#ef4444' : log.status === 'skipped' ? 'var(--text-secondary)' : log.status === 'created' ? '#f59e0b' : '#22c55e',
                borderBottom: i < logs.length - 1 ? '1px solid var(--border-color)' : 'none',
              }}>
                <span style={{ color: 'var(--text-secondary)', marginRight: 8 }}>แถว {log.rowIndex} | HN: {log.hn}</span>
                {log.message}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="dashboard-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>🎉 สรุปผลการนำเข้าข้อมูล</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            {[
              { label: 'ทั้งหมด', value: summary.total, color: 'var(--primary)' },
              { label: 'บันทึกสำเร็จ', value: summary.success, color: '#22c55e' },
              { label: 'สร้างคนไข้ใหม่', value: summary.created, color: '#f59e0b' },
              { label: 'ข้ามซ้ำ', value: summary.skipped, color: 'var(--text-secondary)' },
              { label: 'ผิดพลาด', value: summary.errors, color: '#ef4444' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <button onClick={resetAll} className="btn btn-secondary" style={{ width: 'auto' }}>
            📂 นำเข้าไฟล์ใหม่
          </button>
        </div>
      )}
    </div>
  );
};

export default ImportLabPage;
