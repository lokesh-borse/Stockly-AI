import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchLiveStockBySymbol } from '../api/stocks.js'

// ── Inline animations ─────────────────────────────────────────────────────────
const STYLES = `
  @keyframes shimmer    { from{background-position:-200% 0} to{background-position:200% 0} }
  @keyframes fade-up    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes blink      { 0%,100%{opacity:1} 50%{opacity:0.15} }
  @keyframes pulse-live { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.5)} 50%{box-shadow:0 0 0 7px rgba(34,197,94,0)} }
  @keyframes price-up   { 0%{background:rgba(34,197,94,0.18)} 100%{background:transparent} }
  @keyframes price-down { 0%{background:rgba(239,68,68,0.18)} 100%{background:transparent} }
  @keyframes spin       { to{transform:rotate(360deg)} }

  .fade-up   { animation: fade-up 0.4s ease-out both; }
  .dot-live  { animation: pulse-live 2s ease-in-out infinite; }
  .dot-blink { animation: blink 1.4s ease-in-out infinite; }
  .spin-icon { animation: spin 0.8s linear infinite; }

  .flash-up   { animation: price-up   0.8s ease-out; }
  .flash-down { animation: price-down 0.8s ease-out; }

  .metric-card { transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s; }
  .metric-card:hover { transform: translateY(-2px); border-color: rgba(14,165,233,0.3) !important; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
`

// ── Helpers ───────────────────────────────────────────────────────────────────
const toFin  = v => { const n = Number(v); return Number.isFinite(n) ? n : null }
const fmtINR = (v, d = 2) => {
  const n = toFin(v); if (n === null) return '—'
  return n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })
}
const fmtCompact = v => {
  const n = toFin(v); if (n === null) return '—'
  if (n >= 1e12) return `₹${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9)  return `₹${(n / 1e9).toFixed(2)}B`
  if (n >= 1e7)  return `₹${(n / 1e7).toFixed(2)}Cr`
  if (n >= 1e5)  return `₹${(n / 1e5).toFixed(2)}L`
  return `₹${fmtINR(n)}`
}

function isMarketOpen() {
  const now = new Date()
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const day = ist.getDay()
  const mins = ist.getHours() * 60 + ist.getMinutes()
  return day >= 1 && day <= 5 && mins >= 9 * 60 + 15 && mins < 15 * 60 + 30
}

// Spinner
const Spinner = () => (
  <svg className="spin-icon w-5 h-5" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="#64748b" strokeWidth="4"/>
    <path className="opacity-75" fill="#0EA5E9" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
  </svg>
)

// Skeleton shimmer block
const Sk = ({ h = '14px', w = '100%' }) => (
  <span className="block rounded"
    style={{
      height: h, width: w,
      background: 'linear-gradient(90deg,#151C26 25%,#1E2530 50%,#151C26 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 2s linear infinite',
    }}
  />
)

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, accent = '#0EA5E9', loading }) {
  return (
    <div className="metric-card rounded-xl p-3.5 border-t-2"
         style={{ background: '#0D1117', border: '1px solid #1E2530', borderTopColor: accent }}>
      <div className="text-2xs uppercase tracking-widest mb-1.5"
           style={{ color: accent + '99', fontSize: 10 }}>
        {label}
      </div>
      {loading
        ? <Sk h="18px" w="80%" />
        : <div className="text-sm font-bold font-mono" style={{ color: '#e2e8f0' }}>{value}</div>
      }
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LiveStockDetail() {
  const { symbol }   = useParams()
  const navigate     = useNavigate()
  const timerRef     = useRef(null)
  const prevPriceRef = useRef(null)
  const priceRef     = useRef(null)

  const [data,         setData]         = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [lastUpdated,  setLastUpdated]  = useState(null)
  const [pollCount,    setPollCount]    = useState(0)
  const [flashClass,   setFlashClass]   = useState('')

  const marketOpen = isMarketOpen()
  const POLL_MS    = marketOpen ? 5000 : 30000   // faster polling when market is open

  // ── Polling logic ─────────────────────────────────────────────────────────
  async function poll(isInitial = false) {
    if (isInitial) { setLoading(true); setError(null) }
    try {
      const d = await fetchLiveStockBySymbol(symbol)
      const newPrice = toFin(d?.price)

      // Flash effect on price change
      if (prevPriceRef.current !== null && newPrice !== null && newPrice !== prevPriceRef.current) {
        const cls = newPrice > prevPriceRef.current ? 'flash-up' : 'flash-down'
        setFlashClass(cls)
        setTimeout(() => setFlashClass(''), 800)
      }
      prevPriceRef.current = newPrice
      setData(d)
      setLastUpdated(new Date())
      setPollCount(c => c + 1)
    } catch (e) {
      if (isInitial) setError('Unable to fetch live data for this symbol.')
    } finally {
      if (isInitial) setLoading(false)
      timerRef.current = setTimeout(() => poll(false), POLL_MS)
    }
  }

  useEffect(() => {
    poll(true)
    return () => clearTimeout(timerRef.current)
  }, [symbol])

  // ── Derived values ────────────────────────────────────────────────────────
  const price    = toFin(data?.price)
  const change   = toFin(data?.change)
  const changePct= toFin(data?.change_percent)
  const volume   = toFin(data?.volume)
  const peRatio  = toFin(data?.pe_ratio)
  const mktCap   = toFin(data?.market_cap)
  const high52   = toFin(data?.['52_week_high'])
  const low52    = toFin(data?.['52_week_low'])
  const divYield = toFin(data?.dividend_yield)
  const pct52    = high52 && low52 && price
    ? Math.min(100, Math.max(0, ((price - low52) / (high52 - low52)) * 100)) : null

  const isGain   = change !== null ? change >= 0 : true
  const gainColor= '#22C55E', lossColor = '#EF4444'
  const chgColor = isGain ? gainColor : lossColor

  const cleanSymbol = symbol.replace(/\.(NS|BO)$/, '')
  const exchange    = symbol.endsWith('.NS') ? 'NSE' : symbol.endsWith('.BO') ? 'BSE' : 'NSE'
  const timeStr     = lastUpdated?.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  })

  // ── Error state ───────────────────────────────────────────────────────────
  if (!loading && error) {
    return (
      <>
        <style>{STYLES}</style>
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#070B14' }}>
          <div className="text-center space-y-4">
            <div className="text-5xl">📡</div>
            <div className="text-base font-semibold" style={{ color: '#94a3b8' }}>{error}</div>
            <div className="text-sm" style={{ color: '#475569' }}>Symbol: <span className="font-mono text-neutral-300">{symbol}</span></div>
            <button onClick={() => navigate(-1)}
              className="mt-4 px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors"
              style={{ border: '1px solid #1E2530', color: '#94a3b8' }}>
              ← Go Back
            </button>
          </div>
        </div>
      </>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{STYLES}</style>
      <div className="min-h-screen pb-20" style={{ background: '#070B14' }}>
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 pt-6 space-y-4">

          {/* ════ HERO HEADER ══════════════════════════════════════════════ */}
          <div className="rounded-2xl border p-5 md:p-6 fade-up"
               style={{ background: '#0D1117', border: '1px solid #1E2530',
                        boxShadow: '0 1px 0 rgba(255,255,255,0.02) inset, 0 0 40px rgba(34,197,94,0.04)' }}>

            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">

              {/* Left — symbol + badges */}
              <div>
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={() => navigate(-1)}
                    className="text-2xs uppercase tracking-widest font-medium transition-colors hover:text-neutral-300"
                    style={{ color: '#475569' }}>
                    ← Stocks
                  </button>
                  <span style={{ color: '#1E2530' }}>·</span>
                  <span className="text-2xs uppercase tracking-widest font-mono" style={{ color: '#334155' }}>Live Feed</span>
                </div>

                {/* Symbol row */}
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <h1 className="text-3xl md:text-4xl font-bold font-mono" style={{ color: '#e2e8f0', letterSpacing: '-0.02em' }}>
                    {cleanSymbol}
                  </h1>

                  {/* Exchange badge */}
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-bold tracking-wider"
                        style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.3)', color: '#38BDF8' }}>
                    {exchange}
                  </span>

                  {/* Live pulse badge */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium"
                       style={marketOpen
                         ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E' }
                         : { background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
                    <span className={`w-1.5 h-1.5 rounded-full ${marketOpen ? 'dot-live bg-green-500' : 'bg-red-500 dot-blink'}`} />
                    {marketOpen ? 'Live' : 'Closed'}
                  </div>

                  {/* Polling spinner */}
                  {pollCount > 0 && (
                    <div className="flex items-center gap-1.5 text-2xs" style={{ color: '#334155' }}>
                      <Spinner />
                      <span>Refreshing {marketOpen ? 'every 5s' : 'every 30s'}</span>
                    </div>
                  )}
                </div>

                {/* Last refreshed */}
                {timeStr && (
                  <div className="text-2xs font-mono" style={{ color: '#334155', fontSize: 10 }}>
                    Last updated · {timeStr} IST
                  </div>
                )}
              </div>

              {/* Right — live price */}
              <div className="flex-shrink-0 text-right">
                <div className="text-2xs uppercase tracking-widest mb-1" style={{ color: '#475569' }}>Live Price</div>

                {loading ? (
                  <Sk h="52px" w="180px" />
                ) : (
                  <div ref={priceRef}
                       className={`text-4xl md:text-5xl font-bold font-mono leading-none rounded-xl px-2 -mx-2 transition-colors ${flashClass}`}
                       style={{ color: '#e2e8f0', letterSpacing: '-0.03em' }}>
                    {price !== null ? `₹${fmtINR(price)}` : '—'}
                  </div>
                )}

                {!loading && change !== null && (
                  <div className="flex items-center justify-end gap-2 mt-2">
                    <span className="text-xl font-bold font-mono" style={{ color: chgColor }}>
                      {isGain ? '▲ +' : '▼ '}₹{fmtINR(Math.abs(change))}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-sm font-bold font-mono border"
                          style={isGain
                            ? { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: gainColor }
                            : { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: lossColor }}>
                      {isGain ? '+' : ''}{changePct !== null ? changePct.toFixed(2) : '—'}%
                    </span>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ════ KEY METRICS ══════════════════════════════════════════════ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 fade-up">
            <MetricCard label="Market Cap"   value={fmtCompact(mktCap)}                                 accent="#0EA5E9" loading={loading} />
            <MetricCard label="P/E Ratio"    value={peRatio !== null ? peRatio.toFixed(2) : '—'}        accent="#8B5CF6" loading={loading} />
            <MetricCard label="52W High"     value={high52  !== null ? `₹${fmtINR(high52)}`  : '—'}    accent="#22C55E" loading={loading} />
            <MetricCard label="52W Low"      value={low52   !== null ? `₹${fmtINR(low52)}`   : '—'}    accent="#EF4444" loading={loading} />
            <MetricCard label="Volume"       value={volume  !== null ? volume.toLocaleString('en-IN') : '—'} accent="#F59E0B" loading={loading} />
            <MetricCard label="Div. Yield"   value={divYield !== null ? `${divYield.toFixed(2)}%` : '—'} accent="#06B6D4" loading={loading} />
          </div>

          {/* ════ 52W RANGE BAR ════════════════════════════════════════════ */}
          {!loading && pct52 !== null && (
            <div className="rounded-xl border p-4 fade-up"
                 style={{ background: '#0D1117', border: '1px solid #1E2530' }}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono" style={{ color: '#64748b', minWidth: 80, textAlign: 'right' }}>
                  ₹{fmtINR(low52)}
                </span>
                <div className="flex-1 space-y-1">
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1E2530' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                         style={{ width: `${pct52}%`, background: `linear-gradient(90deg,${lossColor},${gainColor})` }} />
                  </div>
                  <div className="flex justify-center">
                    <span className="text-2xs font-mono" style={{ color: '#475569', fontSize: 10 }}>
                      52-Week Range · {pct52.toFixed(1)}% from low
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono" style={{ color: '#64748b', minWidth: 80 }}>
                  ₹{fmtINR(high52)}
                </span>
              </div>
            </div>
          )}

          {/* ════ RAW DATA PANEL ═══════════════════════════════════════════ */}
          {!loading && data && (
            <div className="rounded-2xl border overflow-hidden fade-up"
                 style={{ background: '#0D1117', border: '1px solid #1E2530' }}>
              <div className="flex items-center gap-2 px-5 py-3 border-b"
                   style={{ borderColor: '#1E2530', background: '#080C12' }}>
                <span className="inline-block w-0.5 h-4 rounded-full bg-green-500" />
                <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>All Live Fields</span>
                <span className="text-2xs px-2 py-0.5 rounded-full font-mono ml-auto"
                      style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}>
                  #{pollCount} polls
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-px" style={{ background: '#1E2530' }}>
                {Object.entries(data)
                  .filter(([, v]) => v !== null && v !== undefined && v !== '')
                  .map(([key, val]) => {
                    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                    const isNum = typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)) && val !== '')
                    return (
                      <div key={key} className="px-4 py-3 flex items-center justify-between gap-3"
                           style={{ background: '#0D1117' }}>
                        <span className="text-2xs uppercase tracking-wider" style={{ color: '#475569', fontSize: 10 }}>{label}</span>
                        <span className="font-mono text-sm text-right" style={{ color: isNum ? '#e2e8f0' : '#94a3b8' }}>
                          {isNum ? (typeof val === 'number' && val > 999 ? val.toLocaleString('en-IN') : val) : String(val)}
                        </span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Loading placeholder */}
          {loading && (
            <div className="rounded-2xl border p-6 space-y-4 fade-up"
                 style={{ background: '#0D1117', border: '1px solid #1E2530' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex justify-between gap-4">
                  <Sk h="13px" w="35%" /><Sk h="13px" w="25%" />
                </div>
              ))}
            </div>
          )}

          {/* Back link */}
          <div className="text-center pt-2">
            <button onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ color: '#475569' }}
              onMouseEnter={e => e.currentTarget.style.color = '#64748b'}
              onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back to previous page
            </button>
          </div>

        </div>
      </div>
    </>
  )
}
