'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      localStorage.setItem('isAdminLoggedIn', 'true');
      router.push('/');
    } else {
      setLoginError('Invalid credentials. Hint: use admin/admin');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#030712',
      color: '#e2e8f0',
      fontFamily: 'Inter, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Image Matching Landing Page but heavily blurred */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: "url('/traffic-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        filter: 'blur(12px) brightness(0.4) contrast(1.1)',
        zIndex: 0,
        pointerEvents: 'none'
      }}></div>

      {/* Radial Gradient Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at 50% 30%, rgba(10, 15, 30, 0.05) 0%, rgba(3, 7, 18, 0.8) 100%)',
        zIndex: 1,
        pointerEvents: 'none'
      }}></div>

      <div style={{ position: 'relative', zIndex: 10, padding: 20, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <Link href="/" style={{
          position: 'absolute', top: 30, left: 30, display: 'flex', alignItems: 'center', gap: 8,
          color: '#cbd5e1', textDecoration: 'none', fontSize: 14, fontWeight: 600, transition: 'color 0.2s',
          background: 'rgba(15,23,42,0.5)', padding: '8px 12px', borderRadius: 8, backdropFilter: 'blur(4px)'
        }}>
          <ArrowLeft size={16} /> Back to Home
        </Link>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          background: 'rgba(15,23,42,0.6)',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: 24,
          padding: 40,
          width: '100%',
          maxWidth: 420,
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.1)'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: 'rgba(59,130,246,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            border: '1px solid rgba(59,130,246,0.2)'
          }}>
            <ShieldAlert size={28} color="#3b82f6" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px 0', color: '#f8fafc' }}>
            Command Center Access
          </h1>
          <p style={{ fontSize: 14, color: '#94a3b8', margin: 0, textAlign: 'center' }}>
            Enter your credentials to access the ParkPulse dashboard and live intelligence feed.
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loginError && (
            <div style={{
              padding: '12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {loginError}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 12, background: 'rgba(8,12,24,0.6)',
                border: '1px solid rgba(99,130,185,0.2)', color: '#e2e8f0', fontSize: 15, outline: 'none',
                transition: 'border-color 0.2s', boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(59,130,246,0.5)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(99,130,185,0.2)'}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '14px 16px', borderRadius: 12, background: 'rgba(8,12,24,0.6)',
                border: '1px solid rgba(99,130,185,0.2)', color: '#e2e8f0', fontSize: 15, outline: 'none',
                transition: 'border-color 0.2s', boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(59,130,246,0.5)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(99,130,185,0.2)'}
            />
          </div>

          <button
            type="submit"
            style={{
              marginTop: 12, padding: '14px', borderRadius: 12,
              background: 'linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)',
              border: 'none', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 10px 25px -5px rgba(59,130,246,0.5)', transition: 'transform 0.1s, box-shadow 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            onMouseDown={(e) => e.currentTarget.style.transform = 'translateY(1px)'}
          >
            Authenticate
          </button>
        </form>
      </motion.div>
      </div>
    </div>
  );
}
