import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await adminLogin(email.trim(), password);
      localStorage.setItem('yavaya_admin_token', data.token);
      localStorage.setItem('yavaya_admin_user', JSON.stringify(data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">YAVA'YA</div>
        <div className="login-subtitle">Panel de Administración</div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Correo electrónico</label>
            <input
              type="email"
              placeholder="admin@yavaya.co"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full"
              autoFocus
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full"
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="text-danger" style={{ marginBottom: 12, fontSize: 13 }}>{error}</p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
