import { NavLink, useNavigate } from 'react-router-dom';
import { disconnectSocket } from '../socket';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '◉' },
  { to: '/orders', label: 'Pedidos', icon: '📦' },
  { to: '/couriers', label: 'Domiciliarios', icon: '🏍' },
  { to: '/disputes', label: 'Disputas', icon: '⚡' },
  { to: '/reports', label: 'Reportes', icon: '📊' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('yavaya_admin_user') || 'null'); } catch { return null; }
  })();

  function logout() {
    disconnectSocket();
    localStorage.removeItem('yavaya_admin_token');
    localStorage.removeItem('yavaya_admin_user');
    navigate('/login');
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>YAVA'YA</h1>
        <span>Admin Panel</span>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(n => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="icon">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ marginBottom: 8, fontWeight: 700, color: 'var(--text-secondary)' }}>
          {user?.name || 'Admin'}
        </div>
        <button className="btn-ghost w-full" style={{ fontSize: 12 }} onClick={logout}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
