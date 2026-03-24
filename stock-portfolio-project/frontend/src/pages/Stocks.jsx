import React, { useEffect, useState } from 'react'
import MarketSection from '../components/stocks/MarketSection'
import AddToPortfolioModal from '../components/stocks/AddToPortfolioModal'
import { fetchRecommendedPortfolios, fetchStockUniverse } from '../api/stocks'

function TabPill({ active, onClick, icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300
        ${active
          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/15 text-cyan-300 border border-cyan-500/35 shadow-[0_0_16px_rgba(56,189,248,0.12)]'
          : 'text-slate-400 hover:text-slate-200 border border-white/5 hover:border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
        }`}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
      <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono
        ${active ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-slate-500'}`}>
        {count}
      </span>
    </button>
  )
}

export default function Stocks() {
  const [activeTab, setActiveTab] = useState('IN')
  const [modalStock, setModalStock] = useState(null)
  const [indianStocks, setIndianStocks] = useState([])
  const [globalStocks, setGlobalStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const handleAdd = (stock) => setModalStock(stock)
  const handleCloseModal = () => setModalStock(null)

  useEffect(() => {
    let isMounted = true

    const normalize = (value) => String(value || '').trim().toUpperCase()
    const unique = (items) => Array.from(new Set(items.map(normalize).filter(Boolean)))
    const byMarketKeyword = (marketValue) => {
      const v = String(marketValue || '').toLowerCase()
      if (v === 'in' || v.includes('india')) return 'IN'
      if (v === 'us' || v.includes('global') || v.includes('usa') || v.includes('united states')) return 'US'
      return null
    }

    async function loadSymbols() {
      setLoading(true)
      setLoadError('')
      try {
        const [inUniverse, usUniverse] = await Promise.all([
          fetchStockUniverse('IN'),
          fetchStockUniverse('US'),
        ])

        let inSymbols = unique(inUniverse?.symbols || [])
        let usSymbols = unique(usUniverse?.symbols || [])

        if (inSymbols.length === 0 && usSymbols.length === 0) {
          const recommended = await fetchRecommendedPortfolios()
          const markets = Array.isArray(recommended?.markets) ? recommended.markets : []
          const inFallback = []
          const usFallback = []

          for (const marketItem of markets) {
            const mapped = byMarketKeyword(marketItem?.market)
            if (!mapped) continue
            const sectors = Array.isArray(marketItem?.sectors) ? marketItem.sectors : []
            for (const sector of sectors) {
              const stocks = Array.isArray(sector?.stocks) ? sector.stocks : []
              for (const stock of stocks) {
                if (mapped === 'IN') inFallback.push(stock?.symbol)
                if (mapped === 'US') usFallback.push(stock?.symbol)
              }
            }
          }

          inSymbols = unique(inFallback)
          usSymbols = unique(usFallback)
        }

        if (!isMounted) return
        setIndianStocks(inSymbols)
        setGlobalStocks(usSymbols)
      } catch {
        if (!isMounted) return
        setLoadError('Could not load symbols right now. Please try refreshing.')
        setIndianStocks([])
        setGlobalStocks([])
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadSymbols()
    return () => { isMounted = false }
  }, [])

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600" />
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Market Explorer</h1>
            </div>
            <p className="text-sm text-slate-400 ml-3">
              Browse and add stocks from curated Indian and Global market lists
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 self-start sm:self-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-emerald-400">Curated Symbols</span>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <TabPill
            active={activeTab === 'IN'}
            onClick={() => setActiveTab('IN')}
            icon="IN"
            label="Indian Markets"
            count={indianStocks.length}
          />
          <TabPill
            active={activeTab === 'US'}
            onClick={() => setActiveTab('US')}
            icon="GL"
            label="Global Markets"
            count={globalStocks.length}
          />
        </div>

        {loading && (
          <div className="mb-6 text-xs text-cyan-400/90">Loading curated symbols...</div>
        )}
        {!loading && loadError && (
          <div className="mb-6 text-xs text-rose-400">{loadError}</div>
        )}

        <div className="h-px w-full bg-gradient-to-r from-cyan-500/20 via-white/5 to-transparent mb-8" />

        <div className="transition-all duration-300">
          {activeTab === 'IN' ? (
            <MarketSection
              key="IN"
              title="Indian Markets"
              icon="Market"
              flag="IN"
              symbols={indianStocks}
              market="IN"
              onAdd={handleAdd}
            />
          ) : (
            <MarketSection
              key="US"
              title="Global Markets"
              icon="Global"
              flag="GL"
              symbols={globalStocks}
              market="US"
              onAdd={handleAdd}
            />
          )}
        </div>

        <div className="mt-12 flex flex-wrap gap-4 justify-center">
          {[
            { icon: 'FAST', label: 'Fast loading', sub: 'local list' },
            { icon: 'LIST', label: 'Curated symbols', sub: 'market segmented' },
            { icon: 'RANGE', label: '52-week range', sub: 'if available' },
            { icon: 'PORT', label: 'Portfolio ready', sub: 'add in one click' },
          ].map((item) => (
            <div key={item.label}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-800/30 border border-white/5">
              <span className="text-lg">{item.icon}</span>
              <div>
                <p className="text-xs font-semibold text-slate-200">{item.label}</p>
                <p className="text-[10px] text-slate-500">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modalStock && (
        <AddToPortfolioModal
          stock={modalStock}
          market={activeTab}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
