import { useState, useEffect } from 'react';
import { getCommissionsReport, getCouriersRanking } from '../api';

function formatCOP(n) { return `$${Number(n || 0).toLocaleString('es-CO')}`; }

const BADGE_ICON = { top_yavaya: '🏆', '100_deliveries': '📦', sin_disputas: '🕊️' };

export default function Reports() {
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().substring(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().substring(0, 10));
  const [commissions, setCommissions] = useState(null);
  const [ranking, setRanking] = useState(null);
  const [loading, setLoading] = useState(false);

  async function fetchAll() {
    setLoading(true);
    try {
      const [c, r] = await Promise.all([
        getCommissionsReport({ from: `${from}T00:00:00`, to: `${to}T23:59:59` }),
        getCouriersRanking(),
      ]);
      setCommissions(c.data);
      setRanking(r.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchAll(); }, []);

  const maxBar = commissions?.daily?.length > 0
    ? Math.max(...commissions.daily.map(d => d.amount), 1)
    : 1;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Reportes</h2>
          <div className="page-subtitle">Comisiones y ranking de domiciliarios</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filters mb-24">
        <div>
          <label className="form-label">Desde</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="form-label">Hasta</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={fetchAll} disabled={loading} style={{ alignSelf: 'flex-end' }}>
          {loading ? 'Cargando…' : '↺ Generar'}
        </button>
      </div>

      {/* Totales */}
      {commissions && (
        <div className="grid-4 mb-24">
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-body">
              <div className="stat-label">Total comisiones</div>
              <div className="stat-value text-primary">{formatCOP(commissions.total)}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-body">
              <div className="stat-label">Transacciones</div>
              <div className="stat-value">{commissions.count}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-body">
              <div className="stat-label">Días con actividad</div>
              <div className="stat-value">{commissions.daily?.length || 0}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-body">
              <div className="stat-label">Promedio / día</div>
              <div className="stat-value">{formatCOP(commissions.daily?.length > 0 ? commissions.total / commissions.daily.length : 0)}</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid-2 mb-24">
        {/* Gráfico de barras */}
        {commissions && (
          <div className="card">
            <h3 style={{ fontFamily: 'Barlow Condensed', fontSize: 20, marginBottom: 20 }}>
              Comisiones por día
            </h3>
            {commissions.daily.length === 0 ? (
              <div className="empty-state"><p>Sin datos en el período seleccionado</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {commissions.daily.slice(-20).map(d => (
                  <div key={d.date} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', width: 70, flexShrink: 0 }}>
                      {new Date(d.date + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                    </div>
                    <div style={{ flex: 1, background: 'var(--surface2)', borderRadius: 4, height: 22, overflow: 'hidden' }}>
                      <div style={{
                        background: 'var(--primary)',
                        width: `${(d.amount / maxBar) * 100}%`,
                        height: '100%',
                        borderRadius: 4,
                        transition: 'width 0.5s',
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: 6,
                      }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#000', whiteSpace: 'nowrap' }}>
                          {formatCOP(d.amount)}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', width: 40, textAlign: 'right', flexShrink: 0 }}>
                      {d.count}×
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Alertas de rating bajo */}
        {ranking?.alerts?.length > 0 && (
          <div className="card" style={{ borderColor: 'var(--warning)' }}>
            <h3 style={{ fontFamily: 'Barlow Condensed', fontSize: 20, marginBottom: 16, color: 'var(--warning)' }}>
              ⚠️ Alertas de rating bajo
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ranking.alerts.map(a => (
                <div key={a.id} className="card-sm" style={{ borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 24 }}>⚠️</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{a.name}</div>
                    <div className="stars">{'★'.repeat(Math.round(a.rating))}{'☆'.repeat(5 - Math.round(a.rating))}</div>
                    <div className="text-muted text-sm">Rating: {Number(a.rating).toFixed(2)} — En riesgo de suspensión</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ranking de couriers */}
      {ranking && (
        <div className="card">
          <h3 style={{ fontFamily: 'Barlow Condensed', fontSize: 20, marginBottom: 16 }}>
            🏆 Top Domiciliarios
          </h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Entregas</th>
                  <th>Rating</th>
                  <th>Tipo</th>
                  <th>Trust</th>
                  <th>Insignias</th>
                </tr>
              </thead>
              <tbody>
                {ranking.couriers.map((c, i) => (
                  <tr key={c.id}>
                    <td>
                      <span style={{ fontFamily: 'Barlow Condensed', fontSize: 20, color: i < 3 ? 'var(--primary)' : 'var(--text-secondary)' }}>
                        {i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}
                      </span>
                    </td>
                    <td><span style={{ fontWeight: 700 }}>{c.user?.name}</span></td>
                    <td className="text-muted">{c.user?.phone}</td>
                    <td>
                      <span style={{ fontFamily: 'Barlow Condensed', fontSize: 20, color: 'var(--primary)' }}>{c.total_deliveries}</span>
                    </td>
                    <td>
                      <div className="stars">{'★'.repeat(Math.round(c.rating))}</div>
                      <div className="text-sm text-muted">{Number(c.rating).toFixed(2)}</div>
                    </td>
                    <td>{c.vehicle_type === 'moto' ? '🏍' : c.vehicle_type === 'bici' ? '🚲' : '🚶'} {c.vehicle_type}</td>
                    <td>
                      <span className="badge badge-primary">
                        T{c.completed_orders < 10 ? 1 : c.completed_orders < 50 ? 2 : 3}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
                        {(c.badges || []).map(b => (
                          <span key={b.badge_type} title={b.badge_type}>{BADGE_ICON[b.badge_type] || '🏅'}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
