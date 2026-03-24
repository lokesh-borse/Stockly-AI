import { useEffect, useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// ── NSE ticker data (reused from Login panel) ────────────────────────────────
const TICKERS = [
  { sym: 'RELIANCE', price: '2,941.55', chg: '+1.23%', up: true },
  { sym: 'TCS',      price: '3,812.40', chg: '+0.87%', up: true },
  { sym: 'HDFCBANK', price: '1,654.10', chg: '-0.42%', up: false },
  { sym: 'INFY',     price: '1,489.25', chg: '+2.11%', up: true },
  { sym: 'ICICIBANK',price: '1,204.75', chg: '+1.56%', up: true },
  { sym: 'SBIN',     price: '  812.30', chg: '-0.68%', up: false },
  { sym: 'WIPRO',    price: '  467.85', chg: '+0.33%', up: true },
  { sym: 'BAJFINANCE',price:'6,982.60', chg: '-1.15%', up: false },
  { sym: 'ADANIENT', price: '2,562.10', chg: '+3.41%', up: true },
  { sym: 'LTIM',     price: '5,321.90', chg: '+1.78%', up: true },
]
const TICKER_ITEMS = [...TICKERS, ...TICKERS]

// ── Feature highlights for the left panel ───────────────────────────────────
const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
      </svg>
    ),
    title: 'AI Portfolio Analysis',
    desc: 'ML models trained on decades of NSE/BSE market data',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
      </svg>
    ),
    title: 'Real-time Tracking',
    desc: 'Live P&L updates across all your holdings instantly',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    title: 'AI Investment Assistant',
    desc: 'Chat with our Gemini-powered market intelligence chatbot',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
      </svg>
    ),
    title: 'BUY / SELL Signals',
    desc: 'Logistic regression and K-Means clustering signals',
  },
]

// ── Icons ─────────────────────────────────────────────────────────────────────
const EyeOpen = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)
const EyeClosed = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

// ── Telegram icon ─────────────────────────────────────────────────────────────
const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.68 7.92c-.13.59-.48.73-.97.45l-2.69-1.98-1.3 1.25c-.14.14-.27.27-.55.27l.19-2.73 4.97-4.49c.22-.19-.05-.3-.33-.11L7.44 14.3l-2.66-.83c-.57-.18-.58-.57.13-.84l10.39-4c.47-.17.89.12.34.17z"/>
  </svg>
)

// ── Inline keyframe styles ────────────────────────────────────────────────────
const GLOBAL_STYLES = `
  @keyframes ticker-left {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20%     { transform: translateX(-8px); }
    40%     { transform: translateX(8px); }
    60%     { transform: translateX(-5px); }
    80%     { transform: translateX(5px); }
  }
  @keyframes float-up {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes progress-bar {
    from { width: 0%; }
    to   { width: var(--pw); }
  }
  .anim-ticker    { animation: ticker-left 32s linear infinite; }
  .anim-ticker:hover { animation-play-state: paused; }
  .anim-shake     { animation: shake 0.45s ease; }
  .anim-float-up  { animation: float-up 0.35s ease-out both; }

  /* Floating label */
  .input-wrap { position: relative; }
  .input-wrap input:focus + label,
  .input-wrap input:not(:placeholder-shown) + label {
    top: 6px; font-size: 10px; color: #0EA5E9; letter-spacing: 0.05em;
  }
  .input-wrap label {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    font-size: 14px; color: #64748b; pointer-events: none;
    transition: all 0.2s ease;
  }
  /* textarea floating label */
  .input-wrap-ta textarea:focus + label,
  .input-wrap-ta textarea:not(:placeholder-shown) + label {
    top: 6px; font-size: 10px; color: #0EA5E9; letter-spacing: 0.05em;
  }
  .input-wrap-ta { position: relative; }
  .input-wrap-ta label {
    position: absolute; left: 14px; top: 14px;
    font-size: 14px; color: #64748b; pointer-events: none;
    transition: all 0.2s ease;
  }
`

// ── Password strength meter ───────────────────────────────────────────────────
function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8)           score++
  if (/[A-Z]/.test(pw))        score++
  if (/[0-9]/.test(pw))        score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const map = [
    { label: 'Too short', color: '#EF4444' },
    { label: 'Weak',      color: '#EF4444' },
    { label: 'Fair',      color: '#F59E0B' },
    { label: 'Good',      color: '#22C55E' },
    { label: 'Strong',    color: '#0EA5E9' },
  ]
  return { score, ...map[score] }
}

export default function Register() {
  const { isAuthenticated, register, loading, error } = useAuth()

  const [username,       setUsername]       = useState('')
  const [email,          setEmail]          = useState('')
  const [password,       setPassword]       = useState('')
  const [showPass,       setShowPass]       = useState(false)
  const [telegramHandle, setTelegramHandle] = useState('')
  const [telegramChatId, setTelegramChatId] = useState('')
  const [shaking,        setShaking]        = useState(false)

  const navigate  = useNavigate()
  const formRef   = useRef(null)
  const strength  = getPasswordStrength(password)

  useEffect(() => {
    if (isAuthenticated) navigate('/portfolio', { replace: true })
  }, [isAuthenticated, navigate])

  useEffect(() => {
    if (error) {
      setShaking(true)
      const t = setTimeout(() => setShaking(false), 500)
      return () => clearTimeout(t)
    }
  }, [error])

  async function onSubmit(e) {
    e.preventDefault()
    const ok = await register(username, email, password, telegramChatId, telegramHandle)
    if (ok) navigate('/login', { state: { message: 'Account created! Please sign in.' } })
  }

  const inputClass = `
    w-full pt-5 pb-2 px-3.5 rounded-lg text-sm
    bg-[#151C26] border border-[#1E2530] text-neutral-200
    focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50
    transition-all duration-200 placeholder-transparent
  `

  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      <div className="min-h-screen flex bg-[#070B14] overflow-hidden">

        {/* ════════════════════════════════════════════════════════════════
            LEFT PANEL — feature highlights + ticker (hidden on mobile)
        ════════════════════════════════════════════════════════════════ */}
        <div className="hidden lg:flex lg:w-[52%] flex-col relative overflow-hidden">

          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                'linear-gradient(rgba(14,165,233,0.07) 1px,transparent 1px),' +
                'linear-gradient(90deg,rgba(14,165,233,0.07) 1px,transparent 1px)',
              backgroundSize: '44px 44px',
            }}
          />

          {/* Glow blobs */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-5%] right-[5%] w-[45%] h-[45%] rounded-full opacity-15 blur-[80px]"
              style={{ background: 'radial-gradient(circle,#0EA5E9,transparent 70%)' }} />
            <div className="absolute bottom-[5%] left-[-5%] w-[45%] h-[45%] rounded-full opacity-10 blur-[60px]"
              style={{ background: 'radial-gradient(circle,#a855f7,transparent 70%)' }} />
          </div>

          <div className="relative z-10 flex flex-col h-full px-12 py-10">

            {/* Logo */}
            <div className="flex items-center gap-3 mb-auto">
              <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-900/50">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                  <polyline points="16 7 22 7 22 13"/>
                </svg>
              </div>
              <span className="text-base font-semibold text-neutral-200 tracking-tight">AI Stock Portfolio</span>
            </div>

            {/* Headline */}
            <div className="mb-8 anim-float-up">
              <h1 className="text-4xl font-bold text-neutral-100 leading-tight mb-3">
                Your AI-powered<br />
                <span className="text-transparent bg-clip-text"
                  style={{ backgroundImage: 'linear-gradient(90deg,#0EA5E9,#a855f7)' }}>
                  market edge.
                </span>
              </h1>
              <p className="text-neutral-400 text-sm leading-relaxed max-w-xs">
                Join traders using machine learning to make smarter portfolio decisions on Indian markets.
              </p>
            </div>

            {/* Feature list */}
            <div className="space-y-4 mb-8">
              {FEATURES.map((f, i) => (
                <div
                  key={f.title}
                  className="flex items-start gap-4 anim-float-up"
                  style={{ animationDelay: `${0.08 * i}s` }}
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                    {f.icon}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-neutral-200">{f.title}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Ticker tape */}
            <div className="mt-auto overflow-hidden"
              style={{ maskImage: 'linear-gradient(90deg,transparent,black 8%,black 92%,transparent)' }}>
              <div className="mb-2 text-2xs uppercase tracking-widest text-neutral-600">
                Live Market Feed · NSE
              </div>
              <div className="anim-ticker flex items-center gap-5 whitespace-nowrap w-max">
                {TICKER_ITEMS.map((t, i) => (
                  <span key={i} className="inline-flex items-center gap-2 text-xs font-mono">
                    <span className="text-neutral-400">{t.sym}</span>
                    <span className="text-neutral-200">{t.price}</span>
                    <span className={t.up ? 'text-gain-500' : 'text-loss-500'}>{t.chg}</span>
                    <span className="text-neutral-700 mx-1">·</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            RIGHT PANEL — registration form
        ════════════════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 relative overflow-y-auto">

          {/* Glow behind card */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full opacity-10 blur-[80px] pointer-events-none"
            style={{ background: 'radial-gradient(circle,#a855f7,transparent 70%)' }}
          />

          <div
            ref={formRef}
            className={`
              relative w-full max-w-sm
              bg-[#0D1117]/80 backdrop-blur-md
              border border-[#1E2530]
              rounded-2xl shadow-2xl p-8
              ${shaking ? 'anim-shake' : ''}
            `}
            style={{ boxShadow: '0 0 0 1px rgba(168,85,247,0.06), 0 24px 48px rgba(0,0,0,0.6)' }}
          >
            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-2 mb-6">
              <div className="w-7 h-7 rounded-md bg-brand-600 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                  <polyline points="16 7 22 7 22 13"/>
                </svg>
              </div>
              <span className="text-sm font-semibold text-neutral-300">AI Stock Portfolio</span>
            </div>

            {/* Heading */}
            <div className="mb-5">
              <p className="text-2xs uppercase tracking-widest text-ai-500 font-medium mb-1">
                Get started free
              </p>
              <h2 className="text-2xl font-bold text-neutral-100">Create your account</h2>
            </div>

            <form onSubmit={onSubmit} className="space-y-3.5" noValidate>

              {/* Username */}
              <div className="input-wrap">
                <input
                  id="reg-username"
                  type="text"
                  placeholder=" "
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className={inputClass}
                />
                <label htmlFor="reg-username">Username</label>
              </div>

              {/* Email */}
              <div className="input-wrap">
                <input
                  id="reg-email"
                  type="email"
                  placeholder=" "
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className={inputClass}
                />
                <label htmlFor="reg-email">Email address</label>
              </div>

              {/* Password + strength meter */}
              <div>
                <div className="input-wrap">
                  <input
                    id="reg-password"
                    type={showPass ? 'text' : 'password'}
                    placeholder=" "
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className={`${inputClass} font-mono tracking-wider pr-10`}
                  />
                  <label htmlFor="reg-password">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeClosed /> : <EyeOpen />}
                  </button>
                </div>

                {/* Strength meter — only shown when typing */}
                {password && (
                  <div className="mt-2 px-0.5">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          className="flex-1 h-0.5 rounded-full transition-all duration-300"
                          style={{
                            background: i <= strength.score ? strength.color : '#1E2530',
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-2xs" style={{ color: strength.color }}>
                      {strength.label}
                    </span>
                  </div>
                )}
              </div>

              {/* ── Telegram section ─────────────────────────────────── */}
              <div className="rounded-lg border border-[#1E2530] bg-[#0A0F1A]/60 p-3.5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[#2AABEE]">
                    <TelegramIcon />
                  </span>
                  <span className="text-xs font-medium text-neutral-300">Telegram Integration</span>
                  <span className="ml-auto text-2xs text-neutral-600 bg-surface-800 border border-surface-700 px-1.5 py-0.5 rounded">Optional</span>
                </div>

                {/* Telegram handle */}
                <div className="input-wrap">
                  <input
                    id="reg-tg-handle"
                    type="text"
                    placeholder=" "
                    value={telegramHandle}
                    onChange={e => setTelegramHandle(e.target.value)}
                    className={inputClass}
                  />
                  <label htmlFor="reg-tg-handle">Telegram @handle</label>
                </div>
                <p className="text-2xs text-neutral-600 -mt-1">
                  For alerts &amp; notifications. Recommended.
                </p>

                {/* Telegram Chat ID */}
                <div className="input-wrap">
                  <input
                    id="reg-tg-chat"
                    type="text"
                    placeholder=" "
                    value={telegramChatId}
                    onChange={e => setTelegramChatId(e.target.value)}
                    className={`${inputClass} font-mono`}
                  />
                  <label htmlFor="reg-tg-chat">Telegram Chat ID</label>
                </div>
                <p className="text-2xs text-neutral-600 -mt-1">
                  Required for password reset OTP. Message{' '}
                  <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer"
                    className="text-[#2AABEE] hover:underline">
                    @userinfobot
                  </a>{' '}
                  to find your ID.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 text-xs text-loss-400 bg-loss-500/10 border border-loss-500/20 rounded-lg px-3 py-2.5">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0 mt-0.5">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="
                  w-full py-3 rounded-lg text-sm font-semibold text-white
                  relative overflow-hidden group
                  disabled:opacity-60 disabled:cursor-not-allowed
                  transition-all duration-200 mt-1
                  focus:outline-none focus:ring-2 focus:ring-ai-500 focus:ring-offset-2 focus:ring-offset-surface-900
                "
                style={{ background: 'linear-gradient(135deg,#0369a1,#0EA5E9,#7c3aed)' }}
              >
                {/* hover shimmer */}
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: 'linear-gradient(135deg,#0EA5E9,#7c3aed,#a855f7)' }} />
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                      </svg>
                      Creating account…
                    </>
                  ) : 'Create account →'}
                </span>
              </button>
            </form>

            {/* Login link */}
            <p className="mt-5 text-center text-xs text-neutral-500">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-400 font-medium hover:text-brand-300 transition-colors">
                Sign in
              </Link>
            </p>

            {/* Trust badges */}
            <div className="mt-6 pt-5 border-t border-surface-700">
              <div className="flex items-center justify-center gap-5">
                {[
                  { icon: '📈', label: 'NSE/BSE Data' },
                  { icon: '🤖', label: 'ML-Powered' },
                  { icon: '🔐', label: 'Secure JWT' },
                ].map(b => (
                  <div key={b.label} className="flex flex-col items-center gap-1">
                    <span className="text-base">{b.icon}</span>
                    <span className="text-2xs text-neutral-600">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
