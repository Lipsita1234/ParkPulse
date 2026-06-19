'use client';
import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { MapPin, AlertTriangle, Info } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getHotspots, getHeatmap, getHotspotSummary } from '@/lib/api';

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    Promise.all([getHotspots(300), getHeatmap(), getHotspotSummary()])
      .then(([h, hm, s]) => {
        setHotspots(h.hotspots || []);
        setHeatmapData(hm.points || []);
        setSummary(s);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!mapRef.current || loading || leafletMap.current) return;

    // Dynamic import of Leaflet (SSR safe)
    import('leaflet').then(L => {
      // Fix marker icons
      const DefaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
      });
      L.Marker.prototype.options.icon = DefaultIcon;

      const map = L.map(mapRef.current!, {
        center: [12.9716, 77.5946], zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        className: 'map-tiles',
      }).addTo(map);

      // Custom dark tile overlay effect via CSS
      const style = document.createElement('style');
      style.innerHTML = `.map-tiles { filter: brightness(0.55) saturate(0.4) hue-rotate(200deg); }`;
      document.head.appendChild(style);

      // Add hotspot markers
      hotspots.forEach(h => {
        const color = h.risk_color || '#3b82f6';
        const radius = Math.max(8, Math.min(24, h.violation_count / 20));

        const circle = L.circleMarker([h.centroid_lat, h.centroid_lon], {
          radius,
          fillColor: color,
          color: color,
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.5,
        });

        const popupContent = `
          <div style="font-family:'Inter',sans-serif;min-width:220px;padding:4px">
            <div style="font-size:13px;font-weight:700;color:#e2e8f0;margin-bottom:8px">${h.location_name}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">
              <div><span style="color:#64748b">Violations</span><br/><b style="color:#60a5fa">${h.violation_count?.toLocaleString()}</b></div>
              <div><span style="color:#64748b">Risk Score</span><br/><b style="color:${color}">${h.risk_score}/100</b></div>
              <div><span style="color:#64748b">Vehicle</span><br/><b style="color:#e2e8f0">${h.dominant_vehicle}</b></div>
              <div><span style="color:#64748b">Peak Hour</span><br/><b style="color:#e2e8f0">${h.peak_hour}:00</b></div>
              <div style="grid-column:span 2"><span style="color:#64748b">Station</span><br/><b style="color:#e2e8f0">${h.police_station}</b></div>
              <div style="grid-column:span 2"><span style="padding:2px 8px;border-radius:12px;background:${color}20;color:${color};font-weight:700;font-size:11px;border:1px solid ${color}40">${h.risk_level} RISK</span></div>
            </div>
          </div>
        `;

        circle.bindPopup(popupContent, {
          className: 'dark-popup',
          maxWidth: 260,
        });

        circle.on('click', () => setSelected(h));
        circle.addTo(map);
      });

      // Heatmap overlay (simple circles for heatmap effect without plugin)
      if (heatmapData.length > 0) {
        const sample = heatmapData.slice(0, 2000);
        sample.forEach(([lat, lon, intensity]: number[]) => {
          L.circleMarker([lat, lon], {
            radius: 4,
            fillColor: `rgba(59,130,246,${intensity * 0.4})`,
            color: 'transparent',
            fillOpacity: intensity * 0.3,
          }).addTo(map);
        });
      }

      // Add popup style
      const popupStyle = document.createElement('style');
      popupStyle.innerHTML = `
        .dark-popup .leaflet-popup-content-wrapper {
          background: #0d1529 !important;
          border: 1px solid #1e3a5f !important;
          border-radius: 12px !important;
          color: #e2e8f0 !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
        }
        .dark-popup .leaflet-popup-tip { background: #0d1529 !important; }
        .leaflet-container { background: #0a0f1e; }
      `;
      document.head.appendChild(popupStyle);

      leafletMap.current = map;
      setMapReady(true);
    });
  }, [loading, hotspots, heatmapData]);

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <div className="section-title">AI Hotspot Intelligence Map</div>
          <div className="section-subtitle">DBSCAN-powered illegal parking cluster detection · Bengaluru</div>
        </div>
        {summary && (
          <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
            <span style={{ color: '#ef4444' }}>● {summary.high_risk} High</span>
            <span style={{ color: '#f97316' }}>● {summary.medium_risk} Medium</span>
            <span style={{ color: '#22c55e' }}>● {summary.low_risk} Low</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
        {/* Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', zIndex: 10 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: '#60a5fa', marginBottom: 8 }}>Loading AI hotspot data...</div>
                <div className="skeleton" style={{ width: 200, height: 6, margin: '0 auto' }} />
              </div>
            </div>
          )}
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

          {/* Map legend */}
          <div style={{
            position: 'absolute', bottom: 28, right: 16, zIndex: 1000,
            background: 'rgba(10,15,30,0.92)', border: '1px solid var(--border-glass)',
            borderRadius: 12, padding: '14px 18px', backdropFilter: 'blur(12px)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Risk Legend</div>
            {[['#ef4444','High Risk Hotspot'],['#f97316','Medium Risk Hotspot'],['#22c55e','Low Risk Hotspot']].map(([color,label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{label}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--border-glass)', marginTop: 8, paddingTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(59,130,246,0.4)', border: '1px solid #3b82f6' }} />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Violation Density</span>
              </div>
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div style={{ width: 320, background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-glass)', overflowY: 'auto' }}>
          {selected ? (
            <motion.div
              key={selected.cluster_id}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              style={{ padding: 20 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', flex: 1 }}>{selected.location_name}</div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 }}>×</button>
              </div>
              <span className={`badge-${selected.risk_level?.toLowerCase()}`} style={{ marginBottom: 16, display: 'inline-block' }}>
                {selected.risk_level} RISK
              </span>
              {[
                ['Risk Score', `${selected.risk_score}/100`],
                ['Violations', selected.violation_count?.toLocaleString()],
                ['Dominant Vehicle', selected.dominant_vehicle],
                ['Peak Hour', `${selected.peak_hour}:00`],
                ['Police Station', selected.police_station],
                ['Cluster ID', `#${selected.cluster_id}`],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{value}</span>
                </div>
              ))}
            </motion.div>
          ) : (
            <div style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 14 }}>Top Hotspots</div>
              {hotspots.slice(0, 15).map((h, i) => (
                <div
                  key={h.cluster_id}
                  onClick={() => setSelected(h)}
                  style={{
                    padding: '12px 14px', borderRadius: 10, marginBottom: 8,
                    background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-glass)',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-glow)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-glass)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>#{i+1}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', flex: 1 }}>{h.location_name?.substring(0,30)}</span>
                    <span className={`badge-${h.risk_level?.toLowerCase()}`}>{h.risk_level}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#64748b' }}>
                    <span>Score: <b style={{ color: h.risk_color }}>{h.risk_score}</b></span>
                    <span>Count: <b style={{ color: '#60a5fa' }}>{h.violation_count?.toLocaleString()}</b></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    </DashboardLayout>
  );
}
