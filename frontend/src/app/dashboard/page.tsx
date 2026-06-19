'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  AlertTriangle, MapPin, Shield, Zap, TrendingUp, Car, Activity, Eye, BrainCircuit, CheckCircle2, Clock
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getKPI, getHourlyTrends, getVehicles, getTopLocations, getHotspotSummary } from '@/lib/api';

const COLORS = ['#3b82f6','#8b5cf6','#06b6d4','#f97316','#22c55e','#ec4899','#f59e0b','#10b981'];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

function AnimatedNumber({ value }: { value: string | number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (typeof value !== 'number') return;
    let start = 0;
    const duration = 1000;
    const increment = value / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  if (typeof value !== 'number') return <>{value}</>;
  return <>{count.toLocaleString()}</>;
}

function KPICard({ icon: Icon, title, value, subtitle, color, index }: any) {
  return (
    <motion.div 
      className="kpi-card" variants={cardVariants} initial="hidden" animate="visible" custom={index}
      whileHover={{ y: -5, boxShadow: `0 10px 25px ${color}20` }}
      style={{ transition: 'all 0.3s ease' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${color}20`, border: `1px solid ${color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={color} />
        </div>
        <TrendingUp size={12} color="#22c55e" />
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#e2e8f0', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}>
        <AnimatedNumber value={value} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginTop: 2 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>{subtitle}</div>}
    </motion.div>
  );
}

export default function DashboardPage() {
  const [kpi, setKpi] = useState<any>(null);
  const [hourly, setHourly] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [hotspotSummary, setHotspotSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getKPI(), getHourlyTrends(), getVehicles(), getTopLocations(), getHotspotSummary()])
      .then(([k, h, v, l, hs]) => {
        setKpi(k); setHourly(h); setVehicles(v.slice(0,8)); setLocations(l.slice(0,10));
        setHotspotSummary(hs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const kpiCards = kpi ? [
    { icon: Activity, title: 'Total Violations', value: kpi.total_violations, subtitle: 'Approved records', color: '#3b82f6' },
    { icon: MapPin, title: 'Unique Locations', value: kpi.unique_locations, subtitle: 'Road segments', color: '#8b5cf6' },
    { icon: Shield, title: 'Police Stations', value: kpi.police_stations, subtitle: 'Active stations', color: '#06b6d4' },
    { icon: AlertTriangle, title: 'Hotspot Clusters', value: kpi.detected_hotspots, subtitle: 'DBSCAN clusters', color: '#ef4444' },
    { icon: MapPin, title: 'Highest Risk Area', value: kpi.highest_risk_location?.substring(0,20) + '...', subtitle: 'Top violation location', color: '#f97316' },
    { icon: Car, title: 'Top Vehicle Type', value: kpi.most_common_vehicle, subtitle: 'Most violations', color: '#22c55e' },
  ] : [];

  const peakHourObj = hourly.length ? hourly.reduce((max, h) => h.count > max.count ? h : max, hourly[0]) : null;
  const topLocation = locations.length ? locations[0].location : 'Unknown';
  const topVehicle = vehicles.length ? vehicles[0].vehicle_type : 'Unknown';

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="section-title">Executive Dashboard</div>
          <div className="section-subtitle">Real-time enforcement intelligence · Bengaluru, Karnataka</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="status-dot live" />
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Live Intelligence</span>
        </div>
      </div>

      <div className="page-content">
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 110 }} />
            ))}
          </div>
        ) : (
          <>
            {/* KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
              {kpiCards.map((card, i) => (
                <KPICard key={card.title} {...card} index={i} />
              ))}
            </div>

            {/* Quality report banner */}
            {kpi?.quality_report && (
              <motion.div
                className="glass-card"
                style={{ padding: '14px 20px', marginBottom: 24, display: 'flex', gap: 32, flexWrap: 'wrap' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              >
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Records</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#60a5fa' }}>{kpi.quality_report.total_records?.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Usable Records</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#22c55e' }}>{kpi.quality_report.usable_records?.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Duplicates Removed</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#f97316' }}>{kpi.quality_report.duplicates_removed?.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Missing Handled</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#a78bfa' }}>{kpi.quality_report.missing_values_handled?.toLocaleString()}</div>
                </div>
                {hotspotSummary && (
                  <>
                    <div>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>High Risk Clusters</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>{hotspotSummary.high_risk}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Medium Risk Clusters</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#f97316' }}>{hotspotSummary.medium_risk}</div>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* AI Intelligence Summary Panel */}
            <motion.div
              className="glass-card"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
              style={{
                padding: '20px 24px', marginBottom: 24,
                background: 'linear-gradient(135deg, rgba(15,23,42,0.8) 0%, rgba(30,58,138,0.2) 100%)',
                borderLeft: '4px solid #3b82f6'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ background: 'rgba(59,130,246,0.1)', padding: 6, borderRadius: 8 }}>
                  <BrainCircuit size={18} color="#60a5fa" />
                </div>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.02em' }}>
                  AI Enforcement Intelligence
                </span>
                <span style={{ fontSize: 10, background: 'rgba(34,197,94,0.1)', color: '#34d399', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                  LIVE
                </span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Clock size={16} color="#f59e0b" style={{ marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Peak Violation Hours</div>
                    <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500, marginTop: 4 }}>
                      {peakHourObj ? `Maximum offenses occur around ${peakHourObj.hour}:00.` : 'Analyzing peak hours...'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <MapPin size={16} color="#ef4444" style={{ marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Most Problematic Zone</div>
                    <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500, marginTop: 4 }}>
                      High recurrence detected at {topLocation?.substring(0, 30)}.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Car size={16} color="#8b5cf6" style={{ marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Primary Offender Type</div>
                    <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500, marginTop: 4 }}>
                      {topVehicle}s constitute the majority of recorded infractions.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Shield size={16} color="#10b981" style={{ marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deployment Strategy</div>
                    <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500, marginTop: 4 }}>
                      Recommend concentrating patrols between {peakHourObj ? `${peakHourObj.hour-1}:00 and ${peakHourObj.hour+1}:00` : 'peak hours'}.
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              {/* Hourly violations */}
              <motion.div className="chart-container" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <div style={{ marginBottom: 16 }}>
                  <div className="section-title" style={{ fontSize: 14 }}>Hour-wise Violation Trend</div>
                  <div className="section-subtitle">Violations by hour of day</div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={hourly}>
                    <defs>
                      <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,130,185,0.1)" />
                    <XAxis dataKey="hour" stroke="#475569" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#475569" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#0d1529', border: '1px solid #1e3a5f', borderRadius: 8, color: '#e2e8f0' }} />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#blueGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Vehicle distribution */}
              <motion.div className="chart-container" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <div style={{ marginBottom: 16 }}>
                  <div className="section-title" style={{ fontSize: 14 }}>Vehicle Category Distribution</div>
                  <div className="section-subtitle">Violations by vehicle type</div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={vehicles} dataKey="count" nameKey="vehicle_type" cx="50%" cy="50%"
                      outerRadius={80} innerRadius={40} paddingAngle={3}>
                      {vehicles.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0d1529', border: '1px solid #1e3a5f', borderRadius: 8, color: '#e2e8f0' }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>
            </div>

            {/* Top locations */}
            <motion.div className="chart-container" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <div style={{ marginBottom: 16 }}>
                <div className="section-title" style={{ fontSize: 14 }}>Top Problematic Locations</div>
                <div className="section-subtitle">Roads with highest violation counts</div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={locations} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,130,185,0.1)" horizontal={false} />
                  <XAxis type="number" stroke="#475569" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="location" width={160} stroke="#475569" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#0d1529', border: '1px solid #1e3a5f', borderRadius: 8, color: '#e2e8f0' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                    {locations.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
