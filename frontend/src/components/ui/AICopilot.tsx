'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, X, Send, ChevronDown, Zap, AlertTriangle, MapPin, Clock, TrendingUp,
} from 'lucide-react';
import api from '@/lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  risk_level?: string | null;
  timestamp: string;
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content:
    "👋 Hello! I'm your **AI Traffic Copilot** for ParkPulse.\n\nAsk me about:\n• 🔴 High-risk hotspot locations\n• 🚔 Officer deployment recommendations\n• 📊 Violation trends & peak hours\n• 📈 Tomorrow's enforcement forecast",
  suggestions: [
    'Which areas need enforcement tomorrow?',
    'Where should I deploy officers tonight?',
    'What are the peak violation hours?',
    'Show me the top hotspots',
  ],
  timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
};

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '10px 0' }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#60a5fa', display: 'block',
          }}
          animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
        />
      ))}
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    High: '#ef4444', Medium: '#f97316', Low: '#22c55e',
  };
  const color = colors[level] || '#94a3b8';
  return (
    <span style={{
      padding: '1px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
      background: `${color}20`, border: `1px solid ${color}40`, color,
      textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      {level} RISK
    </span>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  const lines = msg.content.split('\n');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 12,
      }}
    >
      {!isUser && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bot size={13} color="white" />
          </div>
          <span style={{ fontSize: 11, color: '#60a5fa', fontWeight: 600 }}>ParkPulse Copilot</span>
          {msg.risk_level && <RiskBadge level={msg.risk_level} />}
        </div>
      )}
      <div style={{
        maxWidth: '88%',
        background: isUser
          ? 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(139,92,246,0.2))'
          : 'rgba(15,23,42,0.9)',
        border: isUser
          ? '1px solid rgba(59,130,246,0.4)'
          : '1px solid rgba(99,130,185,0.2)',
        borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
        padding: '10px 14px',
        fontSize: 13,
        lineHeight: 1.65,
        color: '#e2e8f0',
      }}>
        {lines.map((line, i) => {
          // Bold markdown support
          const parts = line.split(/\*\*(.*?)\*\*/g);
          return (
            <div key={i} style={{ marginBottom: i < lines.length - 1 ? 2 : 0 }}>
              {parts.map((p, j) =>
                j % 2 === 1
                  ? <strong key={j} style={{ color: '#60a5fa', fontWeight: 700 }}>{p}</strong>
                  : <span key={j}>{p}</span>
              )}
            </div>
          );
        })}
      </div>
      <span style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>{msg.timestamp}</span>
    </motion.div>
  );
}

export default function AICopilot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, messages]);

  // Fetch alert count for badge
  useEffect(() => {
    api.get('/api/alerts/summary')
      .then(r => setAlertCount(r.data?.critical || 0))
      .catch(() => {});
  }, []);

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: Message = {
      role: 'user',
      content: msg,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const res = await api.post('/api/copilot/chat', { message: msg, history });
      const data = res.data;
      const aiMsg: Message = {
        role: 'assistant',
        content: data.reply,
        suggestions: data.suggestions || [],
        risk_level: data.risk_level,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ Unable to connect to the AI backend. Make sure the FastAPI server is running on port 8000.',
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const lastSuggestions = messages.filter(m => m.suggestions?.length).at(-1)?.suggestions || [];

  return (
    <>
      {/* Floating Button */}
      <motion.button
        id="ai-copilot-btn"
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 999,
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 24px rgba(59,130,246,0.45), 0 8px 24px rgba(0,0,0,0.4)',
        }}
      >
        <AnimatePresence mode="wait">
          {open
            ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                <X size={22} color="white" />
              </motion.div>
            : <motion.div key="bot" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                <Bot size={22} color="white" />
              </motion.div>
          }
        </AnimatePresence>

      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            style={{
              position: 'fixed', bottom: 96, right: 28, zIndex: 998,
              width: 380, height: 560,
              background: 'rgba(8,12,24,0.97)',
              border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: 20,
              display: 'flex', flexDirection: 'column',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 0 50px rgba(59,130,246,0.15), 0 24px 60px rgba(0,0,0,0.6)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid rgba(99,130,185,0.2)',
              background: 'rgba(15,23,42,0.8)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Bot size={18} color="white" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>AI Traffic Copilot</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#22c55e' }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: '#22c55e', display: 'inline-block',
                      boxShadow: '0 0 6px #22c55e',
                    }} />
                    Live · Bengaluru Intelligence
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#64748b', padding: 4,
                }}
              >
                <ChevronDown size={18} />
              </button>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '16px 16px 8px',
              scrollbarWidth: 'thin',
            }}>
              {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Bot size={13} color="white" />
                  </div>
                  <div style={{
                    background: 'rgba(15,23,42,0.9)',
                    border: '1px solid rgba(99,130,185,0.2)',
                    borderRadius: '4px 16px 16px 16px',
                    padding: '4px 14px',
                  }}>
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Suggestion Chips */}
            {lastSuggestions.length > 0 && !loading && (
              <div style={{
                padding: '6px 12px 8px',
                display: 'flex', flexWrap: 'wrap', gap: 6,
                borderTop: '1px solid rgba(99,130,185,0.1)',
              }}>
                {lastSuggestions.slice(0, 3).map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    style={{
                      fontSize: 11, padding: '4px 10px', borderRadius: 100,
                      background: 'rgba(59,130,246,0.1)',
                      border: '1px solid rgba(59,130,246,0.3)',
                      color: '#60a5fa', cursor: 'pointer',
                      transition: 'all 0.2s', whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.1)')}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div style={{
              padding: '10px 12px',
              borderTop: '1px solid rgba(99,130,185,0.15)',
              display: 'flex', gap: 8, alignItems: 'center',
            }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Ask about violations, hotspots, deployment..."
                style={{
                  flex: 1, background: 'rgba(15,23,42,0.8)',
                  border: '1px solid rgba(99,130,185,0.2)',
                  borderRadius: 12, padding: '9px 14px',
                  color: '#e2e8f0', fontSize: 12.5, outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(99,130,185,0.2)')}
              />
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                style={{
                  width: 38, height: 38, borderRadius: 11,
                  background: input.trim() && !loading
                    ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
                    : 'rgba(30,41,59,0.8)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <Send size={15} color={input.trim() && !loading ? 'white' : '#475569'} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        #ai-copilot-btn { animation: copilot-glow 3s ease-in-out infinite; }
        @keyframes copilot-glow {
          0%, 100% { box-shadow: 0 0 24px rgba(59,130,246,0.45), 0 8px 24px rgba(0,0,0,0.4); }
          50% { box-shadow: 0 0 36px rgba(139,92,246,0.55), 0 8px 24px rgba(0,0,0,0.4); }
        }
        @media (max-width: 480px) {
          #ai-copilot-btn { bottom: 16px !important; right: 16px !important; }
        }
      `}</style>
    </>
  );
}
