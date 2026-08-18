import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { adminScopesApi } from '../services/adminScopes';

export default function Layout() {
  const { logOut } = useAuth();
  const { data: myScope } = useQuery({ queryKey: ['admin-scopes', 'me'], queryFn: adminScopesApi.me });

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <h3 style={{ fontSize: 14, padding: '0 10px' }}>Vanigar Ani</h3>
        <NavLink to="/posts" className={({ isActive }) => (isActive ? 'active' : '')}>
          Posts
        </NavLink>
        <NavLink to="/jurisdictions" className={({ isActive }) => (isActive ? 'active' : '')}>
          Jurisdictions
        </NavLink>
        <NavLink to="/bearers" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Bearers
        </NavLink>
        <NavLink to="/bearers/list" className={({ isActive }) => (isActive ? 'active' : '')}>
          All Bearers
        </NavLink>
        <NavLink to="/registrations" className={({ isActive }) => (isActive ? 'active' : '')}>
          Registrations
        </NavLink>
        <NavLink to="/directory" className={({ isActive }) => (isActive ? 'active' : '')}>
          Directory
        </NavLink>
        <NavLink to="/events" className={({ isActive }) => (isActive ? 'active' : '')}>
          Events
        </NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
          Dashboard
        </NavLink>
        <NavLink to="/coverage" className={({ isActive }) => (isActive ? 'active' : '')}>
          Coverage
        </NavLink>
        <NavLink to="/news" end className={({ isActive }) => (isActive ? 'active' : '')}>
          News
        </NavLink>
        <NavLink to="/news/drafts" className={({ isActive }) => (isActive ? 'active' : '')}>
          Drafts
        </NavLink>
        {myScope?.role === 'SUPER_ADMIN' && (
          <NavLink to="/admins" className={({ isActive }) => (isActive ? 'active' : '')}>
            Admins
          </NavLink>
        )}
        <button className="secondary" style={{ marginTop: 16, width: '100%' }} onClick={logOut}>
          Log out
        </button>
      </nav>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
