import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import {
  Chart as ChartJS,
  LineElement, PointElement, LinearScale, CategoryScale,
  Filler, Tooltip, Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import {
  fetchStockById,
  fetchLiveStockBySymbol,
  fetchHistoricalBySymbol,
  fetchStockSentiment,
  fetchPortfolio,
  fetchPortfolioLinearRegression,
  fetchPortfolioLogisticRegression,
  addStockToPortfolio,
  downloadStockSummary,
} from '../api/stocks.js'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend)

// ── Inline keyframes + animations ─────────────────────────────────────────────
const STYLES = `
  @keyframes shimmer { from{background-position:-200% 0} to{background-position:200% 0} }
  @keyframes fade-up  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:0.15} }
  @keyframes pulse-green { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.4)} 50%{box-shadow:0 0 0 6px rgba(34,197,94,0)} }
  @keyframes slide-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes gauge-draw { from{stroke-dashoffset:282} to{stroke-dashoffset:var(--go)} }

  .shimmer {
    background: linear-gradient(90deg,#151C26 25%,#1E2530 50%,#151C26 75%);
    background-size:200% 100%; animation:shimmer 2s linear infinite; border-radius:4px;
  }
  .fade-up   { animation: fade-up 0.35s ease-out both; }
  .slide-up  { animation: slide-up 0.4s cubic-bezier(.16,1,.3,1) both; }
  .dot-blink { animation: blink 1.4s ease-in-out infinite; }
  .dot-open  { animation: pulse-green 2s ease-in-out infinite; }
  .gauge-arc { animation: gauge-draw 1.2s ease-out forwards; }

  /* Chart gradient patch */
  .chartjs-tooltip-custom {
    background: #151C26 !important;
    border: 1px solid #1E2530 !important;
    border-radius: 8px !important;
    padding: 10px 14px !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 11px !important;
    color: #cbd5e1 !important;
    box-shadow: 0 8px 24px rgba(0,0,0,0.6) !important;
    pointer-events: none !important;
  }
`

// ── Helpers ───────────────────────────────────────────────────────────────────
const toFin = v => { const n = Number(v); return Number.isFinite(n) ? n : null }
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

// Market is open: Mon-Fri 09:15–15:30 IST
function isMarketOpen() {
  const now = new Date()
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const day = ist.getDay()               // 0=Sun, 6=Sat
  const h = ist.getHours(), m = ist.getMinutes()
  const mins = h * 60 + m
  return day >= 1 && day <= 5 && mins >= 9 * 60 + 15 && mins < 15 * 60 + 30
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Sk = ({ h = '14px', w = '100%', className = '' }) => (
  <span className={`block shimmer ${className}`} style={{ height: h, width: w }} />
)

// ── Period config ─────────────────────────────────────────────────────────────
const PERIODS = [
  { label: '1D', period: '1d',  interval: '5m'  },
  { label: '1W', period: '5d',  interval: '30m' },
  { label: '1M', period: '1mo', interval: '1d'  },
  { label: '3M', period: '3mo', interval: '1d'  },
  { label: '1Y', period: '1y',  interval: '1wk' },
  { label: '5Y', period: '5y',  interval: '1mo' },
]

// ── Sentiment Gauge ───────────────────────────────────────────────────────────
function SentimentGauge({ score }) {
  const pct = Math.max(0, Math.min(1, score || 0))
  const r = 45, cx = 60, cy = 60
  const circ = Math.PI * r           // half-circle circumference
  const dashOffset = circ * (1 - pct)
  const color = pct >= 0.6 ? '#22C55E' : pct >= 0.4 ? '#F59E0B' : '#EF4444'

  return (
    <svg viewBox="0 0 120 70" width="160" height="95">
      {/* Track */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="#1E2530" strokeWidth="10" strokeLinecap="round"
      />
      {/* Fill */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={dashOffset}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.16,1,.3,1)' }}
      />
      {/* Score text */}
      <text x={cx} y={cy - 8} textAnchor="middle" fill={color}
            font-family="JetBrains Mono, monospace" fontSize="18" fontWeight="700">
        {(pct * 100).toFixed(0)}
      </text>
      <text x={cx} y={cy + 4} textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="Inter, sans-serif">
        / 100
      </text>
    </svg>
  )
}

// ── Signal badge ──────────────────────────────────────────────────────────────
function SignalBadge({ signal, size = 'md' }) {
  if (!signal) return <span className="text-neutral-600 font-mono">—</span>
  const cfg = {
    BUY:  { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.35)',  color: '#22C55E', text: '▲ BUY'  },
    HOLD: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', color: '#F59E0B', text: '◆ HOLD' },
    SELL: { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.35)',  color: '#EF4444', text: '▼ SELL' },
  }[signal] || { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)', color: '#94a3b8', text: signal }

  const pad = size === 'lg' ? 'px-4 py-1.5 text-sm' : 'px-2.5 py-0.5 text-xs'
  return (
    <span className={`${pad} rounded-full font-bold font-mono tracking-wide border`}
          style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.color }}>
      {cfg.text}
    </span>
  )
}

// ── Add-to-Portfolio dropdown ─────────────────────────────────────────────────
function AddToPortfolioButton({ symbol, livePrice }) {
  const [portfolios, setPortfolios] = useState([])
  const [open, setOpen]             = useState(false)
  const [loading, setLoading]       = useState(false)
  const [status, setStatus]         = useState(null)   // null | 'ok' | 'err'
  const ref = useRef()

  useEffect(() => {
    fetchPortfolio().then(setPortfolios).catch(() => {})
  }, [])

  // Close on outside click
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  async function handleAdd(portfolioId) {
    setLoading(true); setStatus(null); setOpen(false)
    const today = new Date().toISOString().slice(0, 10)
    try {
      await addStockToPortfolio(portfolioId, symbol, 1, livePrice || 0, today)
      setStatus('ok')
    } catch { setStatus('err') }
    finally { setLoading(false) }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={loading}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white
                   disabled:opacity-50 transition-all duration-200 hover:shadow-lg active:scale-95"
        style={{ background: 'linear-gradient(135deg,#0369a1,#0EA5E9)', boxShadow: '0 4px 16px rgba(14,165,233,0.3)' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        {loading ? 'Adding…' : 'Add to Portfolio'}
      </button>

      {/* Status flash */}
      {status === 'ok'  && <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs text-gain-400 whitespace-nowrap">✓ Added!</span>}
      {status === 'err' && <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs text-loss-400 whitespace-nowrap">Failed — try again</span>}

      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-60 bg-surface-900 border border-surface-700 rounded-xl overflow-hidden shadow-2xl slide-up z-50"
             style={{ boxShadow: '0 0 0 1px rgba(14,165,233,0.08),0 24px 48px rgba(0,0,0,0.7)' }}>
          <div className="px-4 py-2.5 border-b border-surface-700 text-2xs uppercase tracking-widest text-neutral-500">
            Choose portfolio
          </div>
          {portfolios.length === 0
            ? <div className="px-4 py-4 text-xs text-neutral-500 text-center">No portfolios found</div>
            : portfolios.map(p => (
                <button key={p.id}
                  onClick={() => handleAdd(p.id)}
                  className="w-full text-left px-4 py-3 text-sm text-neutral-300 hover:bg-surface-800 hover:text-neutral-100 transition-colors border-b border-surface-700/50 last:border-0">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-neutral-600 mt-0.5">{p.description || `ID: ${p.id}`}</div>
                </button>
              ))
          }
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function StockDetail() {
  const { id } = useParams()
  const location = useLocation()
  const chartRef = useRef()

  // ── Core data ────────────────────────────────────────────────────────────
  const [stock,      setStock]      = useState(null)
  const [liveData,   setLiveData]   = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  // ── Chart ────────────────────────────────────────────────────────────────
  const [period,       setPeriod]       = useState(4)   // index into PERIODS (default 1Y)
  const [chartHistory, setChartHistory] = useState([])
  const [chartLoading, setChartLoading] = useState(false)

  // ── Sentiment ────────────────────────────────────────────────────────────
  const [sentimentOpen,    setSentimentOpen]    = useState(false)
  const [sentimentData,    setSentimentData]    = useState(null)
  const [sentimentLoading, setSentimentLoading] = useState(false)

  // ── ML Analysis ──────────────────────────────────────────────────────────
  const [mlOpen,      setMlOpen]      = useState(false)
  const [portfolios,  setPortfolios]  = useState([])
  const [mlPortId,    setMlPortId]    = useState(null)
  const [lrData,      setLrData]      = useState(null)
  const [logData,     setLogData]     = useState(null)
  const [mlLoading,   setMlLoading]   = useState(false)
  const preferredMlPortId = Number(location.state?.portfolioId)
  const hasPreferredMlPortId = Number.isFinite(preferredMlPortId) && preferredMlPortId > 0

  // ── Download ──────────────────────────────────────────────────────────────
  const [downloading, setDownloading] = useState(false)

  const marketOpen = isMarketOpen()

  // ── Fetch base stock + live price ─────────────────────────────────────────
  useEffect(() => {
    async function run() {
      setLoading(true); setError(null)
      try {
        const data = await fetchStockById(id)
        setStock(data)
        if (data?.symbol) {
          fetchLiveStockBySymbol(data.symbol)
            .then(setLiveData)
            .catch(() => {})
        }
      } catch { setError('Failed to load stock data') }
      finally { setLoading(false) }
    }
    run()
  }, [id])

  // ── Fetch chart history when period or stock changes ──────────────────────
  useEffect(() => {
    if (!stock?.symbol) return
    const { period: p, interval: i } = PERIODS[period]
    setChartLoading(true)
    fetchHistoricalBySymbol(stock.symbol, p, i)
      .then(d => setChartHistory(d?.prices || []))
      .catch(() => setChartHistory([]))
      .finally(() => setChartLoading(false))
  }, [stock, period])

  // ── Fetch portfolios for ML panel ─────────────────────────────────────────
  useEffect(() => {
    fetchPortfolio()
      .then(d => {
        setPortfolios(d || [])
        if (hasPreferredMlPortId) {
          setMlPortId(preferredMlPortId)
          return
        }
        if (d?.length) setMlPortId(d[0].id)
      })
      .catch(() => {})
  }, [hasPreferredMlPortId, preferredMlPortId])

  // ── Load sentiment on demand ──────────────────────────────────────────────
  async function loadSentiment() {
    if (!stock?.symbol || sentimentData) return
    setSentimentLoading(true)
    try { setSentimentData(await fetchStockSentiment(stock.symbol)) }
    catch (e) { setSentimentData({ error: e?.response?.data?.detail || 'Failed to fetch sentiment' }) }
    finally { setSentimentLoading(false) }
  }

  // ── Load ML on demand ─────────────────────────────────────────────────────
  const loadMl = useCallback(async (portId) => {
    if (!portId) return
    setMlLoading(true); setLrData(null); setLogData(null)
    try {
      const [lr, log] = await Promise.all([
        fetchPortfolioLinearRegression(portId),
        fetchPortfolioLogisticRegression(portId),
      ])
      setLrData(lr); setLogData(log)
    } catch { setLrData({ predictions: [] }); setLogData({ predictions: [] }) }
    finally { setMlLoading(false) }
  }, [])

  useEffect(() => { if (mlOpen && mlPortId) loadMl(mlPortId) }, [mlOpen, mlPortId, loadMl])

  // ── Derived values ────────────────────────────────────────────────────────
  const livePrice   = toFin(liveData?.price) ?? toFin(stock?.price)
  const changeAmt   = toFin(liveData?.change)
  const changePct   = toFin(liveData?.change_percent)
  const volume      = toFin(liveData?.volume) ?? toFin(stock?.volume)
  const peRatio     = toFin(liveData?.pe_ratio) ?? toFin(stock?.pe_ratio)
  const marketCap   = toFin(liveData?.market_cap) ?? toFin(stock?.market_cap)
  const high52      = toFin(liveData?.['52_week_high']) ?? toFin(stock?.['52_week_high'])
  const low52       = toFin(liveData?.['52_week_low'])  ?? toFin(stock?.['52_week_low'])
  const divYield    = toFin(liveData?.dividend_yield)   ?? toFin(stock?.dividend_yield)

  const isGain = changeAmt !== null ? changeAmt >= 0 : true
  const gainColor = '#22C55E'; const lossColor = '#EF4444'
  const changeColor = isGain ? gainColor : lossColor

  // Purchase price for chart coloring
  const purchasePrice = toFin(stock?.purchase_price)

  // Exchange badge — assumes .NS = NSE, .BO = BSE
  const symbol = stock?.symbol || ''
  const exchange = symbol.endsWith('.NS') ? 'NSE' : symbol.endsWith('.BO') ? 'BSE' : 'NSE'
  const cleanSymbol = symbol.replace(/\.(NS|BO)$/, '')

  // ── Chart data ────────────────────────────────────────────────────────────
  const chartLabels = chartHistory.map(h => {
    const d = new Date(h.date)
    if (PERIODS[period].interval === '5m' || PERIODS[period].interval === '30m') {
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
    }
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: period >= 4 ? '2-digit' : undefined })
  })
  const chartValues = chartHistory.map(h => toFin(h.close_price)).filter(v => v !== null)

  const lastChartPrice  = chartValues.length ? chartValues[chartValues.length - 1] : null
  const lineColor = purchasePrice !== null && lastChartPrice !== null
    ? (lastChartPrice >= purchasePrice ? gainColor : lossColor)
    : '#0EA5E9'
  const glowColor = lineColor === gainColor
    ? 'rgba(34,197,94,'
    : lineColor === lossColor
    ? 'rgba(239,68,68,'
    : 'rgba(14,165,233,'

  const chartData = useMemo(() => ({
    labels: chartLabels,
    datasets: [{
      label: cleanSymbol,
      data: chartValues,
      borderColor: lineColor,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHoverBackgroundColor: lineColor,
      fill: true,
      backgroundColor: (ctx) => {
        if (!ctx.chart.chartArea) return `${glowColor}0)`
        const { top, bottom } = ctx.chart.chartArea
        const grad = ctx.chart.ctx.createLinearGradient(0, top, 0, bottom)
        grad.addColorStop(0, `${glowColor}0.18)`)
        grad.addColorStop(1, `${glowColor}0)`)
        return grad
      },
      tension: 0.3,
    }],
  }), [chartLabels, chartValues, lineColor, glowColor, cleanSymbol])

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#151C26',
        borderColor: '#1E2530',
        borderWidth: 1,
        titleColor: '#64748b',
        bodyColor: '#cbd5e1',
        titleFont: { family: 'Inter', size: 10 },
        bodyFont: { family: 'JetBrains Mono', size: 12 },
        padding: 10,
        callbacks: {
          title: items => items[0]?.label || '',
          label: item => {
            const idx = item.dataIndex
            const h   = chartHistory[idx]
            if (!h) return `Close: ₹${fmtINR(item.raw)}`
            const lines = [`Close  ₹${fmtINR(h.close_price)}`]
            if (h.open_price  != null) lines.push(`Open   ₹${fmtINR(h.open_price)}`)
            if (h.high_price  != null) lines.push(`High   ₹${fmtINR(h.high_price)}`)
            if (h.low_price   != null) lines.push(`Low    ₹${fmtINR(h.low_price)}`)
            if (h.volume      != null) lines.push(`Vol    ${Number(h.volume).toLocaleString('en-IN')}`)
            return lines
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#1E2530', drawBorder: false },
        ticks: {
          color: '#64748b',
          font: { family: 'Inter', size: 10 },
          maxTicksLimit: 8,
          maxRotation: 0,
        },
      },
      y: {
        position: 'right',
        grid: { color: '#1E2530', drawBorder: false },
        ticks: {
          color: '#64748b',
          font: { family: 'JetBrains Mono', size: 10 },
          callback: v => `₹${fmtINR(v, 0)}`,
        },
      },
    },
  }), [chartHistory])

  // ── ML derived (for this stock's symbol) ─────────────────────────────────
  const lrRow  = lrData?.predictions?.find(r => r.symbol === symbol)
  const logRow = logData?.predictions?.find(r => r.symbol === symbol)
  const predictedClose = toFin(lrRow?.predicted_next_close)
  const predictedChPct = toFin(lrRow?.predicted_change_percent)
  const logSignal = logRow?.signal
  const logConf   = toFin(logRow?.probability_up_next_close)

  // ── Loading / Error states ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B14] p-6">
        <style>{STYLES}</style>
        <div className="max-w-7xl mx-auto space-y-5">
          <Sk h="96px" className="rounded-2xl" />
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => <Sk key={i} h="72px" className="rounded-xl" />)}
          </div>
          <Sk h="380px" className="rounded-2xl" />
          <div className="grid md:grid-cols-2 gap-4">
            <Sk h="180px" className="rounded-2xl" />
            <Sk h="180px" className="rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !stock) {
    return (
      <div className="min-h-screen bg-[#070B14] flex items-center justify-center">
        <style>{STYLES}</style>
        <div className="text-center">
          <div className="text-4xl mb-4">📉</div>
          <div className="text-neutral-300 font-semibold">{error || 'Stock not found'}</div>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{STYLES}</style>
      <div className="min-h-screen bg-[#070B14] pb-24">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-5 space-y-4">

          {/* ═══════════════════════════════════════════════════════════════
              HERO SECTION
          ═══════════════════════════════════════════════════════════════ */}
          <div className="rounded-2xl border border-surface-700 bg-surface-900 p-5 md:p-6 fade-up"
               style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset, 0 0 40px rgba(14,165,233,0.04)' }}>

            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">

              {/* Left — symbol + name + badges */}
              <div className="min-w-0">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xs uppercase tracking-widest text-brand-500 font-medium">Stock Detail</span>
                  <span className="text-neutral-700">·</span>
                  <span className="text-2xs text-neutral-600 font-mono">ID #{id}</span>
                </div>

                {/* Symbol + exchange badge + status */}
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <h1 className="text-3xl md:text-4xl font-bold text-neutral-100 font-mono tracking-tight">
                    {cleanSymbol}
                  </h1>
                  {/* Exchange badge */}
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-bold tracking-wider"
                        style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.3)', color: '#38BDF8' }}>
                    {exchange}
                  </span>
                  {/* Market status dot */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium"
                       style={marketOpen
                         ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E' }
                         : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444' }}>
                    <span className={`w-1.5 h-1.5 rounded-full ${marketOpen ? 'dot-open bg-green-500' : 'bg-red-500'}`} />
                    {marketOpen ? 'Market Open' : 'Market Closed'}
                  </div>
                </div>

                {/* Company name + sector */}
                <div className="text-base text-neutral-400 font-medium mb-0.5">{stock.name || '—'}</div>
                {(stock.sector || stock.industry) && (
                  <div className="flex items-center gap-2 mt-1">
                    {stock.sector   && <span className="text-xs text-neutral-600 px-2 py-0.5 rounded border border-surface-700 bg-surface-800">{stock.sector}</span>}
                    {stock.industry && <span className="text-xs text-neutral-600 px-2 py-0.5 rounded border border-surface-700 bg-surface-800">{stock.industry}</span>}
                  </div>
                )}
              </div>

              {/* Right — live price + change */}
              <div className="flex-shrink-0 text-right">
                <div className="text-2xs uppercase tracking-widest text-neutral-500 mb-1">
                  {liveData ? 'Live Price' : 'Last Price'}
                </div>

                {/* Big price */}
                <div className="text-4xl md:text-5xl font-bold font-mono leading-none"
                     style={{ color: '#e2e8f0', letterSpacing: '-0.03em' }}>
                  {livePrice !== null ? `₹${fmtINR(livePrice)}` : <Sk h="52px" w="180px" />}
                </div>

                {/* Change */}
                {changeAmt !== null && (
                  <div className="flex items-center justify-end gap-2 mt-2">
                    <span className="text-xl font-bold font-mono" style={{ color: changeColor }}>
                      {isGain ? '▲' : '▼'} {isGain ? '+' : ''}₹{fmtINR(Math.abs(changeAmt))}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-sm font-bold font-mono border"
                          style={isGain
                            ? { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: gainColor }
                            : { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: lossColor }}>
                      {isGain ? '+' : ''}{changePct !== null ? changePct.toFixed(2) : '—'}%
                    </span>
                  </div>
                )}

                {/* Action row */}
                <div className="flex items-center justify-end gap-2 mt-4">
                  <AddToPortfolioButton symbol={symbol} livePrice={livePrice} />
                  <button
                    onClick={async () => {
                      setDownloading(true)
                      try { await downloadStockSummary(symbol) }
                      catch { /* silent */ }
                      finally { setDownloading(false) }
                    }}
                    disabled={downloading}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium border border-surface-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 transition-colors disabled:opacity-50"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 12l-4 4-4-4M12 3v13"/>
                    </svg>
                    {downloading ? 'Exporting…' : 'CSV'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              KEY METRICS ROW
          ═══════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: 'Market Cap',     value: fmtCompact(marketCap),                         accent: '#0EA5E9' },
              { label: 'P/E Ratio',      value: peRatio !== null ? peRatio.toFixed(2) : '—',   accent: '#8B5CF6' },
              { label: '52W High',       value: high52  !== null ? `₹${fmtINR(high52)}`  : '—', accent: '#22C55E' },
              { label: '52W Low',        value: low52   !== null ? `₹${fmtINR(low52)}`   : '—', accent: '#EF4444' },
              { label: 'Volume',         value: volume  !== null ? Number(volume).toLocaleString('en-IN') : '—', accent: '#F59E0B' },
              { label: 'Div. Yield',     value: divYield !== null ? `${divYield.toFixed(2)}%` : '—', accent: '#06B6D4' },
            ].map(card => (
              <div key={card.label}
                   className="bg-surface-900 border border-surface-700 rounded-xl p-3.5 border-t-2 transition-all hover:border-l hover:border-l-surface-700 hover:-translate-y-px duration-200"
                   style={{ borderTopColor: card.accent }}>
                <div className="text-2xs uppercase tracking-widest mb-1.5" style={{ color: card.accent + '99' }}>
                  {card.label}
                </div>
                <div className="text-sm font-bold font-mono text-neutral-200 truncate">{card.value}</div>
              </div>
            ))}
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              MAIN CHART
          ═══════════════════════════════════════════════════════════════ */}
          <div className="bg-surface-900 border border-surface-700 rounded-2xl overflow-hidden">
            {/* Chart header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-surface-700">
              <div className="flex items-center gap-2">
                <span className="inline-block w-0.5 h-4 rounded-full" style={{ background: lineColor }} />
                <span className="text-sm font-semibold text-neutral-200">{cleanSymbol} Price History</span>
                {chartLoading && (
                  <svg className="animate-spin w-3.5 h-3.5 text-neutral-600" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                )}
              </div>
              {/* Period tabs */}
              <div className="flex items-center gap-0.5 bg-surface-800 rounded-lg p-0.5 border border-surface-700">
                {PERIODS.map((p, i) => (
                  <button key={p.label} onClick={() => setPeriod(i)}
                    className="px-3 py-1 rounded-md text-xs font-medium transition-all duration-150"
                    style={i === period
                      ? { background: '#1E2530', color: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }
                      : { color: '#64748b' }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart body */}
            <div className="relative px-4 py-4" style={{ height: 360 }}>
              {chartValues.length > 0 ? (
                <Line ref={chartRef} data={chartData} options={chartOptions} />
              ) : chartLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sk h="100%" w="100%" className="rounded-none" />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-neutral-600 text-sm">
                  No price data for this period
                </div>
              )}
            </div>

            {/* 52W range bar below chart */}
            {low52 !== null && high52 !== null && livePrice !== null && (
              <div className="px-5 py-3 border-t border-surface-700 flex items-center gap-4">
                <span className="text-xs text-neutral-600 font-mono w-24 text-right">₹{fmtINR(low52)}</span>
                <div className="flex-1 h-1.5 bg-surface-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                       style={{
                         width: `${Math.min(100, Math.max(0, ((livePrice - low52) / (high52 - low52)) * 100))}%`,
                         background: lineColor,
                       }} />
                </div>
                <span className="text-xs text-neutral-600 font-mono w-24">₹{fmtINR(high52)}</span>
                <span className="text-xs text-neutral-500 whitespace-nowrap">52W Range</span>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              BOTTOM PANELS — 2 column grid
          ═══════════════════════════════════════════════════════════════ */}
          <div className="grid md:grid-cols-2 gap-4">

            {/* ── SENTIMENT PANEL ───────────────────────────────────────── */}
            <div className="bg-surface-900 border border-surface-700 rounded-2xl overflow-hidden">
              {/* Panel header */}
              <button
                onClick={() => { setSentimentOpen(v => !v); loadSentiment() }}
                className="w-full flex items-center justify-between px-5 py-3.5 border-b border-surface-700 hover:bg-surface-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-block w-0.5 h-4 rounded-full bg-purple-500" />
                  <span className="text-sm font-semibold text-neutral-200">News Sentiment</span>
                  {sentimentData && !sentimentData.error && (
                    <span className={`text-2xs font-bold px-2 py-0.5 rounded-full border ${
                      sentimentData.overall_sentiment === 'positive'
                        ? 'text-green-400 bg-green-500/10 border-green-500/30'
                        : sentimentData.overall_sentiment === 'negative'
                        ? 'text-red-400 bg-red-500/10 border-red-500/30'
                        : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                    }`}>
                      {sentimentData.overall_sentiment?.toUpperCase()}
                    </span>
                  )}
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${sentimentOpen ? 'rotate-180' : ''}`}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>

              {/* Panel body */}
              {sentimentOpen && (
                <div className="p-5 slide-up">
                  {sentimentLoading && (
                    <div className="space-y-2">
                      <Sk h="80px" className="rounded-xl" />
                      <Sk h="40px" className="rounded-lg" />
                      <Sk h="40px" className="rounded-lg" />
                    </div>
                  )}
                  {sentimentData?.error && (
                    <div className="text-sm text-loss-400 text-center py-4">{sentimentData.error}</div>
                  )}
                  {sentimentData && !sentimentData.error && !sentimentLoading && (
                    <div className="space-y-4">
                      {/* Gauge + score */}
                      <div className="flex items-center gap-6">
                        <SentimentGauge score={sentimentData.score ?? (
                          sentimentData.overall_sentiment === 'positive' ? 0.75
                          : sentimentData.overall_sentiment === 'negative' ? 0.25 : 0.5
                        )} />
                        <div>
                          <div className="text-xs text-neutral-500 uppercase tracking-widest mb-1">Overall</div>
                          <div className={`text-2xl font-bold ${
                            sentimentData.overall_sentiment === 'positive' ? 'text-green-400'
                            : sentimentData.overall_sentiment === 'negative' ? 'text-red-400'
                            : 'text-amber-400'
                          }`}>
                            {sentimentData.overall_sentiment === 'positive' ? '🐂 Bullish'
                            : sentimentData.overall_sentiment === 'negative' ? '🐻 Bearish'
                            : '↔ Neutral'}
                          </div>
                          <div className="flex gap-3 mt-2 text-xs">
                            <span className="text-green-400">✓ {sentimentData.positive_count ?? 0} positive</span>
                            <span className="text-red-400">✕ {sentimentData.negative_count ?? 0} negative</span>
                            <span className="text-amber-400">~ {sentimentData.neutral_count ?? 0} neutral</span>
                          </div>
                        </div>
                      </div>

                      {/* News list */}
                      {sentimentData.news?.length > 0 && (
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                          <div className="text-2xs uppercase tracking-widest text-neutral-500 mb-2">Recent Headlines</div>
                          {sentimentData.news.map((n, i) => (
                            <div key={i}
                                 className="flex items-start gap-2.5 p-2.5 rounded-lg bg-surface-800 border border-surface-700">
                              <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-2xs font-bold mt-0.5 ${
                                n.sentiment === 'positive' ? 'text-green-400 bg-green-500/10 border border-green-500/25'
                                : n.sentiment === 'negative' ? 'text-red-400 bg-red-500/10 border border-red-500/25'
                                : 'text-amber-400 bg-amber-500/10 border border-amber-500/25'
                              }`}>
                                {n.sentiment === 'positive' ? '▲' : n.sentiment === 'negative' ? '▼' : '='}
                              </span>
                              <div className="flex-1 text-xs leading-relaxed">
                                {n.url
                                  ? <a href={n.url} target="_blank" rel="noreferrer"
                                       className={`hover:underline ${
                                         n.sentiment === 'positive' ? 'text-green-300'
                                         : n.sentiment === 'negative' ? 'text-red-300'
                                         : 'text-neutral-300'
                                       }`}>{n.title}</a>
                                  : <span className="text-neutral-400">{n.title}</span>
                                }
                                {n.score != null && (
                                  <span className="ml-2 text-neutral-600 font-mono text-2xs">
                                    [{n.score >= 0 ? '+' : ''}{Number(n.score).toFixed(2)}]
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Collapsed state teaser */}
              {!sentimentOpen && (
                <div className="px-5 py-4 text-xs text-neutral-600 text-center">
                  Click to analyse recent news sentiment for {cleanSymbol}
                </div>
              )}
            </div>

            {/* ── ML ANALYSIS PANEL ─────────────────────────────────────── */}
            <div className="bg-surface-900 border border-surface-700 rounded-2xl overflow-hidden">
              {/* Panel header */}
              <button
                onClick={() => setMlOpen(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3.5 border-b border-surface-700 hover:bg-surface-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-block w-0.5 h-4 rounded-full bg-cyan-500" />
                  <span className="text-sm font-semibold text-neutral-200">ML Analysis</span>
                  <span className="text-2xs text-neutral-600 px-1.5 py-0.5 rounded border border-surface-700 bg-surface-800">
                    Linear · Logistic
                  </span>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${mlOpen ? 'rotate-180' : ''}`}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>

              {mlOpen && (
                <div className="p-5 space-y-4 slide-up">
                  {/* Portfolio selector */}
                  {portfolios.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-500">Portfolio:</span>
                      <select
                        value={mlPortId || ''}
                        onChange={e => { setMlPortId(Number(e.target.value)); setLrData(null); setLogData(null) }}
                        className="flex-1 px-2.5 py-1.5 rounded-lg text-xs bg-surface-800 border border-surface-700 text-neutral-300 focus:outline-none focus:border-brand-500"
                      >
                        {portfolios.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <button onClick={() => loadMl(mlPortId)} disabled={mlLoading}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-surface-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 transition-colors disabled:opacity-50">
                        {mlLoading ? '…' : '↻'}
                      </button>
                    </div>
                  )}

                  {mlLoading && (
                    <div className="space-y-3">
                      <Sk h="90px" className="rounded-xl" />
                      <Sk h="90px" className="rounded-xl" />
                    </div>
                  )}

                  {!mlLoading && (
                    <div className="grid grid-cols-1 gap-3">

                      {/* Linear Regression card */}
                      <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
                        <div className="flex items-center gap-1.5 mb-3">
                          <span className="text-2xs uppercase tracking-widest text-cyan-500/70">Linear Regression</span>
                          <span className="text-2xs text-neutral-600">— Next Close Prediction</span>
                        </div>
                        {lrRow ? (
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <div className="text-2xs text-neutral-500 mb-0.5">Current</div>
                              <div className="text-lg font-bold font-mono text-neutral-200">
                                ₹{fmtINR(lrRow.latest_close)}
                              </div>
                            </div>

                            <div className="flex-1 flex items-center justify-center">
                              <svg viewBox="0 0 24 8" className="w-10 h-3">
                                <line x1="0" y1="4" x2="24" y2="4" stroke="#334155" strokeWidth="1" strokeDasharray="2,2"/>
                              </svg>
                            </div>

                            <div className="text-right">
                              <div className="text-2xs text-neutral-500 mb-0.5">Predicted</div>
                              <div className="text-lg font-bold font-mono text-neutral-200">
                                ₹{fmtINR(predictedClose)}
                              </div>
                              {predictedChPct !== null && (
                                <div className="text-xs font-mono mt-0.5"
                                     style={{ color: predictedChPct >= 0 ? gainColor : lossColor }}>
                                  {predictedChPct >= 0 ? '▲ +' : '▼ '}{predictedChPct.toFixed(2)}%
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-neutral-600 text-center py-2">
                            {portfolios.length === 0
                              ? 'Create a portfolio and add this stock to see predictions'
                              : `${cleanSymbol} not found in selected portfolio`}
                          </div>
                        )}
                        <p className="text-2xs text-neutral-600 mt-3 leading-relaxed">
                          Linear regression fits a trendline through 60 days of closing prices to project the next session's close.
                        </p>
                      </div>

                      {/* Logistic Regression card */}
                      <div className="bg-surface-800 border border-surface-700 rounded-xl p-4">
                        <div className="flex items-center gap-1.5 mb-3">
                          <span className="text-2xs uppercase tracking-widest text-violet-500/70">Logistic Regression</span>
                          <span className="text-2xs text-neutral-600">— Direction Signal</span>
                        </div>
                        {logRow ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <SignalBadge signal={logSignal} size="lg" />
                              <div className="text-right">
                                <div className="text-2xs text-neutral-500 mb-0.5">Up Probability</div>
                                <div className="text-xl font-bold font-mono"
                                     style={{ color: logSignal === 'BUY' ? gainColor : logSignal === 'SELL' ? lossColor : '#F59E0B' }}>
                                  {logConf !== null ? `${(logConf * 100).toFixed(1)}%` : '—'}
                                </div>
                              </div>
                            </div>
                            {/* Confidence bar */}
                            {logConf !== null && (
                              <div>
                                <div className="flex justify-between text-2xs text-neutral-600 mb-1">
                                  <span>Confidence</span>
                                  <span>{(logConf * 100).toFixed(1)}%</span>
                                </div>
                                <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full transition-all duration-700"
                                       style={{
                                         width: `${logConf * 100}%`,
                                         background: logSignal === 'BUY' ? gainColor : logSignal === 'SELL' ? lossColor : '#F59E0B',
                                       }} />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-neutral-600 text-center py-2">
                            {portfolios.length === 0
                              ? 'Add this stock to a portfolio to see directional signals'
                              : `${cleanSymbol} not found in selected portfolio`}
                          </div>
                        )}
                        <p className="text-2xs text-neutral-600 mt-3 leading-relaxed">
                          Logistic regression classifies next-day price direction using lagged returns and momentum features. Confidence reflects model probability.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!mlOpen && (
                <div className="px-5 py-4 text-xs text-neutral-600 text-center">
                  Click to view Linear &amp; Logistic Regression predictions for {cleanSymbol}
                </div>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              COMPANY DETAILS CARD
          ═══════════════════════════════════════════════════════════════ */}
          <div className="bg-surface-900 border border-surface-700 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-block w-0.5 h-4 rounded-full bg-amber-500" />
              <span className="text-sm font-semibold text-neutral-200">Company Details</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Sector',       value: stock.sector        || '—' },
                { label: 'Industry',     value: stock.industry      || '—' },
                { label: 'Dividend Yield', value: divYield !== null ? `${divYield.toFixed(2)}%` : '—' },
                { label: '52W Range',    value: (low52 !== null && high52 !== null) ? `₹${fmtINR(low52)} – ₹${fmtINR(high52)}` : '—' },
              ].map(item => (
                <div key={item.label}>
                  <div className="text-2xs uppercase tracking-widest text-neutral-600 mb-1">{item.label}</div>
                  <div className="text-sm font-medium text-neutral-300 font-mono truncate">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
