import { useEffect, useMemo, useState } from 'react'
import AddToPortfolioModal from '../components/stocks/AddToPortfolioModal.jsx'
import { fetchQualityRecommendations } from '../api/stocks.js'

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

export default function Quality() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('indian')
  const [markets, setMarkets] = useState([])
  const [modalStock, setModalStock] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await fetchQualityRecommendations()
        setMarkets(Array.isArray(data?.markets) ? data.markets : [])
      } catch {
        setError('Failed to load quality recommendations.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const splitMarkets = useMemo(() => splitRecommendedMarkets(markets), [markets])
  const selectedMarket = tab === 'indian' ? splitMarkets.indian : splitMarkets.global
  const sectors = Array.isArray(selectedMarket?.sectors) ? selectedMarket.sectors : []

  return (
    <div className="min-h-screen pb-20" style={{ background: '#070B14' }}>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-6 space-y-5">
        <div>
          <div className="text-2xs uppercase tracking-widest mb-1" style={{ color: '#0EA5E9', fontSize: 10 }}>Quality</div>
          <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: '#e2e8f0', letterSpacing: '-0.01em' }}>
            Top Quality Stocks
          </h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            Top 3 stocks by last 1-year return for each recommended portfolio.
          </p>
        </div>

        <div className="rounded-2xl p-1.5 flex items-center gap-2 w-full md:w-fit" style={{ background: '#0D1117', border: '1px solid #1E2530' }}>
          <button
            onClick={() => setTab('indian')}
            className="px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all"
            style={tab === 'indian'
              ? { background: 'linear-gradient(135deg,#0369a1,#0EA5E9)', color: '#fff' }
              : { background: 'transparent', color: '#94a3b8' }}
          >
            Indian
          </button>
          <button
            onClick={() => setTab('global')}
            className="px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all"
            style={tab === 'global'
              ? { background: 'linear-gradient(135deg,#0369a1,#0EA5E9)', color: '#fff' }
              : { background: 'transparent', color: '#94a3b8' }}
          >
            Global
          </button>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl p-5" style={{ background: '#0D1117', border: '1px solid #1E2530' }}>
                <div className="h-4 w-1/2 bg-slate-700/40 rounded mb-3" />
                <div className="h-16 w-full bg-slate-700/30 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {sectors.map((sector, sectorIdx) => {
              const recs = Array.isArray(sector?.recommendations) ? sector.recommendations : []
              return (
                <div key={`${tab}-${sector?.sector || sectorIdx}`} className="rounded-2xl p-5" style={{ background: '#0D1117', border: '1px solid #1E2530' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-lg font-bold" style={{ color: '#e2e8f0' }}>{sector?.sector || 'Unknown Sector'}</div>
                    <div className="text-xs" style={{ color: '#64748b' }}>{sector?.market || selectedMarket?.market || tab}</div>
                  </div>
                  {recs.length === 0 ? (
                    <div className="text-sm" style={{ color: '#94a3b8' }}>No quality stocks available.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {recs.slice(0, 3).map((stock, idx) => (
                        <div key={`${sector?.sector || sectorIdx}-${stock?.symbol || idx}-${idx}`} className="rounded-xl p-3" style={{ background: '#080C12', border: '1px solid #1E2530' }}>
                          <div className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>{stock?.symbol || '-'}</div>
                          <div className="text-xs mt-0.5 truncate" style={{ color: '#94a3b8' }}>{stock?.name || stock?.symbol || 'Unknown'}</div>
                          <div className="mt-2 text-xs" style={{ color: '#64748b' }}>1Y Return</div>
                          <div className={`text-base font-bold ${Number(stock?.one_year_return_pct || 0) >= 0 ? 'text-gain-500' : 'text-loss-500'}`}>
                            {Number(stock?.one_year_return_pct || 0).toFixed(2)}%
                          </div>
                          <button
                            onClick={() => setModalStock({
                              symbol: stock?.symbol,
                              name: stock?.name || stock?.symbol,
                              price: Number(stock?.current_price || 0),
                              market: sector?.market || selectedMarket?.market || '',
                            })}
                            className="mt-3 w-full py-1.5 rounded text-xs font-medium text-brand-400 border border-brand-500/20 bg-brand-500/5 hover:bg-brand-500/15 transition-colors"
                          >
                            + Add to Portfolio
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modalStock && (
        <AddToPortfolioModal
          stock={modalStock}
          market={String(modalStock.market || '').toLowerCase().includes('us') ? 'US' : 'IN'}
          onClose={() => setModalStock(null)}
        />
      )}
    </div>
  )
}
