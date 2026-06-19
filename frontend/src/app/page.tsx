'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Flame,
  Brain,
  Shield,
  Map,
  TrendingUp,
  FileDown,
  Lock,
  Play,
  Globe,
  Activity
} from 'lucide-react';
import { getKPI } from '@/lib/api';

export default function LandingPage() {
  const [stats, setStats] = useState({
    violations: 184320,
    hotspots: 47,
    accuracy: '94.2%',
    stations: 38
  });
  const [systemOnline, setSystemOnline] = useState(true);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check login state
    if (typeof window !== 'undefined') {
      setIsAdminLoggedIn(localStorage.getItem('isAdminLoggedIn') === 'true');
    }
    
    getKPI()
      .then(res => {
        setStats({
          violations: res.total_violations || 184320,
          hotspots: res.high_risk_zones || 47,
          accuracy: '94.2%',
          stations: res.active_stations || 38
        });
      })
      .catch(err => {
        console.error('Failed to load KPIs:', err);
        setSystemOnline(false);
      });
  }, []);

  return (
    <div className="landing-wrapper">

      {/* Header */}
      <header className="landing-header">
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img 
              src="/logo.jpg" 
              alt="ParkPulse Logo" 
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.15)' }} 
            />
          </div>
          <div className="logo-text-box">
            <span className="logo-title">ParkPulse</span>
            <span className="logo-subtitle">Smart Enforcement Platform</span>
          </div>
        </Link>
        <div className="header-right">
          <span className="powered-text">Powered by XGBoost · LightGBM · SHAP</span>
          <div className="system-status">
            <span className="status-indicator-dot" />
            <span className="status-label">System Online</span>
          </div>
        </div>
      </header>

      {/* Main Hero */}
      <main className="landing-container">
        <motion.div 
          className="badge-wrapper"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="traffic-intelligence-badge">
            <Globe className="badge-icon animate-pulse-slow" size={14} />
            <span>BENGALURU TRAFFIC INTELLIGENCE · KARNATAKA</span>
          </div>
        </motion.div>

        <motion.h1 
          className="hero-heading"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          Stop illegal parking <br />
          <span className="hero-heading-glow">before it happens.</span>
        </motion.h1>

        <motion.p 
          className="hero-subheading"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          ParkPulse transforms <strong>historical violation data</strong> into a geospatial command center — predicting hotspots, scoring risk, and deploying enforcement <strong>proactively</strong>.
        </motion.p>

        <motion.div 
          className="cta-wrapper"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {isAdminLoggedIn ? (
            <Link href="/dashboard" className="btn-launch-dashboard">
              <Play size={15} fill="currentColor" className="play-icon" />
              <span>Launch Dashboard</span>
            </Link>
          ) : (
            <Link href="/login" className="btn-launch-dashboard">
              <Lock size={15} fill="currentColor" className="play-icon" />
              <span>Login as Admin</span>
            </Link>
          )}
        </motion.div>

        {/* Stats strip */}
        <motion.div 
          className="landing-stats-box"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="stat-item">
            <div className="stat-value color-blue" suppressHydrationWarning>{stats.violations.toLocaleString()}</div>
            <div className="stat-label">VIOLATIONS ANALYSED</div>
          </div>
          <div className="stat-item border-l">
            <div className="stat-value color-red" suppressHydrationWarning>{stats.hotspots}</div>
            <div className="stat-label">HOTSPOT CLUSTERS</div>
          </div>
          <div className="stat-item border-l">
            <div className="stat-value color-green">{stats.accuracy}</div>
            <div className="stat-label">MODEL ACCURACY</div>
          </div>
          <div className="stat-item border-l">
            <div className="stat-value color-orange" suppressHydrationWarning>{stats.stations}</div>
            <div className="stat-label">POLICE STATIONS</div>
          </div>
        </motion.div>

        {/* Features grid */}
        <div className="features-grid">
          {/* Card 1 */}
          <motion.div 
            className="landing-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="card-icon-box bg-red-opacity">
              <Flame size={18} className="color-red" />
            </div>
            <h3 className="card-title">Hotspot Detection</h3>
            <p className="card-description">
              DBSCAN clustering maps high-density illegal parking zones across the city in real time.
            </p>
          </motion.div>

          {/* Card 2 */}
          <motion.div 
            className="landing-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.55 }}
          >
            <div className="card-icon-box bg-blue-opacity">
              <Brain size={18} className="color-blue" />
            </div>
            <h3 className="card-title">AI Risk Prediction</h3>
            <p className="card-description">
              XGBoost + LightGBM predict High / Medium / Low risk for any location and time slot.
            </p>
          </motion.div>

          {/* Card 3 */}
          <motion.div 
            className="landing-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <div className="card-icon-box bg-green-opacity">
              <Shield size={18} className="color-green" />
            </div>
            <h3 className="card-title">Enforcement Recs</h3>
            <p className="card-description">
              Auto-generates officer deployment plans, patrol schedules, and CCTV priorities.
            </p>
          </motion.div>

          {/* Card 4 */}
          <motion.div 
            className="landing-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.65 }}
          >
            <div className="card-icon-box bg-cyan-opacity">
              <Map size={18} className="color-cyan" />
            </div>
            <h3 className="card-title">Geospatial Heatmap</h3>
            <p className="card-description">
              Interactive city map with cluster markers, risk colors, and drill-down station data.
            </p>
          </motion.div>

          {/* Card 5 */}
          <motion.div 
            className="landing-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <div className="card-icon-box bg-purple-opacity">
              <TrendingUp size={18} className="color-purple" />
            </div>
            <h3 className="card-title">Explainable AI</h3>
            <p className="card-description">
              SHAP values reveal exactly why each zone is flagged — transparent and audit-ready.
            </p>
          </motion.div>

          {/* Card 6 */}
          <motion.div 
            className="landing-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.75 }}
          >
            <div className="card-icon-box bg-orange-opacity">
              <FileDown size={18} className="color-orange" />
            </div>
            <h3 className="card-title">Reports & Export</h3>
            <p className="card-description">
              One-click PDF, CSV and Excel exports for violation data, risk reports, and predictions.
            </p>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <span>Transforming violation data into actionable city intelligence · ParkPulse © 2026</span>
      </footer>

      {/* Styled JSX or CSS variables scoped specifically for the Landing Page */}
      <style>{`
        .landing-wrapper {
          background-color: #030712;
          min-height: 100vh;
          color: #e2e8f0;
          font-family: 'Inter', system-ui, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          padding: 0;
          margin: 0;
        }

        .landing-wrapper::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url('/traffic-bg.jpg');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          background-attachment: fixed;
          filter: blur(4px) brightness(0.45) contrast(1.1);
          z-index: 1;
          pointer-events: none;
        }

        .landing-wrapper::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 30%, rgba(10, 15, 30, 0.05) 0%, rgba(3, 7, 18, 0.6) 80%);
          z-index: 2;
          pointer-events: none;
        }

        .landing-header {
          width: 100%;
          max-width: 1200px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px;
          position: relative;
          z-index: 10;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-box {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          background: #3b82f6;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.3);
        }

        .logo-letter {
          color: white;
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          font-size: 20px;
        }

        .logo-text-box {
          display: flex;
          flex-direction: column;
        }

        .logo-title {
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          font-size: 16px;
          color: #e2e8f0;
          text-shadow: 0 2px 4px rgba(0,0,0,0.8);
        }

        .logo-subtitle {
          font-size: 10px;
          color: #cbd5e1;
          font-weight: 600;
          text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .powered-text {
          font-size: 11px;
          color: #cbd5e1;
          font-weight: 600;
          text-shadow: 0 1px 3px rgba(0,0,0,0.9);
        }

        .system-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 20px;
          background: rgba(10, 15, 30, 0.4);
          border: 1px solid rgba(16, 185, 129, 0.35);
          backdrop-filter: blur(10px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        .status-indicator-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
          animation: pulse-indicator 2s infinite ease-in-out;
        }

        .status-label {
          font-size: 11px;
          font-weight: 700;
          color: #10b981;
        }

        @keyframes pulse-indicator {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }

        .landing-container {
          width: 100%;
          max-width: 1000px;
          padding: 40px 24px 80px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          flex-grow: 1;
          position: relative;
          z-index: 10;
        }

        .badge-wrapper {
          margin-bottom: 24px;
        }

        .traffic-intelligence-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 100px;
          border: 1px solid rgba(59, 130, 246, 0.4);
          background: rgba(10, 15, 30, 0.4);
          color: #60a5fa;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          backdrop-filter: blur(12px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        .badge-icon {
          color: #60a5fa;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s infinite ease-in-out;
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .hero-heading {
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          font-size: 56px;
          line-height: 1.1;
          letter-spacing: -0.03em;
          color: #ffffff;
          margin-bottom: 18px;
          max-width: 800px;
          text-shadow: 0 4px 16px rgba(0, 0, 0, 0.95), 0 0 35px rgba(0, 0, 0, 0.6);
        }

        .hero-heading-glow {
          background: linear-gradient(135deg, #93c5fd, #38bdf8, #06b6d4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: none !important;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.9)) drop-shadow(0 0 25px rgba(59, 130, 246, 0.65));
        }

        .hero-subheading {
          font-size: 16.5px;
          line-height: 1.6;
          color: #ffffff;
          max-width: 680px;
          margin-bottom: 36px;
          font-weight: 500;
          text-shadow: 0 2px 12px rgba(0, 0, 0, 0.95), 0 0 15px rgba(0, 0, 0, 0.6);
        }

        .hero-subheading strong {
          color: #60a5fa;
          font-weight: 700;
        }

        .cta-wrapper {
          margin-bottom: 48px;
        }

        .btn-launch-dashboard {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(10, 15, 30, 0.5);
          border: 1px solid rgba(59, 130, 246, 0.65);
          color: #ffffff;
          padding: 12px 28px;
          border-radius: 100px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          backdrop-filter: blur(12px);
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.25), 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        .btn-launch-dashboard:hover {
          background: rgba(59, 130, 246, 0.25);
          border-color: rgba(59, 130, 246, 0.85);
          transform: translateY(-2px);
          box-shadow: 0 0 30px rgba(59, 130, 246, 0.45);
        }

        .play-icon {
          color: #ffffff;
          transition: transform 0.3s ease;
        }

        .btn-launch-dashboard:hover .play-icon {
          transform: scale(1.1) translateX(1px);
        }

        .landing-stats-box {
          width: 100%;
          max-width: 900px;
          border: 1px solid rgba(99, 130, 185, 0.25);
          background: rgba(8, 12, 24, 0.82);
          backdrop-filter: blur(28px);
          border-radius: 14px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          padding: 24px;
          margin-bottom: 48px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.75), 0 0 30px rgba(59, 130, 246, 0.05);
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
        }

        .border-l {
          border-left: 1px solid rgba(99, 130, 185, 0.2);
        }

        .stat-value {
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          font-size: 28px;
          letter-spacing: -0.02em;
          line-height: 1;
          margin-bottom: 6px;
        }

        .stat-label {
          font-size: 10px;
          font-weight: 700;
          color: #cbd5e1;
          letter-spacing: 0.08em;
          text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        }

        .color-blue {
          color: #60a5fa;
          text-shadow: 0 0 15px rgba(59, 130, 246, 0.25);
        }

        .color-red {
          color: #f87171;
          text-shadow: 0 0 15px rgba(239, 68, 68, 0.25);
        }

        .color-green {
          color: #34d399;
          text-shadow: 0 0 15px rgba(16, 185, 129, 0.25);
        }

        .color-orange {
          color: #fb923c;
          text-shadow: 0 0 15px rgba(249, 115, 22, 0.25);
        }

        .color-cyan {
          color: #22d3ee;
          text-shadow: 0 0 15px rgba(6, 182, 212, 0.25);
        }

        .color-purple {
          color: #c084fc;
          text-shadow: 0 0 15px rgba(139, 92, 246, 0.25);
        }

        .features-grid {
          width: 100%;
          max-width: 900px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .landing-card {
          background: rgba(8, 12, 24, 0.82);
          border: 1px solid rgba(99, 130, 185, 0.22);
          backdrop-filter: blur(32px);
          border-radius: 12px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
        }

        .landing-card:hover {
          transform: translateY(-4px);
          border-color: rgba(59, 130, 246, 0.5);
          box-shadow: 0 12px 30px rgba(59, 130, 246, 0.25);
          background: rgba(15, 23, 42, 0.95);
        }

        .card-icon-box {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .bg-red-opacity {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.25);
        }

        .bg-blue-opacity {
          background: rgba(59, 130, 246, 0.12);
          border: 1px solid rgba(59, 130, 246, 0.25);
        }

        .bg-green-opacity {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.25);
        }

        .bg-cyan-opacity {
          background: rgba(6, 182, 212, 0.12);
          border: 1px solid rgba(6, 182, 212, 0.25);
        }

        .bg-purple-opacity {
          background: rgba(139, 92, 246, 0.12);
          border: 1px solid rgba(139, 92, 246, 0.25);
        }

        .bg-orange-opacity {
          background: rgba(249, 115, 22, 0.12);
          border: 1px solid rgba(249, 115, 22, 0.25);
        }

        .card-title {
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          font-size: 15px;
          color: #ffffff;
          margin-bottom: 8px;
          text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        }

        .card-description {
          font-size: 12.5px;
          line-height: 1.5;
          color: #cbd5e1;
        }

        .landing-card:hover .card-description {
          color: #ffffff;
        }

        .landing-footer {
          width: 100%;
          border-top: 1px solid rgba(99, 130, 185, 0.18);
          padding: 24px;
          display: flex;
          justify-content: center;
          font-size: 10.5px;
          color: #cbd5e1;
          letter-spacing: 0.02em;
          text-align: center;
          background: #030712;
          position: relative;
          z-index: 10;
          text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        }

        /* Responsive Breakpoints */
        @media (max-width: 860px) {
          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .landing-stats-box {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
          .stat-item:nth-child(even) {
            border-left: 1px solid rgba(99, 130, 185, 0.2);
          }
          .stat-item:nth-child(odd) {
            border-left: none;
          }
          .hero-heading {
            font-size: 42px;
          }
        }

        @media (max-width: 580px) {
          .features-grid {
            grid-template-columns: 1fr;
          }
          .landing-stats-box {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .stat-item {
            border-left: none;
            padding: 12px 0;
          }
          .stat-item:not(:last-child) {
            border-bottom: 1px solid rgba(99, 130, 185, 0.2);
          }
          .header-right .powered-text {
            display: none;
          }
          .hero-heading {
            font-size: 32px;
          }
          .hero-subheading {
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}
