'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  Layers, MapPin, AlertTriangle, Eye, Radio, Clock, Zap
} from 'lucide-react';
import { getHeatmap, getHotspots, getRiskHeatmap, getLiveAlerts } from '@/lib/api';

// Dynamically import the map to prevent SSR issues with Leaflet
const DigitalTwinMap = dynamic(() => import('@/components/ui/DigitalTwinMap'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100%', height: '100%',
      background: 'rgba(8,12,24,0.85)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        style={{
          width: 44, height: 44, borderRadius: '50%',
          border: '3px solid rgba(59,130,246,0.2)',
          borderTop: '3px solid #3b82f6',
        }}
      />
      <div style={{ fontSize: 14, color: '#60a5fa', fontWeight: 600 }}>
        Loading Digital Twin Map...
      </div>
    </div>
  ),
});

interface LayerState {
  heatmap: boolean;
  hotspots: boolean;
  riskZones: boolean;
}

export default function DigitalTwinPage() {
  const [layerState, setLayerState] = useState<LayerState>({
    heatmap: true,
    hotspots: true,
    riskZones: true,
  });

  const [timeOfDay, setTimeOfDay] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  
  const [mapData, setMapData] = useState({
    heatmapData: [],
    hotspotsData: [],
    riskData: [],
  });

  const [alerts, setAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState({ hotspots: 0, highRisk: 0, totalPoints: 0, alerts: 0 });
  const [lastUpdated, setLastUpdated] = useState('');

  // Fetch all data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [heatmapRes, hotspotsRes, riskRes, alertsRes] = await Promise.all([
          getHeatmap().catch(() => ({ points: [] })),
          getHotspots(200).catch(() => ({ hotspots: [] })),
          getRiskHeatmap().catch(() => ({ points: [] })),
          getLiveAlerts().catch(() => ({ alerts: [] })),
        ]);

        const hotspots = hotspotsRes.hotspots || [];
        const highRiskCount = hotspots.filter((h: any) => h.risk_level === 'High').length;
        const heatmapPoints = heatmapRes.points || [];
        const riskPoints = riskRes.points || [];
        const liveAlerts = alertsRes.alerts || [];

        setMapData({
          heatmapData: heatmapPoints,
          hotspotsData: hotspots,
          riskData: riskPoints,
        });

        setAlerts(liveAlerts.slice(0, 5)); // Show top 5 recent alerts

        setStats({
          hotspots: hotspots.length,
          highRisk: highRiskCount,
          totalPoints: heatmapPoints.length,
          alerts: liveAlerts.length,
        });

        setLastUpdated(new Date().toLocaleTimeString('en-IN'));
        setLoading(false);
      } catch (error) {
        console.error('Failed to load map data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const toggleLayer = (key: keyof LayerState) => {
    setLayerState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const statPanels = [
    { label: 'Hotspot Clusters', value: stats.hotspots, color: '#ef4444', icon: MapPin },
    { label: 'High Risk Zones', value: stats.highRisk, color: '#f97316', icon: AlertTriangle },
    { label: 'Data Points', value: stats.totalPoints.toLocaleString(), color: '#3b82f6', icon: Eye },
    { label: 'Live Alerts', value: stats.alerts, color: '#8b5cf6', icon: Radio },
  ];

  const timeOptions = ['All', 'Morning', 'Afternoon', 'Evening', 'Night'];

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="page-header" style={{ flexShrink: 0 }}>
        <div>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Layers size={20} style={{ color: '#60a5fa' }} />
            Digital Twin City View
          </div>
          <div className="section-subtitle">
            Live enforcement intelligence · Bengaluru, Karnataka
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastUpdated && (
            <span style={{ fontSize: 11, color: '#64748b' }}>
              <Clock size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Updated {lastUpdated}
            </span>
          )}
          <span className="status-dot live" />
          <span style={{ fontSize: 12, color: '#22c55e' }}>Live Feed</span>
        </div>
      </div>

      <div className="page-content" style={{ padding: 0, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
        {/* Stats Strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1, padding: '16px 20px',
          background: 'rgba(8,12,24,0.9)',
          borderBottom: '1px solid rgba(99,130,185,0.15)',
          flexShrink: 0,
        }}>
          {statPanels.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 16px' }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: `${s.color}15`, border: `1px solid ${s.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={16} color={s.color} />
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {s.label}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Map + Controls Container */}
        <div style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}>
          
          {/* Main Map Component */}
          {!loading && (
            <DigitalTwinMap 
              layerState={layerState}
              heatmapData={mapData.heatmapData}
              hotspotsData={mapData.hotspotsData}
              riskData={mapData.riskData}
              timeOfDay={timeOfDay}
            />
          )}

          {/* Layer Controls Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            style={{
              position: 'absolute', top: 20, left: 20, zIndex: 400,
              background: 'rgba(8,12,24,0.92)',
              border: '1px solid rgba(99,130,185,0.25)',
              borderRadius: 14, padding: 16, minWidth: 200,
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              <Layers size={11} style={{ marginRight: 5, verticalAlign: 'middle' }} />
              Map Layers
            </div>
            {([
              { key: 'heatmap', label: 'Violation Heatmap', color: '#ef4444' },
              { key: 'hotspots', label: 'Hotspot Clusters', color: '#f97316' },
              { key: 'riskZones', label: 'Risk Zones', color: '#8b5cf6' },
            ] as const).map(layer => (
              <div
                key={layer.key}
                onClick={() => toggleLayer(layer.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                  background: layerState[layer.key] ? `${layer.color}10` : 'transparent',
                  border: `1px solid ${layerState[layer.key] ? layer.color + '30' : 'transparent'}`,
                  marginBottom: 4, transition: 'all 0.2s',
                }}
              >
                <div style={{
                  width: 12, height: 12, borderRadius: 3,
                  background: layerState[layer.key] ? layer.color : '#1e293b',
                  border: `1px solid ${layer.color}60`,
                  transition: 'background 0.2s',
                }} />
                <span style={{
                  fontSize: 12, fontWeight: 500,
                  color: layerState[layer.key] ? '#e2e8f0' : '#64748b',
                }}>
                  {layer.label}
                </span>
              </div>
            ))}
          </motion.div>

          {/* Time Simulation Slider */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            style={{
              position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', zIndex: 400,
              background: 'rgba(8,12,24,0.92)',
              border: '1px solid rgba(99,130,185,0.25)',
              borderRadius: 12, padding: '12px 24px',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={12} /> Time-Based Risk Simulation
            </div>
            <div style={{ display: 'flex', gap: 6, background: '#0a0f1e', padding: 4, borderRadius: 8, border: '1px solid rgba(99,130,185,0.1)' }}>
              {timeOptions.map(time => (
                <button
                  key={time}
                  onClick={() => setTimeOfDay(time)}
                  style={{
                    padding: '6px 16px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                    background: timeOfDay === time ? 'rgba(59,130,246,0.15)' : 'transparent',
                    color: timeOfDay === time ? '#60a5fa' : '#94a3b8',
                    border: `1px solid ${timeOfDay === time ? 'rgba(59,130,246,0.3)' : 'transparent'}`,
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  {time}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Live Alert Feed Sidebar Overlay */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            style={{
              position: 'absolute', top: 20, right: 20, zIndex: 400,
              width: 280,
              background: 'rgba(8,12,24,0.92)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 14, overflow: 'hidden',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Radio size={14} color="#ef4444" style={{ animation: 'pulse-glow 2s infinite' }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Live Alerts
              </div>
            </div>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
              {alerts.length === 0 ? (
                <div style={{ fontSize: 11, color: '#64748b', textAlign: 'center', padding: '10px 0' }}>No active alerts</div>
              ) : alerts.map(alert => (
                <div key={alert.id} style={{
                  padding: 10, borderRadius: 8, background: 'rgba(15,23,42,0.6)',
                  borderLeft: `3px solid ${alert.color || '#ef4444'}`,
                  borderTop: '1px solid rgba(99,130,185,0.1)',
                  borderRight: '1px solid rgba(99,130,185,0.1)',
                  borderBottom: '1px solid rgba(99,130,185,0.1)',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>{alert.title}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>📍 {alert.location}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 9, color: alert.color, fontWeight: 700, background: `${alert.color}15`, padding: '2px 6px', borderRadius: 4 }}>{alert.risk_level}</span>
                    <span style={{ fontSize: 9, color: '#64748b' }}>{alert.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Legend Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            style={{
              position: 'absolute', bottom: 30, left: 20, zIndex: 400,
              background: 'rgba(8,12,24,0.92)',
              border: '1px solid rgba(99,130,185,0.2)',
              borderRadius: 12, padding: '12px 16px',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Risk Legend
            </div>
            {[
              { label: 'High Risk', color: '#ef4444' },
              { label: 'Medium Risk', color: '#f97316' },
              { label: 'Low Risk', color: '#22c55e' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: l.color,
                  boxShadow: `0 0 6px ${l.color}`,
                }} />
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{l.label}</span>
              </div>
            ))}
          </motion.div>

        </div>
      </div>

      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 4px rgba(239,68,68,0.8)); }
          50% { opacity: 0.5; filter: none; }
        }
      `}</style>
    </DashboardLayout>
  );
}
