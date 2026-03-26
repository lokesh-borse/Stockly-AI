import { useEffect, useMemo, useState, useRef, lazy, Suspense, Fragment } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LinearScale, PointElement, Tooltip, Legend, Chart as ChartJS } from 'chart.js'
import {
  addStockToPortfolio, createPortfolio, fetchHistoricalBySymbol, fetchLiveStockBySymbol,
  fetchPortfolioById, fetchPortfolioLinearRegression, fetchPortfolioLogisticRegression,
  fetchPortfolioClusters, fetchGrowthAnalysis, fetchPortfolioRating,
  fetchSummaryReport, fetchRecommendStocks, fetchRecommendedPortfolios,
  removeStockFromPortfolio, searchLiveStocks,
} from '../api/stocks.js'
import MpinModal from '../components/MpinModal.jsx'
import {
  MLForecastTab, ClusterTab, GrowthTab, SummaryTab, RecommendTab,
} from '../components/portfolio/AnalyticsTabs.jsx'

ChartJS.register(LinearScale, PointElement, Tooltip, Legend)

// ── Inline keyframes ──────────────────────────────────────────────────────────
const STYLES = `
  @keyframes shimmer { from{background-position:-200% 0} to{background-position:200% 0} }
  @keyframes spin-slow { to { transform: rotate(360deg) } }
  @keyframes slide-in { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes fade-up  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:.2} }
  .shimmer { background:linear-gradient(90deg,#151C26 25%,#1E2530 50%,#151C26 75%);
             background-size:200% 100%; animation:shimmer 2s linear infinite; border-radius:4px; }
  .drawer-open { animation: slide-in 0.3s ease-out both; }
  .fade-up { animation: fade-up 0.35s ease-out both; }
  .dot-live { animation: blink 1.2s ease-in-out infinite; }
`

// ── Helpers ───────────────────────────────────────────────────────────────────
function toFin(v) { const n = Number(v); return Number.isFinite(n) ? n : null }
function fmtINR(v, d = 2) {
  const n = toFin(v); if (n === null) return '—'
  return n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })
}
function fmtPct(v, d = 2) { const n = toFin(v); return n === null ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(d)}%` }

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Sk = ({ h = '14px', w = '100%', className = '' }) => (
  <span className={`block shimmer ${className}`} style={{ height: h, width: w }} />
)

// ── Star Rating ───────────────────────────────────────────────────────────────
const Stars = ({ count }) => (
  <span>
    {[1,2,3,4,5].map(i => (
      <span key={i} style={{ color: i <= count ? '#F59E0B' : '#334155', fontSize: 14 }}>★</span>
    ))}
  </span>
)

// ── Sort icon ─────────────────────────────────────────────────────────────────
const SortIco = ({ dir }) => (
  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 inline ml-0.5 opacity-50">
    <path d="M8 3L5 7h6L8 3Z" opacity={dir === 'asc' ? 1 : 0.3}/>
    <path d="M8 13L5 9h6L8 13Z" opacity={dir === 'desc' ? 1 : 0.3}/>
  </svg>
)

// ── MPIN Modal (dark redesign) ────────────────────────────────────────────────
import { verifyMpin } from '../api/stocks.js'
function DarkMpinModal({ open, title, onSuccess, onClose }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const refs = useRef([])

  function handleDigit(idx, val) {
    if (!/^\d?$/.test(val)) return
    const arr = pin.split('')
    arr[idx] = val
    const next = arr.join('').slice(0, 6)
    setPin(next); setError('')
    if (val && idx < 5) refs.current[idx + 1]?.focus()
  }
  function handleKey(idx, e) {
    if (e.key === 'Backspace' && !pin[idx] && idx > 0) refs.current[idx - 1]?.focus()
  }
  function close() { setPin(''); setError(''); onClose() }

  async function submit(e) {
    e.preventDefault()
    if (pin.length !== 6) { setError('Enter all 6 digits'); return }
    setLoading(true); setError('')
    try {
      const res = await verifyMpin(pin)
      if (res.mpin_valid) { setPin(''); onSuccess() }
      else setError('Incorrect MPIN. Try again.')
    } catch (err) {
      setError(err?.response?.data?.detail || 'Incorrect MPIN.')
    } finally { setLoading(false) }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-xs mx-4 bg-surface-900 border border-surface-700 rounded-2xl p-7 shadow-2xl fade-up"
        style={{ boxShadow: '0 0 0 1px rgba(14,165,233,0.08), 0 24px 48px rgba(0,0,0,0.7)' }}>
        {/* Icon */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 text-2xl mb-3">🔐</div>
          <h2 className="text-base font-bold text-neutral-100">{title}</h2>
          <p className="text-xs text-neutral-500 mt-1">Enter your 6-digit MPIN to confirm</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* 6 dot inputs */}
          <div className="flex justify-center gap-2.5">
            {[0,1,2,3,4,5].map(i => (
              <input
                key={i}
                ref={el => refs.current[i] = el}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={pin[i] || ''}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKey(i, e)}
                className="w-10 h-12 text-center text-xl font-bold font-mono rounded-lg
                  bg-surface-800 border border-surface-700 text-neutral-200
                  focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50
                  transition-all duration-150"
                aria-label={`PIN digit ${i + 1}`}
              />
            ))}
          </div>

          {/* Filled dot indicator */}
          <div className="flex justify-center gap-1.5">
            {[0,1,2,3,4,5].map(i => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors duration-150
                ${i < pin.length ? 'bg-brand-500' : 'bg-surface-700'}`} />
            ))}
          </div>

          {error && (
            <p className="text-xs text-loss-400 text-center bg-loss-500/10 border border-loss-500/20 rounded-lg py-2">{error}</p>
          )}

          <div className="flex gap-2.5">
            <button type="button" onClick={close}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium text-neutral-400 border border-surface-700 hover:border-neutral-600 hover:text-neutral-300 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading || pin.length !== 6}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg,#0369a1,#0EA5E9)' }}>
              {loading ? (
                <span className="flex items-center justify-center gap-1.5">
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                  Verifying…
                </span>
              ) : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Add Stock Drawer ──────────────────────────────────────────────────────────
function AddStockDrawer({ open, onClose, query, setQuery, suggestions, onAdd }) {
  return (
    <>
      {/* Overlay */}
      {open && <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />}

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-sm z-50 bg-surface-900 border-l border-surface-700 shadow-2xl
        flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
          <div>
            <h3 className="text-sm font-semibold text-neutral-200">Add Stock</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Search NSE/BSE listed stocks</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-200 hover:bg-surface-800 transition-colors">
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-surface-700">
          <div className="relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Type company e.g. Reliance, TCS…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus={open}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm
                bg-surface-800 border border-surface-700 text-neutral-200 placeholder-neutral-600
                focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 transition-all"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {suggestions.length === 0 && query && (
            <div className="text-center py-8 text-neutral-500 text-xs">No results found for "{query}"</div>
          )}
          {suggestions.length === 0 && !query && (
            <div className="text-center py-10 text-neutral-600 text-xs">Start typing to search stocks…</div>
          )}
          {suggestions.map(s => (
            <div key={s.symbol}
              className="flex items-center justify-between p-3 rounded-lg bg-surface-800 border border-surface-700 hover:border-brand-700 transition-colors">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-neutral-200">{s.symbol}</div>
                <div className="text-xs text-neutral-500 truncate">{s.name}</div>
                {s.current_price && (
                  <div className="text-xs font-mono text-brand-400 mt-0.5">₹{parseFloat(s.current_price).toFixed(2)}</div>
                )}
              </div>
              <button onClick={() => onAdd(s.symbol)}
                className="ml-3 flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 transition-colors">
                Add
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'lr',      label: 'ML Forecast',      icon: '📈' },
  { id: 'cluster', label: 'Cluster Analysis',  icon: '⬡' },
  { id: 'growth',  label: 'Growth Analysis',   icon: '📊' },
  { id: 'summary', label: 'AI Summary',        icon: '✦' },
  { id: 'reco',    label: 'Recommendations',   icon: '💡' },
]

export default function PortfolioDetail() {
  const { id, market, sector } = useParams()
  const isRecommendedView = Boolean(market && sector)
  const decodedMarket = decodeURIComponent(market || '')
  const decodedSector = decodeURIComponent(sector || '')
  const recommendedStorageKey = 'recommended_portfolio_id_map_v1'
  const recommendedMapKey = `${decodedMarket.toLowerCase()}::${decodedSector.toLowerCase()}`

  // ── Core state (unchanged from original) ─────────────────────────────────
  const [portfolio,       setPortfolio]       = useState(null)
  const [query,           setQuery]           = useState('')
  const [suggestions,     setSuggestions]     = useState([])
  const [message,         setMessage]         = useState('')
  const [metricsMap,      setMetricsMap]      = useState({})
  const [lrData,          setLrData]          = useState(null)
  const [lrLoading,       setLrLoading]       = useState(false)
  const [logData,         setLogData]         = useState(null)
  const [logLoading,      setLogLoading]      = useState(false)
  const [refreshingAll,   setRefreshingAll]   = useState(false)
  const [growthData,      setGrowthData]      = useState(null)
  const [growthLoading,   setGrowthLoading]   = useState(false)
  const [ratingData,      setRatingData]      = useState(null)
  const [summaryData,     setSummaryData]     = useState(null)
  const [summaryLoading,  setSummaryLoading]  = useState(false)
  const [recommendData,   setRecommendData]   = useState(null)
  const [recommendLoading,setRecommendLoading]= useState(false)
  const [mpinOpen,        setMpinOpen]        = useState(false)
  const [pendingRemove,   setPendingRemove]   = useState(null)
  const [activePortfolioId, setActivePortfolioId] = useState(isRecommendedView ? null : id)

  // ── UI-only state ─────────────────────────────────────────────────────────
  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const [activeTab,   setActiveTab]   = useState(null)   // null = collapsed
  const [sortKey,     setSortKey]     = useState('symbol')
  const [sortDir,     setSortDir]     = useState('asc')
  const [expandedRow, setExpandedRow] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // ── API calls (all unchanged logic from original) ─────────────────────────
  function getRecommendedIdMap() {
    try {
      const raw = localStorage.getItem(recommendedStorageKey)
      const parsed = raw ? JSON.parse(raw) : {}
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }

  function saveRecommendedIdMap(map) {
    localStorage.setItem(recommendedStorageKey, JSON.stringify(map))
  }

  async function ensureRecommendedPortfolioId() {
    const idMap = getRecommendedIdMap()
    const cachedId = idMap[recommendedMapKey]
    if (cachedId) {
      try {
        await fetchPortfolioById(cachedId)
        return cachedId
      } catch {}
    }

    const data = await fetchRecommendedPortfolios(decodedMarket)
    const markets = Array.isArray(data?.markets) ? data.markets : []
    const marketItem = markets.find(
      (m) => String(m?.market || '').toLowerCase() === decodedMarket.toLowerCase()
    ) || markets[0]
    const sectorItem = (marketItem?.sectors || []).find(
      (s) => String(s?.sector || '').toLowerCase() === decodedSector.toLowerCase()
    )
    if (!marketItem || !sectorItem) throw new Error('Recommended portfolio not found')

    const created = await createPortfolio({
      name: `${sectorItem.sector} (${marketItem.market})`,
      description: `auto-generated from stock_universe symbols in sector: ${sectorItem.sector} (${marketItem.market})`,
    })

    const today = new Date().toISOString().slice(0, 10)
    await Promise.all(
      (sectorItem.stocks || []).map((stock) =>
        addStockToPortfolio(created.id, stock.symbol, 1, 0, today).catch(() => null)
      )
    )

    const nextMap = { ...idMap, [recommendedMapKey]: created.id }
    saveRecommendedIdMap(nextMap)
    return created.id
  }

  async function loadPortfolio() {
    try {
      const portfolioId = isRecommendedView ? await ensureRecommendedPortfolioId() : id
      setActivePortfolioId(portfolioId)
      const d = await fetchPortfolioById(portfolioId)
      setPortfolio(d)
    } catch {
      setMessage('Failed to load portfolio')
    }
  }

  async function loadLinearRegression(portfolioId) {
    if (!portfolioId) return
    setLrLoading(true)
    try { setLrData(await fetchPortfolioLinearRegression(portfolioId)) }
    catch { setLrData({ predictions: [], skipped: [] }) }
    finally { setLrLoading(false) }
  }
  async function loadLogisticRegression(portfolioId) {
    if (!portfolioId) return
    setLogLoading(true)
    try { setLogData(await fetchPortfolioLogisticRegression(portfolioId)) }
    catch { setLogData({ predictions: [], skipped: [] }) }
    finally { setLogLoading(false) }
  }
  async function loadGrowthAnalysis(portfolioId) {
    if (!portfolioId) return
    setGrowthLoading(true)
    try { setGrowthData(await fetchGrowthAnalysis(portfolioId)) }
    catch (e) { setGrowthData({ error: e?.response?.data?.detail || 'Failed' }) }
    finally { setGrowthLoading(false) }
  }
  async function loadSummary(portfolioId) {
    if (!portfolioId) return
    setSummaryLoading(true)
    try { setSummaryData(await fetchSummaryReport(portfolioId)) }
    catch (e) { setSummaryData({ error: e?.response?.data?.detail || 'Failed' }) }
    finally { setSummaryLoading(false) }
  }
  async function loadRecommend(portfolioId) {
    if (!portfolioId) return
    setRecommendLoading(true)
    try {
      const params = {}
      if (decodedSector) params.sector = decodedSector
      if (decodedMarket) params.market = decodedMarket
      setRecommendData(await fetchRecommendStocks(portfolioId, params))
    }
    catch (e) { setRecommendData({ error: e?.response?.data?.detail || 'Failed' }) }
    finally { setRecommendLoading(false) }
  }
  async function loadRating(portfolioId) {
    if (!portfolioId) return
    try { setRatingData(await fetchPortfolioRating(portfolioId)) } catch {}
  }

  useEffect(() => { loadPortfolio() }, [id, isRecommendedView, decodedMarket, decodedSector])
  useEffect(() => {
    if (!activePortfolioId) return
    loadLinearRegression(activePortfolioId)
    loadLogisticRegression(activePortfolioId)
    loadRating(activePortfolioId)
  }, [activePortfolioId])

  // ── Debounced stock search ─────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!query.trim()) { setSuggestions([]); return }
      try { setSuggestions(await searchLiveStocks(query, 8) || []) }
      catch { setSuggestions([]) }
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  // ── Load live price + 52W range per stock ─────────────────────────────────
  useEffect(() => {
    async function loadHistory() {
      if (!portfolio?.stocks?.length) { setMetricsMap({}); return }
      const pairs = await Promise.all(
        portfolio.stocks.map(async (s) => {
          try {
            const [live, d] = await Promise.all([
              fetchLiveStockBySymbol(s.symbol).catch(() => null),
              fetchHistoricalBySymbol(s.symbol, '1y', '1d'),
            ])
            const prices = d?.prices || []
            const livePrice = Number(live?.price)
            const lastLive = Number.isFinite(livePrice) ? livePrice : null
            if (!prices.length) return [s.symbol, { last: lastLive, min365: null, max365: null }]
            const closes = prices.map(p => Number(p.close_price)).filter(v => Number.isFinite(v))
            if (!closes.length) return [s.symbol, { last: lastLive, min365: null, max365: null }]
            return [s.symbol, {
              last: lastLive ?? closes[closes.length - 1],
              min365: Math.min(...closes),
              max365: Math.max(...closes),
            }]
          } catch { return [s.symbol, { last: null, min365: null, max365: null }] }
        })
      )
      setMetricsMap(Object.fromEntries(pairs))
    }
    loadHistory()
  }, [portfolio])

  // ── Memoised lookups ──────────────────────────────────────────────────────
  const lrBySymbol  = useMemo(() => Object.fromEntries((lrData?.predictions || []).map(r => [r.symbol, r])), [lrData])
  const logBySymbol = useMemo(() => Object.fromEntries((logData?.predictions || []).map(r => [r.symbol, r])), [logData])

  const holdingsRows = useMemo(() => {
    if (!portfolio?.stocks?.length) return []
    return portfolio.stocks.map(s => {
      const m   = metricsMap[s.symbol] || {}
      const lr  = lrBySymbol[s.symbol]
      const log = logBySymbol[s.symbol]
      const last = toFin(m.last)
      const avg  = toFin(s.purchase_price)
      const qty  = toFin(s.quantity) ?? 0
      const pnl  = last !== null && avg !== null ? (last - avg) * qty : toFin(s.pnl)
      const pnlPct = avg && avg > 0 && last !== null ? ((last - avg) / avg) * 100 : toFin(s.pnl_pct)
      return {
        ...s,
        last, avg, qty,
        min365: toFin(m.min365),
        max365: toFin(m.max365),
        discount: last !== null && m.max365 > 0 ? ((m.max365 - last) / m.max365) * 100 : null,
        pnl, pnlPct,
        predictedNextClose:   toFin(lr?.predicted_next_close),
        predictedChangePct:   toFin(lr?.predicted_change_percent),
        signal: log?.signal || null,
      }
    })
  }, [portfolio, metricsMap, lrBySymbol, logBySymbol])

  // ── Portfolio totals ──────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const invested = holdingsRows.reduce((acc, s) => acc + (s.avg || 0) * s.qty, 0)
    const current  = holdingsRows.reduce((acc, s) => {
      const price = s.last ?? s.current_price ?? 0
      return acc + price * s.qty
    }, 0)
    const pnl    = current - invested
    const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0
    const best   = [...holdingsRows].sort((a, b) => (b.pnlPct ?? -999) - (a.pnlPct ?? -999))[0]
    return { invested, current, pnl, pnlPct, best }
  }, [holdingsRows])

  // ── Sorted holdings ───────────────────────────────────────────────────────
  const sortedRows = useMemo(() => {
    return [...holdingsRows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [holdingsRows, sortKey, sortDir])

  function handleSort(key) {
    setSortKey(key); setSortDir(k => k === key ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc')
    setSortKey(key)
    setSortDir(prev => sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc')
  }

  // ── Add / Remove ──────────────────────────────────────────────────────────
  async function onAdd(symbol) {
    if (!activePortfolioId) return
    try {
      await addStockToPortfolio(activePortfolioId, symbol, 1, 0, new Date().toISOString().slice(0, 10))
      setMessage(`${symbol} added to portfolio`)
      setQuery(''); setSuggestions([])
      setDrawerOpen(false)
      await loadPortfolio(); await loadLinearRegression(activePortfolioId); await loadLogisticRegression(activePortfolioId)
    } catch { setMessage('Failed to add stock') }
  }
  function requestRemove(symbol) { setPendingRemove(symbol); setMpinOpen(true) }
  async function onRemove() {
    if (!activePortfolioId) return
    const sym = pendingRemove; setMpinOpen(false); setPendingRemove(null)
    try {
      await removeStockFromPortfolio(activePortfolioId, sym)
      setMessage(`${sym} removed`)
      await loadPortfolio(); await loadLinearRegression(activePortfolioId); await loadLogisticRegression(activePortfolioId)
    } catch { setMessage('Remove failed') }
  }

  // ── Tab toggle (lazy load) ────────────────────────────────────────────────
  function toggleTab(tab) {
    if (activeTab === tab) { setActiveTab(null); return }
    setActiveTab(tab)
    if (tab === 'growth'  && !growthData)   loadGrowthAnalysis(activePortfolioId)
    if (tab === 'summary' && !summaryData)  loadSummary(activePortfolioId)
    if (tab === 'reco') loadRecommend(activePortfolioId)
  }

  async function onRefreshAll() {
    if (!activePortfolioId) return
    setRefreshingAll(true)
    await Promise.all([loadPortfolio(), loadLinearRegression(activePortfolioId), loadLogisticRegression(activePortfolioId)])
    setLastRefresh(new Date()); setRefreshingAll(false)
  }

  // ── Render states ─────────────────────────────────────────────────────────
  if (!portfolio) {
    return (
      <div className="min-h-screen bg-[#070B14] p-6">
        <style>{STYLES}</style>
        <div className="max-w-7xl mx-auto space-y-4">
          <Sk h="64px" className="rounded-xl" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Sk key={i} h="80px" className="rounded-xl" />)}
          </div>
          <Sk h="400px" className="rounded-xl" />
        </div>
      </div>
    )
  }

  const hasGain = totals.pnl >= 0
  const pnlColor = hasGain ? '#22C55E' : '#EF4444'

  return (
    <>
      <style>{STYLES}</style>
      <div className="min-h-screen bg-[#070B14] pb-24">
        <div className="max-w-[1700px] mx-auto px-4 md:px-6 py-5 space-y-5">

          {/* ═══════════════════════════════════════════════════════════════
              HEADER BAR
          ═══════════════════════════════════════════════════════════════ */}
          <div className="rounded-xl border border-surface-700 bg-surface-900 p-5"
            style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset' }}>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">

              {/* Left — name, rating, description */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xs uppercase tracking-widest text-brand-500 font-medium">Portfolio</span>
                  <span className="text-neutral-700">·</span>
                  <span className="text-2xs text-neutral-600 font-mono">#{activePortfolioId ?? id}</span>
                </div>
                <h1 className="text-2xl font-bold text-neutral-100 truncate">{portfolio.name}</h1>
                {portfolio.description && (
                  <p className="text-xs text-neutral-500 mt-1">{portfolio.description}</p>
                )}
                {/* Star rating */}
                {ratingData && (
                  <div className="flex items-center gap-2 mt-2">
                    <Stars count={ratingData.stars} />
                    <span className={`text-xs font-medium px-2 py-0.5 rounded border
                      ${ratingData.stars >= 4 ? 'text-gain-400 bg-gain-500/10 border-gain-500/25'
                        : ratingData.stars >= 3 ? 'text-amber-400 bg-amber-500/10 border-amber-500/25'
                        : 'text-loss-400 bg-loss-500/10 border-loss-500/25'}`}>
                      {ratingData.label}
                    </span>
                    <span className="text-xs font-mono text-neutral-500">Score: {ratingData.score}</span>
                  </div>
                )}
              </div>

              {/* Right — Total value + P&L */}
              <div className="flex-shrink-0 text-right">
                <div className="text-2xs uppercase tracking-widest text-neutral-500 mb-1">Total Portfolio Value</div>
                <div className="text-3xl font-bold font-mono text-neutral-100">
                  ₹{fmtINR(totals.current)}
                </div>
                <div className="flex items-center justify-end gap-2 mt-1">
                  <span className="text-base font-semibold font-mono" style={{ color: pnlColor }}>
                    {hasGain ? '▲' : '▼'} ₹{fmtINR(Math.abs(totals.pnl))}
                  </span>
                  <span className={`text-xs font-mono px-1.5 py-0.5 rounded border
                    ${hasGain ? 'text-gain-400 bg-gain-500/10 border-gain-500/25' : 'text-loss-400 bg-loss-500/10 border-loss-500/25'}`}>
                    {fmtPct(totals.pnlPct)}
                  </span>
                </div>
                <div className="text-2xs text-neutral-600 mt-2 font-mono">
                  ⌚ {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} IST
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              QUICK STATS ROW
          ═══════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => toggleTab(tab.id)}
                  className={`text-left bg-surface-900 border rounded-xl p-4 border-t-2 transition-all duration-150
                    ${isActive
                      ? 'border-brand-600 bg-brand-500/5'
                      : 'border-surface-700 hover:border-brand-700/70 hover:bg-surface-800/80'}`}
                  style={{ borderTopColor: isActive ? '#0EA5E9' : '#334155' }}
                >
                  <div className="text-2xs uppercase tracking-widest text-neutral-500 mb-1">
                    {tab.label}
                  </div>
                  <div className={`text-base font-semibold truncate ${isActive ? 'text-brand-300' : 'text-neutral-200'}`}>
                    {tab.icon} {tab.label}
                  </div>
                  <div className="text-2xs text-neutral-500 mt-1">
                    Click to open analytics tab
                  </div>
                </button>
              )
            })}
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              ANALYTICS TABS
          ═══════════════════════════════════════════════════════════════ */}
          <div className="bg-surface-900 border border-surface-700 rounded-xl overflow-hidden">
            {/* Tab bar */}
            <div className="flex overflow-x-auto border-b border-surface-700 no-scrollbar">
              {TABS.map(tab => {
                const isActive = activeTab === tab.id
                return (
                  <button key={tab.id} onClick={() => toggleTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-all duration-150 flex-shrink-0
                      ${isActive
                        ? 'border-brand-500 text-brand-400 bg-brand-500/5'
                        : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-surface-800'}`}>
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Tab content — lazy rendered with Suspense fallback */}
            {activeTab && (
              <div className="fade-up">
                <Suspense fallback={
                  <div className="p-6 space-y-3">
                    {Array.from({length:4}).map((_,i) => (
                      <Sk key={i} h="14px" className="rounded" w={i % 2 === 0 ? '80%' : '60%'} />
                    ))}
                  </div>
                }>
                  {activeTab === 'lr'      && <MLForecastTab lrData={lrData} loading={lrLoading} />}
                  {activeTab === 'cluster' && <ClusterTab portfolioId={activePortfolioId} fetchFn={fetchPortfolioClusters} />}
                  {activeTab === 'growth'  && <GrowthTab growthData={growthData} loading={growthLoading} />}
                  {activeTab === 'summary' && <SummaryTab summaryData={summaryData} loading={summaryLoading} />}
                  {activeTab === 'reco'    && <RecommendTab recommendData={recommendData} loading={recommendLoading} onAdd={onAdd} />}
                </Suspense>
              </div>
            )}

            {!activeTab && (
              <div className="px-5 py-6 text-xs text-neutral-600">
                Select a tab above to view analytics for this portfolio.
              </div>
            )}
          </div>


          {/* ═══════════════════════════════════════════════════════════════
              HOLDINGS TABLE
          ═══════════════════════════════════════════════════════════════ */}
          <div className="bg-surface-900 border border-surface-700 rounded-xl overflow-hidden">

            {/* Table toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700 bg-surface-950/40">
              <div className="flex items-center gap-2">
                <span className="inline-block w-0.5 h-4 bg-brand-500 rounded-full" />
                <span className="text-sm font-semibold text-neutral-200">Holdings</span>
                <span className="text-xs text-neutral-600 ml-1">({holdingsRows.length} stocks)</span>
                {/* Live dot */}
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-gain-500 dot-live ml-1" />
              </div>
              <div className="flex items-center gap-2">
                {message && (
                  <span className="text-xs text-gain-400 bg-gain-500/10 border border-gain-500/20 px-2.5 py-1 rounded-lg">
                    ✓ {message}
                  </span>
                )}
                <button onClick={onRefreshAll} disabled={refreshingAll || lrLoading || logLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-surface-700
                    text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 transition-colors disabled:opacity-50">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`w-3.5 h-3.5 ${refreshingAll ? 'animate-spin' : ''}`}>
                    <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                  {refreshingAll ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs min-w-[1100px]">
                <thead>
                  <tr className="border-b border-surface-700 bg-surface-950/60">
                    {[
                      { key: 'symbol',          label: 'Symbol',        align: 'left'  },
                      { key: 'name',            label: 'Company',       align: 'left'  },
                      { key: 'qty',             label: 'Qty',           align: 'right' },
                      { key: 'last',            label: 'LTP',           align: 'right' },
                      { key: null,              label: 'Cur. Value',    align: 'right' },
                      { key: 'pnl',             label: 'P&L (₹)',       align: 'right' },
                      { key: 'predictedNextClose', label: 'LR Pred.',   align: 'right' },
                      { key: 'signal',          label: 'Signal',        align: 'center'},
                      { key: null,              label: 'Actions',       align: 'center'},
                    ].map((col, i) => (
                      <th key={i}
                        onClick={col.key ? () => handleSort(col.key) : undefined}
                        className={`px-3 py-2.5 text-2xs uppercase tracking-widest text-neutral-500 whitespace-nowrap
                          ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                          ${col.key ? 'cursor-pointer hover:text-neutral-300 select-none' : ''}`}>
                        {col.label}
                        {col.key && <SortIco dir={sortKey === col.key ? sortDir : null} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                {sortedRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <svg viewBox="0 0 120 90" className="w-28 h-20 opacity-60">
                            <rect width="120" height="90" fill="#080C12" rx="8"/>
                            <line x1="0" y1="22" x2="120" y2="22" stroke="#1E2530" strokeWidth="1"/>
                            <line x1="0" y1="44" x2="120" y2="44" stroke="#1E2530" strokeWidth="1"/>
                            <line x1="0" y1="66" x2="120" y2="66" stroke="#1E2530" strokeWidth="1"/>
                            <rect x="8" y="30" width="30" height="8" rx="2" fill="#1E2530"/>
                            <rect x="46" y="30" width="20" height="8" rx="2" fill="#1E2530"/>
                            <rect x="74" y="30" width="16" height="8" rx="2" fill="#1E2530"/>
                            <rect x="97" y="30" width="16" height="8" rx="2" fill="#1E2530"/>
                            <rect x="8" y="52" width="24" height="8" rx="2" fill="#1E2530"/>
                            <rect x="46" y="52" width="20" height="8" rx="2" fill="#1E2530"/>
                            <rect x="74" y="52" width="16" height="8" rx="2" fill="#1E2530"/>
                            <rect x="97" y="52" width="16" height="8" rx="2" fill="#1E2530"/>
                            <circle cx="60" cy="45" r="14" fill="#0D1117" stroke="#0EA5E9" strokeWidth="1.5" opacity="0.9"/>
                            <line x1="60" y1="39" x2="60" y2="51" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round"/>
                            <line x1="54" y1="45" x2="66" y2="45" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                          <div className="text-sm font-medium" style={{ color: '#64748b' }}>No stocks in this portfolio yet</div>
                          <div className="text-xs" style={{ color: '#334155' }}>Use the + button below to add stocks</div>
                        </div>
                      </td>
                    </tr>
                  ) : sortedRows.map((s, idx) => {
                    const isGain = (s.pnlPct ?? 0) >= 0
                    const rowBg  = isGain ? 'rgba(34,197,94,0.03)' : 'rgba(239,68,68,0.03)'
                    const ltpColor = isGain ? '#22C55E' : '#EF4444'
                    const curVal = ((s.last ?? s.current_price ?? 0) * s.qty)
                    const stockLink = s.stock_id ? `/stocks/${s.stock_id}` : `/stocks/live/${encodeURIComponent(s.symbol)}`
                    const signalCfg = {
                      BUY:  { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  color: '#22C55E' },
                      HOLD: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', color: '#F59E0B' },
                      SELL: { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  color: '#EF4444' },
                    }[s.signal] || null

                    return (
                      <Fragment key={s.id ?? s.symbol}>
                        <tr
                          className="border-b border-surface-700/50 transition-colors duration-100 cursor-pointer"
                          style={{ background: expandedRow === s.symbol ? 'rgba(14,165,233,0.04)' : rowBg }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(14,165,233,0.04)'}
                          onMouseLeave={e => e.currentTarget.style.background = expandedRow === s.symbol ? 'rgba(14,165,233,0.04)' : rowBg}
                          onClick={() => setExpandedRow(expandedRow === s.symbol ? null : s.symbol)}
                        >
                          {/* Symbol — sticky */}
                          <td className="px-3 py-2.5 font-semibold text-left sticky left-0 bg-surface-900 z-[5]">
                            <Link to={stockLink}
                              state={{ portfolioId: activePortfolioId, fromRecommended: isRecommendedView }}
                              onClick={e => e.stopPropagation()}
                              className="text-brand-400 hover:text-brand-300 transition-colors font-mono">
                              {s.symbol}
                            </Link>
                          </td>
                          <td className="px-3 py-2.5 text-neutral-400 truncate max-w-[140px]">{s.name}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-neutral-300">{s.qty}</td>
                          {/* LTP with live dot */}
                          <td className="px-3 py-2.5 text-right font-mono font-medium" style={{ color: ltpColor }}>
                            <span className="inline-flex items-center justify-end gap-1">
                              <span className="inline-block w-1 h-1 rounded-full dot-live" style={{ background: ltpColor }} />
                              {s.last !== null ? `₹${fmtINR(s.last)}` : '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-neutral-300">
                            {curVal > 0 ? `₹${fmtINR(curVal)}` : '—'}
                          </td>
                          {/* P&L ₹ */}
                          <td className="px-3 py-2.5 text-right font-mono font-medium"
                            style={{ color: (s.pnl ?? 0) >= 0 ? '#22C55E' : '#EF4444' }}>
                            {s.pnl !== null ? `₹${fmtINR(Math.abs(s.pnl))}` : '—'}
                          </td>
                          {/* LR Prediction */}
                          <td className="px-3 py-2.5 text-right font-mono">
                            {s.predictedNextClose !== null ? (
                              <span className="text-neutral-400">
                                ₹{fmtINR(s.predictedNextClose)}
                                {s.predictedChangePct !== null && (
                                  <span className={`ml-1 ${s.predictedChangePct >= 0 ? 'text-gain-500' : 'text-loss-500'}`}>
                                    ({s.predictedChangePct >= 0 ? '+' : ''}{s.predictedChangePct.toFixed(1)}%)
                                  </span>
                                )}
                              </span>
                            ) : (lrLoading ? <span className="shimmer inline-block w-16 h-3 rounded" /> : '—')}
                          </td>
                          {/* Signal badge */}
                          <td className="px-3 py-2.5 text-center">
                            {signalCfg ? (
                              <span className="text-2xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded border"
                                style={{ color: signalCfg.color, background: signalCfg.bg, borderColor: signalCfg.border }}>
                                {s.signal}
                              </span>
                            ) : logLoading ? <span className="shimmer inline-block w-10 h-4 rounded" /> : '—'}
                          </td>
                          {/* Actions */}
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                              <Link to={stockLink}
                                state={{ portfolioId: activePortfolioId, fromRecommended: isRecommendedView }}
                                className="px-2 py-1 rounded text-2xs font-medium text-brand-400 border border-brand-500/20 bg-brand-500/5 hover:bg-brand-500/15 transition-colors">
                                View
                              </Link>
                              <button onClick={() => requestRemove(s.symbol)}
                                className="px-2 py-1 rounded text-2xs font-medium text-loss-400 border border-loss-500/20 bg-loss-500/5 hover:bg-loss-500/15 transition-colors">
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded mini-detail row */}
                        {expandedRow === s.symbol && (
                          <tr key={`${s.symbol}-expand`} className="border-b border-surface-700/50">
                            <td colSpan={9} className="px-4 py-3 bg-surface-800/50">
                              <div className="flex flex-wrap gap-4 text-xs">
                                <div>
                                  <span className="text-neutral-500">52W Low: </span>
                                  <span className="font-mono text-loss-400">₹{fmtINR(s.min365)}</span>
                                </div>
                                <div>
                                  <span className="text-neutral-500">52W High: </span>
                                  <span className="font-mono text-gain-400">₹{fmtINR(s.max365)}</span>
                                </div>
                                <div>
                                  <span className="text-neutral-500">Discount from 52W High: </span>
                                  <span className="font-mono text-neutral-300">
                                    {s.discount !== null ? `${s.discount.toFixed(1)}%` : '—'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-neutral-500">Sector: </span>
                                  <span className="text-neutral-300">{s.sector || '—'}</span>
                                </div>
                                <div>
                                  <span className="text-neutral-500">Purchase Date: </span>
                                  <span className="font-mono text-neutral-300">{s.purchase_date || '—'}</span>
                                </div>
                              </div>
                              {/* 52W position bar */}
                              {s.min365 !== null && s.max365 !== null && s.last !== null && (
                                <div className="mt-2.5 max-w-xs">
                                  <div className="flex justify-between text-2xs text-neutral-600 mb-1">
                                    <span>52W Low</span><span>52W High</span>
                                  </div>
                                  <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-brand-500 rounded-full"
                                      style={{ width: `${Math.min(100,Math.max(0,((s.last - s.min365)/(s.max365 - s.min365))*100))}%` }} />
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })
                  }
                </tbody>
              </table>
            </div>

            {/* Mobile card stack */}
            <div className="md:hidden divide-y divide-surface-700">
              {sortedRows.map(s => {
                const isGain = (s.pnlPct ?? 0) >= 0
                const stockLink = s.stock_id ? `/stocks/${s.stock_id}` : `/stocks/live/${encodeURIComponent(s.symbol)}`
                const signalCfg = {
                  BUY:  { bg:'rgba(34,197,94,0.12)',border:'rgba(34,197,94,0.3)',color:'#22C55E' },
                  HOLD: { bg:'rgba(245,158,11,0.12)',border:'rgba(245,158,11,0.3)',color:'#F59E0B' },
                  SELL: { bg:'rgba(239,68,68,0.12)',border:'rgba(239,68,68,0.3)',color:'#EF4444' },
                }[s.signal] || null
                return (
                  <div key={s.symbol} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Link to={stockLink} state={{ portfolioId: activePortfolioId, fromRecommended: isRecommendedView }} className="text-sm font-bold font-mono text-brand-400">{s.symbol}</Link>
                        <div className="text-xs text-neutral-500 truncate">{s.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono text-neutral-200">
                          {s.last !== null ? `₹${fmtINR(s.last)}` : '—'}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-2xs">
                      <div><span className="text-neutral-600">Qty</span><br/><span className="font-mono text-neutral-300">{s.qty}</span></div>
                      <div><span className="text-neutral-600">P&L</span><br/>
                        <span className={`font-mono ${isGain?'text-gain-500':'text-loss-500'}`}>
                          ₹{fmtINR(Math.abs(s.pnl))}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      {signalCfg && (
                        <span className="text-2xs font-semibold px-2 py-0.5 rounded border uppercase"
                          style={{ color: signalCfg.color, background: signalCfg.bg, borderColor: signalCfg.border }}>
                          {s.signal}
                        </span>
                      )}
                      <button onClick={() => requestRemove(s.symbol)}
                        className="ml-auto px-3 py-1 rounded text-2xs text-loss-400 border border-loss-500/20 bg-loss-500/5">
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>{/* /container */}

        {/* ═══════════════════════════════════════════════════════════════
            FAB — Add Stock
        ═══════════════════════════════════════════════════════════════ */}
        <button onClick={() => setDrawerOpen(true)}
          className="fixed bottom-6 right-6 z-30 w-13 h-13 flex items-center justify-center rounded-full text-white text-xl shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95"
          style={{
            background: 'linear-gradient(135deg,#0369a1,#0EA5E9)',
            boxShadow: '0 0 20px rgba(14,165,233,0.4), 0 4px 16px rgba(0,0,0,0.5)',
            width: 52, height: 52,
          }}
          aria-label="Add stock to portfolio">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>

      </div>{/* /page */}

      {/* ═══════════════════════════════════════════════════════════════
          ADD STOCK DRAWER
      ═══════════════════════════════════════════════════════════════ */}
      <AddStockDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setQuery(''); setSuggestions([]) }}
        query={query} setQuery={setQuery}
        suggestions={suggestions}
        onAdd={onAdd}
      />

      {/* ═══════════════════════════════════════════════════════════════
          MPIN MODAL
      ═══════════════════════════════════════════════════════════════ */}
      <DarkMpinModal
        open={mpinOpen}
        title={`Confirm Remove ${pendingRemove ?? ''}`}
        onSuccess={onRemove}
        onClose={() => { setMpinOpen(false); setPendingRemove(null) }}
      />
    </>
  )
}


