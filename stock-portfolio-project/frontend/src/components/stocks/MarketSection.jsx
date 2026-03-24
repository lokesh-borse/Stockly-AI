import React, { useState } from 'react'
import StockCard from './StockCard'

export default function MarketSection({ title, icon, flag, symbols, market, onAdd }) {
  const [viewAll, setViewAll] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const previewSymbols = symbols.slice(0, 10)

  const loadMore = () => {
    const nextPage = page + 1
    const start = nextPage * PAGE_SIZE
    const batch = symbols.slice(start, start + PAGE_SIZE)
    if (batch.length > 0) {
      setPage(nextPage)
    }
  }

  const filteredSymbols = viewAll
    ? symbols.filter((sym) => (
      !search || sym.toLowerCase().includes(search.toLowerCase())
    ))
    : previewSymbols

  const maxLoaded = (page + 1) * PAGE_SIZE
  const hasMore = viewAll && maxLoaded < symbols.length

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/20">
            <span className="text-lg">{flag}</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              {icon} {title}
            </h2>
            <p className="text-xs text-slate-500">
              {viewAll
                ? `Showing ${Math.min(filteredSymbols.length, maxLoaded)} of ${filteredSymbols.length} stocks`
                : `${previewSymbols.length} featured stocks`}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setViewAll((v) => !v); setSearch(''); setPage(0) }}
          className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300
            px-3 py-1.5 rounded-lg border border-cyan-500/20 hover:border-cyan-400/40
            bg-cyan-500/5 hover:bg-cyan-500/10 transition-all duration-200"
        >
          {viewAll ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
              Show Less
            </>
          ) : (
            <>
              View All
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>

      {viewAll && (
        <div className="flex flex-col sm:flex-row gap-3 p-3 rounded-xl bg-slate-800/30 border border-white/5">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by symbol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-800/60 border border-white/10
                text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/40
                focus:ring-1 focus:ring-cyan-500/20"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
        {(viewAll ? filteredSymbols.slice(0, maxLoaded) : previewSymbols).map((symbol) => (
          <StockCard
            key={symbol}
            stock={{ symbol, name: symbol }}
            market={market}
            onAdd={onAdd}
          />
        ))}
      </div>

      {viewAll && filteredSymbols.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <svg className="w-12 h-12 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-sm">No stocks match your search</p>
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={loadMore}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-cyan-400
              border border-cyan-500/25 bg-cyan-500/5 hover:bg-cyan-500/12 hover:border-cyan-400/40
              transition-all duration-200"
          >
            Load More ({Math.min(PAGE_SIZE, symbols.length - maxLoaded)} more)
          </button>
        </div>
      )}
    </section>
  )
}
