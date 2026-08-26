import { Outlet } from 'react-router-dom';

export function StudentLayout() {
  return (
    <div style={{ minHeight: '100vh', background: '#0c0e17' }}>
      <Outlet />
    </div>
  );
}
