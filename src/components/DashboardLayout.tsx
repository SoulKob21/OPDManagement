import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import logoImg from '../assets/LOGO.png';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeMenu: 'overview' | 'patients' | 'appointments' | 'queues' | 'deliveries' | 'diabetes-screening' | 'doctors' | 'permissions' | 'change-password' | 'questionnaire' | 'import-lab';
  activeSubMenu?: string;
  title?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeMenu,
  activeSubMenu,
  title = 'ระบบจัดการผู้ป่วยนอก (OPD)'
}) => {
  const { user, logout, allowedMenus, displayName: dbDisplayName, role: dbRole } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const userDisplayName = dbDisplayName || user?.user_metadata?.display_name || user?.user_metadata?.full_name || 'ผู้ใช้งานระบบ';
  const userRole = dbRole || 'เจ้าหน้าที่ปฏิบัติการ';

  const isAllowed = (menu: string) => {
    if (allowedMenus === null) return true;
    return allowedMenus.includes(menu);
  };

  useEffect(() => {
    if (allowedMenus !== null && activeMenu !== 'overview' && activeMenu !== 'change-password' && !allowedMenus.includes(activeMenu)) {
      console.warn(`[DashboardLayout] Unauthorized menu access attempt to: ${activeMenu}. Redirecting...`);
      navigate('/dashboard?tab=overview', { replace: true });
    }
  }, [activeMenu, allowedMenus, navigate]);

  // Diabetes submenu expanded state
  const [isDiabetesOpen, setIsDiabetesOpen] = useState(activeMenu === 'diabetes-screening');

  // Keep submenu open if activeMenu changes to diabetes-screening
  useEffect(() => {
    if (activeMenu === 'diabetes-screening') {
      setIsDiabetesOpen(true);
    }
  }, [activeMenu]);

  // Sidebar collapsible state
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    return window.innerWidth > 768;
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
    } catch (err) {
      console.error('[DashboardLayout] Error logging out:', err);
      setLoggingOut(false);
    }
  };

  const handleMenuClick = (menu: typeof activeMenu) => {
    if (window.innerWidth <= 768 && menu !== 'diabetes-screening') {
      setIsSidebarOpen(false);
    }

    if (menu === 'diabetes-screening') {
      setIsDiabetesOpen(!isDiabetesOpen);
      if (isAllowed('diabetes-screening')) {
        navigate('/DiabetesScreeningPage?view=summary');
      } else if (isAllowed('import-lab')) {
        navigate('/DiabetesScreeningPage?view=import-lab');
      }
    } else if (menu === 'questionnaire') {
      navigate('/questionnaire');
    } else {
      navigate(`/dashboard?tab=${menu}`, { state: { activeTab: menu } });
    }
  };

  const handleSubMenuClick = (view: 'summary' | 'hba1c-fbs' | 'monofilament' | 'abi' | 'import-lab') => {
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
    navigate(`/DiabetesScreeningPage?view=${view}`);
  };

  const hasMenuSection = isAllowed('overview') || isAllowed('patients') || isAllowed('appointments') || isAllowed('queues') || isAllowed('deliveries') || isAllowed('questionnaire') || isAllowed('import-lab');
  const hasManagementSection = isAllowed('doctors') || isAllowed('permissions');

  return (
    <div className="tail-layout">
      {/* Mobile Sidebar Overlay Backdrop */}
      {isSidebarOpen && window.innerWidth <= 768 && (
        <div className="tail-sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* LEFT SIDEBAR */}
      <aside className={`tail-sidebar ${!isSidebarOpen ? 'collapsed' : ''} ${isSidebarOpen && window.innerWidth <= 768 ? 'open' : ''}`}>
        <div className="tail-sidebar-header">
          <div style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')} className="tail-sidebar-brand">
            <img src={logoImg} alt="BIDI Logo" />
            <h2>OPD MED</h2>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="tail-sidebar-close"
            aria-label="Close Sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="tail-sidebar-menu-wrapper">
          {/* Main Menu Group */}
          {hasMenuSection && (
            <div className="tail-menu-group">
              <span className="tail-menu-group-title">MENU</span>
              <ul className="tail-menu-list">
                {isAllowed('overview') && (
                  <li>
                    <button
                      className={`tail-menu-item-btn ${activeMenu === 'overview' ? 'active' : ''}`}
                      onClick={() => handleMenuClick('overview')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                      </svg>
                      <span>ภาพรวมระบบ</span>
                    </button>
                  </li>
                )}
                {isAllowed('patients') && (
                  <li>
                    <button
                      className={`tail-menu-item-btn ${activeMenu === 'patients' ? 'active' : ''}`}
                      onClick={() => handleMenuClick('patients')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                      <span>ลงทะเบียนผู้ป่วย</span>
                    </button>
                  </li>
                )}
                {isAllowed('appointments') && (
                  <li>
                    <button
                      className={`tail-menu-item-btn ${activeMenu === 'appointments' ? 'active' : ''}`}
                      onClick={() => handleMenuClick('appointments')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      <span>นัดหมายผู้ป่วย</span>
                    </button>
                  </li>
                )}
                {isAllowed('queues') && (
                  <li>
                    <button
                      className={`tail-menu-item-btn ${activeMenu === 'queues' ? 'active' : ''}`}
                      onClick={() => handleMenuClick('queues')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                      </svg>
                      <span>จัดการคิว OPD</span>
                    </button>
                  </li>
                )}
                {isAllowed('deliveries') && (
                  <li>
                    <button
                      className={`tail-menu-item-btn ${activeMenu === 'deliveries' ? 'active' : ''}`}
                      onClick={() => handleMenuClick('deliveries')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                      </svg>
                      <span>ประวัติส่งยา</span>
                    </button>
                  </li>
                )}
                {isAllowed('questionnaire') && (
                  <li>
                    <button
                      className={`tail-menu-item-btn ${activeMenu === 'questionnaire' ? 'active' : ''}`}
                      onClick={() => handleMenuClick('questionnaire')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                      <span>ทำแบบสอบถาม</span>
                    </button>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Specialized Services Group */}
          {(isAllowed('diabetes-screening') || isAllowed('import-lab')) && (
            <div className="tail-menu-group">
              <span className="tail-menu-group-title">SPECIALIZED</span>
              <ul className="tail-menu-list">
                <li>
                  <button
                    className={`tail-menu-item-btn ${activeMenu === 'diabetes-screening' ? 'active' : ''}`}
                    onClick={() => handleMenuClick('diabetes-screening')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                    <span>คัดกรองเบาหวาน</span>
                    <svg className={`tail-chevron-icon ${isDiabetesOpen ? 'rotate' : ''}`} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>

                  {isDiabetesOpen && (
                    <ul className="tail-submenu-list">
                      <li>
                        <button
                          className={`tail-submenu-item-btn ${activeMenu === 'diabetes-screening' && activeSubMenu === 'summary' ? 'active' : ''}`}
                          onClick={() => handleSubMenuClick('summary')}
                        >
                          สรุปรายปี
                        </button>
                      </li>
                      <li>
                        <button
                          className={`tail-submenu-item-btn ${activeMenu === 'diabetes-screening' && activeSubMenu === 'hba1c-fbs' ? 'active' : ''}`}
                          onClick={() => handleSubMenuClick('hba1c-fbs')}
                        >
                          🩸 การตรวจ HbA1C และ FBS
                        </button>
                      </li>
                      <li>
                        <button
                          className={`tail-submenu-item-btn ${activeMenu === 'diabetes-screening' && activeSubMenu === 'monofilament' ? 'active' : ''}`}
                          onClick={() => handleSubMenuClick('monofilament')}
                        >
                          🦶 การตรวจคัดกรองเท้า Monofilament
                        </button>
                      </li>
                      <li>
                        <button
                          className={`tail-submenu-item-btn ${activeMenu === 'diabetes-screening' && activeSubMenu === 'abi' ? 'active' : ''}`}
                          onClick={() => handleSubMenuClick('abi')}
                        >
                          🫀 การตรวจคัดกรอง ABI
                        </button>
                      </li>
                      {isAllowed('import-lab') && (
                        <li>
                          <button
                            className={`tail-submenu-item-btn ${activeMenu === 'diabetes-screening' && activeSubMenu === 'import-lab' ? 'active' : ''}`}
                            onClick={() => handleSubMenuClick('import-lab')}
                          >
                            📥 นำเข้าข้อมูล Lab (Excel)
                          </button>
                        </li>
                      )}
                    </ul>
                  )}
                </li>
              </ul>
            </div>
          )}

          {/* Management Group */}
          {hasManagementSection && (
            <div className="tail-menu-group">
              <span className="tail-menu-group-title">MANAGEMENT</span>
              <ul className="tail-menu-list">
                {isAllowed('doctors') && (
                  <li>
                    <button
                      className={`tail-menu-item-btn ${activeMenu === 'doctors' ? 'active' : ''}`}
                      onClick={() => handleMenuClick('doctors')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                      </svg>
                      <span>จัดการแพทย์</span>
                    </button>
                  </li>
                )}
                {isAllowed('permissions') && (
                  <li>
                    <button
                      className={`tail-menu-item-btn ${activeMenu === 'permissions' ? 'active' : ''}`}
                      onClick={() => handleMenuClick('permissions')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                      </svg>
                      <span>จัดการสิทธิ์</span>
                    </button>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Account Group */}
          <div className="tail-menu-group">
            <span className="tail-menu-group-title">ACCOUNT</span>
            <ul className="tail-menu-list">
              <li>
                <button
                  className={`tail-menu-item-btn ${activeMenu === 'change-password' ? 'active' : ''}`}
                  onClick={() => handleMenuClick('change-password')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    <circle cx="12" cy="16" r="1.5"></circle>
                  </svg>
                  <span>เปลี่ยนรหัสผ่าน</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN AREA */}
      <div className="tail-main-area">
        {/* TOP HEADER */}
        <header className="tail-header">
          <div className="tail-header-left">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="tail-sidebar-toggle"
              aria-label="Toggle Sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <h1 className="tail-header-title">{title}</h1>
          </div>

          <div className="tail-header-right">
            <span className="tail-header-badge">เข้ารหัสปลอดภัย</span>
            <div className="tail-user-info">
              <span className="tail-user-name">{userDisplayName}</span>
              <span className="tail-user-email" style={{ display: 'block' }}>ตำแหน่ง: {userRole}</span>
              <span className="tail-user-email" style={{ display: 'block', fontSize: '0.7rem', opacity: 0.8 }}>{user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="tail-logout-btn"
            >
              {loggingOut ? (
                <>
                  <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, margin: 0 }}></span>
                  <span>ออกระบบ…</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>ออกจากระบบ</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <main className="tail-content">
          {children}
        </main>

        {/* FOOTER */}
        <footer className="tail-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span>Powered by</span>
            <div className="tech-badges-container">
              <span className="tech-badge chatgpt" title="ChatGPT">
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                ChatGPT
              </span>
              <span className="tech-badge gemini" title="Gemini">
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{ verticalAlign: 'middle' }}><path d="M12 2c0 5.523 4.477 10 10 10-5.523 0-10 4.477-10 10 0-5.523-4.477-10-10-10 5.523 0 10-4.477 10-10z"/></svg>
                Gemini
              </span>
              <span className="tech-badge claude" title="Claude">
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}><path d="M12 2v20M2 12h20M5.636 5.636l12.728 12.728M5.636 18.364L18.364 5.636"/></svg>
                Claude
              </span>
              <span className="tech-badge github" title="GitHub">
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                GitHub
              </span>
              <span className="tech-badge cloudflare" title="Cloudflare">
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}><path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42-1.04-1.21-1.88-2.22-2.39S11.66 8.01 10.6 8.5C8.07 9.68 6.5 12.3 6.5 15c0 .34.02.67.06 1A4.5 4.5 0 0 0 11 20.5c.81 0 1.6-.2 2.3-.59.7.39 1.49.59 2.3.59h1.9"/></svg>
                Cloudflare
              </span>
              <span className="tech-badge supabase" title="Supabase">
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{ verticalAlign: 'middle' }}><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                Supabase
              </span>
            </div>
          </div>

          <div>
            Developed by <strong style={{ color: 'var(--text-primary)' }}>Imanity21</strong>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            <span>โทร: 02-5903000 ต่อ 3543</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
