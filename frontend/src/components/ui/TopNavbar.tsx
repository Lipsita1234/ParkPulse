'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Server, Database, BrainCircuit, Activity, ChevronDown, CheckCircle2, X, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function TopNavbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showHealth, setShowHealth] = useState(false);
  const [searchResults, setSearchResults] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    const q = searchQuery.toLowerCase();
    
    if (q === 'map' || q === 'hotspot') { router.push('/digital-twin'); setSearchQuery(''); return; }
    if (q === 'twin' || q === 'city') { router.push('/digital-twin'); setSearchQuery(''); return; }
    if (q === 'risk' || q === 'prediction') { router.push('/predict'); setSearchQuery(''); return; }
    if (q === 'analytic' || q === 'vehicle') { router.push('/analytics'); setSearchQuery(''); return; }
    
    // Otherwise, treat as location search
    setIsSearching(true);
    setShowSearchModal(true);
    try {
      const res = await api.get(`/api/risk?search=${encodeURIComponent(q)}&limit=1`);
      const riskData = res.data?.data || [];
      const found = riskData.length > 0 ? riskData[0] : null;
      setSearchResults(found || { notFound: true, query: searchQuery });
    } catch (err) {
      setSearchResults({ error: true });
    } finally {
      setIsSearching(false);
    }
  };

  const riskColor = (level: string) => {
    if (level === 'High') return '#ef4444';
    if (level === 'Medium') return '#f97316';
    return '#22c55e';
  };

  return (
    <div style={{
      height: 64,
      padding: '0 24px',
      borderBottom: '1px solid rgba(99,130,185,0.15)',
      background: 'rgba(8,12,24,0.7)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Search Bar */}
      <div style={{ flex: 1, maxWidth: 480, position: 'relative' }}>
        <form onSubmit={handleSearch} style={{ position: 'relative' }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search locations, stations, hotspots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(15,23,42,0.6)',
              border: '1px solid rgba(99,130,185,0.2)',
              borderRadius: 20,
              padding: '8px 16px 8px 40px',
              color: '#e2e8f0',
              fontSize: 13,
              outline: 'none',
              transition: 'all 0.2s',
            }}
            onFocus={(e) => e.target.style.borderColor = 'rgba(59,130,246,0.5)'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(99,130,185,0.2)'}
          />
        </form>

        {/* Search Results Modal Overlay */}
        <AnimatePresence>
          {showSearchModal && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              style={{
                position: 'absolute',
                top: 50,
                left: 0,
                width: '100%',
                background: 'rgba(15,23,42,0.95)',
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: 12,
                padding: 16,
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                zIndex: 200,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Search Results</div>
                <X size={14} color="#64748b" style={{ cursor: 'pointer' }} onClick={() => setShowSearchModal(false)} />
              </div>
              
              {isSearching ? (
                <div style={{ fontSize: 13, color: '#e2e8f0', textAlign: 'center', padding: 20 }}>
                  Searching city intelligence database...
                </div>
              ) : searchResults?.notFound ? (
                <div style={{ fontSize: 13, color: '#cbd5e1', textAlign: 'center', padding: 20 }}>
                  No high-risk or tracked data found for <strong>"{searchResults.query}"</strong>.
                </div>
              ) : searchResults?.error ? (
                <div style={{ fontSize: 13, color: '#ef4444', textAlign: 'center', padding: 20 }}>
                  Failed to fetch search results.
                </div>
              ) : searchResults && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MapPin size={16} color="#60a5fa" />
                    {searchResults.location}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>Risk Level</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: riskColor(searchResults.risk_level) }}>
                        {searchResults.risk_level?.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>Risk Score</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>
                        {searchResults.risk_score}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>Total Violations</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>
                        {searchResults.violation_count}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4 }}>
                    <strong>Jurisdiction:</strong> {searchResults.police_station}
                  </div>
                  <button
                    onClick={() => { setShowSearchModal(false); router.push('/digital-twin'); }}
                    style={{
                      marginTop: 8, padding: '8px', borderRadius: 8, background: 'rgba(59,130,246,0.1)',
                      border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    View on Map
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* System Health */}
      <div style={{ position: 'relative' }}>
        <div 
          onClick={() => setShowHealth(!showHealth)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 12px', borderRadius: 8,
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.2)',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ position: 'absolute', width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
            <span style={{ position: 'relative', width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#34d399' }}>System Healthy</span>
          <ChevronDown size={14} color="#34d399" />
        </div>

        <AnimatePresence>
          {showHealth && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 8,
                width: 280, background: 'rgba(15,23,42,0.95)',
                border: '1px solid rgba(99,130,185,0.2)', borderRadius: 12,
                backdropFilter: 'blur(20px)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                padding: 16, zIndex: 101,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                System Monitoring
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Backend API Status', icon: Server, status: 'Online' },
                  { label: 'Dataset Availability', icon: Database, status: 'Synced' },
                  { label: 'AI Risk Engine', icon: BrainCircuit, status: 'Ready' },
                  { label: 'Live Data Feed', icon: Activity, status: 'Active' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <item.icon size={14} color="#64748b" />
                      <span style={{ fontSize: 12, color: '#cbd5e1' }}>{item.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#34d399' }}>{item.status}</span>
                      <CheckCircle2 size={12} color="#34d399" />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(99,130,185,0.1)', fontSize: 10, color: '#64748b', textAlign: 'center' }}>
                Last synced: Just now
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
