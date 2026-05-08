import { useEffect, useRef } from 'react';
import L from 'leaflet';

const MEDELLIN = [6.2442, -75.5812];

function createIcon(busy) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:32px;height:32px;border-radius:50%;
        background:${busy ? '#EF4444' : '#FFB800'};
        border:3px solid ${busy ? '#7F1D1D' : '#7A5800'};
        display:flex;align-items:center;justify-content:center;
        font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.5);
      ">🏍</div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export default function CourierMap({ couriers = [], height = 460 }) {
  const mapRef = useRef(null);
  const instanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!instanceRef.current) {
      instanceRef.current = L.map(mapRef.current, { zoomControl: true }).setView(MEDELLIN, 13);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(instanceRef.current);
    }

    // Limpiar marcadores previos
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Agregar marcadores
    for (const c of couriers) {
      if (!c.lat || !c.lng) continue;
      const marker = L.marker([c.lat, c.lng], { icon: createIcon(c.busy) })
        .addTo(instanceRef.current)
        .bindPopup(`
          <div style="font-family:sans-serif;min-width:160px">
            <strong style="font-size:14px">${c.name || 'Sin nombre'}</strong><br/>
            ${c.vehicle_type} · ⭐ ${c.rating?.toFixed(1) || '—'}<br/>
            <span style="color:${c.busy ? '#EF4444' : '#22C55E'}">${c.busy ? '● Con pedido' : '● Disponible'}</span>
          </div>
        `);
      markersRef.current.push(marker);
    }
  }, [couriers]);

  // Ajustar mapa cuando se monta
  useEffect(() => {
    return () => {
      if (instanceRef.current) {
        instanceRef.current.remove();
        instanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="map-container" style={{ height }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
