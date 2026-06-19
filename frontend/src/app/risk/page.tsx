'use client';
import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { AlertTriangle, ShieldAlert, CheckCircle, Search, HelpCircle, MapPin, RefreshCw, BarChart2 } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getRiskData, getRiskSummary, getRiskHeatmap } from '@/lib/api';

const RISK_COLORS = {
  High: '#ef4444',
  Medium: '#f97316',
  Low: '#22c55e'
};

export default function RiskIntelligencePage() {
  const [summary, setSummary] = useState<any>(null);
  const [riskData, setRiskData] = useState<any[]>([]);
  const [heatmapPoints, setHeatmapPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('All');
  const [compareList, setCompareList] = useState<any[]>([]);
  const [mapLoading, setMapLoading] = useState(false);

  // Map elements
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);

  useEffect(() => {
    fetchData();
  }, [selectedLevel]);

  const fetchData = () => {
    setLoading(true);
    const apiLevel = selectedLevel === 'All' ? undefined : selectedLevel;
    Promise.all([
      getRiskSummary(),
      getRiskData(100, apiLevel),
      getRiskHeatmap()
    ])
      .then(([s, d, h]) => {
        setSummary(s);
        setRiskData(d.data || []);
        setHeatmapPoints(h.points || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // Setup Leaflet map for risk points
  useEffect(() => {
    if (!mapRef.current || loading || leafletMap.current) return;

    setMapLoading(true);
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
        className: 'risk-map-tiles',
      }).addTo(map);

      // Custom dark tile overlay effect via CSS
      const style = document.createElement('style');
      style.innerHTML = `.risk-map-tiles { filter: brightness(0.55) saturate(0.4) hue-rotate(200deg); }`;
      document.head.appendChild(style);

      // Plot risk points
      riskData.forEach(item => {
        if (!item.lat || !item.lon) return;

        const color = item.risk_color || '#3b82f6';
        const radius = Math.max(6, Math.min(20, item.risk_score / 5));

        const circle = L.circleMarker([item.lat, item.lon], {
          radius,
          fillColor: color,
          color: color,
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.4,
        });

        const popupContent = `
          <div style="font-family:'Inter',sans-serif;min-width:180px;padding:2px">
            <div style="font-size:12px;font-weight:700;color:#e2e8f0;margin-bottom:6px">${item.location}</div>
            <div style="font-size:11px;color:#94a3b8">
              Risk Score: <b style="color:${color}">${item.risk_score}/100</b><br/>
              Risk Level: <b style="color:${color}">${item.risk_level}</b><br/>
              Violations: <b style="color:#60a5fa">${item.violation_count}</b><br/>
              Station: <b style="color:#e2e8f0">${item.police_station}</b>
            </div>
          </div>
        `;

        circle.bindPopup(popupContent, {
          className: 'dark-popup'
        });

        circle.addTo(map);
      });

      leafletMap.current = map;
      setMapLoading(false);
    }).catch(err => {
      console.error('Error loading leaflet', err);
      setMapLoading(false);
    });

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [loading, riskData]);

  // Filter risk records
  const filteredRecords = riskData.filter(item => {
    const query = searchQuery.toLowerCase();
    return (
      item.location?.toLowerCase().includes(query) ||
      item.police_station?.toLowerCase().includes(query)
    );
  });

  const toggleCompare = (item: any) => {
    if (compareList.some(c => c.location === item.location)) {
      setCompareList(compareList.filter(c => c.location !== item.location));
    } else {
      if (compareList.length >= 5) {
        alert("You can compare up to 5 locations at a time.");
        return;
      }
      setCompareList([...compareList, item]);
    }
  };

  const distributionData = summary ? [
    { name: 'High Risk', value: summary.high_risk_count, color: RISK_COLORS.High },
    { name: 'Medium Risk', value: summary.medium_risk_count, color: RISK_COLORS.Medium },
    { name: 'Low Risk', value: summary.low_risk_count, color: RISK_COLORS.Low },
  ] : [];

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <div className="section-title">Parking Risk Intelligence Center</div>
          <div className="section-subtitle">Composite Risk Analysis mapping historical recurrence & temporal parameters</div>
        </div>
        <button className="btn-secondary" onClick={fetchData} style={{ padding: '8px 14px' }}>
          <RefreshCw size={14} style={{ marginRight: 4 }} /> Sync Data
        </button>
      </div>

      <div className="page-content">
        {loading && !summary ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 110 }} />
            ))}
          </div>
        ) : (
          <>
            {/* Summary Statistics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
              <div className="kpi-card" style={{ borderLeft: `4px solid ${RISK_COLORS.High}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>High Risk Locations</span>
                  <ShieldAlert size={20} color={RISK_COLORS.High} />
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#f8fafc', marginTop: 10 }}>
                  {summary?.high_risk_count || 0}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Risk Score ≥ 71/100</div>
              </div>

              <div className="kpi-card" style={{ borderLeft: `4px solid ${RISK_COLORS.Medium}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Medium Risk Locations</span>
                  <AlertTriangle size={20} color={RISK_COLORS.Medium} />
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#f8fafc', marginTop: 10 }}>
                  {summary?.medium_risk_count || 0}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Risk Score 41–70/100</div>
              </div>

              <div className="kpi-card" style={{ borderLeft: `4px solid ${RISK_COLORS.Low}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Low Risk Locations</span>
                  <CheckCircle size={20} color={RISK_COLORS.Low} />
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#f8fafc', marginTop: 10 }}>
                  {summary?.low_risk_count || 0}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Risk Score 0–40/100</div>
              </div>

              <div className="kpi-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Average Platform Risk</span>
                  <HelpCircle size={20} color="#3b82f6" />
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#f8fafc', marginTop: 10 }}>
                  {summary?.avg_risk_score || '0.0'}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Mean aggregated risk index</div>
              </div>
            </div>

            {/* Layout Panels */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, marginBottom: 20 }}>
              {/* Left Panel: Map and Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Risk Map */}
                <div className="chart-container" style={{ height: 360, position: 'relative', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)', background: 'rgba(10,15,30,0.4)' }}>
                    <div className="section-title" style={{ fontSize: 14 }}>Geospatial Risk Distribution</div>
                    <div className="section-subtitle">Visualising Composite Risk Score intensity points</div>
                  </div>
                  <div style={{ flex: 1, position: 'relative' }}>
                    {mapLoading && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', zIndex: 10 }}>
                        <span style={{ fontSize: 12, color: '#60a5fa' }}>Initialising Risk Map Layer...</span>
                      </div>
                    )}
                    <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
                  </div>
                </div>

                {/* Risk Rankings Table */}
                <div className="chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                    <div>
                      <div className="section-title" style={{ fontSize: 14 }}>Risk Rankings & Intel</div>
                      <div className="section-subtitle">Ordered list of areas scored by risk factors</div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      {/* Search */}
                      <div style={{ position: 'relative' }}>
                        <Search size={14} color="#64748b" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="text"
                          placeholder="Search area/police stn..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="form-input"
                          style={{ paddingLeft: 30, height: 34, fontSize: 12, width: 180 }}
                        />
                      </div>

                      {/* Level selector */}
                      <select
                        value={selectedLevel}
                        onChange={e => setSelectedLevel(e.target.value)}
                        className="form-input"
                        style={{ height: 34, width: 110, fontSize: 12 }}
                      >
                        <option value="All">All Risks</option>
                        <option value="High">High Risk</option>
                        <option value="Medium">Medium Risk</option>
                        <option value="Low">Low Risk</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto', maxHeight: 350 }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Area / Road Segment</th>
                          <th style={{ textAlign: 'center' }}>Risk Score</th>
                          <th>Risk Level</th>
                          <th style={{ textAlign: 'right' }}>Violations</th>
                          <th>Police Station</th>
                          <th style={{ textAlign: 'center' }}>Compare</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecords.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: '20px 0' }}>
                              No areas found matching criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredRecords.map((item, idx) => {
                            const isComparing = compareList.some(c => c.location === item.location);
                            return (
                              <tr key={idx}>
                                <td style={{ fontWeight: 600 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <MapPin size={12} color="#64748b" />
                                    <span>{item.location}</span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 700, color: item.risk_color }}>
                                  {item.risk_score}
                                </td>
                                <td>
                                  <span className={`badge-${item.risk_level?.toLowerCase()}`} style={{ fontSize: 10, padding: '1px 6px' }}>
                                    {item.risk_level}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                  {item.violation_count?.toLocaleString()}
                                </td>
                                <td style={{ color: '#94a3b8', fontSize: 12 }}>
                                  {item.police_station}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <button
                                    onClick={() => toggleCompare(item)}
                                    style={{
                                      background: isComparing ? 'linear-gradient(135deg,#3b82f6,#6366f1)' : 'transparent',
                                      border: isComparing ? 'none' : '1px solid var(--border-glass)',
                                      color: isComparing ? 'white' : '#94a3b8',
                                      padding: '3px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                                      fontWeight: 600
                                    }}
                                  >
                                    {isComparing ? 'Comparing' : '+ Compare'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Panel: Side Cards & Comparison */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Risk Distribution Chart */}
                <div className="chart-container">
                  <div className="section-title" style={{ fontSize: 14, marginBottom: 4 }}>Risk Level Distribution</div>
                  <div className="section-subtitle" style={{ marginBottom: 16 }}>Composition of road risk segments</div>
                  {summary ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, position: 'relative' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={distributionData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={65}
                            innerRadius={35}
                            paddingAngle={3}
                          >
                            {distributionData.map((d, i) => (
                              <Cell key={i} fill={d.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ background: '#0d1529', border: '1px solid #1e3a5f', borderRadius: 8, color: '#e2e8f0' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Custom Legend underneath */}
                      <div style={{ position: 'absolute', bottom: -5, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {distributionData.map((d, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                            <span style={{ color: '#94a3b8' }}>{d.name} ({d.value})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ height: 180 }} className="skeleton" />
                  )}
                </div>

                {/* Area Comparison Console */}
                <div className="chart-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div className="section-title" style={{ fontSize: 14, marginBottom: 4 }}>Area Comparison Bench</div>
                  <div className="section-subtitle" style={{ marginBottom: 16 }}>Select up to 5 locations from the table to compare side-by-side</div>

                  {compareList.length === 0 ? (
                    <div style={{
                      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      border: '2px dashed var(--border-glass)', borderRadius: 10, padding: 32, textAlign: 'center'
                    }}>
                      <BarChart2 size={36} color="#475569" style={{ marginBottom: 10 }} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>Bench is Empty</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Click "+ Compare" in the rankings table to load locations here.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                      {/* List of compare locations */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {compareList.map((c, i) => (
                          <span
                            key={i}
                            style={{
                              background: `${c.risk_color}15`,
                              border: `1px solid ${c.risk_color}40`,
                              color: c.risk_color,
                              padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                              display: 'inline-flex', alignItems: 'center', gap: 6
                            }}
                          >
                            {c.location?.substring(0, 15)}...
                            <button
                              onClick={() => toggleCompare(c)}
                              style={{ background: 'none', border: 'none', color: c.risk_color, cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>

                      {/* Comparison chart */}
                      <div style={{ flex: 1, minHeight: 220 }}>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={compareList} margin={{ top: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,130,185,0.1)" />
                            <XAxis dataKey="location" stroke="#475569" tick={{ fontSize: 9 }} tickFormatter={(v) => v.substring(0, 10) + '...'} />
                            <YAxis yAxisId="left" stroke="#3b82f6" orientation="left" tick={{ fontSize: 10 }} label={{ value: 'Risk Score', angle: -90, position: 'insideLeft', style: { fill: '#3b82f6', fontSize: 10 } }} />
                            <YAxis yAxisId="right" stroke="#8b5cf6" orientation="right" tick={{ fontSize: 10 }} label={{ value: 'Violations', angle: 90, position: 'insideRight', style: { fill: '#8b5cf6', fontSize: 10 } }} />
                            <Tooltip contentStyle={{ background: '#0d1529', border: '1px solid #1e3a5f', borderRadius: 8, color: '#e2e8f0' }} />
                            <Bar yAxisId="left" dataKey="risk_score" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Risk Score" />
                            <Bar yAxisId="right" dataKey="violation_count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Violations" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    </DashboardLayout>
  );
}
