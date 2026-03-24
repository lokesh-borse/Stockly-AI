import React, { useState, useEffect, useRef } from 'react'
import { useToast } from '../../context/ToastContext'
import { fetchPortfolio, createPortfolio, addStockToPortfolio } from '../../api/stocks'

export default function AddToPortfolioModal({ stock, market, onClose }) {
  const { toast } = useToast()
  const [portfolios, setPortfolios] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [loadingPortfolios, setLoadingPortfolios] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [creatingNew, setCreatingNew] = useState(false)
  const [newPortfolioName, setNewPortfolioName] = useState('')
  const overlayRef = useRef(null)

  const currency = market === 'IN' ? '₹' : '$'
  const displayPrice = stock?.price ?? stock?.close ?? ''

  useEffect(() => {
    setLoadingPortfolios(true)
    fetchPortfolio()
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.results ?? []
        setPortfolios(list)
        if (list.length > 0) setSelectedId(String(list[0].id))
      })
      .catch(() => toast.error('Failed to load portfolios'))
      .finally(() => setLoadingPortfolios(false))
  }, [])

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose()
  }

  const handleCreatePortfolio = async () => {
    const name = newPortfolioName.trim()
    if (!name) { toast.error('Portfolio name cannot be empty'); return }
    try {
      const created = await createPortfolio({ name })
      setPortfolios((prev) => [...prev, created])
      setSelectedId(String(created.id))
      setCreatingNew(false)
      setNewPortfolioName('')
      toast.success(`Portfolio "${created.name}" created`)
    } catch {
      toast.error('Failed to create portfolio')
    }
  }

  const handleSubmit = async () => {
    if (!selectedId) { toast.error('Please select a portfolio'); return }

    // Use defaults: qty=1, purchase_price=current price, purchase_date=today
    const today = new Date().toISOString().split('T')[0]
    const price = displayPrice ? Number(displayPrice) : 0

    setSubmitting(true)
    try {
      await addStockToPortfolio(
        Number(selectedId),
        stock.symbol,
        1,        // quantity default
        price,    // purchase_price = current price
        today     // purchase_date = today
      )
      toast.success(`${stock.symbol.replace('.NS', '')} added to portfolio!`)
      onClose()
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to add stock'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl
          bg-[#1a1d2e]/95 backdrop-blur-xl overflow-hidden"
        style={{ boxShadow: '0 0 60px rgba(56,189,248,0.08), 0 25px 50px rgba(0,0,0,0.6)' }}
      >
        {/* Top accent line */}
        <div className="h-0.5 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-transparent" />

        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-100">Add to Portfolio</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-bold text-cyan-400 font-mono">{stock.symbol.replace('.NS', '')}</span>
              <span className="text-slate-500 text-xs">·</span>
              <span className="text-xs text-slate-400 truncate max-w-[180px]">{stock.name || stock.symbol}</span>
            </div>
            {displayPrice && (
              <div className="mt-1 text-lg font-bold text-slate-100 font-mono">
                {currency}{Number(displayPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-5 flex flex-col gap-4">

          {/* Portfolio selector */}
          <div>
            <label className="text-xs text-slate-400 font-medium mb-1.5 block">Select Portfolio</label>
            {loadingPortfolios ? (
              <div className="h-10 rounded-lg bg-slate-700/40 animate-pulse" />
            ) : (
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-slate-800/60 border border-white/10
                  text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30
                  appearance-none cursor-pointer"
              >
                {portfolios.length === 0 && <option value="">No portfolios yet</option>}
                {portfolios.map((p) => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
            )}

            {/* Create new portfolio */}
            {!creatingNew ? (
              <button
                onClick={() => setCreatingNew(true)}
                className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
              >
                + Create New Portfolio
              </button>
            ) : (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="Portfolio name..."
                  value={newPortfolioName}
                  onChange={(e) => setNewPortfolioName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreatePortfolio()}
                  className="flex-1 h-9 px-3 rounded-lg bg-slate-800/60 border border-white/10
                    text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                  autoFocus
                />
                <button
                  onClick={handleCreatePortfolio}
                  className="px-3 h-9 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-semibold
                    hover:bg-cyan-500/30 border border-cyan-500/30 transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => { setCreatingNew(false); setNewPortfolioName('') }}
                  className="px-3 h-9 rounded-lg bg-slate-700/50 text-slate-400 text-xs
                    hover:bg-slate-700 border border-white/5 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Info note */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/5 border border-cyan-500/15">
            <span className="text-cyan-400 text-sm">ℹ️</span>
            <span className="text-xs text-slate-400">
              Stock will be added at today's price ({currency}{displayPrice ? Number(displayPrice).toFixed(2) : '—'}) with quantity 1.
            </span>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || loadingPortfolios}
            className="w-full h-11 rounded-xl font-semibold text-sm text-white
              bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
              shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Adding...
              </span>
            ) : 'Add to Portfolio'}
          </button>
        </div>
      </div>
    </div>
  )
}
