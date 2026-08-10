import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';

export function StudentLayout() {
  const [studentUser, setStudentUser] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const userStr = localStorage.getItem('seep_user');
    if (userStr) setStudentUser(JSON.parse(userStr));
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const navItems = [
    { key: 'available', path: '/student/dashboard?tab=available', label: '1. Available Exams', icon: '📝' },
    { key: 'results', path: '/student/dashboard?tab=results', label: '2. My Results & History', icon: '📊' },
  ];

  const currentTab = new URLSearchParams(location.search).get('tab') || 'available';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0b0f19', color: '#f3f4f6', fontFamily: "'Inter', sans-serif" }}>
      {/* Left Sidebar */}
      <aside
        style={{
          width: '260px',
          background: 'rgba(17, 24, 39, 0.85)',
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
        {/* Brand Header */}
        <div style={{ padding: '0 0.75rem 1.5rem 0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '1.2rem', color: '#fff', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
              S
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #ffffff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                SEEP
              </h1>
              <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500 }}>Student Portal</span>
            </div>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith('/student') && currentTab === item.key;
            return (
              <NavLink
                key={item.key}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '0.925rem',
                  fontWeight: 500,
                  color: isActive ? '#ffffff' : '#9ca3af',
                  background: isActive ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.25))' : 'transparent',
                  border: isActive ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer info */}
        <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
              {studentUser?.name ? studentUser.name.charAt(0) : 'S'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f3f4f6', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {studentUser?.name || 'Student Candidate'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#818cf8' }}>{studentUser?.regNo || studentUser?.department || 'Student'}</div>
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
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.875rem'
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ marginLeft: '260px', flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header */}
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
            <span style={{ color: '#818cf8', fontWeight: 700 }}>SEEP</span> • Student Portal & Online Examination Platform
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f3f4f6' }}>{studentUser?.name || 'Alex Johnson'}</div>
              <div style={{ fontSize: '0.75rem', color: '#818cf8' }}>Reg: {studentUser?.regNo || 'CS2026001'}</div>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'grid', placeItems: 'center', fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>
              {studentUser?.name ? studentUser.name.charAt(0) : 'S'}
            </div>
          </div>
        </header>

        {/* Nested Route View */}
        <main style={{ padding: '2rem', flex: 1 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
