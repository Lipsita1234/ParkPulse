'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, BarChart3, Map, ShieldAlert, Brain,
  Zap, FlaskConical, Database, FileDown, Menu, X,
  Activity, ChevronRight, Globe2, LogOut
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { href: '/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
      { href: '/analytics', label: 'Violation Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'AI Intelligence',
    items: [
      { href: '/map', label: 'AI Hotspot Map', icon: Map },
      { href: '/digital-twin', label: 'Digital Twin City', icon: Globe2 },
      { href: '/risk', label: 'Risk Intelligence', icon: ShieldAlert },
      { href: '/predict', label: 'Prediction Command', icon: Brain },
      { href: '/recommendations', label: 'Enforcement Recs', icon: Zap },
    ],
  },
  {
    title: 'Model & Data',
    items: [
      { href: '/model', label: 'Model & Explainability', icon: FlaskConical },
      { href: '/dataset', label: 'Dataset Management', icon: Database },
      { href: '/reports', label: 'Reports & Export', icon: FileDown },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="sidebar-logo">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', cursor: 'pointer' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img 
              src="/logo.jpg" 
              alt="ParkPulse Logo" 
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.15)' }} 
            />
          </div>
          <div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 16, color: '#e2e8f0', letterSpacing: '-0.02em' }}>
              ParkPulse
            </div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>Smart Enforcement Platform</div>
          </div>
        </Link>
      </div>

      {/* Live status */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border-glass)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#22c55e' }}>
          <span className="status-dot live" />
          System Online · Bengaluru, KA
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV_SECTIONS.map(section => (
          <div key={section.title}>
            <div className="nav-section-title">{section.title}</div>
            {section.items.map(item => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${active ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon size={15} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {active && <ChevronRight size={12} style={{ opacity: 0.6 }} />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-glass)' }}>
        <button
          onClick={() => {
            localStorage.removeItem('isAdminLoggedIn');
            window.location.href = '/';
          }}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
            background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer',
            borderRadius: 8, fontSize: 13, fontWeight: 600, transition: 'background 0.2s',
            marginBottom: 12
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <LogOut size={15} />
          <span>Logout</span>
        </button>
        <div style={{ fontSize: 11, color: '#475569', textAlign: 'center' }}>
          ParkPulse AI v1.0 · Production
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar" style={{ display: 'none' }} id="desktop-sidebar">
        <SidebarContent />
      </aside>
      <style>{`
        @media (min-width: 769px) {
          #desktop-sidebar { display: flex !important; flex-direction: column; }
          #mobile-toggle { display: none !important; }
          #mobile-sidebar { display: none !important; }
        }
        @media (max-width: 768px) {
          #mobile-sidebar { position: fixed; left: 12px; top: 12px; z-index: 100; width: 260px; height: calc(100vh - 24px);
            background: rgba(15,23,42,0.9); border: 1px solid rgba(99,130,185,0.25); border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5); backdrop-filter: blur(24px); overflow: hidden;
            display: flex; flex-direction: column;
            transform: translateX(${mobileOpen ? '0' : '-120%'}); transition: transform 0.3s ease; }
          #mobile-overlay { display: ${mobileOpen ? 'block' : 'none'}; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99; }
        }
      `}</style>

      {/* Mobile toggle */}
      <button
        id="mobile-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          position: 'fixed', top: 12, left: 12, zIndex: 101,
          background: 'rgba(15,23,42,0.9)', border: '1px solid var(--border-glass)',
          borderRadius: 8, padding: '8px', color: 'var(--text-primary)', cursor: 'pointer',
        }}
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile sidebar */}
      <aside id="mobile-sidebar">
        <SidebarContent />
      </aside>
      <div id="mobile-overlay" onClick={() => setMobileOpen(false)} />
    </>
  );
}
