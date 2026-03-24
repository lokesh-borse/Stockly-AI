import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import api from '../api/axios.js'

// ── Inline CSS (keyframes + ticker) ──────────────────────────────────────────
const STYLES = `
  @keyframes ticker-scroll {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
  @keyframes fade-up {
    from { opacity:0; transform:translateY(24px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes float {
    0%,100% { transform: translateY(0px); }
    50%      { transform: translateY(-10px); }
  }
  @keyframes blink-dot {
    0%,100% { opacity:1; } 50% { opacity:0.2; }
  }
  @keyframes price-flash-green {
    0%   { background:rgba(34,197,94,0.25); }
    100% { background:transparent; }
  }
  @keyframes price-flash-red {
    0%   { background:rgba(239,68,68,0.25); }
    100% { background:transparent; }
  }
  @keyframes scroll-prices {
    from { transform: translateY(0); }
    to   { transform: translateY(-50%); }
  }
  @keyframes grid-pulse {
    0%,100% { opacity:0.03; }
    50%      { opacity:0.07; }
  }
  @keyframes shimmer-text {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes glow-pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(14,165,233,0); }
    50%      { box-shadow: 0 0 30px 4px rgba(14,165,233,0.18); }
  }

  .ticker-inner { animation: ticker-scroll 28s linear infinite; }
  .ticker-inner:hover { animation-play-state: paused; }

  .float-card   { animation: float 4s ease-in-out infinite; }
  .dot-blink    { animation: blink-dot 1.4s ease-in-out infinite; }

  .fade-up-1    { animation: fade-up 0.6s ease-out 0.1s both; }
  .fade-up-2    { animation: fade-up 0.6s ease-out 0.25s both; }
  .fade-up-3    { animation: fade-up 0.6s ease-out 0.4s both; }
  .fade-up-4    { animation: fade-up 0.6s ease-out 0.55s both; }

  .mock-prices  { animation: scroll-prices 7s linear infinite; }

  .grid-bg {
    background-image:
      linear-gradient(rgba(14,165,233,0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(14,165,233,0.05) 1px, transparent 1px);
    background-size: 44px 44px;
    animation: grid-pulse 4s ease-in-out infinite;
  }

  .shimmer-brand {
    background: linear-gradient(90deg,#38BDF8,#0EA5E9,#818CF8,#38BDF8);
    background-size: 200% auto;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shimmer-text 3s linear infinite;
  }

  .btn-glow { animation: glow-pulse 2.5s ease-in-out infinite; }

  .feature-card {
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .feature-card:hover {
    transform: translateY(-4px);
    border-color: rgba(14,165,233,0.4);
    box-shadow: 0 8px 32px rgba(14,165,233,0.1);
  }

  .step-card {
    transition: transform 0.2s ease;
  }
  .step-card:hover { transform: translateY(-4px); }

  .chat-slide-up {
    animation: fade-up 0.25s ease-out both;
  }
`

// ── Gemini backend proxy helper ─────────────────────────────────────────────────────
// Calls our Django backend which securely holds the Gemini API key
async function callGeminiProxy(contents, systemPrompt) {
  const res = await api.post('stocks/gemini/', {
    contents,
    system_prompt: systemPrompt,
  })
  return res.data.reply
}

const BASE_SYSTEM_PROMPT = `You are an expert AI Stock Market Assistant embedded in a stock portfolio management app focused on Indian (NSE/BSE) and global (US) markets.

You have deep knowledge of the following:

INDIAN STOCKS (NSE): Search and analyze via live market endpoints.

GLOBAL STOCKS (US): Search and analyze via live market endpoints.

CRYPTO: BTC-USD, ETH-USD, BNB-USD, SOL-USD, XRP-USD, ADA-USD, DOGE-USD, DOT-USD, MATIC-USD, LTC-USD, TRX-USD, AVAX-USD, SHIB-USD, LINK-USD, ATOM-USD, XLM-USD, ETC-USD, ICP-USD, FIL-USD, APT-USD

APP FEATURES:
- Portfolio creation and management (add/remove stocks)
- ML models: Linear Regression (next-day price prediction), Logistic Regression (UP/DOWN direction), ARIMA/LSTM time-series forecast (1d/7d), K-Means portfolio clustering (High/Medium/Low risk), Growth Analysis (3-month return, volatility, Sharpe Ratio), Portfolio Star Rating (1-5), Summary Report, Stock Recommendations
- EDA tools: Gold/Silver correlation analysis, Nifty 50 clustering
- Auth: JWT login, MPIN, Telegram OTP for password reset

STRICT RULES:
1. Only answer finance, stock market, investing, and app-related questions
2. If asked anything unrelated (coding help, general knowledge, jokes etc.), politely decline and redirect to finance topics
3. Always be concise — max 4-5 sentences unless a detailed comparison is requested
4. For "best stock" or "buy recommendation" questions, give a balanced answer with 2-3 options across sectors and always add a risk disclaimer
5. For app feature questions, explain the relevant ML model or feature clearly
6. Use Indian Rupee (₹) for NSE/BSE stocks and USD ($) for US stocks
7. Format responses cleanly — use bullet points for lists, bold for stock symbols, and keep it conversational
8. Never make absolute buy/sell guarantees — always recommend consulting a SEBI registered financial advisor for actual investment decisions`

// ── Simple markdown renderer ──────────────────────────────────────────────────
function renderMarkdown(text) {
  const lines = text.split('\n')
  const elements = []
  let key = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) { elements.push(<div key={key++} style={{ height: 6 }} />); continue }

    // Bold entire line
    if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      elements.push(<p key={key++} style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 12, margin: '4px 0' }}>{line.slice(2, -2)}</p>)
      continue
    }
    // Bullet
    if (line.startsWith('- ') || line.startsWith('• ')) {
      const content = line.slice(2)
      elements.push(
        <div key={key++} style={{ display: 'flex', gap: 6, fontSize: 12, color: '#cbd5e1', margin: '2px 0' }}>
          <span style={{ color: '#38bdf8', flexShrink: 0 }}>·</span>
          <span dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e2e8f0">$1</strong>') }} />
        </div>
      )
      continue
    }
    // Regular line with inline bold
    elements.push(
      <p key={key++} style={{ fontSize: 12, color: '#cbd5e1', margin: '2px 0', lineHeight: 1.6 }}
        dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e2e8f0">$1</strong>') }} />
    )
  }
  return elements
}

// ── Voice recognition ─────────────────────────────────────────────────────────
function useSpeechRecognition(onResult) {
  const recognitionRef = useRef(null)
  const [listening, setListening] = useState(false)
  const supported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  function startListening() {
    if (!supported) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.lang = 'en-IN'; rec.interimResults = false
    rec.onresult = e => { onResult(e.results[0][0].transcript); setListening(false) }
    rec.onerror = () => setListening(false)
    rec.onend   = () => setListening(false)
    recognitionRef.current = rec; rec.start(); setListening(true)
  }
  return { startListening, listening, supported }
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '8px 12px', background: '#1E2530', border: '1px solid #1E2530', borderRadius: 12, borderBottomLeftRadius: 4, width: 'fit-content' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: '50%', background: '#38bdf8',
          animation: `blink-dot 1.4s ease-in-out ${i * 0.2}s infinite`
        }} />
      ))}
    </div>
  )
}

// ── Chatbot Widget ─────────────────────────────────────────────────────────────
function ChatbotWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'bot', text: '👋 Hi! I\'m your AI Stock Assistant powered by Gemini.\n\nAsk me about:\n• Market Analysis & Stock Picks\n• ARIMA / RNN Price Forecasts\n• Portfolio Risk & Clustering\n• Mutual Funds & ETFs\n• App Features & How-To' }
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const systemPrompt = BASE_SYSTEM_PROMPT
  // Gemini conversation history: [{role:'user',parts:[{text}]},{role:'model',parts:[{text}]}]
  const [history, setHistory] = useState([])
  const bottomRef = useRef(null)
  const { startListening, listening, supported } = useSpeechRecognition(text => setInput(text))

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open, typing])

  async function sendMessage(text) {
    const trimmed = text.trim()
    if (!trimmed || typing) return
    setInput('')

    // Add user message to display
    setMessages(prev => [...prev, { role: 'user', text: trimmed }])

    // Build new history entry
    const newUserTurn = { role: 'user', parts: [{ text: trimmed }] }
    const updatedHistory = [...history, newUserTurn]

    // Cap at last 10 exchanges (20 turns)
    const cappedHistory = updatedHistory.slice(-20)

    setTyping(true)

    try {
      const reply = await callGeminiProxy(cappedHistory, systemPrompt)
      const newModelTurn = { role: 'model', parts: [{ text: reply }] }
      setHistory([...cappedHistory, newModelTurn])
      setMessages(prev => [...prev, { role: 'bot', text: reply }])
    } catch (err) {
      console.error('Chatbot error:', err)
      const status = err?.response?.status
      const detail = err?.response?.data?.detail || ''
      const backendError = err?.response?.data?.error || ''
      const retryAfter = err?.response?.data?.retry_after_seconds || ''
      let msg
      if (status === 429) {
        const parsedRetry = parseInt(String(retryAfter), 10)
        const waitHint = Number.isFinite(parsedRetry) && parsedRetry > 0
          ? `Please wait ~${parsedRetry} seconds and try again.`
          : 'Please wait 1-2 minutes and try again.'
        const parsed429Msg = (() => {
          try {
            const parsed = JSON.parse(backendError)
            return parsed?.error?.message || parsed?.message || ''
          } catch (_) {
            return ''
          }
        })()
        msg = parsed429Msg
          ? `Rate limit reached.\n${parsed429Msg}`
          : `${detail || 'Rate limit reached.'} ${waitHint}`
      } else if (detail) {
        const rawLine = String(backendError).split('\n').map(s => s.trim()).find(Boolean) || ''
        let hint = rawLine
        try {
          const parsed = JSON.parse(backendError)
          const parsedMsg = parsed?.error?.message || parsed?.message || ''
          if (parsedMsg) hint = parsedMsg
        } catch (_) {
          // Non-JSON backend error body; keep first-line fallback.
        }
        msg = hint ? `Error: ${detail}\n${hint}` : `Error: ${detail}`
      } else {
        msg = 'Unable to reach AI. Please try again.'
      }
      setMessages(prev => [...prev, { role: 'bot', text: msg, isError: true }])
    } finally {
      setTyping(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-4 w-[340px] max-h-[520px] flex flex-col rounded-2xl overflow-hidden chat-slide-up"
             style={{ background: '#0D1117', border: '1px solid #1E2530', boxShadow: '0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(14,165,233,0.1)' }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-700"
               style={{ background: 'linear-gradient(135deg,#0c4a6e,#0369a1)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                 style={{ background: 'rgba(255,255,255,0.12)' }}>🤖</div>
            <div>
              <div className="text-sm font-bold text-white">AI Stock Assistant</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 dot-blink" />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Powered by Gemini · Finance topics only</span>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="ml-auto text-white/50 hover:text-white transition-colors text-xl leading-none">✕</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ background: '#080C12' }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-xl px-3 py-2 ${m.role === 'user' ? 'rounded-br-none' : 'rounded-bl-none'}`}
                  style={m.role === 'user'
                    ? { background: 'linear-gradient(135deg,#0369a1,#0EA5E9)', color: '#fff' }
                    : { background: m.isError ? 'rgba(239,68,68,0.08)' : '#1E2530', border: m.isError ? '1px solid rgba(239,68,68,0.3)' : '1px solid #1E2530' }}>
                  {m.role === 'user'
                    ? <span style={{ fontSize: 12, lineHeight: 1.6 }}>{m.text}</span>
                    : <div>{renderMarkdown(m.text)}</div>
                  }
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <TypingDots />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t px-3 py-2.5 flex items-center gap-2"
               style={{ borderColor: '#1E2530', background: '#0D1117' }}>
            <input
              className="flex-1 text-xs rounded-xl px-3 py-2 focus:outline-none transition-colors"
              style={{ background: '#151C26', border: '1px solid #1E2530', color: '#e2e8f0' }}
              placeholder="Ask about stocks, risk, funds..."
              value={input}
              disabled={typing}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
            />
            {supported && (
              <button onClick={startListening} title="Voice input"
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors text-sm"
                style={listening
                  ? { background: '#EF4444', color: '#fff' }
                  : { background: '#1E2530', color: '#94a3b8' }}>
                🎤
              </button>
            )}
            <button onClick={() => sendMessage(input)} disabled={typing}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white transition-colors text-sm"
              style={{ background: typing ? '#1E2530' : 'linear-gradient(135deg,#0369a1,#0EA5E9)', opacity: typing ? 0.5 : 1 }}>
              ➤
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button onClick={() => setOpen(v => !v)}
        className="w-14 h-14 rounded-2xl text-white text-2xl shadow-2xl hover:scale-110 active:scale-95 transition-transform flex items-center justify-center relative"
        style={{ background: 'linear-gradient(135deg,#0369a1,#0EA5E9)', boxShadow: '0 8px 24px rgba(14,165,233,0.4)' }}>
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
            <path d="M12 2a9 9 0 0 1 9 9c0 4.97-4.03 9-9 9a9 9 0 0 1-4.29-1.08L3 21l2.08-4.71A8.96 8.96 0 0 1 3 11a9 9 0 0 1 9-9z"/>
            <path d="M8 11h.01M12 11h.01M16 11h.01" strokeLinecap="round"/>
          </svg>
        )}
        {!open && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 dot-blink"
                style={{ borderColor: '#070B14' }} />
        )}
      </button>
    </div>
  )
}

// ── Ticker data ───────────────────────────────────────────────────────────────
const TICKERS = [
  { sym: 'RELIANCE', price: '2,947.50', chg: '+1.23%', up: true  },
  { sym: 'TCS',      price: '3,812.75', chg: '+0.87%', up: true  },
  { sym: 'INFOSYS',  price: '1,524.30', chg: '-0.43%', up: false },
  { sym: 'HDFC',     price: '1,678.90', chg: '+2.11%', up: true  },
  { sym: 'ICICIBANK',price: '1,103.60', chg: '+0.64%', up: true  },
  { sym: 'WIPRO',    price: '  467.85', chg: '-0.92%', up: false },
  { sym: 'BAJFIN',   price: '6,892.40', chg: '+1.78%', up: true  },
  { sym: 'HCLTECH',  price: '1,389.20', chg: '+0.31%', up: true  },
  { sym: 'SBIN',     price: '  753.15', chg: '-0.28%', up: false },
  { sym: 'LTIM',     price: '4,231.60', chg: '+1.05%', up: true  },
  { sym: 'NESTLEIND',price: '2,285.70', chg: '-0.55%', up: false },
  { sym: 'TITAN',    price: '3,124.80', chg: '+1.42%', up: true  },
]

// ── Mock Dashboard Preview (hero right side) ──────────────────────────────────
const MOCK_PRICES = [
  { sym: 'RELIANCE', price: '2,947.50', delta: '+1.23%', up: true  },
  { sym: 'TCS',      price: '3,812.75', delta: '+0.87%', up: true  },
  { sym: 'INFY',     price: '1,524.30', delta: '-0.43%', up: false },
  { sym: 'HDFC',     price: '1,678.90', delta: '+2.11%', up: true  },
  { sym: 'WIPRO',    price: '  467.85', delta: '-0.92%', up: false },
  { sym: 'BAJFIN',   price: '6,892.40', delta: '+1.78%', up: true  },
  // duplicate for seamless loop
  { sym: 'RELIANCE', price: '2,947.50', delta: '+1.23%', up: true  },
  { sym: 'TCS',      price: '3,812.75', delta: '+0.87%', up: true  },
  { sym: 'INFY',     price: '1,524.30', delta: '-0.43%', up: false },
  { sym: 'HDFC',     price: '1,678.90', delta: '+2.11%', up: true  },
  { sym: 'WIPRO',    price: '  467.85', delta: '-0.92%', up: false },
  { sym: 'BAJFIN',   price: '6,892.40', delta: '+1.78%', up: true  },
]

function MockDashboard() {
  return (
    <div className="relative float-card" style={{ perspective: '1200px' }}>
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-2xl blur-2xl opacity-20"
           style={{ background: 'linear-gradient(135deg,#0EA5E9,#8B5CF6)', transform: 'scale(0.95) translateY(12px)' }} />

      {/* Card */}
      <div className="relative rounded-2xl overflow-hidden"
           style={{
             background: '#0D1117',
             border: '1px solid #1E2530',
             boxShadow: '0 32px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(14,165,233,0.08)',
             transform: 'rotateY(-4deg) rotateX(2deg)',
             minWidth: 320,
           }}>
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b"
             style={{ borderColor: '#1E2530', background: '#080C12' }}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full dot-blink" style={{ background: '#22C55E' }} />
            <span className="text-xs font-mono" style={{ color: '#0EA5E9' }}>PORTFOLIO LIVE</span>
          </div>
          <span className="text-2xs font-mono" style={{ color: '#64748b', fontSize: 10 }}>
            NSE · 18:15 IST
          </span>
        </div>

        {/* Mini stats row */}
        <div className="grid grid-cols-3 gap-px border-b" style={{ borderColor: '#1E2530', background: '#1E2530' }}>
          {[
            { label: 'Value', val: '₹4.82L', color: '#e2e8f0' },
            { label: 'P&L',   val: '+₹34.2K', color: '#22C55E' },
            { label: 'Ret.',  val: '+7.62%', color: '#22C55E' },
          ].map(s => (
            <div key={s.label} className="px-3 py-2" style={{ background: '#0D1117' }}>
              <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
              <div className="font-bold font-mono text-sm" style={{ color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Table header */}
        <div className="grid grid-cols-3 px-4 py-1.5 border-b"
             style={{ borderColor: '#1E2530', background: '#080C12' }}>
          {['Symbol', 'Price', 'Chg%'].map(h => (
            <div key={h} style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em',
                                   textAlign: h !== 'Symbol' ? 'right' : 'left' }}>{h}</div>
          ))}
        </div>

        {/* Scrolling stock rows */}
        <div style={{ height: 168, overflow: 'hidden' }}>
          <div className="mock-prices">
            {MOCK_PRICES.map((s, i) => (
              <div key={i} className="grid grid-cols-3 items-center px-4 py-2 border-b"
                   style={{ borderColor: '#1E2530' }}>
                <span className="font-mono text-xs font-semibold" style={{ color: '#38BDF8' }}>{s.sym}</span>
                <span className="font-mono text-xs text-right" style={{ color: '#e2e8f0' }}>₹{s.price}</span>
                <span className="font-mono text-xs text-right font-medium"
                      style={{ color: s.up ? '#22C55E' : '#EF4444' }}>{s.delta}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom signal chip */}
        <div className="px-4 py-2.5 flex items-center justify-between border-t"
             style={{ borderColor: '#1E2530', background: '#080C12' }}>
          <span style={{ fontSize: 10, color: '#64748b' }}>LR Signal</span>
          <span className="font-bold font-mono px-3 py-0.5 rounded-full text-xs"
                style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.3)' }}>
            ▲ BUY
          </span>
          <span style={{ fontSize: 10, color: '#64748b' }}>Sentiment</span>
          <span className="font-bold text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(14,165,233,0.12)', color: '#38BDF8', border: '1px solid rgba(14,165,233,0.25)' }}>
            🐂 Bullish
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Feature cards ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: '#0EA5E9', bg: 'rgba(14,165,233,0.1)', border: 'rgba(14,165,233,0.2)',
    title: 'ML Price Predictions',
    desc: 'Linear Regression projects the next session\'s closing price with slope & confidence.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7">
        <path d="M3 3v18h18" strokeLinecap="round"/>
        <path d="M7 16l4-4 4 4 4-7" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)',
    title: 'ARIMA + RNN Forecasting',
    desc: 'Time-series models forecast 1-day & 7-day price horizons using historical OHLCV data.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7">
        <circle cx="5"  cy="12" r="2"/><circle cx="12" cy="5"  r="2"/>
        <circle cx="19" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
        <path d="M7 12h5m0-5v5m0 0v5m0-5h5m-5 0l4-7" strokeLinecap="round"/>
      </svg>
    ),
    color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)',
    title: 'Portfolio Clustering',
    desc: 'KMeans groups your stocks by risk profile — High, Medium, Low — for smarter diversification.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7">
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
      </svg>
    ),
    color: '#22C55E', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)',
    title: 'Buy / Hold / Sell Signals',
    desc: 'Logistic Regression classifies next-day direction and outputs probability-backed trade signals.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    color: '#06B6D4', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)',
    title: 'Sentiment Analysis',
    desc: 'Real-time news sentiment (Bullish / Neutral / Bearish) scraped and scored per stock.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
    color: '#F472B6', bg: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.2)',
    title: 'Portfolio Rating',
    desc: 'ML-powered 1–5 star portfolio score based on returns, volatility, Sharpe ratio & drawdown.',
  },
]

// ── Stats ─────────────────────────────────────────────────────────────────────
const STATS = [
  { num: 'NSE & BSE', label: 'Exchanges Covered',     icon: '🇮🇳' },
  { num: '6',         label: 'ML Models Running',     icon: '🤖' },
  { num: 'Real-time', label: 'Live Price Data',        icon: '⚡' },
]

// ── Steps ─────────────────────────────────────────────────────────────────────
const STEPS = [
  {
    n: '01', color: '#0EA5E9', bg: 'rgba(14,165,233,0.12)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Add Your Stocks',
    desc: 'Search NSE/BSE listed stocks and add them to your portfolio in seconds.',
  },
  {
    n: '02', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8">
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
        <path d="M12 8v4l3 3" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Run AI Analysis',
    desc: 'Our 6 ML models instantly analyse your portfolio for patterns, risk & opportunities.',
  },
  {
    n: '03', color: '#22C55E', bg: 'rgba(34,197,94,0.12)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Get Insights',
    desc: 'See buy/hold/sell signals, predicted prices, sentiment scores and sector ratings.',
  },
]

// ── Main Home ─────────────────────────────────────────────────────────────────
export default function Home() {
  const { isAuthenticated } = useAuth()
  const tickerItems = [...TICKERS, ...TICKERS]   // double for seamless loop

  return (
    <>
      <style>{STYLES}</style>
      <div className="min-h-screen" style={{ background: '#070B14', color: '#cbd5e1' }}>

        {/* ══════════════════════════════════════════════════════════════
            HERO SECTION
        ══════════════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden" style={{ minHeight: '88vh' }}>

          {/* BG: animated grid */}
          <div className="absolute inset-0 grid-bg" />
          {/* BG: radial glows */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10"
                 style={{ background: '#0EA5E9' }} />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-8"
                 style={{ background: '#8B5CF6' }} />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 md:px-6 pt-20 pb-16 flex flex-col lg:flex-row items-center gap-16 min-h-[82vh]">

            {/* ── Left content ── */}
            <div className="flex-1 max-w-xl fade-up-1">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6 text-xs font-medium"
                   style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', color: '#38BDF8' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 dot-blink" />
                Live NSE & BSE data · 6 ML Models
              </div>

              {/* Headline */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-5" style={{ color: '#e2e8f0', letterSpacing: '-0.02em' }}>
                Invest Smarter<br />
                with{' '}
                <span className="shimmer-brand">AI-Powered</span>
                <br />Analytics
              </h1>

              {/* Sub */}
              <p className="text-base md:text-lg leading-relaxed mb-8" style={{ color: '#94a3b8' }}>
                Track NSE & BSE stocks, get ML price predictions, sentiment signals
                and portfolio risk ratings — all in one dark-themed terminal.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 fade-up-2">
                {isAuthenticated ? (
                  <Link to="/portfolio"
                    className="px-7 py-3.5 rounded-xl font-bold text-base text-white transition-all hover:opacity-90 active:scale-95 btn-glow"
                    style={{ background: 'linear-gradient(135deg,#0369a1,#0EA5E9)', boxShadow: '0 8px 24px rgba(14,165,233,0.35)' }}>
                    Go to Dashboard →
                  </Link>
                ) : (
                  <>
                    <Link to="/register"
                      className="px-7 py-3.5 rounded-xl font-bold text-base text-white transition-all hover:opacity-90 active:scale-95 btn-glow"
                      style={{ background: 'linear-gradient(135deg,#0369a1,#0EA5E9)', boxShadow: '0 8px 24px rgba(14,165,233,0.35)' }}>
                      Start Free →
                    </Link>
                    <a href="#how-it-works"
                      className="px-7 py-3.5 rounded-xl font-bold text-base transition-all hover:opacity-80"
                      style={{ border: '1px solid #1E2530', color: '#94a3b8' }}>
                      See How It Works
                    </a>
                  </>
                )}
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center gap-4 mt-8 fade-up-3">
                {['No credit card', 'Free to start', 'Indian markets only'].map(t => (
                  <div key={t} className="flex items-center gap-1.5 text-xs" style={{ color: '#64748b' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" className="w-3.5 h-3.5">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {t}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right — mock dashboard ── */}
            <div className="flex-1 flex justify-center lg:justify-end fade-up-4">
              <MockDashboard />
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            LIVE TICKER STRIP
        ══════════════════════════════════════════════════════════════ */}
        <div className="border-y overflow-hidden py-2.5"
             style={{ borderColor: '#1E2530', background: '#080C12' }}>
          <div className="ticker-inner inline-flex gap-0 whitespace-nowrap">
            {tickerItems.map((t, i) => (
              <div key={i} className="inline-flex items-center gap-2 px-6 border-r"
                   style={{ borderColor: '#1E2530' }}>
                <span className="text-xs font-bold font-mono" style={{ color: '#e2e8f0' }}>{t.sym}</span>
                <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>₹{t.price}</span>
                <span className="text-xs font-mono font-medium"
                      style={{ color: t.up ? '#22C55E' : '#EF4444' }}>
                  {t.up ? '▲' : '▼'} {t.chg}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            STATS / TRUST SECTION
        ══════════════════════════════════════════════════════════════ */}
        <section className="py-16 border-b" style={{ borderColor: '#1E2530' }}>
          <div className="max-w-4xl mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              {STATS.map(s => (
                <div key={s.label} className="space-y-2">
                  <div className="text-3xl mb-2">{s.icon}</div>
                  <div className="text-3xl md:text-4xl font-extrabold font-mono shimmer-brand">{s.num}</div>
                  <div className="text-sm" style={{ color: '#64748b' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            FEATURES GRID
        ══════════════════════════════════════════════════════════════ */}
        <section id="features" className="py-20 px-4 md:px-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-xs font-medium"
                   style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', color: '#a78bfa' }}>
                ✦ ML-Powered Features
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-3" style={{ color: '#e2e8f0', letterSpacing: '-0.01em' }}>
                Everything You Need to<br/>Invest Smarter
              </h2>
              <p className="text-base max-w-xl mx-auto" style={{ color: '#64748b' }}>
                Six machine learning models working in unison to give you an edge in the Indian equity market.
              </p>
            </div>

            {/* Cards */}
            <div id="models" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map(f => (
                <div key={f.title} className="feature-card rounded-2xl p-5"
                     style={{ background: '#0D1117', border: `1px solid #1E2530` }}>
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                       style={{ background: f.bg, border: `1px solid ${f.border}`, color: f.color }}>
                    {f.icon}
                  </div>
                  <div className="font-bold text-base mb-1.5" style={{ color: '#e2e8f0' }}>{f.title}</div>
                  <div className="text-sm leading-relaxed" style={{ color: '#64748b' }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            HOW IT WORKS
        ══════════════════════════════════════════════════════════════ */}
        <section id="how-it-works" className="py-20 px-4 md:px-6 border-t"
                 style={{ borderColor: '#1E2530', background: '#080C12' }}>
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-xs font-medium"
                   style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}>
                ▶ Simple 3-step process
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold" style={{ color: '#e2e8f0', letterSpacing: '-0.01em' }}>
                From Zero to Insights<br/>in Minutes
              </h2>
            </div>

            {/* Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {/* Connector line (desktop) */}
              <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px"
                   style={{ background: 'linear-gradient(90deg, transparent, #1E2530, transparent)' }} />

              {STEPS.map((step, i) => (
                <div key={step.n} className="step-card rounded-2xl p-6 text-center relative"
                     style={{ background: '#0D1117', border: '1px solid #1E2530' }}>
                  {/* Number badge */}
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                       style={{ background: step.bg, border: `1px solid ${step.color}40`, color: step.color }}>
                    {i + 1}
                  </div>
                  {/* Icon */}
                  <div className="flex items-center justify-center w-16 h-16 rounded-2xl mx-auto mb-4 mt-2"
                       style={{ background: step.bg, color: step.color }}>
                    {step.icon}
                  </div>
                  <div className="font-bold text-base mb-2" style={{ color: '#e2e8f0' }}>{step.title}</div>
                  <div className="text-sm leading-relaxed" style={{ color: '#64748b' }}>{step.desc}</div>
                </div>
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="text-center mt-14">
              {isAuthenticated ? (
                <Link to="/portfolio"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base text-white transition-all hover:opacity-90 active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#0369a1,#0EA5E9)', boxShadow: '0 8px 24px rgba(14,165,233,0.3)' }}>
                  Open Dashboard →
                </Link>
              ) : (
                <Link to="/register"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base text-white transition-all hover:opacity-90 active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#0369a1,#0EA5E9)', boxShadow: '0 8px 24px rgba(14,165,233,0.3)' }}>
                  Create Free Account →
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            FOOTER
        ══════════════════════════════════════════════════════════════ */}
        <footer className="border-t py-10 px-4 md:px-6"
                style={{ borderColor: '#1E2530', background: '#070B14' }}>
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">

            {/* Logo + tagline */}
            <div className="flex flex-col items-center md:items-start gap-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md flex items-center justify-center"
                     style={{ background: 'linear-gradient(135deg,#0369a1,#0EA5E9)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-3 h-3">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-sm font-bold" style={{ color: '#e2e8f0' }}>
                  AI <span style={{ color: '#0EA5E9' }}>Portfolio</span>
                </span>
              </div>
              <p className="text-xs" style={{ color: '#64748b' }}>AI-powered investing for Indian equity markets.</p>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6 text-xs" style={{ color: '#64748b' }}>
              <Link to="/register" className="hover:text-neutral-300 transition-colors">Register</Link>
              <Link to="/login"    className="hover:text-neutral-300 transition-colors">Login</Link>
              <a href="#features"     className="hover:text-neutral-300 transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-neutral-300 transition-colors">How It Works</a>
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-center md:text-right max-w-xs" style={{ color: '#475569' }}>
              Not SEBI-registered. For educational purposes only. Past performance is not indicative of future results.
            </p>
          </div>
        </footer>

        {/* ══════════════════════════════════════════════════════════════
            CHATBOT
        ══════════════════════════════════════════════════════════════ */}
        <ChatbotWidget />
      </div>
    </>
  )
}


