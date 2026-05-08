import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendOtp, verifyOtp } from '../api';

export default function Login() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSendOtp(e) {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setError('');
    try {
      await sendOtp(phone.trim());
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar el código');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await verifyOtp(phone.trim(), code.trim());
      if (data.user?.role !== 'admin') {
        setError('Esta cuenta no tiene permisos de administrador.');
        return;
      }
      localStorage.setItem('yavaya_admin_token', data.token);
      localStorage.setItem('yavaya_admin_user', JSON.stringify(data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Código incorrecto');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">YAVA'YA</div>
        <div className="login-subtitle">Panel de Administración</div>

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp}>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input
                type="tel"
                placeholder="+57 300 000 0000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full"
                autoFocus
              />
            </div>
            {error && <p className="text-danger" style={{ marginBottom: 12, fontSize: 13 }}>{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Enviando…' : 'Enviar código SMS'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
              Código enviado a <strong style={{ color: 'var(--text)' }}>{phone}</strong>
            </p>
            <div className="form-group">
              <label className="form-label">Código OTP</label>
              <input
                type="text"
                placeholder="123456"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full"
                maxLength={6}
                autoFocus
              />
            </div>
            {error && <p className="text-danger" style={{ marginBottom: 12, fontSize: 13 }}>{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Verificando…' : 'Ingresar al panel'}
            </button>
            <button
              type="button"
              className="btn-ghost w-full mt-8"
              onClick={() => { setStep('phone'); setError(''); }}
            >
              ← Cambiar teléfono
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
