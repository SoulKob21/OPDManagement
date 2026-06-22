import React from 'react';

interface DmScreeningListViewProps {
  onBack: () => void;
}

const MOCK_DATA = [
  { id: 1, hn: '6700001', name: 'นายสมชาย ใจดี', age: 55, fbs: 132, hba1c: 6.8, result: 'เสี่ยงสูง', date: '15/01/2569', color: '#f59e0b' },
  { id: 2, hn: '6700045', name: 'นางสาวสมหญิง รักษ์สุข', age: 42, fbs: 95, hba1c: 5.4, result: 'ปกติ', date: '15/01/2569', color: '#10b981' },
  { id: 3, hn: '6700102', name: 'นายวิชัย สร้างสรรค์', age: 63, fbs: 185, hba1c: 8.2, result: 'DM ยืนยัน', date: '16/01/2569', color: '#ef4444' },
  { id: 4, hn: '6700178', name: 'นางมาลี ดอกไม้', age: 50, fbs: 110, hba1c: 6.0, result: 'เสี่ยงปานกลาง', date: '16/01/2569', color: '#f59e0b' },
  { id: 5, hn: '6700203', name: 'นายประเสริฐ มั่นคง', age: 58, fbs: 88, hba1c: 5.2, result: 'ปกติ', date: '17/01/2569', color: '#10b981' },
  { id: 6, hn: '6700255', name: 'นางสาวพิมพ์ใจ งามตา', age: 47, fbs: 156, hba1c: 7.5, result: 'DM ยืนยัน', date: '17/01/2569', color: '#ef4444' },
  { id: 7, hn: '6700310', name: 'นายอนุชา พัฒนา', age: 61, fbs: 102, hba1c: 5.8, result: 'ปกติ', date: '18/01/2569', color: '#10b981' },
  { id: 8, hn: '6700389', name: 'นางจันทร์ สว่าง', age: 53, fbs: 128, hba1c: 6.5, result: 'เสี่ยงสูง', date: '18/01/2569', color: '#f59e0b' },
];

export const DmScreeningListView: React.FC<DmScreeningListViewProps> = ({ onBack }) => (
  <div className="dashboard-card">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
      <div>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>Mock Menu 1 — รายชื่อผู้คัดกรอง</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0 }}>รายละเอียดผู้ป่วยที่เข้ารับการคัดกรองเบาหวาน</p>
      </div>
      <button className="btn btn-secondary" onClick={onBack} style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8125rem' }}>
        ← กลับหน้าสรุป
      </button>
    </div>

    <div style={{ overflowX: 'auto' }}>
      <table className="opd-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--bg-secondary)', fontSize: '0.8125rem' }}>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid var(--border-color)' }}>ลำดับ</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid var(--border-color)' }}>HN</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid var(--border-color)' }}>ชื่อ-นามสกุล</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid var(--border-color)' }}>อายุ</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid var(--border-color)' }}>FBS (mg/dL)</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid var(--border-color)' }}>HbA1c (%)</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid var(--border-color)' }}>ผลคัดกรอง</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid var(--border-color)' }}>วันที่ตรวจ</th>
          </tr>
        </thead>
        <tbody style={{ fontSize: '0.8125rem' }}>
          {MOCK_DATA.map((row) => (
            <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <td style={{ padding: '0.75rem 1rem' }}>{row.id}</td>
              <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600 }}>{row.hn}</td>
              <td style={{ padding: '0.75rem 1rem' }}>{row.name}</td>
              <td style={{ padding: '0.75rem 1rem' }}>{row.age} ปี</td>
              <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{row.fbs}</td>
              <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{row.hba1c}</td>
              <td style={{ padding: '0.75rem 1rem' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '0.2rem 0.625rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#fff',
                  background: row.color
                }}>{row.result}</span>
              </td>
              <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{row.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
