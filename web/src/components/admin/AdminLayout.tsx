import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';

export function AdminLayout() {
  const [adminUser, setAdminUser] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const userStr = localStorage.getItem('seep_user');
    if (userStr) setAdminUser(JSON.parse(userStr));
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const navItems = [
    { key: 'OVERVIEW', path: '/admin/dashboard?tab=OVERVIEW', label: '1. System Overview', icon: '⚡' },
    { key: 'DEPARTMENTS', path: '/admin/dashboard?tab=DEPARTMENTS', label: '2. Department Details', icon: '🏢' },
    { key: 'TEACHERS', path: '/admin/dashboard?tab=TEACHERS', label: '3. Teacher Details', icon: '👨‍🏫' },
    { key: 'STUDENTS', path: '/admin/dashboard?tab=STUDENTS', label: '4. Student Details', icon: '🎓' },
    { key: 'APPROVALS', path: '/admin/dashboard?tab=APPROVALS', label: '5. Test Approvals', icon: '📋' },
    { key: 'RESULTS', path: '/admin/dashboard?tab=RESULTS', label: '6. Student Results', icon: '📊' },
    { key: 'RETEST_REQUESTS', path: '/admin/dashboard?tab=RETEST_REQUESTS', label: '7. Retest Requests', icon: '📩' },
    { key: 'AUDIT_LOGS', path: '/admin/dashboard?tab=AUDIT_LOGS', label: '8. Audit Logs', icon: '🛡️' },
    { key: 'SYSTEM_CONFIG', path: '/admin/dashboard?tab=SYSTEM_CONFIG', label: '9. System Config & Flags', icon: '⚙️' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0b0f19', color: '#f3f4f6', fontFamily: "'Inter', sans-serif" }}>
      {/* Left Admin Sidebar */}
      <aside
        style={{
          width: '270px',
          background: 'rgba(17, 24, 39, 0.95)',
          backdropFilter: 'blur(16px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem 1rem',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 50
        }}
      >
        {/* Admin Brand Header */}
        <div style={{ padding: '0 0.75rem 1.5rem 0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '1.25rem', color: '#fff', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
              🛡️
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #ffffff, #6ee7b7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                SEEP ADMIN
              </h1>
              <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>Administrator Portal</span>
            </div>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, overflowY: 'auto' }}>
          {navItems.map((item) => {
            const currentTab = new URLSearchParams(location.search).get('tab') || 'OVERVIEW';
            const isActive = location.pathname.startsWith('/admin') && currentTab === item.key;
            return (
              <NavLink
                key={item.key}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 0.9rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: isActive ? '#ffffff' : '#9ca3af',
                  background: isActive ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.25))' : 'transparent',
                  border: isActive ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Admin User Info */}
        <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
              {adminUser?.name ? adminUser.name.charAt(0) : 'A'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f3f4f6', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {adminUser?.name || 'System Admin'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#34d399' }}>{adminUser?.email || 'admin@seep.platform'}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.6rem',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#f87171',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ marginLeft: '270px', flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Sticky Top Header Bar */}
        <header
          style={{
            height: '64px',
            background: 'rgba(17, 24, 39, 0.7)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 2rem',
            position: 'sticky',
            top: 0,
            zIndex: 40
          }}
        >
          <div style={{ fontSize: '0.9rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#34d399', fontWeight: 700 }}>SEEP</span> • Administrator Command Center
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f3f4f6' }}>{adminUser?.name || 'Administrator'}</div>
              <div style={{ fontSize: '0.75rem', color: '#34d399' }}>Full Access Control</div>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'grid', placeItems: 'center', fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>
              {adminUser?.name ? adminUser.name.charAt(0) : 'A'}
            </div>
          </div>
        </header>

        {/* Content View */}
        <main style={{ padding: '2rem', flex: 1 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
