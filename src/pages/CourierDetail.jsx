import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCourier, verifyCourier, walletTopup, blockUser } from '../api';
import { useToast } from '../App';

const VEHICLE_ICON = { moto: '🏍', bici: '🚲', pie: '🚶' };
const BADGE_ICON   = { top_yavaya: '🏆', '100_deliveries': '📦', sin_disputas: '🕊️' };
const BADGE_LABEL  = { top_yavaya: "Top YAVA'YA", '100_deliveries': '100 Entregas', sin_disputas: 'Sin Disputas' };

const DOCS = [
  { key: 'cedula_front_url',  label: 'Cédula — Frente' },
  { key: 'cedula_back_url',   label: 'Cédula — Reverso' },
  { key: 'selfie_url',        label: 'Selfie con cédula' },
  { key: 'vehicle_photo_url', label: 'Foto moto / placa' },
  { key: 'license_url',       label: 'Licencia — Frente' },
  { key: 'license_back_url',  label: 'Licencia — Reverso' },
];

function formatCOP(n) { return `$${Number(n || 0).toLocaleString('es-CO')}`; }
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function CourierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [photoModal, setPhotoModal] = useState(null);   // url de foto ampliada
  const [rejectModal, setRejectModal] = useState(false); // modal motivo rechazo
  const [rejectReason, setRejectReason] = useState('');

  // Wallet topup
  const [topupAmount, setTopupAmount] = useState('');
  const [topupDesc, setTopupDesc]     = useState('');

  async function load() {
    setLoading(true);
    try {
      const { data: d } = await getCourier(id);
      setData(d);
    } catch {
      toast('Error al cargar domiciliario', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleApprove() {
    if (!window.confirm(`¿Aprobar a ${data.courier.user?.name}? El domiciliario quedará activo y recibirá una notificación.`)) return;
    setSaving(true);
    try {
      await verifyCourier(id, { verification_status: 'approved' });
      toast(`✅ ${data.courier.user?.name} fue aprobado`, 'success');
      load();
    } catch (err) {
      toast(err.response?.data?.error || 'Error al aprobar', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast('Escribe un motivo antes de rechazar', 'error');
      return;
    }
    setSaving(true);
    try {
      await verifyCourier(id, { verification_status: 'rejected', verification_notes: rejectReason.trim() });
      toast(`❌ ${data.courier.user?.name} fue rechazado`, 'info');
      setRejectModal(false);
      setRejectReason('');
      load();
    } catch (err) {
      toast(err.response?.data?.error || 'Error al rechazar', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleTopup(e) {
    e.preventDefault();
    // Acepta formato colombiano: "150.000" o "150000" → 150000
    const amount = parseInt(String(topupAmount).replace(/\./g, '').replace(/,/g, ''));
    if (!amount || amount < 1000) { toast('El monto mínimo es $1.000', 'error'); return; }
    setSaving(true);
    try {
      await walletTopup(id, { amount, description: topupDesc || undefined });
      toast(`Recarga de ${formatCOP(amount)} exitosa`, 'success');
      setTopupAmount('');
      setTopupDesc('');
      load();
    } catch (err) {
      toast(err.response?.data?.error || 'Error al recargar', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleBlock(blocked) {
    const reason = blocked ? window.prompt('Razón del bloqueo:') : null;
    if (blocked && !reason) return;
    setSaving(true);
    try {
      await blockUser(data.courier.user_id, { blocked, reason });
      toast(`Usuario ${blocked ? 'bloqueado' : 'desbloqueado'}`, blocked ? 'error' : 'success');
      load();
    } catch (err) {
      toast(err.response?.data?.error || 'Error', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="empty-state" style={{ marginTop: 60 }}><p>Cargando…</p></div>;
  if (!data)   return <div className="empty-state"><p>No encontrado</p></div>;

  const { courier, wallet, ratings, disputes } = data;
  const isPending = courier.verification_status === 'pending';
  const isApproved = courier.verification_status === 'approved';
  const isRejected = courier.verification_status === 'rejected';
  const isBlocked  = courier.user?.status === 'blocked';
  const codLimit   = courier.completed_orders < 10 ? 100000
    : courier.completed_orders < 50 ? 300000 : null;

  return (
    <div>
      {/* Back */}
      <button className="btn-ghost btn-sm mb-16" onClick={() => navigate('/couriers')}>← Volver a domiciliarios</button>

      {/* ── BANNER DE ACCIÓN (solo cuando está pendiente) ─────────────────────── */}
      {isPending && (
        <div style={{
          background: 'linear-gradient(135deg, #1A1200, #2A1E00)',
          border: '1.5px solid var(--warning)',
          borderRadius: 14,
          padding: '20px 24px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontFamily: 'Barlow Condensed', fontSize: 18, color: 'var(--warning)', marginBottom: 4 }}>
              ⏳ VERIFICACIÓN PENDIENTE
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Revisa los 6 documentos{courier.vehicle_type === 'moto' ? ', la placa y datos del vehículo,' : ''} y decide si aprobar o rechazar a <strong style={{ color: 'var(--text)' }}>{courier.user?.name}</strong>.
            </div>
          </div>
          <div className="flex gap-8">
            <button
              className="btn-success"
              style={{ padding: '10px 24px', fontSize: 15 }}
              disabled={saving}
              onClick={handleApprove}
            >
              ✅ Aprobar cuenta
            </button>
            <button
              className="btn-danger"
              style={{ padding: '10px 24px', fontSize: 15 }}
              disabled={saving}
              onClick={() => setRejectModal(true)}
            >
              ❌ Rechazar
            </button>
          </div>
        </div>
      )}

      {/* ── BANNER APROBADO ───────────────────────────────────────────────────── */}
      {isApproved && (
        <div style={{
          background: '#0D2218', border: '1.5px solid var(--success)',
          borderRadius: 14, padding: '14px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <span style={{ color: 'var(--success)', fontWeight: 700 }}>✅ Cuenta aprobada</span>
            {courier.verified_at && (
              <span className="text-muted text-sm" style={{ marginLeft: 12 }}>
                el {formatDate(courier.verified_at)}
              </span>
            )}
          </div>
          <button className="btn-danger btn-sm" disabled={saving} onClick={() => setRejectModal(true)}>
            Revocar aprobación
          </button>
        </div>
      )}

      {/* ── BANNER RECHAZADO ─────────────────────────────────────────────────── */}
      {isRejected && (
        <div style={{
          background: '#200D0D', border: '1.5px solid var(--danger)',
          borderRadius: 14, padding: '14px 20px', marginBottom: 20,
        }}>
          <div style={{ color: 'var(--danger)', fontWeight: 700, marginBottom: 4 }}>❌ Cuenta rechazada</div>
          {courier.verification_notes && (
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Motivo: {courier.verification_notes}</div>
          )}
          <button className="btn-success btn-sm" style={{ marginTop: 10 }} disabled={saving} onClick={handleApprove}>
            ✅ Aprobar igualmente
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>

        {/* ── COLUMNA IZQUIERDA ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Perfil */}
          <div className="card">
            <div className="flex gap-16 mb-20">
              {courier.selfie_url
                ? <img
                    src={courier.selfie_url}
                    alt="foto"
                    onClick={() => setPhotoModal(courier.selfie_url)}
                    style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                      border: '3px solid var(--primary)', cursor: 'pointer', flexShrink: 0 }}
                  />
                : <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--surface2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, flexShrink: 0 }}>
                    {VEHICLE_ICON[courier.vehicle_type]}
                  </div>
              }
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 28, marginBottom: 4 }}>{courier.user?.name || '—'}</h2>
                <div className="text-muted text-sm" style={{ marginBottom: 6 }}>
                  {courier.user?.phone} &nbsp;·&nbsp;
                  {VEHICLE_ICON[courier.vehicle_type]} {courier.vehicle_type}
                </div>
                {/* Placa como ID del domiciliario */}
                {courier.plate_number && (
                  <div style={{
                    display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                    background: '#0A0A0A', border: '2.5px solid var(--primary)',
                    borderRadius: 10, padding: '6px 16px', marginBottom: 8,
                  }}>
                    <span style={{ fontFamily: 'Barlow Condensed', fontSize: 10, color: 'var(--primary)', letterSpacing: 3, textTransform: 'uppercase' }}>PLACA / ID</span>
                    <span style={{ fontFamily: 'Barlow Condensed', fontSize: 28, color: 'var(--primary)', fontWeight: 700, lineHeight: '1.1' }}>{courier.plate_number}</span>
                  </div>
                )}

                <div className="flex gap-8" style={{ flexWrap: 'wrap', marginTop: 8 }}>
                  {isPending  && <span className="badge badge-pending">⏳ Pendiente verificación</span>}
                  {isApproved && <span className="badge badge-approved">✅ Aprobado</span>}
                  {isRejected && <span className="badge badge-rejected">❌ Rechazado</span>}
                  {isBlocked  && <span className="badge badge-rejected">🔒 Bloqueado</span>}
                  {courier.is_online && <span className="badge badge-online">● Online</span>}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid-4" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {[
                { label: 'Rating',      value: Number(courier.rating || 5).toFixed(2), icon: '⭐' },
                { label: 'Entregas',    value: courier.total_deliveries,               icon: '📦' },
                { label: 'Completados', value: courier.completed_orders,               icon: '✅' },
                { label: 'Wallet',      value: formatCOP(courier.wallet_balance),      icon: '💰' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center', padding: '12px 8px', background: 'var(--surface2)', borderRadius: 8 }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontFamily: 'Barlow Condensed', fontSize: 22, color: 'var(--primary)' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Trust Score */}
            <div className="card-sm mt-16" style={{ borderColor: 'var(--primary)' }}>
              <div className="flex-between">
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                    Trust Score — Tier {courier.completed_orders < 10 ? 1 : courier.completed_orders < 50 ? 2 : 3}
                  </div>
                  <div className="text-muted text-sm">
                    {codLimit ? `COD máx ${formatCOP(codLimit)}` : 'Sin límite de COD 🎉'}
                    &nbsp;·&nbsp;{courier.completed_orders} pedidos completados
                  </div>
                </div>
                <div style={{ fontFamily: 'Barlow Condensed', fontSize: 28, color: 'var(--primary)' }}>
                  {courier.completed_orders < 10 ? 'T1' : courier.completed_orders < 50 ? 'T2' : 'T3'}
                </div>
              </div>
              <div style={{ background: 'var(--surface)', borderRadius: 4, height: 6, marginTop: 12, overflow: 'hidden' }}>
                <div style={{
                  background: 'var(--primary)',
                  width: `${Math.min(100, (courier.completed_orders / 50) * 100)}%`,
                  height: '100%', borderRadius: 4,
                }} />
              </div>
            </div>

            {/* Badges */}
            {courier.badges?.length > 0 && (
              <div className="flex gap-8 mt-16" style={{ flexWrap: 'wrap' }}>
                {courier.badges.map(b => (
                  <div key={b.badge_type} className="pill">
                    <span>{BADGE_ICON[b.badge_type] || '🏅'}</span>
                    <span>{BADGE_LABEL[b.badge_type] || b.badge_type}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Bancos / métodos de pago */}
            {courier.payment_methods?.length > 0 && (
              <div className="mt-16">
                <div className="section-title">Bancos con los que trabaja</div>
                <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                  {courier.payment_methods.filter(pm => pm.is_active).map((pm, i) => (
                    <span key={i} className="badge badge-primary" style={{ fontSize: 12, padding: '4px 10px' }}>
                      {pm.method.replace('_', ' ').toUpperCase()}
                      {pm.account_number && ` · ${pm.account_number}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Datos del vehículo (si es moto) */}
            {courier.vehicle_type === 'moto' && (
              <div className="mt-16" style={{ background: 'var(--surface2)', borderRadius: 10, padding: '14px 16px' }}>
                <div className="section-title" style={{ marginBottom: 10 }}>🏍️ Datos del vehículo</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', fontSize: 13 }}>
                  {courier.plate_number && (
                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Placa</span>
                      <div style={{ fontFamily: 'Barlow Condensed', fontSize: 20, color: 'var(--primary)', fontWeight: 700 }}>{courier.plate_number}</div>
                    </div>
                  )}
                  {courier.vehicle_reference && (
                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Referencia</span>
                      <div style={{ color: 'var(--text)', marginTop: 2 }}>{courier.vehicle_reference}</div>
                    </div>
                  )}
                  {courier.vehicle_color && (
                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Color</span>
                      <div style={{ color: 'var(--text)', marginTop: 2 }}>{courier.vehicle_color}</div>
                    </div>
                  )}
                  {courier.vehicle_registration && (
                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Matrícula</span>
                      <div style={{ color: 'var(--text)', marginTop: 2 }}>{courier.vehicle_registration}</div>
                    </div>
                  )}
                  {!courier.plate_number && !courier.vehicle_reference && !courier.vehicle_color && !courier.vehicle_registration && (
                    <div style={{ gridColumn: '1/-1', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Sin datos del vehículo registrados aún.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bloquear */}
            <div className="mt-16" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className={`${isBlocked ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                disabled={saving}
                onClick={() => handleBlock(!isBlocked)}
              >
                {isBlocked ? '🔓 Desbloquear usuario' : '🔒 Bloquear usuario'}
              </button>
            </div>
          </div>

          {/* ── DOCUMENTOS ──────────────────────────────────────────────────── */}
          <div className="card">
            <div className="flex-between mb-16">
              <h3 style={{ fontFamily: 'Barlow Condensed', fontSize: 22 }}>Documentos</h3>
              <span style={{
                fontFamily: 'Barlow Condensed', fontSize: 18, fontWeight: 700,
                color: DOCS.filter(d => courier[d.key]).length === 6 ? 'var(--success)' : 'var(--warning)',
              }}>
                {DOCS.filter(d => courier[d.key]).length}/6
              </span>
            </div>

            <div className="doc-grid">
              {DOCS.map(d => (
                <div
                  key={d.key}
                  className="doc-thumb"
                  onClick={() => courier[d.key] && setPhotoModal(courier[d.key])}
                  style={{ opacity: courier[d.key] ? 1 : 0.45 }}
                >
                  {courier[d.key]
                    ? <img src={courier[d.key]} alt={d.label} />
                    : <div style={{ height: 100, background: 'var(--surface2)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: 24 }}>📄</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sin subir</span>
                      </div>
                  }
                  <div className="doc-thumb-label" style={{ color: courier[d.key] ? 'var(--success)' : 'var(--text-muted)' }}>
                    {courier[d.key] ? '✓ ' : '○ '}{d.label}
                  </div>
                </div>
              ))}
            </div>

            {isPending && (
              <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--surface2)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                💡 Haz clic en cada foto para verla grande. Revisa que los documentos sean legibles y pertenezcan a la misma persona.
              </div>
            )}
          </div>

          {/* Calificaciones */}
          {ratings?.length > 0 && (
            <div className="card">
              <h3 style={{ fontFamily: 'Barlow Condensed', fontSize: 20, marginBottom: 16 }}>Reseñas recientes</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ratings.map((r, i) => (
                  <div key={i} className="card-sm">
                    <div className="flex-between mb-8">
                      <div className="stars">{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</div>
                      <div className="text-muted text-sm">{formatDate(r.created_at)}</div>
                    </div>
                    {r.comment && <p style={{ fontSize: 13, color: 'var(--text)' }}>"{r.comment}"</p>}
                    <div className="text-muted text-sm mt-8">Pedido {r.order?.order_number}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disputas */}
          {disputes?.length > 0 && (
            <div className="card">
              <h3 style={{ fontFamily: 'Barlow Condensed', fontSize: 20, marginBottom: 16, color: 'var(--danger)' }}>
                ⚡ Disputas ({disputes.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {disputes.map(d => (
                  <div key={d.id} className="card-sm" style={{ borderColor: 'var(--danger)' }}>
                    <div className="flex-between">
                      <span className="font-bold">{d.order?.order_number}</span>
                      <span className={`badge ${d.status === 'open' ? 'badge-rejected' : 'badge-approved'}`}>{d.status}</span>
                    </div>
                    <div className="text-muted text-sm mt-8">{d.reason || 'Sin razón especificada'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── COLUMNA DERECHA ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Wallet */}
          <div className="card">
            <h3 style={{ fontFamily: 'Barlow Condensed', fontSize: 20, marginBottom: 4 }}>Wallet</h3>
            <div style={{ fontFamily: 'Barlow Condensed', fontSize: 48, color: 'var(--primary)', lineHeight: 1.1 }}>
              {formatCOP(courier.wallet_balance)}
            </div>
            <hr className="divider" />
            <div className="section-title">Recarga manual</div>
            <form onSubmit={handleTopup} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label className="form-label">Monto (COP)</label>
                <input
                  type="text" placeholder="150.000 o 150000"
                  value={topupAmount}
                  onChange={e => setTopupAmount(e.target.value)}
                  className="w-full"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="form-label">Descripción</label>
                <input
                  type="text" placeholder="Ej: Transferencia Nequi…"
                  value={topupDesc} onChange={e => setTopupDesc(e.target.value)} className="w-full"
                />
              </div>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Recargando…' : '💰 Recargar wallet'}
              </button>
            </form>

            {wallet?.transactions?.length > 0 && (
              <div className="mt-16">
                <div className="section-title">Últimas transacciones</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {wallet.transactions.map(t => (
                    <div key={t.id} className="flex-between" style={{ fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: t.type === 'top_up' ? 'var(--success)' : 'var(--danger)' }}>
                          {t.type === 'top_up' ? '+' : '-'}{formatCOP(Math.abs(t.amount))}
                        </div>
                        <div className="text-muted text-sm">{t.description || t.type}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="text-muted text-sm">{formatCOP(t.balance_after)}</div>
                        <div className="text-muted text-sm">{new Date(t.created_at).toLocaleDateString('es-CO')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Info básica */}
          <div className="card">
            <h3 style={{ fontFamily: 'Barlow Condensed', fontSize: 18, marginBottom: 12 }}>Info del registro</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <InfoRow label="Registrado"  value={formatDate(courier.user?.created_at)} />
              <InfoRow label="Verificado"  value={formatDate(courier.verified_at)} />
              <InfoRow label="Estado"      value={courier.user?.status} />
              <InfoRow label="Online"      value={courier.is_online ? '● Sí' : 'No'} />
              {courier.verification_notes && (
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                    NOTAS ADMIN
                  </div>
                  <div style={{ background: 'var(--surface2)', padding: '8px 10px', borderRadius: 6, fontSize: 13, color: 'var(--warning)' }}>
                    {courier.verification_notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL FOTO GRANDE ─────────────────────────────────────────────────── */}
      {photoModal && (
        <div className="modal-overlay" onClick={() => setPhotoModal(null)}>
          <div style={{ maxWidth: '92vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
            onClick={e => e.stopPropagation()}>
            <img src={photoModal} alt="documento" style={{ maxWidth: '100%', maxHeight: '82vh', borderRadius: 10, objectFit: 'contain' }} />
            <button className="btn-ghost btn-sm" onClick={() => setPhotoModal(null)}>✕ Cerrar</button>
          </div>
        </div>
      )}

      {/* ── MODAL MOTIVO DE RECHAZO ───────────────────────────────────────────── */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => { setRejectModal(false); setRejectReason(''); }}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ color: 'var(--danger)' }}>❌ Rechazar domiciliario</div>
              <button className="modal-close" onClick={() => { setRejectModal(false); setRejectReason(''); }}>✕</button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{data.courier.user?.name}</div>
              <div className="text-muted text-sm">{data.courier.user?.phone}</div>
            </div>

            <div>
              <label className="form-label">Motivo del rechazo <span style={{ color: 'var(--danger)' }}>*</span></label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Ej: Los documentos no son legibles. Por favor vuelve a subir la cédula con mejor iluminación."
                style={{ width: '100%', minHeight: 100, resize: 'vertical', marginBottom: 16 }}
                autoFocus
              />
            </div>

            <div className="flex gap-8">
              <button
                className="btn-danger"
                style={{ flex: 1, padding: '10px 0' }}
                disabled={saving || !rejectReason.trim()}
                onClick={handleReject}
              >
                {saving ? 'Rechazando…' : '❌ Confirmar rechazo'}
              </button>
              <button
                className="btn-ghost"
                onClick={() => { setRejectModal(false); setRejectReason(''); }}
                disabled={saving}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <span style={{ color: 'var(--text-secondary)', fontWeight: 600, minWidth: 90, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
        {label}
      </span>
      <span style={{ color: 'var(--text)' }}>{value || '—'}</span>
    </div>
  );
}
