'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, AlertTriangle, CheckCircle, Users, Clock, AlertCircle, MapPin, Printer } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getRiskData, getOptions } from '@/lib/api';

const STRATEGIES = {
  High: {
    priority: "IMMEDIATE / CRITICAL",
    color: "#ef4444",
    officers: "3–5 traffic officers",
    monitoring_time: "Continuous monitoring (24/7 or active violation hours)",
    actions: [
      "Deploy 3–5 traffic officers immediately to initiate physical clear-out.",
      "Increase CCTV surveillance frequency and set automated alerts for parking anomalies.",
      "Install temporary no-parking physical barriers (cones/fencing).",
      "Establish a high-frequency patrol route with check-ins every 30 minutes.",
      "Issue immediate on-the-spot fines and coordinate with towing trucks."
    ],
    infrastructure: "Install retro-reflective signage and paint kerbs yellow. Coordinate with local businesses to provide alternative off-street parking."
  },
  Medium: {
    priority: "SCHEDULED / MODERATE",
    color: "#f97316",
    officers: "1–2 traffic officers",
    monitoring_time: "Peak hours (07:00–10:00 and 17:00–21:00)",
    actions: [
      "Schedule periodic drive-by inspections every 2 hours.",
      "Deploy 1-2 traffic officers during identified peak traffic periods.",
      "Distribute awareness notices and warnings to double-parked vehicles.",
      "Issue warning notices for the first 15 minutes before writing fine tickets."
    ],
    infrastructure: "Clarify parking lane markings and set time-restricted parking boards."
  },
  Low: {
    priority: "ROUTINE surveillance",
    color: "#22c55e",
    officers: "Standard area patrol",
    monitoring_time: "Regular surveillance schedule",
    actions: [
      "Include the area in regular daily police station rounds.",
      "Log observations into the ParkPulse registry for trend tracking.",
      "Conduct monthly audits to check for risk level escalation."
    ],
    infrastructure: "Ensure general signage is visible. No structural changes required."
  }
};

export default function RecommendationsPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocName, setSelectedLocName] = useState<string>('');
  const [selectedLocData, setSelectedLocData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'High' | 'Medium' | 'Low'>('High');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRiskData(100)
      .then(res => {
        const data = res.data || [];
        setLocations(data);
        if (data.length > 0) {
          setSelectedLocName(data[0].location);
          setSelectedLocData(data[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleLocationChange = (locName: string) => {
    setSelectedLocName(locName);
    const found = locations.find(l => l.location === locName);
    setSelectedLocData(found || null);
  };

  const currentStrategy = STRATEGIES[activeTab];

  const handlePrint = () => {
    if (!selectedLocData) return;
    const strategy = STRATEGIES[selectedLocData.risk_level as 'High' | 'Medium' | 'Low'];
    const riskColor = selectedLocData.risk_color || strategy.color;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const docNum = `PP-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>ParkPulse Enforcement Dispatch — ${selectedLocData.location}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', Arial, sans-serif; background: #fff; color: #1a1a2e; font-size: 13px; }
    .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 20mm 18mm; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; border-bottom: 3px solid #1e3a5f; margin-bottom: 20px; }
    .header-left .org { font-size: 20px; font-weight: 800; color: #1e3a5f; letter-spacing: -0.5px; }
    .header-left .tagline { font-size: 10px; color: #64748b; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.08em; }
    .header-right { text-align: right; }
    .header-right .doc-no { font-size: 11px; font-weight: 700; color: #64748b; }
    .header-right .doc-date { font-size: 10px; color: #94a3b8; margin-top: 2px; }

    /* Title Banner */
    .title-banner { background: #1e3a5f; color: white; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; }
    .title-banner .doc-type { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #93c5fd; margin-bottom: 4px; }
    .title-banner .location-name { font-size: 22px; font-weight: 800; line-height: 1.1; }
    .title-banner .location-sub { font-size: 11px; color: #93c5fd; margin-top: 4px; }

    /* Risk Badge */
    .risk-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: white; background: ${riskColor}; margin-top: 8px; }

    /* Sections */
    .section { margin-bottom: 18px; }
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px; }

    /* Info Grid */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin-bottom: 18px; }
    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
    .info-box .label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 4px; }
    .info-box .value { font-size: 14px; font-weight: 800; color: #1e293b; }
    .info-box .value.risk { color: ${riskColor}; }

    /* Action Plan */
    .action-box { background: #f0f7ff; border-left: 4px solid ${riskColor}; border-radius: 0 6px 6px 0; padding: 12px 14px; margin-bottom: 18px; }
    .action-box .plan-header { font-size: 11px; font-weight: 700; color: ${riskColor}; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
    .action-box .summary { font-size: 12px; color: #374151; line-height: 1.6; margin-bottom: 10px; }
    .action-list { list-style: none; display: flex; flex-direction: column; gap: 6px; }
    .action-list li { display: flex; gap: 8px; font-size: 12px; color: #374151; line-height: 1.5; }
    .action-list li .num { font-weight: 700; color: ${riskColor}; min-width: 18px; }

    /* Infrastructure */
    .infra-box { background: #fafafa; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px; margin-bottom: 18px; }
    .infra-box p { font-size: 12px; color: #374151; line-height: 1.6; }

    /* Units */
    .units-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
    .unit-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; }
    .unit-box .label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 3px; }
    .unit-box .value { font-size: 13px; font-weight: 700; color: #1e293b; }

    /* Footer */
    .footer { border-top: 2px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; align-items: flex-end; margin-top: 20px; }
    .footer .disclaimer { font-size: 9px; color: #94a3b8; line-height: 1.5; max-width: 380px; font-style: italic; }
    .footer .signature-box { text-align: right; }
    .footer .sig-line { border-top: 1px solid #64748b; margin-top: 30px; padding-top: 4px; font-size: 9px; color: #64748b; width: 130px; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 15mm 15mm; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <div class="org">&#127947; ParkPulse</div>
      <div class="tagline">Smart Parking Enforcement Intelligence Platform &middot; Bengaluru Traffic Authority</div>
    </div>
    <div class="header-right">
      <div class="doc-no">Dispatch No: ${docNum}</div>
      <div class="doc-date">${dateStr} &middot; ${timeStr}</div>
    </div>
  </div>

  <!-- Title Banner -->
  <div class="title-banner">
    <div class="doc-type">&#9679; Enforcement Dispatch Briefing Order</div>
    <div class="location-name">${selectedLocData.location}</div>
    <div class="location-sub">Bengaluru, Karnataka, India &mdash; Generated by ParkPulse AI Risk Engine</div>
    <div class="risk-badge">${selectedLocData.risk_level} Risk Zone &mdash; ${strategy.priority}</div>
  </div>

  <!-- Stats Row -->
  <div class="section">
    <div class="section-title">Location Intelligence Summary</div>
    <div class="info-grid">
      <div class="info-box"><div class="label">Risk Score</div><div class="value risk">${selectedLocData.risk_score}/100</div></div>
      <div class="info-box"><div class="label">Risk Category</div><div class="value risk">${selectedLocData.risk_level}</div></div>
      <div class="info-box"><div class="label">Total Violations</div><div class="value">${selectedLocData.violation_count?.toLocaleString()}</div></div>
      <div class="info-box"><div class="label">Primary Vehicle</div><div class="value">${selectedLocData.dominant_vehicle || 'All Types'}</div></div>
    </div>
  </div>

  <!-- Responsible Units -->
  <div class="section">
    <div class="section-title">Assigned Units &amp; Manpower</div>
    <div class="units-grid">
      <div class="unit-box"><div class="label">Responsible Precinct</div><div class="value">${selectedLocData.police_station} Police Station</div></div>
      <div class="unit-box"><div class="label">Recommended Officers</div><div class="value">${strategy.officers}</div></div>
      <div class="unit-box"><div class="label">Monitoring Schedule</div><div class="value">${strategy.monitoring_time}</div></div>
      <div class="unit-box"><div class="label">Priority Level</div><div class="value">${strategy.priority}</div></div>
    </div>
  </div>

  <!-- Action Plan -->
  <div class="section">
    <div class="section-title">Operational Action Plan</div>
    <div class="action-box">
      <div class="plan-header">Action Plan &mdash; ${selectedLocData.risk_level} Risk Level</div>
      <div class="summary">Deploy <strong>${strategy.officers}</strong> for patrol operations. Action focus during peak hours: <strong>${strategy.monitoring_time}</strong>.</div>
      <ul class="action-list">
        ${strategy.actions.map((a, i) => `<li><span class="num">0${i+1}</span><span>${a}</span></li>`).join('')}
      </ul>
    </div>
  </div>

  <!-- Infrastructure -->
  <div class="section">
    <div class="section-title">Infrastructure Recommendations</div>
    <div class="infra-box"><p>${strategy.infrastructure}</p></div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="disclaimer">
      Notice: This dispatch order is AI-generated based on ${selectedLocData.violation_count?.toLocaleString()} historical parking violation records mapped at this location node. Standard field safety, traffic control regulations, and officer discretion apply. Ref: ${docNum}.
    </div>
    <div class="signature-box">
      <div class="sig-line">Authorised Officer Signature</div>
      <div class="sig-line" style="margin-top:18px">Station Commander Approval</div>
    </div>
  </div>

</div>
<script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <div className="section-title">Smart Enforcement Recommendation Center</div>
          <div className="section-subtitle">Actionable deployment guidelines, manpower planning, and mitigation strategies</div>
        </div>
      </div>

      <div className="page-content">
        {/* Top: Strategy Templates by Risk Category */}
        <div className="chart-container" style={{ marginBottom: 24 }}>
          <div className="section-title" style={{ fontSize: 14, marginBottom: 16 }}>Deployment Strategies by Risk Level</div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {(['High', 'Medium', 'Low'] as const).map(level => {
              const isActive = activeTab === level;
              const color = STRATEGIES[level].color;
              return (
                <button
                  key={level}
                  onClick={() => setActiveTab(level)}
                  style={{
                    padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 700,
                    background: isActive ? color : 'rgba(15,23,42,0.6)',
                    color: isActive ? '#0a0f1e' : '#94a3b8',
                    borderWidth: 1, borderStyle: 'solid', borderColor: isActive ? color : 'var(--border-glass)',
                    transition: 'all 0.2s',
                    boxShadow: isActive ? `0 4px 14px ${color}40` : 'none'
                  }}
                >
                  {level.toUpperCase()} RISK TACTICS
                </button>
              );
            })}
          </div>

          {/* Strategy Details */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}
          >
            {/* Left: Metadata */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                background: 'rgba(15,23,42,0.4)', padding: 16, borderRadius: 12, border: '1px solid var(--border-glass)',
                display: 'flex', flexDirection: 'column', gap: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={16} color={currentStrategy.color} />
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Recommended Manpower:</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{currentStrategy.officers}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={16} color={currentStrategy.color} />
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Monitoring Frequency:</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{currentStrategy.monitoring_time}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={16} color={currentStrategy.color} />
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Priority Status:</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: currentStrategy.color }}>{currentStrategy.priority}</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  Infrastructure Recommendations
                </div>
                <p style={{ fontSize: 12.5, color: '#94a3b8', lineHeight: 1.5 }}>
                  {currentStrategy.infrastructure}
                </p>
              </div>
            </div>

            {/* Right: Actions List */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Standard Operating Procedures
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {currentStrategy.actions.map((act, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: '#e2e8f0', background: 'rgba(15,23,42,0.3)', padding: 10, borderRadius: 8, border: '1px solid rgba(99,130,185,0.04)' }}>
                    <span style={{ color: currentStrategy.color, fontWeight: 'bold' }}>0{i+1}</span>
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom: Dynamic Location Briefing Generator */}
        <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: 24 }}>
          {/* Select Location */}
          <div className="chart-container" style={{ display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
            <div className="section-title" style={{ fontSize: 14, marginBottom: 4 }}>Tactical Briefing Dispatch</div>
            <div className="section-subtitle" style={{ marginBottom: 16 }}>Select a scored road segment to inspect local deployment plans</div>

            {loading ? (
              <div className="skeleton" style={{ height: 40 }} />
            ) : (
              <div>
                <label className="form-label">Search Location Segment</label>
                <select
                  value={selectedLocName}
                  onChange={e => handleLocationChange(e.target.value)}
                  className="form-input"
                  style={{ marginBottom: 16 }}
                >
                  {locations.map((l, i) => (
                    <option key={i} value={l.location}>{l.location}</option>
                  ))}
                </select>

                {selectedLocData && (
                  <div style={{ background: 'rgba(10,15,30,0.5)', padding: 14, borderRadius: 10, border: '1px solid var(--border-glass)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Risk Score</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: selectedLocData.risk_color }}>{selectedLocData.risk_score}/100</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Risk Category</span>
                      <span className={`badge-${selectedLocData.risk_level?.toLowerCase()}`} style={{ fontSize: 9 }}>{selectedLocData.risk_level}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Violations</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{selectedLocData.violation_count}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Police Station</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>{selectedLocData.police_station}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Generated Briefing Sheet */}
          <div className="chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
            {selectedLocData ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>Enforcement Dispatch Briefing</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <MapPin size={16} color="#94a3b8" /> {selectedLocData.location}
                    </div>
                  </div>
                  <button
                    onClick={handlePrint}
                    className="btn-secondary"
                    style={{ padding: '6px 10px', fontSize: 11.5 }}
                  >
                    <Printer size={12} style={{ marginRight: 4 }} /> Print Dispatch
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11.5, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Responsible Unit</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{selectedLocData.police_station} Police Precinct</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Primary Vehicle Target</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa' }}>{selectedLocData.dominant_vehicle || 'All Categories'}</div>
                  </div>
                </div>

                {/* Operations instructions */}
                <div style={{
                  background: `${selectedLocData.risk_color}10`, border: `1px solid ${selectedLocData.risk_color}30`,
                  padding: 16, borderRadius: 10
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: selectedLocData.risk_color, textTransform: 'uppercase', marginBottom: 8 }}>
                    Action Plan for {selectedLocData.risk_level} Risk Level
                  </div>
                  <div style={{ fontSize: 12.5, color: '#cbd5e1', marginBottom: 12, lineHeight: 1.5 }}>
                    Deploy <b style={{ color: '#f8fafc' }}>{STRATEGIES[selectedLocData.risk_level as 'High'].officers}</b> for patrol operations. Action focus during peak hours: <b style={{ color: '#f8fafc' }}>{STRATEGIES[selectedLocData.risk_level as 'High'].monitoring_time}</b>.
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {STRATEGIES[selectedLocData.risk_level as 'High'].actions.slice(0, 3).map((act, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: '#94a3b8' }}>
                        <span>•</span>
                        <span>{act}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tactical Dispatch Warnings */}
                <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: 12, fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
                  Notice: This dispatcher order is AI-generated based on historical parking violations (currently {selectedLocData.violation_count?.toLocaleString()} approved offences mapped at this specific location node). Standard field safety and traffic control regulations apply.
                </div>
              </motion.div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#64748b' }}>
                Awaiting location selection to load briefing dispatch sheet.
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
