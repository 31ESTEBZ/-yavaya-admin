import { useState, useEffect, useCallback } from 'react';
import { getDisputes, getDispute, resolveDispute } from '../api';
import { useToast } from '../App';

function formatCOP(n) { return `$${Number(n || 0).toLocaleString('es-CO')}`; }
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const STATUS_OPTS = [
  { value: 'open', label: '⚡ Abiertas' },
  { value: 'resolved_for_courier', label: '✅ A favor courier' },
  { value: 'resolved_for_business', label: '❌ A favor negocio' },
];

export default function Disputes() {
  const toast = useToast();
  const [status, setStatus] = useState('open');
  const [disputes, setDisputes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getDisputes({ status, limit: 30 });
      setDisputes(data.disputes || []);
      setTotal(data.total || 0);
    } catch { } finally { setLoading(false); }
  }, [status]);

  useEffect(() => { fetchList(); }, [fetchList]);

  async function openDetail(id) {
    setSelected(id);
    setAdminNotes('');
    try {
      const { data } = await getDispute(id);
      setDetail(data);
    } catch { setDetail(null); }
  }

  async function handleResolve(resolution) {
    if (!selected) return;
    const msg = resolution === 'resolved_for_courier'
      ? '¿Resolver a favor del DOMICILIARIO?'
      : '¿Resolver a favor del NEGOCIO? (El courier será BLOQUEADO PERMANENTEMENTE)';
    if (!window.confirm(msg)) return;

    setSaving(true);
    try {
      await resolveDispute(selected, { resolution, admin_notes: adminNotes });
      toast(`Disputa resuelta: ${resolution === 'resolved_for_courier' ? 'a favor del courier' : 'a favor del negocio'}`,
        resolution === 'resolved_for_courier' ? 'success' : 'info');
      setSelected(null);
      setDetail(null);
      fetchList();
    } catch (err) {
      toast(err.response?.data?.error || 'Error al resolver', 'error');
    } finally { setSaving(false); }
  }

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 48px)' }}>
      {/* Lista */}
      <div style={{ width: 340, flexShrink: 0, overflowY: 'auto' }}>
        <div className="page-header">
          <div>
            <h2 className="page-title">Disputas</h2>
            <div className="page-subtitle">{total} en esta vista</div>
          </div>
        </div>

        <div className="flex gap-8 mb-16" style={{ flexWrap: 'wrap' }}>
          {STATUS_OPTS.map(o => (
            <button
              key={o.value}
              onClick={() => { setStatus(o.value); setSelected(null); setDetail(null); }}
              className={status === o.value ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
              style={{ fontSize: 12 }}
            >
              {o.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty-state"><p>Cargando…</p></div>
        ) : disputes.length === 0 ? (
          <div className="empty-state"><div className="icon">✅</div><p>Sin disputas en esta categoría</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {disputes.map(d => (
              <div
                key={d.id}
                className="card-sm"
                style={{
                  cursor: 'pointer',
                  borderColor: selected === d.id ? 'var(--primary)' : d.status === 'open' ? 'var(--danger)' : 'var(--border)',
                }}
                onClick={() => openDetail(d.id)}
              >
                <div className="flex-between mb-8">
                  <span className="text-primary font-bold">{d.order?.order_number}</span>
                  <span style={{ fontSize: 20 }}>⚡</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{formatCOP(d.order?.cod_amount)}</div>
                <div className="text-muted text-sm mt-8">
                  Cliente: {d.order?.client?.name}<br />
                  Courier: {d.order?.courier?.user?.name || '—'}
                </div>
                {d.reason && <div style={{ fontSize: 12, marginTop: 6, color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{d.reason}"</div>}
                <div className="text-muted text-sm mt-8">{formatDate(d.created_at)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Panel detalle */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!selected ? (
          <div className="empty-state" style={{ marginTop: 80 }}>
            <div className="icon">⚡</div>
            <p>Seleccioná una disputa para ver el detalle</p>
          </div>
        ) : !detail ? (
          <div className="empty-state"><p>Cargando…</p></div>
        ) : (
          <DisputeDetail
            detail={detail}
            adminNotes={adminNotes}
            setAdminNotes={setAdminNotes}
            onResolve={handleResolve}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}

function DisputeDetail({ detail, adminNotes, setAdminNotes, onResolve, saving }) {
  const { dispute, chat } = detail;
  const order = dispute.order;
  const isOpen = dispute.status === 'open';

  function formatCOP(n) { return `$${Number(n || 0).toLocaleString('es-CO')}`; }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="card">
        <div className="flex-between mb-16">
          <div>
            <h3 style={{ fontFamily: 'Barlow Condensed', fontSize: 24, color: 'var(--danger)' }}>
              ⚡ Disputa — {order?.order_number}
            </h3>
            <span className={`badge ${isOpen ? 'badge-rejected' : 'badge-resolved'}`}>
              {isOpen ? 'ABIERTA' : dispute.status === 'resolved_for_courier' ? 'RESUELTA → COURIER' : 'RESUELTA → NEGOCIO'}
            </span>
          </div>
          {dispute.evidence_url && (
            <a href={dispute.evidence_url} target="_blank" rel="noreferrer">
              <img src={dispute.evidence_url} alt="evidencia" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
            </a>
          )}
        </div>

        <div className="grid-2">
          <div className="card-sm">
            <div className="section-title">Pedido</div>
            <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <InfoRow label="COD" value={formatCOP(order?.cod_amount)} highlight />
              <InfoRow label="Tarifa" value={formatCOP(order?.delivery_fee)} />
              <InfoRow label="Recogida" value={order?.pickup_address} />
              <InfoRow label="Entrega" value={order?.delivery_address} />
            </div>
          </div>
          <div className="card-sm">
            <div className="section-title">Partes</div>
            <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <InfoRow label="Cliente" value={`${order?.client?.name} · ${order?.client?.phone}`} />
              <InfoRow label="Courier" value={`${order?.courier?.user?.name} · ${order?.courier?.user?.phone}`} />
              <InfoRow label="Levantada por" value={dispute.raised_by_user?.name} />
              <InfoRow label="Razón" value={dispute.reason} />
            </div>
          </div>
        </div>
      </div>

      {/* Chat completo */}
      <div className="card">
        <h3 style={{ fontFamily: 'Barlow Condensed', fontSize: 20, marginBottom: 16 }}>
          Chat del pedido — {chat.length} mensajes
        </h3>
        <div className="chat-box" style={{ height: 380 }}>
          {chat.length === 0
            ? <div className="empty-state"><p>Sin mensajes</p></div>
            : chat.map(m => <ChatMsg key={m.id} msg={m} />)
          }
        </div>
      </div>

      {/* Resolución */}
      {isOpen && (
        <div className="card" style={{ borderColor: 'var(--warning)' }}>
          <h3 style={{ fontFamily: 'Barlow Condensed', fontSize: 20, marginBottom: 12 }}>
            Resolver disputa
          </h3>
          <div className="form-group mb-16">
            <label className="form-label">Notas del admin</label>
            <textarea
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              placeholder="Describe la decisión y por qué…"
              style={{ width: '100%', minHeight: 80, resize: 'vertical' }}
            />
          </div>

          <div className="flex gap-12">
            <div style={{ flex: 1, padding: '16px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>✅ A favor del COURIER</div>
              <div className="text-muted text-sm mb-12">El comprobante es válido. Pedido marcado como completado.</div>
              <button
                className="btn-success w-full"
                disabled={saving}
                onClick={() => onResolve('resolved_for_courier')}
              >
                Resolver a favor del courier
              </button>
            </div>

            <div style={{ flex: 1, padding: '16px', background: '#200D0D', borderRadius: 10, border: '1px solid #4A1515' }}>
              <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--danger)' }}>❌ A favor del NEGOCIO</div>
              <div className="text-muted text-sm mb-12">Comprobante falso. El courier será <strong style={{ color: 'var(--danger)' }}>BLOQUEADO PERMANENTEMENTE</strong>.</div>
              <button
                className="btn-danger w-full"
                disabled={saving}
                onClick={() => onResolve('resolved_for_business')}
              >
                Resolver a favor del negocio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolución ya tomada */}
      {!isOpen && (
        <div className="card" style={{ borderColor: 'var(--success)' }}>
          <div className="flex gap-12" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: 32 }}>{dispute.status === 'resolved_for_courier' ? '✅' : '❌'}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                {dispute.status === 'resolved_for_courier' ? 'Resuelta a favor del courier' : 'Resuelta a favor del negocio'}
              </div>
              {dispute.admin_notes && <div className="text-muted text-sm mt-8">"{dispute.admin_notes}"</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChatMsg({ msg }) {
  if (msg.message_type === 'system') {
    return (
      <div className="msg-system">
        {msg.message}
        {msg.attachment_url && (
          <a href={msg.attachment_url} target="_blank" rel="noreferrer">
            <img src={msg.attachment_url} alt="" style={{ marginTop: 6, maxWidth: '100%', borderRadius: 4 }} />
          </a>
        )}
      </div>
    );
  }
  const isRight = msg.sender?.role === 'domiciliario';
  return (
    <div className={`msg ${isRight ? 'msg-right' : 'msg-left'}`}>
      <div className="msg-bubble">
        {msg.message}
        {msg.attachment_url && (
          <a href={msg.attachment_url} target="_blank" rel="noreferrer">
            <img src={msg.attachment_url} alt="" style={{ marginTop: 6, maxWidth: '100%', borderRadius: 4 }} />
          </a>
        )}
      </div>
      <div className="msg-meta">
        {msg.sender?.name} ({msg.sender?.role}) · {new Date(msg.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <span style={{ color: 'var(--text-secondary)', minWidth: 70, fontWeight: 600, fontSize: 12 }}>{label}</span>
      <span style={{ color: highlight ? 'var(--primary)' : 'var(--text)', fontWeight: highlight ? 700 : 400 }}>{value || '—'}</span>
    </div>
  );
}
