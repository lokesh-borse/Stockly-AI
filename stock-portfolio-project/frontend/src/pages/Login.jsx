import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// ── NSE ticker data for the animated left panel ──────────────────────────────
const TICKERS = [
  { sym: 'RELIANCE', price: '2,941.55', chg: '+1.23%', up: true },
  { sym: 'TCS',      price: '3,812.40', chg: '+0.87%', up: true },
  { sym: 'HDFCBANK', price: '1,654.10', chg: '-0.42%', up: false },
  { sym: 'INFY',     price: '1,489.25', chg: '+2.11%', up: true },
  { sym: 'ICICIBANK',price: '1,204.75', chg: '+1.56%', up: true },
  { sym: 'SBIN',     price: '  812.30', chg: '-0.68%', up: false },
  { sym: 'WIPRO',    price: '  467.85', chg: '+0.33%', up: true },
  { sym: 'BAJFINANCE',price:'6,982.60', chg: '-1.15%', up: false },
  { sym: 'LTIM',     price: '5,321.90', chg: '+1.78%', up: true },
  { sym: 'ASIANPAINT',price:'2,847.65', chg: '-0.29%', up: false },
  { sym: 'ADANIENT', price: '2,562.10', chg: '+3.41%', up: true },
  { sym: 'HINDALCO', price: '  673.40', chg: '+0.92%', up: true },
]

// Duplicate for seamless infinite scroll
const TICKER_ITEMS = [...TICKERS, ...TICKERS]

// ── Fake SVG "candlestick" sparkline for the left panel ─────────────────────
const SPARK_POINTS = [
  [0,78],[18,62],[36,69],[54,45],[72,55],[90,38],[108,48],
  [126,32],[144,41],[162,27],[180,35],[198,20],[216,28],
  [234,15],[252,22],[270,10],[288,18],[306,8],[324,14],[342,5],
]
const SPARK_PATH = SPARK_POINTS.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ')
const SPARK_FILL = `${SPARK_PATH} L${SPARK_POINTS.at(-1)[0]},100 L0,100 Z`

// ── Eye icon for password toggle ─────────────────────────────────────────────
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

// ── Inline styles for keyframe animations (Tailwind can't do complex ones) ───
const GLOBAL_STYLES = `
  @keyframes ticker-left {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes shake {
    0%,100% { transform: translateX(0);   }
    20%      { transform: translateX(-8px); }
    40%      { transform: translateX(8px);  }
    60%      { transform: translateX(-5px); }
    80%      { transform: translateX(5px);  }
  }
  @keyframes glow-pulse {
    0%,100% { opacity:0.6; }
    50%      { opacity:1; }
  }
  @keyframes spark-draw {
    from { stroke-dashoffset: 700; }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes float-up {
    from { opacity:0; transform:translateY(12px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .anim-ticker    { animation: ticker-left 35s linear infinite; }
  .anim-ticker:hover { animation-play-state: paused; }
  .anim-shake     { animation: shake 0.45s ease; }
  .anim-glow      { animation: glow-pulse 2.5s ease-in-out infinite; }
  .anim-spark     { stroke-dasharray: 700; animation: spark-draw 2s ease-out forwards; }
  .anim-float-up  { animation: float-up 0.4s ease-out both; }
  /* Floating label technique */
  .input-wrap { position: relative; }
  .input-wrap input:focus + label,
  .input-wrap input:not(:placeholder-shown) + label {
    top: 6px; font-size: 10px; color: #0EA5E9; letter-spacing: 0.05em;
  }
  .input-wrap label {
    position:absolute; left:14px; top:50%; transform:translateY(-50%);
    font-size:14px; color:#64748b; pointer-events:none;
    transition:all 0.2s ease; background:transparent;
  }
`

export default function Login() {
  const { isAuthenticated, login, loading, error } = useAuth()
  const [email,       setEmail]    = useState('')
  const [password,    setPassword] = useState('')
  const [showPass,    setShowPass] = useState(false)
  const [shaking,     setShaking]  = useState(false)
  const navigate  = useNavigate()
  const location  = useLocation()
  const formRef   = useRef(null)

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      const to = location.state?.from?.pathname || '/portfolio'
      navigate(to, { replace: true })
    }
  }, [isAuthenticated, navigate, location])

  // Shake the form on auth error
  useEffect(() => {
    if (error) {
      setShaking(true)
      const t = setTimeout(() => setShaking(false), 500)
      return () => clearTimeout(t)
    }
  }, [error])

  async function onSubmit(e) {
    e.preventDefault()
    const ok = await login(email, password)
    if (ok) navigate('/portfolio')
  }

  return (
    <>
      {/* ── inject keyframes ── */}
      <style>{GLOBAL_STYLES}</style>

      <div className="min-h-screen flex bg-[#070B14] overflow-hidden">

        {/* ════════════════════════════════════════════════════════════════
            LEFT PANEL — animated market atmosphere (hidden on mobile)
        ════════════════════════════════════════════════════════════════ */}
        <div className="hidden lg:flex lg:w-[55%] flex-col relative overflow-hidden">

          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'linear-gradient(rgba(14,165,233,0.07) 1px,transparent 1px),' +
                'linear-gradient(90deg,rgba(14,165,233,0.07) 1px,transparent 1px)',
              backgroundSize: '44px 44px',
            }}
          />

          {/* Gradient radial glow */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <div
              className="absolute top-[-10%] left-[15%] w-[55%] h-[55%] rounded-full opacity-20 blur-[80px]"
              style={{ background: 'radial-gradient(circle, #0EA5E9 0%, transparent 70%)' }}
            />
            <div
              className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] rounded-full opacity-10 blur-[60px]"
              style={{ background: 'radial-gradient(circle, #22C55E 0%, transparent 70%)' }}
            />
          </div>

          {/* Content */}
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
            <div className="mb-6 anim-float-up">
              <h1 className="text-4xl font-bold text-neutral-100 leading-tight mb-3">
                Markets move fast.<br />
                <span className="text-transparent bg-clip-text"
                  style={{ backgroundImage: 'linear-gradient(90deg,#0EA5E9,#22C55E)' }}>
                  Stay ahead.
                </span>
              </h1>
              <p className="text-neutral-400 text-sm leading-relaxed max-w-xs">
                AI-powered analysis of Indian equities. Portfolios, P&amp;L tracking, ML signals and more — all in one terminal.
              </p>
            </div>

            {/* Fake sparkline chart */}
            <div className="mb-6 anim-float-up" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest">NIFTY 50</span>
                <span className="text-xs font-mono text-gain-500 font-medium anim-glow">▲ 22,147.65</span>
                <span className="text-2xs font-mono text-gain-500 bg-gain-500/10 border border-gain-500/20 px-1.5 py-0.5 rounded">+1.34%</span>
              </div>
              <div className="relative h-28 rounded-lg overflow-hidden"
                style={{ background: 'linear-gradient(180deg,rgba(13,17,23,0) 0%,#0D1117 100%)' }}>
                <svg viewBox="0 0 342 100" preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full">
                  {/* Fill area */}
                  <path d={SPARK_FILL} fill="url(#sparkGrad)" opacity="0.4" />
                  {/* Line */}
                  <path d={SPARK_PATH} fill="none" stroke="#22C55E" strokeWidth="1.5"
                    className="anim-spark" />
                  <defs>
                    <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* X-axis labels */}
                <div className="absolute bottom-1 left-0 right-0 flex justify-between px-2">
                  {['9:15','10:30','11:45','1:00','2:15','3:30'].map(t => (
                    <span key={t} className="text-2xs font-mono text-neutral-600">{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Ticker tape */}
            <div className="mb-8 overflow-hidden"
              style={{ maskImage: 'linear-gradient(90deg,transparent,black 8%,black 92%,transparent)' }}>
              <div className="anim-ticker flex items-center gap-6 whitespace-nowrap w-max">
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

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mt-auto pb-2 anim-float-up" style={{ animationDelay: '0.2s' }}>
              {[
                { label: 'Stocks Tracked', value: '5,000+' },
                { label: 'ML Signals/Day',  value: '2,400+' },
                { label: 'NSE/BSE Data',    value: 'Real-time' },
              ].map(s => (
                <div key={s.label} className="bg-surface-900/60 border border-surface-700 rounded-lg p-3 text-center">
                  <div className="text-base font-bold font-mono text-brand-400">{s.value}</div>
                  <div className="text-2xs text-neutral-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            RIGHT PANEL — the login form
        ════════════════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 relative">

          {/* Subtle glow behind card */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full opacity-10 blur-[80px] pointer-events-none"
            style={{ background: 'radial-gradient(circle, #0EA5E9, transparent 70%)' }}
          />

          <div
            ref={formRef}
            className={`
              relative w-full max-w-sm
              bg-[#0D1117]/80 backdrop-blur-md
              border border-[#1E2530]
              rounded-2xl shadow-2xl
              p-8
              ${shaking ? 'anim-shake' : ''}
            `}
            style={{ boxShadow: '0 0 0 1px rgba(14,165,233,0.06), 0 24px 48px rgba(0,0,0,0.6)' }}
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
            <div className="mb-6">
              <p className="text-2xs uppercase tracking-widest text-brand-500 font-medium mb-1">
                Welcome back
              </p>
              <h2 className="text-2xl font-bold text-neutral-100">Sign in to your portfolio</h2>
            </div>

            {/* Success message from register redirect */}
            {location.state?.message && (
              <div className="mb-4 flex items-center gap-2 text-xs text-gain-400 bg-gain-500/10 border border-gain-500/20 rounded-lg px-3 py-2.5">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                {location.state.message}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4" noValidate>

              {/* Email — floating label */}
              <div className="input-wrap">
                <input
                  id="login-email"
                  type="email"
                  placeholder=" "
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="
                    w-full pt-5 pb-2 px-3.5 rounded-lg text-sm
                    bg-[#151C26] border border-[#1E2530] text-neutral-200
                    focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50
                    transition-all duration-200
                  "
                />
                <label htmlFor="login-email">Email address</label>
              </div>

              {/* Password — floating label + show/hide */}
              <div className="input-wrap">
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  placeholder=" "
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="
                    w-full pt-5 pb-2 pl-3.5 pr-10 rounded-lg text-sm
                    bg-[#151C26] border border-[#1E2530] text-neutral-200
                    font-mono tracking-wider
                    focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50
                    transition-all duration-200
                  "
                />
                <label htmlFor="login-password">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeClosed /> : <EyeOpen />}
                </button>
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-start gap-2 text-xs text-loss-400 bg-loss-500/10 border border-loss-500/20 rounded-lg px-3 py-2.5">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0 mt-0.5">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Forgot password */}
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs text-neutral-500 hover:text-brand-400 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="
                  w-full py-3 rounded-lg text-sm font-semibold text-white
                  relative overflow-hidden group
                  disabled:opacity-60 disabled:cursor-not-allowed
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-surface-900
                "
                style={{ background: 'linear-gradient(135deg,#0369a1,#0EA5E9,#06b6d4)' }}
              >
                {/* hover shimmer */}
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'linear-gradient(135deg,#0EA5E9,#06b6d4,#22d3ee)' }} />
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                      </svg>
                      Signing in…
                    </>
                  ) : 'Sign in'}
                </span>
              </button>
            </form>

            {/* Register link */}
            <p className="mt-5 text-center text-xs text-neutral-500">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-brand-400 font-medium hover:text-brand-300 transition-colors">
                Create account →
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
