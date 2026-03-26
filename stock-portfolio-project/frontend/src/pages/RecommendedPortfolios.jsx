import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchRecommendedPortfolios, createPortfolio, addStockToPortfolio,
  fetchPortfolioById, fetchPortfolioRating,
} from '../api/stocks.js'

function splitRecommendedMarkets(markets) {
  const byType = { indian: null, global: null }
  for (const market of markets || []) {
    const name = String(market?.market || '').toLowerCase()
    if (!byType.indian && (name.includes('india') || name.includes('indian') || name === 'in')) byType.indian = market
    if (!byType.global && (name.includes('global') || name.includes('us') || name.includes('usa') || name.includes('united states'))) byType.global = market
  }
  if (!byType.indian && markets?.length) byType.indian = markets[0]
  if (!byType.global && markets?.length > 1) byType.global = markets[1]
  if (!byType.global) byType.global = byType.indian
  return byType
}

export default function RecommendedPortfolios() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [recommendedTab, setRecommendedTab] = useState('indian')
  const [markets, setMarkets] = useState([])
  const [portfolioMetrics, setPortfolioMetrics] = useState({})

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await fetchRecommendedPortfolios()
        setMarkets(Array.isArray(data?.markets) ? data.markets : [])
      } catch {
        setError('Failed to load recommended portfolios.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const splitMarkets = useMemo(() => splitRecommendedMarkets(markets), [markets])
  const selectedMarket = recommendedTab === 'indian' ? splitMarkets.indian : splitMarkets.global
  const cards = (selectedMarket?.sectors || []).map((sectorItem, index) => {
    const marketParam = encodeURIComponent(String(selectedMarket?.market || recommendedTab))
    const sectorParam = encodeURIComponent(String(sectorItem?.sector || `sector-${index}`))
    return {
      id: `${recommendedTab}-${index}`,
      name: sectorItem?.sector || 'Unknown Sector',
      count: Number(sectorItem?.count || 0),
      stocks: Array.isArray(sectorItem?.stocks) ? sectorItem.stocks : [],
      viewTo: `/portfolio/recommended/${marketParam}/${sectorParam}`,
      marketLabel: String(selectedMarket?.market || recommendedTab),
      marketRaw: String(selectedMarket?.market || recommendedTab),
      sectorRaw: String(sectorItem?.sector || ''),
    }
  })

  useEffect(() => {
    let cancelled = false
    const storageKey = 'recommended_portfolio_id_map_v1'

    function getIdMap() {
      try {
        const raw = localStorage.getItem(storageKey)
        const parsed = raw ? JSON.parse(raw) : {}
        return parsed && typeof parsed === 'object' ? parsed : {}
      } catch {
        return {}
      }
    }
    function saveIdMap(map) {
      localStorage.setItem(storageKey, JSON.stringify(map))
    }

    async function ensurePortfolioId(card) {
      const key = `${card.marketRaw.toLowerCase()}::${card.sectorRaw.toLowerCase()}`
      const idMap = getIdMap()
      const cachedId = idMap[key]
      if (cachedId) return cachedId

      const created = await createPortfolio({
        name: `${card.sectorRaw} (${card.marketRaw})`,
        description: `auto-generated from stock_universe symbols in sector: ${card.sectorRaw} (${card.marketRaw})`,
      })
      const today = new Date().toISOString().slice(0, 10)
      await Promise.all(
        (card.stocks || []).map((s) =>
          addStockToPortfolio(created.id, s.symbol, 1, 0, today).catch(() => null)
        )
      )
      const next = { ...idMap, [key]: created.id }
      saveIdMap(next)
      return created.id
    }

    async function loadMetrics() {
      if (!cards.length) return
      for (const card of cards) {
        const metricsKey = `${card.marketRaw}::${card.sectorRaw}`
        if (portfolioMetrics[metricsKey]) continue
        try {
          const pid = await ensurePortfolioId(card)
          const [portfolio, rating] = await Promise.all([
            fetchPortfolioById(pid),
            fetchPortfolioRating(pid).catch(() => null),
          ])
          if (!cancelled) {
            setPortfolioMetrics((prev) => ({
              ...prev,
              [metricsKey]: {
                totalValue: Number(portfolio?.total_value || 0),
                stars: Number(rating?.stars || 0),
              },
            }))
          }
        } catch {
          if (!cancelled) {
            setPortfolioMetrics((prev) => ({
              ...prev,
              [metricsKey]: { totalValue: null, stars: 0 },
            }))
          }
        }
      }
    }

    loadMetrics()
    return () => { cancelled = true }
  }, [cards.length, recommendedTab, selectedMarket?.market])

  const fmtINR = (v, d = 2) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return '—'
    return n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d })
  }
  const fmtCompact = (v) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return '—'
    if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
    if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
    return `₹${fmtINR(n)}`
  }

  const Stars = ({ count }) => (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} viewBox="0 0 24 24" className="w-3 h-3"
             fill={i <= count ? '#F59E0B' : 'none'}
             stroke={i <= count ? '#F59E0B' : '#334155'} strokeWidth="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </span>
  )

  return (
    <div className="min-h-screen pb-20" style={{ background: '#070B14' }}>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-6 space-y-5">
        <div>
          <div className="text-2xs uppercase tracking-widest mb-1" style={{ color: '#0EA5E9', fontSize: 10 }}>Recommended</div>
          <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: '#e2e8f0', letterSpacing: '-0.01em' }}>
            Recommended Portfolios
          </h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            Browse sector-wise recommended portfolios and open analytics instantly.
          </p>
        </div>

        <div className="rounded-2xl p-1.5 flex items-center gap-2 w-full md:w-fit" style={{ background: '#0D1117', border: '1px solid #1E2530' }}>
          <button
            onClick={() => setRecommendedTab('indian')}
            className="px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all"
            style={recommendedTab === 'indian'
              ? { background: 'linear-gradient(135deg,#0369a1,#0EA5E9)', color: '#fff' }
              : { background: 'transparent', color: '#94a3b8' }}
          >
            Indian Market
          </button>
          <button
            onClick={() => setRecommendedTab('global')}
            className="px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all"
            style={recommendedTab === 'global'
              ? { background: 'linear-gradient(135deg,#0369a1,#0EA5E9)', color: '#fff' }
              : { background: 'transparent', color: '#94a3b8' }}
          >
            Global Market
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
               style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <span style={{ color: '#EF4444' }}>! {error}</span>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl p-5" style={{ background: '#0D1117', border: '1px solid #1E2530' }}>
                <div className="h-4 w-1/2 bg-slate-700/40 rounded mb-3" />
                <div className="h-3 w-2/3 bg-slate-700/40 rounded mb-5" />
                <div className="h-9 w-full bg-slate-700/30 rounded" />
              </div>
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="rounded-xl px-4 py-5 text-sm" style={{ background: '#080C12', border: '1px solid #1E2530', color: '#94a3b8' }}>
            No recommended portfolios found for {recommendedTab === 'indian' ? 'Indian market' : 'Global market'}.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cards.map((c) => (
              <div key={c.id} className="rounded-2xl p-5" style={{ background: '#0D1117', border: '1px solid #1E2530' }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="text-xs uppercase tracking-wider mb-1" style={{ color: '#64748b' }}>{c.marketLabel}</div>
                    <div className="text-lg font-bold" style={{ color: '#e2e8f0' }}>{c.name}</div>
                  </div>
                  <Stars count={portfolioMetrics[`${c.marketRaw}::${c.sectorRaw}`]?.stars || 0} />
                </div>
                <div className="text-2xs uppercase tracking-widest mb-0.5" style={{ color: '#475569', fontSize: 10 }}>Current Value</div>
                <div className="text-2xl font-bold font-mono" style={{ color: '#e2e8f0' }}>
                  {fmtCompact(portfolioMetrics[`${c.marketRaw}::${c.sectorRaw}`]?.totalValue)}
                </div>
                <div className="text-sm mt-1" style={{ color: '#94a3b8' }}>{c.count} stocks in this sector</div>
                <Link
                  to={c.viewTo}
                  className="mt-4 inline-flex items-center justify-center w-full py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg,#0369a1,#0EA5E9)' }}
                >
                  Open Recommended Portfolio
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
