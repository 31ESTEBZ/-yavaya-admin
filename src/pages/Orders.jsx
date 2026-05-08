import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getOrders, getOrder } from '../api';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'assigning', label: 'Asignando' },
  { value: 'assigned', label: 'Asignado' },
  { value: 'picked_up', label: 'Recogido' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'disputed', label: 'En disputa' },
];

const STATUS_BADGE = {
  pending: 'badge-pending', assigning: 'badge-pending',
  assigned: 'badge-approved', picked_up: 'badge-approved',
  delivered: 'badge-resolved', completed: 'badge-resolved',
  cancelled: 'badge-rejected', disputed: 'badge-rejected',
  no_couriers: 'badge-rejected',
};

const STATUS_LABEL = {
  pending: 'Pendiente', assigning: 'Asignando', assigned: 'Asignado',
  picked_up: 'Recogido', delivered: 'Entregado', completed: 'Completado',
  cancelled: 'Cancelado', disputed: 'En disputa', no_couriers: 'Sin courier',
};

function formatCOP(n) { return `$${Number(n || 0).toLocaleString('es-CO')}`; }

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function Orders() {
  const [params, setParamsState] = useState({ status: '', from: '', to: '', limit: 20, offset: 0 });
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const p = {};
      if (params.status) p.status = params.status;
      if (params.from) p.from = params.from;
      if (params.to) p.to = params.to;
      p.limit = params.limit;
      p.offset = params.offset;
      const { data } = await getOrders(p);
      setOrders(data.orders || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { fetch(); }, [fetch]);

  async function openDetail(id) {
    setSelected(id);
    setDetailLoading(true);
    try {
      const { data } = await getOrder(id);
      setDetail(data);
    } catch { setDetail(null); } finally { setDetailLoading(false); }
  }

  const page = Math.floor(params.offset / params.limit) + 1;
  const pages = Math.ceil(total / params.limit);

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 48px)' }}>
      {/* Lista */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
        <div className="page-header">
          <div>
            <h2 className="page-title">Pedidos</h2>
            <div className="page-subtitle">{total} pedidos encontrados</div>
          </div>
          <button className="btn-ghost btn-sm" onClick={fetch}>↺</button>
        </div>

        <div className="filters">
          <select value={params.status} onChange={e => setParamsState(p => ({ ...p, status: e.target.value, offset: 0 }))}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input type="date" value={params.from} onChange={e => setParamsState(p => ({ ...p, from: e.target.value, offset: 0 }))} />
          <input type="date" value={params.to} onChange={e => setParamsState(p => ({ ...p, to: e.target.value, offset: 0 }))} />
        </div>

        <div className="card">
          {loading ? (
            <div className="empty-state"><p>Cargando pedidos…</p></div>
          ) : orders.length === 0 ? (
            <div className="empty-state"><div className="icon">📭</div><p>No hay pedidos</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Estado</th>
                    <th>Cliente</th>
                    <th>Courier</th>
                    <th>COD</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr
                      key={o.id}
                      onClick={() => openDetail(o.id)}
                      style={{ cursor: 'pointer', background: selected === o.id ? 'var(--surface2)' : '' }}
                    >
                      <td><span className="text-primary font-bold">{o.order_number}</span></td>
                      <td><span className={`badge ${STATUS_BADGE[o.status] || 'badge-pending'}`}>{STATUS_LABEL[o.status] || o.status}</span></td>
                      <td>{o.client?.name}<br /><span className="text-muted text-sm">{o.client?.phone}</span></td>
                      <td>{o.courier?.user?.name || <span className="text-muted">—</span>}</td>
                      <td>{formatCOP(o.cod_amount)}</td>
                      <td className="text-muted">{formatDate(o.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Paginación */}
        <div className="pagination">
          <button className="btn-ghost btn-xs" disabled={params.offset === 0}
            onClick={() => setParamsState(p => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}>
            ‹ Anterior
          </button>
          <span className="page-info">Pág {page} de {pages || 1}</span>
          <button className="btn-ghost btn-xs" disabled={page >= pages}
            onClick={() => setParamsState(p => ({ ...p, offset: p.offset + p.limit }))}>
            Siguiente ›
          </button>
        </div>
      </div>

      {/* Panel detalle */}
      {selected && (
        <div style={{ width: 420, overflowY: 'auto', flexShrink: 0 }}>
          <div className="card" style={{ position: 'sticky', top: 0 }}>
            <div className="flex-between mb-16">
              <h3 style={{ fontFamily: 'Barlow Condensed', fontSize: 20 }}>
                {detail?.order?.order_number || '…'}
              </h3>
              <button className="modal-close" onClick={() => { setSelected(null); setDetail(null); }}>×</button>
            </div>

            {detailLoading ? (
              <div className="empty-state"><p>Cargando…</p></div>
            ) : detail ? (
              <OrderDetail detail={detail} />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function OrderDetail({ detail }) {
  const { order, chat, dispute, delivery_confirmation, presence_proof } = detail;

  function formatCOP(n) { return `$${Number(n || 0).toLocaleString('es-CO')}`; }

  const STATUS_LABEL = {
    pending: 'Pendiente', assigning: 'Asignando', assigned: 'Asignado',
    picked_up: 'Recogido', delivered: 'Entregado', completed: 'Completado',
    cancelled: 'Cancelado', disputed: 'En disputa',
  };

  return (
    <div>
      {/* Status + amounts */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <span className="badge badge-primary">{STATUS_LABEL[order.status] || order.status}</span>
        {dispute && <span className="badge badge-rejected">⚡ Disputa</span>}
        {delivery_confirmation?.verified_at && <span className="badge badge-approved">✅ Confirmado</span>}
        {presence_proof && <span className="badge badge-pending">📸 Presencia</span>}
      </div>

      <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        <InfoRow label="COD" value={formatCOP(order.cod_amount)} highlight />
        <InfoRow label="Tarifa" value={formatCOP(order.delivery_fee)} />
        <InfoRow label="Paga" value={order.who_pays_delivery === 'client' ? 'Cliente' : 'Negocio'} />
        <InfoRow label="Recogida" value={order.pickup_address} />
        <InfoRow label="Entrega" value={order.delivery_address} />
        <InfoRow label="Cliente" value={`${order.client?.name} · ${order.client?.phone}`} />
        {order.courier && (
          <InfoRow label="Courier" value={`${order.courier.user?.name} · ${order.courier.user?.phone}`} />
        )}
      </div>

      {/* Código de confirmación */}
      {delivery_confirmation && (
        <div className="card-sm mb-12" style={{ borderColor: 'var(--primary)' }}>
          <div className="section-title">Código de entrega</div>
          <div style={{ fontFamily: 'Barlow Condensed', fontSize: 32, color: 'var(--primary)', letterSpacing: 6 }}>
            {delivery_confirmation.code}
          </div>
          <div className="text-muted text-sm mt-8">
            {delivery_confirmation.verified_at
              ? `✅ Verificado a las ${new Date(delivery_confirmation.verified_at).toLocaleTimeString('es-CO')}`
              : `Intentos: ${delivery_confirmation.attempts} / 5`}
          </div>
        </div>
      )}

      {/* Prueba de presencia */}
      {presence_proof && (
        <div className="card-sm mb-12" style={{ borderColor: 'var(--warning)' }}>
          <div className="section-title">Prueba de presencia</div>
          <a href={presence_proof.photo_url} target="_blank" rel="noreferrer">
            <img src={presence_proof.photo_url} alt="Prueba" style={{ width: '100%', borderRadius: 6, marginBottom: 6 }} />
          </a>
          <div className="text-muted text-sm">GPS: {presence_proof.lat}, {presence_proof.lng}</div>
          {presence_proof.notes && <div style={{ marginTop: 6, fontSize: 13 }}>{presence_proof.notes}</div>}
        </div>
      )}

      {/* Chat */}
      {chat.length > 0 && (
        <div>
          <div className="section-title">Chat del pedido ({chat.length} mensajes)</div>
          <div className="chat-box" style={{ height: 240 }}>
            {chat.map(m => <ChatMsg key={m.id} msg={m} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, highlight }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <span style={{ color: 'var(--text-secondary)', minWidth: 70, fontWeight: 600, fontSize: 12 }}>{label}</span>
      <span style={{ color: highlight ? 'var(--primary)' : 'var(--text)', fontWeight: highlight ? 700 : 400 }}>{value}</span>
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
      <div className="msg-meta">{msg.sender?.name} · {new Date(msg.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
    </div>
  );
}
