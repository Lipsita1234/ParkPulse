'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, X, AlertTriangle, MapPin, Clock, Shield, TrendingUp,
  Radio, RefreshCw, ChevronRight, Zap,
} from 'lucide-react';
import api from '@/lib/api';

interface Alert {
  id: string;
  type: string;
  icon: string;
  color: string;
  title: string;
  location: string;
  risk_level: string;
  risk_score: number;
  time: string;
  minutes_ago: number;
  station: string;
}

interface AlertSummary {
  critical: number;
  warning: number;
  info: number;
  total: number;
  peak_hour: boolean;
}

const ICON_MAP: Record<string, any> = {
  'alert-triangle': AlertTriangle,
  'map-pin': MapPin,
  'clock': Clock,
  'trending-up': TrendingUp,
  'shield': Shield,
};

function AlertItem({ alert, index }: { alert: Alert; index: number }) {
  const IconComp = ICON_MAP[alert.icon] || AlertTriangle;
  const riskColors: Record<string, string> = {
    High: '#ef4444',
    Medium: '#f97316',
    Low: '#22c55e',
  };
  const riskColor = riskColors[alert.risk_level] || '#94a3b8';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      style={{
        padding: '12px 14px',
        borderRadius: 10,
        background: 'rgba(15,23,42,0.7)',
        border: `1px solid ${alert.color}20`,
        borderLeft: `3px solid ${alert.color}`,
        marginBottom: 8,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        transition: 'background 0.2s',
        cursor: 'default',
      }}
      whileHover={{ background: 'rgba(15,23,42,0.95)' }}
    >
      {/* Icon */}
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: `${alert.color}15`, border: `1px solid ${alert.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <IconComp size={14} color={alert.color} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11.5, fontWeight: 700, color: '#e2e8f0',
          marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {alert.title}
        </div>
        <div style={{
          fontSize: 11, color: '#94a3b8', marginBottom: 4,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          📍 {alert.location}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 9.5, fontWeight: 700, padding: '1px 7px', borderRadius: 20,
            background: `${riskColor}15`, border: `1px solid ${riskColor}30`,
            color: riskColor, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {alert.risk_level}
          </span>
          <span style={{ fontSize: 10, color: '#475569' }}>
            Score: <strong style={{ color: '#64748b' }}>{alert.risk_score}</strong>
          </span>
        </div>
      </div>

      {/* Time */}
      <div style={{
        fontSize: 10, color: '#475569', flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3,
      }}>
        <span style={{ color: '#64748b' }}>{alert.time}</span>
        {alert.minutes_ago === 0 && (
          <span style={{
            fontSize: 9, color: '#22c55e', fontWeight: 700,
            background: 'rgba(34,197,94,0.1)', padding: '1px 5px', borderRadius: 4,
          }}>LIVE</span>
        )}
        {alert.minutes_ago > 0 && alert.minutes_ago < 10 && (
          <span style={{
            fontSize: 9, color: '#f97316', fontWeight: 700,
            background: 'rgba(249,115,22,0.1)', padding: '1px 5px', borderRadius: 4,
          }}>{alert.minutes_ago}m ago</span>
        )}
      </div>
    </motion.div>
  );
}

export default function AlertFeed() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<AlertSummary>({ critical: 0, warning: 0, info: 0, total: 0, peak_hour: false });
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlerts = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    try {
      const [liveRes, summaryRes] = await Promise.all([
        api.get('/api/alerts/live'),
        api.get('/api/alerts/summary'),
      ]);
      setAlerts(liveRes.data?.alerts || []);
      setSummary(summaryRes.data || { critical: 0, warning: 0, info: 0, total: 0, peak_hour: false });
      setLastRefresh(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      // Backend not ready yet
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch on open
  useEffect(() => {
    if (open && alerts.length === 0) fetchAlerts();
  }, [open]);

  // Wait for real backend live data. Simulated alerts removed as per request.
  useEffect(() => {
    // Keep empty until real live data is integrated.
  }, []);

  // Pre-fetch summary for badge count (even when closed)
  useEffect(() => {
    const fetchSummary = () =>
      api.get('/api/alerts/summary')
        .then(r => setSummary(r.data))
        .catch(() => {});
    fetchSummary();
    const interval = setInterval(fetchSummary, 60_000);
    return () => clearInterval(interval);
  }, []);

  const totalBadge = summary.critical + summary.warning;

  return (
    <>
      {/* ── Bell Trigger Button ── */}
      <motion.button
        id="alert-feed-btn"
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        title="Live Alert Feed"
        style={{
          position: 'fixed', bottom: 104, right: 40, zIndex: 900,
          width: 44, height: 44, borderRadius: 12,
          background: open
            ? 'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(249,115,22,0.2))'
            : 'rgba(15,23,42,0.85)',
          border: open
            ? '1px solid rgba(239,68,68,0.45)'
            : '1px solid rgba(99,130,185,0.2)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(12px)',
          boxShadow: open
            ? '0 0 18px rgba(239,68,68,0.25)'
            : '0 4px 14px rgba(0,0,0,0.3)',
          transition: 'all 0.25s ease',
        }}
      >
        <Bell size={16} color={open ? '#f97316' : '#94a3b8'} />
        {/* Badge */}
        <AnimatePresence>
          {totalBadge > 0 && !open && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              style={{
                position: 'absolute', top: -4, right: -4,
                minWidth: 18, height: 18, borderRadius: 9,
                background: '#ef4444', border: '2px solid #0a0f1e',
                fontSize: 9, fontWeight: 800, color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 4px',
              }}
            >
              {totalBadge > 99 ? '99+' : totalBadge}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Slide-in Panel ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop (mobile) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 800,
                background: 'rgba(0,0,0,0.25)',
              }}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: 380 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 380 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 850,
                width: 360,
                background: 'rgba(6,10,20,0.97)',
                borderLeft: '1px solid rgba(239,68,68,0.2)',
                backdropFilter: 'blur(24px)',
                display: 'flex', flexDirection: 'column',
                boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div style={{
                padding: '20px 18px 16px',
                borderBottom: '1px solid rgba(99,130,185,0.15)',
                background: 'rgba(15,23,42,0.8)',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 9,
                      background: 'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(249,115,22,0.2))',
                      border: '1px solid rgba(239,68,68,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Radio size={16} color="#ef4444" style={{ animation: 'pulse 2s infinite' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0' }}>Live Alert Feed</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: '#64748b' }}>
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: '#22c55e', display: 'inline-block',
                          boxShadow: '0 0 5px #22c55e',
                        }} />
                        Bengaluru Enforcement Network
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => fetchAlerts(true)}
                      title="Refresh"
                      style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: 'rgba(59,130,246,0.1)',
                        border: '1px solid rgba(59,130,246,0.2)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <RefreshCw
                        size={13} color="#60a5fa"
                        style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}
                      />
                    </button>
                    <button
                      onClick={() => setOpen(false)}
                      style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.15)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <X size={14} color="#ef4444" />
                    </button>
                  </div>
                </div>

                {/* Summary Chips */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { label: 'Critical', count: summary.critical, color: '#ef4444' },
                    { label: 'Warning', count: summary.warning, color: '#f97316' },
                    { label: 'Info', count: summary.info, color: '#3b82f6' },
                  ].map(s => (
                    <div key={s.label} style={{
                      flex: 1, padding: '6px 8px', borderRadius: 8, textAlign: 'center',
                      background: `${s.color}10`, border: `1px solid ${s.color}25`,
                    }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: s.color, fontFamily: 'Outfit, sans-serif' }}>
                        {s.count}
                      </div>
                      <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Peak Hour Banner */}
                {summary.peak_hour && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      marginTop: 10, padding: '7px 12px', borderRadius: 8,
                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                      display: 'flex', alignItems: 'center', gap: 7,
                    }}
                  >
                    <Zap size={12} color="#ef4444" />
                    <span style={{ fontSize: 11, color: '#fca5a5', fontWeight: 700 }}>
                      ⚡ PEAK ENFORCEMENT WINDOW ACTIVE — City-wide elevated risk
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Alert List */}
              <div style={{
                flex: 1, overflowY: 'auto', padding: '14px 14px 14px',
                scrollbarWidth: 'thin', scrollbarColor: '#1e293b transparent',
              }}>
                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="skeleton" style={{ height: 80, borderRadius: 10 }} />
                    ))}
                  </div>
                ) : alerts.length === 0 ? (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', height: '60%', gap: 12, textAlign: 'center',
                  }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%',
                      background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Shield size={24} color="#22c55e" />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8' }}>Awaiting Live Data</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>
                      Waiting for live intelligence feed...
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: '#475569',
                      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span>Recent Alerts ({alerts.length})</span>
                      {lastRefresh && (
                        <span style={{ color: '#334155', fontWeight: 500 }}>
                          Updated {lastRefresh}
                        </span>
                      )}
                    </div>
                    {alerts.map((alert, i) => (
                      <AlertItem key={alert.id} alert={alert} index={i} />
                    ))}
                  </>
                )}
              </div>

              {/* Footer */}
              <div style={{
                padding: '12px 16px',
                borderTop: '1px solid rgba(99,130,185,0.12)',
                background: 'rgba(15,23,42,0.6)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 10.5, color: '#475569' }}>
                  Auto-refreshes every 30s
                </span>
                <a
                  href="/risk"
                  style={{
                    fontSize: 11, color: '#60a5fa', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 4,
                    textDecoration: 'none',
                  }}
                >
                  View Risk Intelligence <ChevronRight size={12} />
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        #alert-feed-btn:hover { transform: scale(1.06); }
        @media (max-width: 480px) {
          #alert-feed-btn { bottom: 84px !important; right: 24px !important; }
        }
      `}</style>
    </>
  );
}
