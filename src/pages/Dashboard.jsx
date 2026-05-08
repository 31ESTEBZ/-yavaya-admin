import { useState, useEffect, useCallback } from 'react';
import CourierMap from '../components/CourierMap';
import { getStats, getMapCouriers, getOrders } from '../api';
import { getSocket } from '../socket';
import { useNavigate } from 'react-router-dom';

const STATUS_COLOR = {
  pending: 'badge-pending',
  assigning: 'badge-pending',
  assigned: 'badge-approved',
  picked_up: 'badge-approved',
  delivered: 'badge-resolved',
  completed: 'badge-resolved',
  cancelled: 'badge-rejected',
  disputed: 'badge-rejected',
  no_couriers: 'badge-rejected',
};

const STATUS_LABEL = {
  pending: 'Pendiente', assigning: 'Asignando', assigned: 'Asignado',
  picked_up: 'Recogido', delivered: 'Entregado', completed: 'Completado',
  cancelled: 'Cancelado', disputed: 'En disputa', no_couriers: 'Sin courrier',
};

function formatCOP(n) {
  return `$${Number(n || 0).toLocaleString('es-CO')}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [couriers, setCouriers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [s, c, o] = await Promise.all([
        getStats(),
        getMapCouriers(),
        getOrders({ limit: 15, status: undefined }),
      ]);
      setStats(s.data);
      setCouriers(c.data.couriers || []);
      setOrders(o.data.orders || []);
    } catch (err) {
      console.error('[dashboard]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 15000); // refresco cada 15s
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Actualizaciones en tiempo real de couriers vía Socket.io
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onLocation = ({ courier_id, lat, lng }) => {
      setCouriers(prev =>
        prev.map(c => c.id === courier_id ? { ...c, lat, lng } : c),
      );
    };

    const onOnline = ({ courier_id, name, vehicle_type, lat, lng, rating }) => {
      setCouriers(prev => {
        if (prev.find(c => c.id === courier_id)) {
          return prev.map(c => c.id === courier_id ? { ...c, lat, lng } : c);
        }
        return [...prev, { id: courier_id, name, vehicle_type, lat, lng, rating, busy: false }];
      });
    };

    const onOffline = ({ courier_id }) => {
      setCouriers(prev => prev.filter(c => c.id !== courier_id));
    };

    socket.on('courier:location', onLocation);
    socket.on('courier:online',   onOnline);
    socket.on('courier:offline',  onOffline);

    return () => {
      socket.off('courier:location', onLocation);
      socket.off('courier:online',   onOnline);
      socket.off('courier:offline',  onOffline);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '60vh' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: 18 }}>Cargando…</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <div className="page-subtitle">Vista en tiempo real — se actualiza cada 15s</div>
        </div>
        <button className="btn-ghost btn-sm" onClick={fetchAll}>↺ Actualizar</button>
      </div>

      {/* Stats */}
      <div className="grid-4 mb-24">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-body">
            <div className="stat-label">Pedidos hoy</div>
            <div className="stat-value">{stats?.orders_today ?? '—'}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏍</div>
          <div className="stat-body">
            <div className="stat-label">Online ahora</div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>
              {stats?.online_couriers ?? '—'}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-body">
            <div className="stat-label">Pendientes verificar</div>
            <div className="stat-value" style={{ color: stats?.pending_verification > 0 ? 'var(--warning)' : 'var(--text)' }}>
              {stats?.pending_verification ?? '—'}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-body">
            <div className="stat-label">Comisiones hoy</div>
            <div className="stat-value text-primary">{formatCOP(stats?.commissions_today)}</div>
          </div>
        </div>
      </div>

      {/* Mapa */}
      <div className="card mb-24">
        <div className="flex-between mb-16">
          <div>
            <h3 style={{ fontSize: 18, fontFamily: 'Barlow Condensed' }}>Mapa en tiempo real</h3>
            <div className="text-muted text-sm mt-8">
              <span style={{ color: 'var(--primary)', marginRight: 12 }}>● Disponible</span>
              <span style={{ color: 'var(--danger)', marginRight: 12 }}>● Con pedido activo</span>
              <strong>{couriers.length}</strong> domiciliarios online
            </div>
          </div>
          <span className="badge badge-online">{couriers.length} ONLINE</span>
        </div>
        <CourierMap couriers={couriers} height={440} />
      </div>

      {/* Pedidos activos recientes */}
      <div className="card">
        <div className="flex-between mb-16">
          <h3 style={{ fontSize: 18, fontFamily: 'Barlow Condensed' }}>Pedidos activos</h3>
          <button className="btn-ghost btn-sm" onClick={() => navigate('/orders')}>Ver todos →</button>
        </div>

        {orders.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📭</div>
            <p>No hay pedidos activos</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Estado</th>
                  <th>Cliente</th>
                  <th>Domiciliario</th>
                  <th>COD</th>
                  <th>Origen</th>
                  <th>Destino</th>
                  <th>Hace</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/orders?highlight=${o.id}`)}>
                    <td><span className="text-primary font-bold">{o.order_number}</span></td>
                    <td><span className={`badge ${STATUS_COLOR[o.status] || 'badge-pending'}`}>{STATUS_LABEL[o.status] || o.status}</span></td>
                    <td>{o.client?.name || '—'}</td>
                    <td>{o.courier?.user?.name || <span className="text-muted">Sin asignar</span>}</td>
                    <td>{formatCOP(o.cod_amount)}</td>
                    <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={o.pickup_address}>{o.pickup_address}</td>
                    <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={o.delivery_address}>{o.delivery_address}</td>
                    <td className="text-muted">{timeSince(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Disputas abiertas alert */}
      {stats?.open_disputes > 0 && (
        <div
          className="card mt-16"
          style={{ borderColor: 'var(--danger)', cursor: 'pointer' }}
          onClick={() => navigate('/disputes')}
        >
          <div className="flex gap-12" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: 28 }}>⚡</span>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 15 }}>
                {stats.open_disputes} disputa{stats.open_disputes > 1 ? 's' : ''} abierta{stats.open_disputes > 1 ? 's' : ''}
              </div>
              <div className="text-muted text-sm">Requieren revisión — clic para ver</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function timeSince(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
