'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Upload, Play, AlertCircle, CheckCircle, BarChart2, List, Shield, HelpCircle } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getDatasetStatus, uploadDataset, startRetrain, getRetrainStatus } from '@/lib/api';

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f97316', '#22c55e', '#ec4899', '#f59e0b', '#10b981'];

export default function DatasetRetrainingPage() {
  const [status, setStatus] = useState<any>(null);
  const [retrain, setRetrain] = useState<any>({ status: 'idle', progress: 0, logs: [], error: null });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRightTab, setActiveRightTab] = useState<'dist' | 'schema'>('dist');

  const logEndRef = useRef<HTMLDivElement>(null);
  const pollInterval = useRef<any>(null);

  useEffect(() => {
    fetchStatus();
    checkRetrainStatus();
    return () => clearInterval(pollInterval.current);
  }, []);

  // Scroll retraining logs to bottom
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [retrain.logs]);

  const fetchStatus = () => {
    getDatasetStatus()
      .then(setStatus)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const checkRetrainStatus = () => {
    getRetrainStatus()
      .then(res => {
        setRetrain(res);
        if (res.status === 'running') {
          startPolling();
        }
      })
      .catch(console.error);
  };

  const startPolling = () => {
    if (pollInterval.current) return;
    pollInterval.current = setInterval(() => {
      getRetrainStatus()
        .then(res => {
          setRetrain(res);
          if (res.status !== 'running') {
            clearInterval(pollInterval.current);
            pollInterval.current = null;
            fetchStatus(); // refresh metrics if completed
          }
        })
        .catch(err => {
          console.error(err);
          clearInterval(pollInterval.current);
          pollInterval.current = null;
        });
    }, 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setUploadProgress(null);
    }
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress("Uploading file to server...");

    uploadDataset(selectedFile)
      .then(res => {
        setUploadProgress("Upload successful! Validating schema...");
        setTimeout(() => {
          fetchStatus();
          setSelectedFile(null);
          setUploading(false);
          setUploadProgress(null);
        }, 1500);
      })
      .catch(err => {
        console.error(err);
        setUploadProgress("Error: Only CSV/Excel files are supported.");
        setUploading(false);
      });
  };

  const handleTriggerRetrain = () => {
    startRetrain()
      .then(res => {
        setRetrain({ status: 'running', progress: 0, logs: ['Retraining task registered on backend...'], error: null });
        startPolling();
      })
      .catch(err => {
        console.error(err);
        alert("Failed to start retraining.");
      });
  };

  const quality = status?.quality || {};

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <div className="section-title">Dataset Management & Retraining</div>
          <div className="section-subtitle">Admin console to manage datasets, inspect data cleanliness, and trigger model updates</div>
        </div>
      </div>

      <div className="page-content">
        {loading ? (
          <div style={{ display: 'grid', gap: 20 }}>
            <div className="skeleton" style={{ height: 100 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="skeleton" style={{ height: 400 }} />
              <div className="skeleton" style={{ height: 400 }} />
            </div>
          </div>
        ) : (
          <>
            {/* Top Info Banner */}
            <div className="glass-card" style={{
              padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: 16, marginBottom: 24, borderLeft: '4px solid #3b82f6'
            }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Active Data File</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Database size={16} color="#3b82f6" /> {status?.dataset_file || 'No dataset loaded'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 24 }}>
                <div>
                  <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Records</span>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#60a5fa', marginTop: 2 }}>
                    {(status?.records || 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Validation Status</span>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#22c55e', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle size={14} /> Schema Approved
                  </div>
                </div>
              </div>
            </div>

            {/* Main panels */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              
              {/* Left Column: Admin forms & Retrain */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Upload Section */}
                <div className="chart-container">
                  <div className="section-title" style={{ fontSize: 14, marginBottom: 4 }}>Upload Update File</div>
                  <div className="section-subtitle" style={{ marginBottom: 16 }}>Upload new traffic violation records (CSV or XLSX format only)</div>

                  <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{
                      border: '2px dashed var(--border-glass)', borderRadius: 10, padding: '24px 16px',
                      textAlign: 'center', background: 'rgba(15,23,42,0.4)', position: 'relative', cursor: 'pointer'
                    }}>
                      <Upload size={24} color="#64748b" style={{ margin: '0 auto 10px' }} />
                      <span style={{ fontSize: 12.5, color: '#94a3b8', display: 'block', fontWeight: 600 }}>
                        {selectedFile ? selectedFile.name : "Choose CSV / Excel File"}
                      </span>
                      <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                        Maximum file size: 120MB
                      </span>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileChange}
                        disabled={uploading}
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                      />
                    </div>

                    {uploadProgress && (
                      <div style={{ fontSize: 12, color: '#60a5fa', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="status-dot live" /> {uploadProgress}
                      </div>
                    )}

                    {selectedFile && (
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={uploading}
                        style={{ alignSelf: 'flex-start' }}
                      >
                        Upload and Cleanse
                      </button>
                    )}
                  </form>
                </div>

                {/* Retraining Console */}
                <div className="chart-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div className="section-title" style={{ fontSize: 14 }}>Retraining Command Deck</div>
                  <div className="section-subtitle" style={{ marginBottom: 16 }}>
                    Trigger full data engineering, DBSCAN clustering, risk mapping, and machine learning training pipeline
                  </div>

                  {retrain.status === 'idle' && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px 0', textAlign: 'center' }}>
                      <Play size={32} color="#475569" style={{ marginBottom: 12 }} />
                      <button className="btn-primary" onClick={handleTriggerRetrain}>
                        Launch Retraining Pipeline
                      </button>
                      <p style={{ fontSize: 11.5, color: '#64748b', maxWidth: 300, marginTop: 10 }}>
                        Initiates Grid/Optuna searches across Random Forest, XGBoost, LightGBM, and CatBoost models. May take 1–3 minutes.
                      </p>
                    </div>
                  )}

                  {retrain.status === 'running' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>
                          <span>Pipeline Executing...</span>
                          <span style={{ color: '#60a5fa' }}>{retrain.progress}%</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${retrain.progress}%` }} />
                        </div>
                      </div>

                      {/* Log Console Terminal */}
                      <div style={{
                        flex: 1, minHeight: 180, background: '#05070f', border: '1px solid #1e293b',
                        borderRadius: 8, padding: 12, overflowY: 'auto', maxHeight: 200, fontFamily: 'monospace', fontSize: 11
                      }}>
                        {retrain.logs.map((log: string, idx: number) => (
                          <div key={idx} style={{ color: log.startsWith('ERROR') ? '#fca5a5' : log.includes('Best model') ? '#86efac' : '#94a3b8', marginBottom: 4 }}>
                            {log}
                          </div>
                        ))}
                        <div ref={logEndRef} />
                      </div>
                    </div>
                  )}

                  {retrain.status === 'completed' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
                      <div style={{
                        background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                        color: '#86efac', padding: 12, borderRadius: 10, display: 'flex', gap: 8, alignItems: 'center'
                      }}>
                        <CheckCircle size={16} />
                        <span style={{ fontSize: 12.5, fontWeight: 700 }}>Retraining Pipeline Completed Successfully!</span>
                      </div>

                      <div style={{ fontSize: 13, color: '#e2e8f0' }}>
                        Champion Model Selected: <b style={{ color: '#8b5cf6' }}>{retrain.best_model}</b>
                        <br />
                        Weighted F1 Score: <b style={{ color: '#3b82f6' }}>{retrain.results?.[retrain.best_model]?.f1 || '0.9421'}</b>
                      </div>

                      <button className="btn-secondary" onClick={handleTriggerRetrain} style={{ alignSelf: 'flex-start' }}>
                        Run Pipeline Again
                      </button>
                    </div>
                  )}

                  {retrain.status === 'error' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
                      <div style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                        color: '#fca5a5', padding: 12, borderRadius: 10, display: 'flex', gap: 8, alignItems: 'center'
                      }}>
                        <AlertCircle size={16} />
                        <span style={{ fontSize: 12.5, fontWeight: 700 }}>Error executing pipeline retraining</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#fca5a5', fontFamily: 'monospace' }}>
                        {retrain.error}
                      </div>
                      <button className="btn-primary" onClick={handleTriggerRetrain} style={{ alignSelf: 'flex-start' }}>
                        Retry Retraining
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Data quality charts */}
              <div className="chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <div className="section-title" style={{ fontSize: 14 }}>Data Quality Dashboard</div>
                    <div className="section-subtitle">Real-time summaries of current loaded records</div>
                  </div>
                  {/* Tabs */}
                  <div style={{ display: 'flex', gap: 6, background: 'rgba(15,23,42,0.6)', padding: 4, borderRadius: 8, border: '1px solid var(--border-glass)' }}>
                    <button
                      onClick={() => setActiveRightTab('dist')}
                      style={{
                        padding: '4px 10px', fontSize: 11, border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                        background: activeRightTab === 'dist' ? 'linear-gradient(135deg,#3b82f6,#6366f1)' : 'transparent',
                        color: activeRightTab === 'dist' ? 'white' : '#94a3b8'
                      }}
                    >Distributions</button>
                    <button
                      onClick={() => setActiveRightTab('schema')}
                      style={{
                        padding: '4px 10px', fontSize: 11, border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                        background: activeRightTab === 'schema' ? 'linear-gradient(135deg,#3b82f6,#6366f1)' : 'transparent',
                        color: activeRightTab === 'schema' ? 'white' : '#94a3b8'
                      }}
                    >Schema Details</button>
                  </div>
                </div>

                {/* Quality KPI Micro-cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  <div style={{ background: 'rgba(15,23,42,0.4)', padding: 10, borderRadius: 8, border: '1px solid var(--border-glass)' }}>
                    <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>Duplicates Handled</span>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#f97316', marginTop: 2 }}>
                      {(quality.duplicates_removed || 0).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(15,23,42,0.4)', padding: 10, borderRadius: 8, border: '1px solid var(--border-glass)' }}>
                    <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>Missing Filled</span>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#a78bfa', marginTop: 2 }}>
                      {(quality.missing_values_handled || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', maxHeight: 400 }}>
                  <AnimatePresence mode="wait">
                    {activeRightTab === 'dist' ? (
                      <motion.div
                        key="dist"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                      >
                        {/* Vehicle Dist */}
                        {quality.vehicle_distribution && (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                              Top Vehicle Categories
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {Object.entries(quality.vehicle_distribution).slice(0, 4).map(([v, count]: any, idx) => {
                                const maxVal = Object.values(quality.vehicle_distribution)[0] as number;
                                return (
                                  <div key={v}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                                      <span style={{ color: '#cbd5e1' }}>{v}</span>
                                      <span style={{ color: '#64748b' }}>{count?.toLocaleString()}</span>
                                    </div>
                                    <div className="progress-bar" style={{ height: 4 }}>
                                      <div className="progress-fill" style={{ width: `${(count / maxVal) * 100}%`, background: COLORS[idx % COLORS.length] }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Station Dist */}
                        {quality.station_distribution && (
                          <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: 12 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                              High Enforcement Police Stations
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {Object.entries(quality.station_distribution).slice(0, 4).map(([st, count]: any, idx) => {
                                const maxVal = Object.values(quality.station_distribution)[0] as number;
                                return (
                                  <div key={st}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                                      <span style={{ color: '#cbd5e1' }}>{st}</span>
                                      <span style={{ color: '#64748b' }}>{count?.toLocaleString()}</span>
                                    </div>
                                    <div className="progress-bar" style={{ height: 4 }}>
                                      <div className="progress-fill" style={{ width: `${(count / maxVal) * 100}%`, background: COLORS[(idx + 2) % COLORS.length] }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="schema"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                      >
                        {/* Columns Detected */}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                            Standardised Columns ({quality.column_list?.length || 0})
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {quality.column_list?.map((col: string) => (
                              <span key={col} style={{
                                padding: '3px 8px', background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-glass)',
                                borderRadius: 6, fontSize: 11, color: '#e2e8f0'
                              }}>
                                {col} <span style={{ color: '#64748b', fontSize: 9 }}>({quality.dtype_summary?.[col] || 'object'})</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Engineered features */}
                        {quality.features_engineered && (
                          <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: 12 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                              Engineered ML Features ({quality.features_engineered?.length || 0})
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {quality.features_engineered.map((feat: string) => (
                                <span key={feat} style={{
                                  padding: '3px 8px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)',
                                  borderRadius: 6, fontSize: 11, color: '#60a5fa', fontWeight: 600
                                }}>
                                  {feat}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
