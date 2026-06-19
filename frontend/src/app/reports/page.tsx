'use client';
import { useEffect, useState } from 'react';
import { FileDown, FileText, Filter, Table, RefreshCw } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getOptions, API_BASE } from '@/lib/api';

export default function ReportsExportPage() {
  const [options, setOptions] = useState<any>({ vehicle_types: [], police_stations: [] });
  const [loadingOptions, setLoadingOptions] = useState(true);
  
  // Filter states
  const [location, setLocation] = useState('');
  const [station, setStation] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [limit, setLimit] = useState('5000');

  useEffect(() => {
    getOptions()
      .then(setOptions)
      .catch(console.error)
      .finally(() => setLoadingOptions(false));
  }, []);

  const handleExportViolations = (format: 'csv' | 'excel') => {
    const params = new URLSearchParams();
    if (location) params.append('location', location);
    if (station) params.append('station', station);
    if (vehicle) params.append('vehicle', vehicle);
    params.append('limit', limit);

    const url = `${API_BASE}/api/reports/violations/${format}?${params.toString()}`;
    window.open(url, '_blank');
  };

  const handleExportHotspots = () => {
    window.open(`${API_BASE}/api/reports/hotspots/csv`, '_blank');
  };

  const handleExportRisk = () => {
    window.open(`${API_BASE}/api/reports/risk/csv`, '_blank');
  };

  const handleExportPDF = () => {
    window.open(`${API_BASE}/api/reports/pdf`, '_blank');
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <div className="section-title">Reports & Export Center</div>
          <div className="section-subtitle">Generate official enforcement reports and extract custom data segments</div>
        </div>
      </div>

      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Left Column: Filtered Violation Exports */}
          <div className="chart-container" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Filter size={18} color="#60a5fa" />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Filtered Violations Registry</span>
            </div>

            {loadingOptions ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 50 }} />)}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
                <div>
                  <label className="form-label">Road or Location keyword</label>
                  <input
                    type="text"
                    placeholder="e.g. MG Road, Indiranagar"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Police Station Precinct</label>
                  <select
                    className="form-input"
                    value={station}
                    onChange={e => setStation(e.target.value)}
                  >
                    <option value="">All Police Stations</option>
                    {options.police_stations.map((ps: string) => (
                      <option key={ps} value={ps}>{ps}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Target Vehicle Category</label>
                  <select
                    className="form-input"
                    value={vehicle}
                    onChange={e => setVehicle(e.target.value)}
                  >
                    <option value="">All Vehicle Categories</option>
                    {options.vehicle_types.map((v: string) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Record Extraction Limit</label>
                  <select
                    className="form-input"
                    value={limit}
                    onChange={e => setLimit(e.target.value)}
                  >
                    <option value="1000">1,000 records</option>
                    <option value="5000">5,000 records</option>
                    <option value="10000">10,000 records</option>
                    <option value="25000">25,000 records</option>
                    <option value="50000">50,000 records</option>
                  </select>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12, marginTop: 'auto', paddingTop: 16 }}>
                  <button
                    onClick={() => handleExportViolations('csv')}
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <FileDown size={16} /> Export CSV
                  </button>
                  <button
                    onClick={() => handleExportViolations('excel')}
                    className="btn-secondary"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <Table size={16} /> Export Excel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Strategic PDF & Global Extracts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* PDF Summary Report Card */}
            <div className="glass-card" style={{
              background: 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(59,130,246,0.15))',
              border: '1px solid rgba(59, 130, 246, 0.25)', padding: 20, borderRadius: 14
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.15)',
                    color: '#60a5fa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase'
                  }}>Executive Report</span>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc', marginTop: 8 }}>
                    PDF Executive Intelligence Summary
                  </div>
                </div>
                <FileText size={28} color="#60a5fa" />
              </div>
              <p style={{ fontSize: 12.5, color: '#94a3b8', lineHeight: 1.5, marginBottom: 20 }}>
                Generates a printable, publication-grade executive summary of current city violation parameters, listing key KPI summaries, top 10 active hotspots, validation metrics, and tactical officer deployment structures.
              </p>
              <button onClick={handleExportPDF} className="btn-primary">
                <FileDown size={14} /> Download PDF Report
              </button>
            </div>

            {/* General Database Extracts */}
            <div className="chart-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>
                Strategic Database Extracts
              </div>

              {/* Hotspots Extract */}
              <div style={{
                background: 'rgba(15,23,42,0.4)', padding: 14, borderRadius: 10, border: '1px solid var(--border-glass)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>Geospatial Hotspots Registry</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>DBSCAN cluster centroid coordinates & risk classifications</div>
                </div>
                <button
                  onClick={handleExportHotspots}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: 12 }}
                >
                  Download CSV
                </button>
              </div>

              {/* Risk Score Index Extract */}
              <div style={{
                background: 'rgba(15,23,42,0.4)', padding: 14, borderRadius: 10, border: '1px solid var(--border-glass)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>Location Risk Index Report</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Composite 0-100 scores, workload indices & coordinates</div>
                </div>
                <button
                  onClick={handleExportRisk}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: 12 }}
                >
                  Download CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
