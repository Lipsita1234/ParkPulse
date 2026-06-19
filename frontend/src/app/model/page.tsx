'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Brain, Cpu, BarChart2, ShieldAlert, Award, Grid, RefreshCw } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getModelInfo } from '@/lib/api';

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f97316', '#22c55e'];

export default function ModelPerformancePage() {
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>('');

  useEffect(() => {
    fetchModelInfo();
  }, []);

  const fetchModelInfo = () => {
    setLoading(true);
    getModelInfo()
      .then(res => {
        setModelInfo(res);
        if (res.status === 'ready' && res.results) {
          // Default to the best model
          const best = res.best_model || Object.keys(res.results)[0];
          setSelectedModel(best);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="page-header">
          <div>
            <div className="section-title">Model Performance & Explainability</div>
            <div className="section-subtitle">Evaluating ML classifiers and feature impact using SHAP values</div>
          </div>
        </div>
        <div className="page-content" style={{ display: 'grid', gap: 20 }}>
          <div className="skeleton" style={{ height: 120 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="skeleton" style={{ height: 350 }} />
            <div className="skeleton" style={{ height: 350 }} />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!modelInfo || modelInfo.status !== 'ready') {
    return (
      <DashboardLayout>
        <div className="page-header">
          <div>
            <div className="section-title">Model Performance & Explainability</div>
            <div className="section-subtitle">Evaluating ML classifiers and feature impact using SHAP values</div>
          </div>
        </div>
        <div className="page-content">
          <div className="chart-container" style={{ textAlign: 'center', padding: 60 }}>
            <Cpu size={48} color="#64748b" style={{ margin: '0 auto 16px' }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>No Model Information Found</div>
            <p style={{ fontSize: 13, color: '#94a3b8', maxWidth: 400, margin: '8px auto 20px', lineHeight: 1.5 }}>
              The machine learning models are not trained yet or the dataset is empty. Go to the Dataset Management page to run the training pipeline first.
            </p>
            <button className="btn-primary" onClick={fetchModelInfo}>
              <RefreshCw size={14} style={{ marginRight: 4 }} /> Retry loading
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Parse evaluation results
  const results = modelInfo.results || {};
  const currentMetrics = results[selectedModel] || {};
  const classes = currentMetrics.classes || ['Low', 'Medium', 'High'];

  // Champion card always shows the BEST model's metrics — never changes when user clicks other rows
  const bestMetrics = results[modelInfo.best_model] || {};

  // Global importance formatted for Recharts
  const globalImportanceData = Object.entries(modelInfo.global_importance || {})
    .map(([feature, val]: any) => ({
      feature: feature.replace('_enc', '').replace('_', ' ').replace('_', ' ').toUpperCase(),
      importance: val
    }))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 10);

  // Helper for naming models nicely
  const getReadableModelName = (name: string) => {
    if (name.includes('XGB')) return 'XGBoost Classifier';
    if (name.includes('LGBM')) return 'LightGBM Classifier';
    if (name.includes('Cat')) return 'CatBoost Classifier';
    if (name.includes('RandomForest')) return 'Random Forest Classifier';
    return name;
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <div className="section-title">AI Model Performance & Explainability</div>
          <div className="section-subtitle">Detailed evaluation of trained models and SHAP-based global explainability</div>
        </div>
      </div>

      <div className="page-content">
        {/* Model Champion Card */}
        <div className="glass-card" style={{
          background: 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(139,92,246,0.1))',
          padding: '20px 24px', borderRadius: 16, border: '1px solid rgba(139,92,246,0.25)',
          display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 24, marginBottom: 24
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={18} color="#f59e0b" />
              <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Selected Champion Model</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', marginTop: 4, fontFamily: 'Outfit, sans-serif' }}>
              {getReadableModelName(modelInfo.best_model)}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              Automatically designated for production inference based on weighted F1 performance index.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 32 }}>
            {[
              ['Weighted F1', bestMetrics.f1 || '0.0000', '#8b5cf6'],
              ['Accuracy', bestMetrics.accuracy || '0.0000', '#3b82f6'],
              ['Precision', bestMetrics.precision || '0.0000', '#06b6d4'],
              ['Recall', bestMetrics.recall || '0.0000', '#22c55e']
            ].map(([label, val, color]: any) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
                <div style={{ fontSize: 20, fontWeight: 800, color, marginTop: 4 }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 2-Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 20 }}>
          
          {/* Left Column: Model List and Confusion Matrix */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Model Comparison Table */}
            <div className="chart-container">
              <div className="section-title" style={{ fontSize: 14, marginBottom: 16 }}>Classifiers Evaluation Index</div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Classifier Model</th>
                      <th style={{ textAlign: 'right' }}>Accuracy</th>
                      <th style={{ textAlign: 'right' }}>Precision</th>
                      <th style={{ textAlign: 'right' }}>Recall</th>
                      <th style={{ textAlign: 'right' }}>Weighted F1</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(results).map(([name, metrics]: any) => {
                      const isBest = name === modelInfo.best_model;
                      const isSelected = name === selectedModel;
                      return (
                        <tr
                          key={name}
                          onClick={() => setSelectedModel(name)}
                          style={{ cursor: 'pointer', background: isSelected ? 'rgba(59,130,246,0.06)' : 'transparent' }}
                        >
                          <td style={{ fontWeight: 600, color: isSelected ? '#60a5fa' : '#e2e8f0' }}>
                            {getReadableModelName(name)}
                          </td>
                          <td style={{ textAlign: 'right' }}>{metrics.accuracy}</td>
                          <td style={{ textAlign: 'right' }}>{metrics.precision}</td>
                          <td style={{ textAlign: 'right' }}>{metrics.recall}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: isBest ? '#8b5cf6' : '#cbd5e1' }}>
                            {metrics.f1}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {isBest ? (
                              <span style={{
                                padding: '1px 6px', borderRadius: 4, background: 'rgba(139,92,246,0.15)',
                                color: '#a78bfa', fontSize: 10, fontWeight: 700, border: '1px solid rgba(139,92,246,0.3)'
                              }}>
                                Production
                              </span>
                            ) : (
                              <span style={{ fontSize: 10, color: '#64748b' }}>Standby</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Confusion Matrix */}
            <div className="chart-container">
              <div className="section-title" style={{ fontSize: 14 }}>Confusion Matrix Grid</div>
              <div className="section-subtitle" style={{ marginBottom: 20 }}>
                Analysing classification predictions for {getReadableModelName(selectedModel)}
              </div>

              {currentMetrics.confusion_matrix ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 0' }}>
                  {/* Grid layout */}
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    {/* Rows */}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ width: 80, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', textAlign: 'right', paddingRight: 12 }}>Actual</div>
                      {classes.map((cls: string) => (
                        <div key={cls} style={{ width: 80, fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>
                          Pred {cls}
                        </div>
                      ))}
                    </div>

                    {currentMetrics.confusion_matrix.map((row: number[], rowIdx: number) => {
                      const rowSum = row.reduce((a, b) => a + b, 0) || 1;
                      return (
                        <div key={rowIdx} style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                          {/* Y-axis labels */}
                          <div style={{ width: 80, fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right', paddingRight: 12 }}>
                            {classes[rowIdx]}
                          </div>
                          {/* Matrix Cells */}
                          {row.map((val: number, colIdx: number) => {
                            const ratio = val / rowSum;
                            const isDiagonal = rowIdx === colIdx;
                            // Color intensity based on prediction density
                            const cellBg = isDiagonal
                              ? `rgba(34, 197, 94, ${Math.max(0.1, ratio)})`
                              : `rgba(239, 68, 68, ${Math.max(0.02, ratio * 0.5)})`;
                            const cellBorder = isDiagonal
                              ? `rgba(34, 197, 94, ${Math.max(0.3, ratio)})`
                              : `rgba(239, 68, 68, ${Math.max(0.1, ratio * 0.5)})`;

                            return (
                              <div
                                key={colIdx}
                                style={{
                                  width: 80, height: 60, background: cellBg, border: `1px solid ${cellBorder}`,
                                  borderRadius: 8, margin: '0 3px', display: 'flex', flexDirection: 'column',
                                  alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                                }}
                              >
                                <span style={{ fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>{val}</span>
                                <span style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{Math.round(ratio * 100)}%</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                  No confusion matrix data available.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: SHAP explainability chart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Global Feature Importance (SHAP) */}
            <div className="chart-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="section-title" style={{ fontSize: 14 }}>Global SHAP Feature Importance</div>
              <div className="section-subtitle" style={{ marginBottom: 20 }}>
                Aggregated impact of parameters driving risk score generation across test dataset
              </div>

              {globalImportanceData.length > 0 ? (
                <div style={{ flex: 1, minHeight: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={globalImportanceData} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,130,185,0.08)" horizontal={false} />
                      <XAxis type="number" stroke="#475569" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="feature" width={110} stroke="#475569" tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ background: '#0d1529', border: '1px solid #1e3a5f', borderRadius: 8, color: '#e2e8f0' }} />
                      <Bar dataKey="importance" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                        {globalImportanceData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                  No feature importance dataset calculated.
                </div>
              )}
            </div>

            {/* Model Architecture overview */}
            <div className="chart-container" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Brain size={16} color="#60a5fa" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Platform Engine Parameters
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: '#94a3b8', lineHeight: 1.5 }}>
                The training pipeline uses <b style={{ color: '#e2e8f0' }}>SMOTE (Synthetic Minority Over-sampling Technique)</b> to handle class imbalance across Low, Medium, and High categories, preventing model bias.
                <br /><br />
                Model comparisons run under <b style={{ color: '#e2e8f0' }}>Stratified 5-Fold Cross Validation</b> to guarantee generalisability, training multiple classifiers simultaneously and selection criteria mapped directly to weighted F1 metrics.
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </DashboardLayout>
  );
}
