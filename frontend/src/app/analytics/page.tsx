'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  getHourlyTrends, getDailyTrends, getMonthlyTrends, getSeasonalTrends,
  getVehicles, getTopLocations, getStations, getJunctions, getViolationTypes
} from '@/lib/api';

const COLORS = ['#3b82f6','#8b5cf6','#06b6d4','#f97316','#22c55e','#ec4899','#f59e0b','#10b981','#ef4444','#a78bfa'];
const SEASON_COLORS: Record<string,string> = { Winter:'#06b6d4', Spring:'#22c55e', Summer:'#f97316', Autumn:'#f59e0b' };

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: '#0d1529', border: '1px solid #1e3a5f', borderRadius: 8, padding: '8px 14px', color: '#e2e8f0', fontSize: 13 }}>
        <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}>{label}</div>
        <div style={{ fontWeight: 700 }}>{payload[0].value?.toLocaleString()} violations</div>
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const [hourly, setHourly] = useState<any[]>([]);
  const [daily, setDaily] = useState<any[]>([]);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [seasonal, setSeasonal] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [junctions, setJunctions] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'time'|'vehicle'|'location'>('time');

  useEffect(() => {
    Promise.all([
      getHourlyTrends(), getDailyTrends(), getMonthlyTrends(), getSeasonalTrends(),
      getVehicles(), getTopLocations(), getStations(), getJunctions(), getViolationTypes()
    ]).then(([h, d, m, s, v, l, st, j, vt]) => {
      setHourly(h); setDaily(d); setMonthly(m); setSeasonal(s);
      setVehicles(v); setLocations(l); setStations(st); setJunctions(j); setViolations(vt);
    }).finally(() => setLoading(false));
  }, []);

  const tabs = [
    { key: 'time', label: 'Temporal Analysis' },
    { key: 'vehicle', label: 'Vehicle Intelligence' },
    { key: 'location', label: 'Location Intelligence' },
  ];

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <div className="section-title">Violation Analytics Center</div>
          <div className="section-subtitle">Deep-dive into violation patterns across time, vehicle, and location dimensions</div>
        </div>
      </div>

      <div className="page-content">
        {/* Tab selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'rgba(15,23,42,0.6)', padding: 6, borderRadius: 12, width: 'fit-content', border: '1px solid var(--border-glass)' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: activeTab === tab.key ? 'linear-gradient(135deg,#3b82f6,#6366f1)' : 'transparent',
                color: activeTab === tab.key ? 'white' : '#94a3b8',
                transition: 'all 0.2s',
              }}
            >{tab.label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'grid', gap: 20 }}>
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 280 }} />)}
          </div>
        ) : (
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {activeTab === 'time' && (
              <div style={{ display: 'grid', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {/* Hourly */}
                  <div className="chart-container">
                    <div className="section-title" style={{ fontSize: 14, marginBottom: 4 }}>Hour-wise Violations</div>
                    <div className="section-subtitle" style={{ marginBottom: 16 }}>Peak enforcement hours</div>
                    <ResponsiveContainer width="100%" height={230}>
                      <AreaChart data={hourly}>
                        <defs>
                          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,130,185,0.1)"/>
                        <XAxis dataKey="hour" stroke="#475569" tick={{fontSize:11}}/>
                        <YAxis stroke="#475569" tick={{fontSize:11}}/>
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#g1)" strokeWidth={2}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Daily */}
                  <div className="chart-container">
                    <div className="section-title" style={{ fontSize: 14, marginBottom: 4 }}>Day-wise Violations</div>
                    <div className="section-subtitle" style={{ marginBottom: 16 }}>Weekday vs weekend patterns</div>
                    <ResponsiveContainer width="100%" height={230}>
                      <BarChart data={daily}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,130,185,0.1)"/>
                        <XAxis dataKey="day" stroke="#475569" tick={{fontSize:11}}/>
                        <YAxis stroke="#475569" tick={{fontSize:11}}/>
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[4,4,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {/* Monthly */}
                  <div className="chart-container">
                    <div className="section-title" style={{ fontSize: 14, marginBottom: 4 }}>Monthly Trends</div>
                    <div className="section-subtitle" style={{ marginBottom: 16 }}>Jan–May 2023 violation timeline</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={monthly}>
                        <defs>
                          <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,130,185,0.1)"/>
                        <XAxis dataKey="month" stroke="#475569" tick={{fontSize:11}}/>
                        <YAxis stroke="#475569" tick={{fontSize:11}}/>
                        <Tooltip content={<CustomTooltip />}/>
                        <Area type="monotone" dataKey="count" stroke="#06b6d4" fill="url(#g2)" strokeWidth={2}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Seasonal */}
                  <div className="chart-container">
                    <div className="section-title" style={{ fontSize: 14, marginBottom: 4 }}>Seasonal Distribution</div>
                    <div className="section-subtitle" style={{ marginBottom: 16 }}>Violation intensity by season</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={seasonal} dataKey="count" nameKey="season" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={4}>
                          {seasonal.map((s, i) => <Cell key={i} fill={SEASON_COLORS[s.season] || COLORS[i]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background:'#0d1529', border:'1px solid #1e3a5f', borderRadius:8, color:'#e2e8f0' }}/>
                        <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'vehicle' && (
              <div style={{ display: 'grid', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div className="chart-container">
                    <div className="section-title" style={{ fontSize: 14, marginBottom: 4 }}>Vehicle Category Breakdown</div>
                    <div className="section-subtitle" style={{ marginBottom: 16 }}>Distribution of violating vehicles</div>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={vehicles} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,130,185,0.1)" horizontal={false}/>
                        <XAxis type="number" stroke="#475569" tick={{fontSize:11}}/>
                        <YAxis type="category" dataKey="vehicle_type" width={120} stroke="#475569" tick={{fontSize:11}}/>
                        <Tooltip contentStyle={{ background:'#0d1529', border:'1px solid #1e3a5f', borderRadius:8, color:'#e2e8f0' }}/>
                        <Bar dataKey="count" radius={[0,4,4,0]}>
                          {vehicles.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="chart-container">
                    <div className="section-title" style={{ fontSize: 14, marginBottom: 4 }}>Violation Type Analysis</div>
                    <div className="section-subtitle" style={{ marginBottom: 16 }}>Most common violation categories</div>
                    <div style={{ overflowY: 'auto', maxHeight: 300 }}>
                      {violations.slice(0,10).map((v, i) => (
                        <div key={i} style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: '#94a3b8', flex: 1, paddingRight: 10 }}>{v.violation?.substring(0,40)}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', whiteSpace: 'nowrap' }}>{v.count?.toLocaleString()}</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${(v.count / (violations[0]?.count || 1)) * 100}%`, background: COLORS[i % COLORS.length] }}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'location' && (
              <div style={{ display: 'grid', gap: 20 }}>
                <div className="chart-container">
                  <div className="section-title" style={{ fontSize: 14, marginBottom: 4 }}>Top Problematic Roads</div>
                  <div className="section-subtitle" style={{ marginBottom: 16 }}>Highest violation density road segments</div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={locations.slice(0,15)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,130,185,0.1)" horizontal={false}/>
                      <XAxis type="number" stroke="#475569" tick={{fontSize:11}}/>
                      <YAxis type="category" dataKey="location" width={180} stroke="#475569" tick={{fontSize:10}}/>
                      <Tooltip contentStyle={{ background:'#0d1529', border:'1px solid #1e3a5f', borderRadius:8, color:'#e2e8f0' }}/>
                      <Bar dataKey="count" fill="#ef4444" radius={[0,4,4,0]}>
                        {locations.slice(0,15).map((_,i) => <Cell key={i} fill={i < 5 ? '#ef4444' : i < 10 ? '#f97316' : '#22c55e'}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div className="chart-container">
                    <div className="section-title" style={{ fontSize: 14, marginBottom: 4 }}>Police Station Workload</div>
                    <div className="section-subtitle" style={{ marginBottom: 16 }}>Cases handled per station</div>
                    <div style={{ overflowY: 'auto', maxHeight: 280 }}>
                      {stations.slice(0,15).map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '6px 0', borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: COLORS[i%COLORS.length], width: 22, textAlign: 'right' }}>{i+1}</span>
                          <span style={{ fontSize: 12, color: '#94a3b8', flex: 1 }}>{s.station}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{s.count?.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="chart-container">
                    <div className="section-title" style={{ fontSize: 14, marginBottom: 4 }}>Junction Violation Analysis</div>
                    <div className="section-subtitle" style={{ marginBottom: 16 }}>High-risk junction points</div>
                    <div style={{ overflowY: 'auto', maxHeight: 280 }}>
                      {junctions.slice(0,12).map((j, i) => (
                        <div key={i} style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: '#94a3b8', flex: 1 }}>{j.junction}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#f97316' }}>{j.count?.toLocaleString()}</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${(j.count / (junctions[0]?.count || 1)) * 100}%`, background: '#f97316' }}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
