import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCouriers } from '../api';

const VEHICLE_ICON = { moto: '🏍', bici: '🚲', pie: '🚶' };
const VERIF_BADGE  = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected' };
const VERIF_LABEL  = { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' };

const TABS = [
  { key: 'all',      label: 'Todos',      icon: '👥' },
  { key: 'pending',  label: 'Pendientes', icon: '⏳' },
  { key: 'approved', label: 'Aprobados',  icon: '✅' },
  { key: 'rejected', label: 'Rechazados', icon: '❌' },
];

const DOC_FIELDS = [
  { key: 'cedula_front_url',  label: 'CC Frente' },
  { key: 'cedula_back_url',   label: 'CC Reverso' },
  { key: 'selfie_url',        label: 'Selfie' },
  { key: 'vehicle_photo_url', label: 'Moto' },
  { key: 'license_url',       label: 'Lic. Frente' },
  { key: 'license_back_url',  label: 'Lic. Reverso' },
];

export default function Couriers() {
  const navigate = useNavigate();
  const [tab, setTab]           = useState('all');
  const [couriers, setCouriers] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [offset, setOffset]     = useState(0);
  const [search, setSearch]     = useState('');
  const [query, setQuery]       = useState('');   // valor debounced
  const debounceRef             = useRef(null);
  const limit = 20;

  // Debounce: esperar 350 ms después de que el usuario deje de escribir
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  // Resetear paginación al cambiar pestaña o búsqueda
  useEffect(() => { setOffset(0); }, [tab, query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit, offset };
      if (tab !== 'all') params.verification_status = tab;
      if (query)         params.search = query;
      const { data } = await getCouriers(params);
      setCouriers(data.couriers || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tab, offset, query]);

  useEffect(() => { load(); }, [load]);

  const pages = Math.ceil(total / limit);
  const page  = Math.floor(offset / limit) + 1;

  function docsCount(c) {
    return DOC_FIELDS.filter(f => c[f.key]).length;
  }

  const emptyIcon = tab === 'pending' ? '⏳' : tab === 'approved' ? '✅' : tab === 'rejected' ? '❌' : '👥';
  const emptyMsg  = query
    ? `No hay resultados para "${query}"`
    : `No hay domiciliarios ${tab !== 'all' ? VERIF_LABEL[tab]?.toLowerCase() + 's' : ''}`;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Domiciliarios</h2>
          <div className="page-subtitle">{total} en esta vista</div>
        </div>
        <button className="btn-ghost btn-sm" onClick={load}>↺ Actualizar</button>
      </div>

      {/* Buscador */}
      <div style={{
        position: 'relative',
        marginBottom: 20,
      }}>
        <span style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          fontSize: 16, color: 'var(--text-muted)', pointerEvents: 'none',
        }}>🔍</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o teléfono…"
          style={{
            width: '100%',
            paddingLeft: 40,
            paddingRight: search ? 36 : 14,
            paddingTop: 10,
            paddingBottom: 10,
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
            borderRadius: 10,
            color: 'var(--text)',
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 16, lineHeight: 1, padding: 2,
            }}
            title="Limpiar búsqueda"
          >✕</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-8 mb-24">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={tab === t.key ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Indicador de búsqueda activa */}
      {query && (
        <div style={{
          marginBottom: 16,
          padding: '8px 14px',
          background: 'var(--primary)1A',
          borderRadius: 8,
          borderLeft: '3px solid var(--primary)',
          fontSize: 13,
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span>
            Resultados para <strong style={{ color: 'var(--primary)' }}>"{query}"</strong>
            {total > 0 && ` — ${total} encontrado${total !== 1 ? 's' : ''}`}
          </span>
          <button
            className="btn-ghost btn-xs"
            onClick={() => setSearch('')}
            style={{ marginLeft: 12 }}
          >
            Limpiar ✕
          </button>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="empty-state"><p>Cargando…</p></div>
      ) : couriers.length === 0 ? (
        <div className="empty-state">
          <div className="icon">{query ? '🔍' : emptyIcon}</div>
          <p>{emptyMsg}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {couriers.map(c => {
            const docs    = docsCount(c);
            const allDocs = docs === 6;
            return (
              <div
                key={c.id}
                className="card"
                style={{
                  cursor: 'pointer',
                  borderColor: c.verification_status === 'pending' ? 'var(--warning)' : 'var(--border)',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onClick={() => navigate(`/couriers/${c.id}`)}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 0 2px var(--primary)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}
              >
                {/* Header */}
                <div className="flex gap-12 mb-12">
                  {c.selfie_url
                    ? <img src={c.selfie_url} alt="selfie" className="avatar"
                        style={{ width: 48, height: 48, border: '2px solid var(--primary)' }} />
                    : <div className="avatar flex-center" style={{ width: 48, height: 48, fontSize: 22 }}>
                        {VEHICLE_ICON[c.vehicle_type] || '🏍'}
                      </div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {highlight(c.user?.name || '—', query)}
                    </div>
                    <div className="text-muted text-sm">
                      {highlight(c.user?.phone || '', query)}
                    </div>
                    <div className="text-muted text-sm" style={{ marginTop: 2 }}>
                      {VEHICLE_ICON[c.vehicle_type]} {c.vehicle_type} · ⭐ {Number(c.rating || 5).toFixed(1)}
                    </div>
                  </div>
                  <span className={`badge ${VERIF_BADGE[c.verification_status]}`}>
                    {VERIF_LABEL[c.verification_status]}
                  </span>
                </div>

                {/* Wallet */}
                <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Wallet</span>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, color: 'var(--primary)', fontWeight: 700 }}>
                    ${Number(c.wallet_balance || 0).toLocaleString('es-CO')}
                  </span>
                </div>

                {/* Documentos */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 5 }}>
                    <span>Documentos</span>
                    <span style={{ color: allDocs ? 'var(--success)' : 'var(--warning)', fontWeight: 700 }}>{docs}/6</span>
                  </div>
                  <div style={{ background: 'var(--surface2)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                    <div style={{
                      background: allDocs ? 'var(--success)' : 'var(--warning)',
                      width: `${(docs / 6) * 100}%`,
                      height: '100%', borderRadius: 4, transition: 'width 0.3s',
                    }} />
                  </div>
                </div>

                <button
                  className={c.verification_status === 'pending' ? 'btn-primary btn-sm w-full' : 'btn-ghost btn-sm w-full'}
                  style={{ marginTop: 4 }}
                >
                  {c.verification_status === 'pending' ? '👁 Revisar y verificar →' : '💰 Ver perfil / recargar →'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {pages > 1 && (
        <div className="pagination">
          <button className="btn-ghost btn-xs" disabled={offset === 0}
            onClick={() => setOffset(o => Math.max(0, o - limit))}>‹ Anterior</button>
          <span className="page-info">Pág {page} de {pages}</span>
          <button className="btn-ghost btn-xs" disabled={page >= pages}
            onClick={() => setOffset(o => o + limit)}>Siguiente ›</button>
        </div>
      )}
    </div>
  );
}

// Resalta la coincidencia de búsqueda en el texto
function highlight(text, query) {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'var(--primary)', color: '#000', borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}
