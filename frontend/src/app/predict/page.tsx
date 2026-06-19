'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Calendar, Clock, MapPin, Shield, Zap, Info, Loader2, AlertCircle,
  TrendingUp, ChevronRight, BarChart2, Radio
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getOptions, predict, getForecast24h } from '@/lib/api';

const RISK_COLORS: Record<string, string> = {
  High: '#ef4444',
  Medium: '#f97316',
  Low: '#22c55e'
};

function RiskMeter({ level, score }: { level: string; score: number }) {
  const color = RISK_COLORS[level] || '#94a3b8';
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={120} height={70} viewBox="0 0 120 70">
        {/* Track */}
        <path d="M10,60 A50,50 0 0,1 110,60" fill="none" stroke="rgba(30,41,59,0.8)" strokeWidth={10} strokeLinecap="round" />
        {/* Fill */}
        <path
          d="M10,60 A50,50 0 0,1 110,60"
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * 157.08} 157.08`}
          style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'stroke-dasharray 1s ease' }}
        />
        <text x="60" y="58" textAnchor="middle" fill={color} fontFamily="Outfit, sans-serif" fontSize="16" fontWeight="800">
          {score.toFixed(0)}
        </text>
      </svg>
      <div style={{ fontSize: 10, color: '#64748b', marginTop: -4 }}>RISK SCORE</div>
    </div>
  );
}

export default function PredictionCommandPage() {
  const [activeTab, setActiveTab] = useState<'query' | 'forecast'>('query');
  const [options, setOptions] = useState<any>({ vehicle_types: [], police_stations: [], junctions: [], locations: [] });
  const [form, setForm] = useState({
    location: '', date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    vehicle_type: 'CAR', police_station: '', junction: 'No Junction'
  });
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Forecast state
  const [forecast, setForecast] = useState<any>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);

  useEffect(() => {
    getOptions()
      .then(opts => {
        setOptions(opts);
        setForm(f => ({
          ...f,
          location: opts.locations[0] || '',
          vehicle_type: opts.vehicle_types.includes('CAR') ? 'CAR' : (opts.vehicle_types[0] || ''),
          police_station: opts.police_stations[0] || '',
          junction: opts.junctions.includes('No Junction') ? 'No Junction' : (opts.junctions[0] || '')
        }));
      })
      .catch(console.error)
      .finally(() => setLoadingOptions(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'forecast' && !forecast) {
      loadForecast();
    }
  }, [activeTab]);

  const loadForecast = () => {
    setLoadingForecast(true);
    setForecastError(null);
    getForecast24h()
      .then(data => setForecast(data))
      .catch(() => setForecastError('Unable to generate forecast. Ensure backend is running and models are trained.'))
      .finally(() => setLoadingForecast(false));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPredicting(true);
    setError(null);
    predict(form)
      .then(res => setResult(res))
      .catch(err => {
        console.error(err);
        setError('Failed to run prediction. Please ensure the backend is running and trained.');
      })
      .finally(() => setPredicting(false));
  };

  const tabs = [
    { key: 'query', label: 'Risk Query', icon: Brain },
    { key: 'forecast', label: '24h Intelligence Forecast', icon: TrendingUp },
  ] as const;

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <div className="section-title">AI Prediction Command Center</div>
          <div className="section-subtitle">ML-powered risk assessment with SHAP explainability · 24h Forecast</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                  background: isActive ? 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(139,92,246,0.2))' : 'transparent',
                  border: isActive ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
                  color: isActive ? '#60a5fa' : '#64748b',
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="page-content">
        <AnimatePresence mode="wait">
          {/* ── RISK QUERY TAB ── */}
          {activeTab === 'query' && (
            <motion.div
              key="query"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 24 }}
            >
              {/* Query Form */}
              <div className="chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <Brain size={18} color="#60a5fa" />
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Risk Query Form</div>
                </div>
                {loadingOptions ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 50 }} />)}
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label className="form-label">Target Location Area</label>
                      <select className="form-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} required>
                        {options.locations.map((l: string) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label className="form-label">Query Date</label>
                        <input type="date" className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
                      </div>
                      <div>
                        <label className="form-label">Query Time</label>
                        <input type="time" className="form-input" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} required />
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Vehicle Category</label>
                      <select className="form-input" value={form.vehicle_type} onChange={e => setForm({ ...form, vehicle_type: e.target.value })} required>
                        {options.vehicle_types.map((v: string) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Responsible Police Station</label>
                      <select className="form-input" value={form.police_station} onChange={e => setForm({ ...form, police_station: e.target.value })} required>
                        {options.police_stations.map((ps: string) => <option key={ps} value={ps}>{ps}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Nearby Junction</label>
                      <select className="form-input" value={form.junction} onChange={e => setForm({ ...form, junction: e.target.value })} required>
                        {options.junctions.map((j: string) => <option key={j} value={j}>{j}</option>)}
                      </select>
                    </div>
                    <button type="submit" className="btn-primary" disabled={predicting} style={{ marginTop: 8, justifyContent: 'center' }}>
                      {predicting ? <><Loader2 size={16} className="animate-spin" /> Assessing Risk...</> : <><Brain size={16} /> Run AI Risk Assessment</>}
                    </button>
                  </form>
                )}
              </div>

              {/* Results Console */}
              <div className="chart-container" style={{ display: 'flex', flexDirection: 'column', minHeight: 450 }}>
                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: 14, borderRadius: 10, display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
                    <AlertCircle size={16} />
                    <span style={{ fontSize: 12.5 }}>{error}</span>
                  </div>
                )}
                {!result && !predicting && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border-glass)', borderRadius: 12, padding: 40, textAlign: 'center' }}>
                    <Brain size={44} color="#334155" style={{ marginBottom: 14 }} />
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#94a3b8' }}>Awaiting Assessment Query</div>
                    <p style={{ fontSize: 12.5, color: '#64748b', maxWidth: 320, marginTop: 6 }}>
                      Enter target operational details on the left and trigger the AI agent. The console will display risk classifications, model confidence, and SHAP decision explanations.
                    </p>
                  </div>
                )}
                {predicting && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="skeleton" style={{ height: 80 }} />
                    <div className="skeleton" style={{ height: 40 }} />
                    <div className="skeleton" style={{ height: 160 }} />
                    <div className="skeleton" style={{ height: 100 }} />
                  </div>
                )}
                {result && !predicting && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
                    {/* Risk Gauge */}
                    <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-glass)', padding: '16px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Risk Prediction</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: RISK_COLORS[result.prediction], fontFamily: 'Outfit, sans-serif' }}>
                          {result.prediction?.toUpperCase()} RISK
                        </div>
                      </div>
                      <RiskMeter level={result.prediction} score={result.risk_score || 0} />
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Confidence</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#f8fafc', fontFamily: 'Outfit, sans-serif' }}>
                          {Math.round(result.confidence)}%
                        </div>
                      </div>
                    </div>
                    {/* Probability Distribution */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Model Probabilities</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {Object.entries(result.probabilities || {}).map(([level, prob]: any) => (
                          <div key={level}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 3 }}>
                              <span style={{ color: '#94a3b8' }}>{level} Risk</span>
                              <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{Math.round(prob)}%</span>
                            </div>
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${prob}%`, background: RISK_COLORS[level] || '#3b82f6' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* SHAP Explanations */}
                    <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                        <Zap size={14} color="#a78bfa" />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Decision Rationale (SHAP)</span>
                      </div>
                      {result.explanation?.shap_available ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {result.explanation.top_reasons?.map((reason: any, i: number) => {
                            const isIncrease = reason.direction === 'increases';
                            return (
                              <div key={i} style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(99,130,185,0.08)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{reason.feature}</span>
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: isIncrease ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: isIncrease ? '#fca5a5' : '#86efac', border: isIncrease ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(34,197,94,0.2)' }}>
                                    {isIncrease ? `+${reason.shap_value} (Raises)` : `${reason.shap_value} (Lowers)`}
                                  </span>
                                </div>
                                <div style={{ fontSize: 11.5, color: '#94a3b8' }}>{reason.description}</div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {(result.explanation?.reasons || []).map((reason: string, i: number) => (
                            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: '#94a3b8', padding: '6px 0' }}>
                              <span style={{ color: '#a78bfa' }}>▪</span>
                              <span>{reason}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Enforcement Plan */}
                    <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <Shield size={14} color="#60a5fa" />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Immediate Enforcement Plan</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#e2e8f0', marginBottom: 8 }}>
                        Priority: <span style={{ fontWeight: 700, color: RISK_COLORS[result.prediction] }}>{result.recommendation?.priority}</span> ·
                        Manpower: <span style={{ fontWeight: 700 }}>{result.recommendation?.officers}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {(result.recommendation?.actions || []).map((act: string, idx: number) => (
                          <div key={idx} style={{ display: 'flex', gap: 6, fontSize: 11.5, color: '#94a3b8' }}>
                            <span>✓</span><span>{act}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── 24H FORECAST TAB ── */}
          {activeTab === 'forecast' && (
            <motion.div key="forecast" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              {/* Header info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrendingUp size={16} color="#60a5fa" />
                    24-Hour Predictive Intelligence Forecast
                    {forecast?.forecast_date && (
                      <span style={{ fontSize: 12, color: '#60a5fa', fontWeight: 500, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', padding: '2px 10px', borderRadius: 20 }}>
                        {forecast.forecast_date}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                    ML ensemble predictions for top risk locations × time windows
                  </div>
                </div>
                <button onClick={loadForecast} className="btn-secondary" style={{ fontSize: 12 }} disabled={loadingForecast}>
                  <Radio size={13} />
                  {loadingForecast ? 'Computing...' : 'Refresh Forecast'}
                </button>
              </div>

              {loadingForecast && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 12 }} />)}
                </div>
              )}

              {forecastError && !loadingForecast && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: 20, borderRadius: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <AlertCircle size={18} />
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Forecast Unavailable</div>
                    <div style={{ fontSize: 12 }}>{forecastError}</div>
                  </div>
                </div>
              )}

              {forecast && !loadingForecast && (
                <>
                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                    {[
                      { label: 'High Risk Slots', value: forecast.forecast?.filter((f: any) => f.risk_level === 'High').length || 0, color: '#ef4444' },
                      { label: 'Medium Risk Slots', value: forecast.forecast?.filter((f: any) => f.risk_level === 'Medium').length || 0, color: '#f97316' },
                      { label: 'Locations Scanned', value: new Set(forecast.forecast?.map((f: any) => f.location)).size || 0, color: '#3b82f6' },
                    ].map(s => (
                      <div key={s.label} className="glass-card" style={{ padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: 'Outfit, sans-serif' }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Forecast Cards */}
                  {forecast.status === 'data_loading' ? (
                    <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
                      <Brain size={44} color="#334155" style={{ marginBottom: 14, margin: '0 auto 14px' }} />
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#94a3b8' }}>ML Pipeline Loading</div>
                      <p style={{ fontSize: 13, marginTop: 6 }}>The forecast engine is still warming up. Please wait a moment and refresh.</p>
                    </div>
                  ) : forecast.forecast?.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
                      <BarChart2 size={44} color="#334155" style={{ marginBottom: 14, margin: '0 auto 14px' }} />
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#94a3b8' }}>No High-Risk Predictions</div>
                      <p style={{ fontSize: 13, marginTop: 6 }}>All scanned location-time combinations return Low risk for tomorrow.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                      {(forecast.forecast || []).map((item: any, i: number) => {
                        const riskColor = RISK_COLORS[item.risk_level] || '#94a3b8';
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            style={{
                              background: 'rgba(15,23,42,0.8)',
                              border: `1px solid ${riskColor}25`,
                              borderLeft: `3px solid ${riskColor}`,
                              borderRadius: 12,
                              padding: '16px 18px',
                              display: 'flex', flexDirection: 'column', gap: 10,
                              backdropFilter: 'blur(12px)',
                              transition: 'all 0.2s ease',
                            }}
                            whileHover={{ y: -2, boxShadow: `0 8px 24px ${riskColor}20` }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>
                                  {item.location}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b' }}>
                                  <Clock size={10} />
                                  {item.time_label}
                                  <span>·</span>
                                  <Calendar size={10} />
                                  {item.date}
                                </div>
                              </div>
                              <span style={{
                                padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                                background: `${riskColor}15`, border: `1px solid ${riskColor}35`,
                                color: riskColor, textTransform: 'uppercase', letterSpacing: '0.05em',
                                whiteSpace: 'nowrap', marginLeft: 10,
                              }}>
                                {item.risk_level}
                              </span>
                            </div>

                            {/* Risk score bar */}
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 4 }}>
                                <span>Risk Score</span>
                                <span style={{ fontWeight: 700, color: riskColor }}>{item.risk_score}/100</span>
                              </div>
                              <div className="progress-bar">
                                <motion.div
                                  className="progress-fill"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${item.risk_score}%` }}
                                  transition={{ delay: i * 0.06 + 0.3, duration: 0.8 }}
                                  style={{ background: riskColor }}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#475569' }}>
                              <span>Model confidence: <strong style={{ color: '#94a3b8' }}>{item.confidence}%</strong></span>
                              <span style={{ color: riskColor, fontWeight: 600 }}>
                                {item.risk_level === 'High' ? '🔴 Deploy officers' : '🟠 Monitor closely'}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .predict-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </DashboardLayout>
  );
}
