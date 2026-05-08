import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Couriers from './pages/Couriers';
import CourierDetail from './pages/CourierDetail';
import Disputes from './pages/Disputes';
import Reports from './pages/Reports';
import Login from './pages/Login';
import { connectSocket, disconnectSocket } from './socket';

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, type = 'info') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ─── Auth guard ───────────────────────────────────────────────────────────────

function useAuth() {
  const token = localStorage.getItem('yavaya_admin_token');
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('yavaya_admin_user') || 'null'); } catch { return null; }
  })();
  return { token, user, isAdmin: user?.role === 'admin' };
}

function RequireAdmin({ children }) {
  const { token, isAdmin } = useAuth();
  if (!token || !isAdmin) return <Navigate to="/login" replace />;
  return children;
}

// ─── Admin layout ─────────────────────────────────────────────────────────────

function AdminLayout({ children }) {
  const { token } = useAuth();

  useEffect(() => {
    if (token) connectSocket(token);
    return () => disconnectSocket();
  }, [token]);

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <RequireAdmin>
              <AdminLayout><Dashboard /></AdminLayout>
            </RequireAdmin>
          } />
          <Route path="/orders" element={
            <RequireAdmin>
              <AdminLayout><Orders /></AdminLayout>
            </RequireAdmin>
          } />
          <Route path="/couriers" element={
            <RequireAdmin>
              <AdminLayout><Couriers /></AdminLayout>
            </RequireAdmin>
          } />
          <Route path="/couriers/:id" element={
            <RequireAdmin>
              <AdminLayout><CourierDetail /></AdminLayout>
            </RequireAdmin>
          } />
          <Route path="/disputes" element={
            <RequireAdmin>
              <AdminLayout><Disputes /></AdminLayout>
            </RequireAdmin>
          } />
          <Route path="/reports" element={
            <RequireAdmin>
              <AdminLayout><Reports /></AdminLayout>
            </RequireAdmin>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
