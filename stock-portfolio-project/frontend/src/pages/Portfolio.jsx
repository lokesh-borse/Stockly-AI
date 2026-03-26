import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchPortfolio, createPortfolio, deletePortfolio,
  fetchPortfolioRating, verifyMpin,
} from '../api/stocks.js'

// ── Inline keyframes ──────────────────────────────────────────────────────────
const STYLES = `
  @keyframes shimmer { from{background-position:-200% 0} to{background-position:200% 0} }
  @keyframes fade-up  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes scale-in { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
  @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:.15} }

  .shimmer {
    background:linear-gradient(90deg,#151C26 25%,#1E2530 50%,#151C26 75%);
    background-size:200% 100%; animation:shimmer 2s linear infinite; border-radius:4px;
  }
  .fade-up  { animation:fade-up  0.35s ease-out both; }
  .scale-in { animation:scale-in 0.25s cubic-bezier(.16,1,.3,1) both; }
  .dot-blink{ animation:blink 1.4s ease-in-out infinite; }

  .port-card {
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .port-card:hover {
    transform: translateY(-3px);
    border-color: rgba(14,165,233,0.35) !important;
    box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(14,165,233,0.12);
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
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`
  return `₹${fmtINR(n)}`
}

// Skeleton
const Sk = ({ h = '14px', w = '100%', className = '' }) => (
  <span className={`block shimmer ${className}`} style={{ height: h, width: w }} />
)

// Stars
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

// Sector color map
const SECTOR_COLORS = [
  '#0EA5E9','#8B5CF6','#22C55E','#F59E0B','#EF4444',
  '#06B6D4','#F472B6','#A3E635','#FB923C','#94A3B8',
]

// ── MPIN Modal (dark) ─────────────────────────────────────────────────────────
function MpinModal({ open, onSuccess, onClose }) {
  const [pin, setPin]     = useState('')
  const [err, setErr]     = useState('')
  const [busy, setBusy]   = useState(false)
  const refs              = useRef([])

  function digit(idx, val) {
    if (!/^\d?$/.test(val)) return
    const arr = pin.split(''); arr[idx] = val
    const next = arr.join('').slice(0, 6); setPin(next); setErr('')
    if (val && idx < 5) refs.current[idx + 1]?.focus()
  }
  function onKey(idx, e) {
    if (e.key === 'Backspace' && !pin[idx] && idx > 0) refs.current[idx - 1]?.focus()
  }
  function close() { setPin(''); setErr(''); onClose() }

  async function submit(e) {
    e.preventDefault()
    if (pin.length !== 6) { setErr('Enter all 6 digits'); return }
    setBusy(true); setErr('')
    try {
      const res = await verifyMpin(pin)
      if (res.mpin_valid) { setPin(''); onSuccess() }
      else setErr('Incorrect MPIN. Try again.')
    } catch (er) { setErr(er?.response?.data?.detail || 'Incorrect MPIN.') }
    finally { setBusy(false) }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-xs mx-4 rounded-2xl p-7 scale-in"
           style={{ background: '#0D1117', border: '1px solid #1E2530', boxShadow: '0 0 0 1px rgba(14,165,233,0.08),0 24px 64px rgba(0,0,0,0.8)' }}>
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3 text-2xl"
               style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>🔐</div>
          <h2 className="text-base font-bold text-neutral-100">Confirm Delete</h2>
          <p className="text-xs text-neutral-500 mt-1">Enter your 6-digit MPIN to confirm</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex justify-center gap-2.5">
            {[0,1,2,3,4,5].map(i => (
              <input key={i} ref={el => refs.current[i] = el}
                type="password" inputMode="numeric" maxLength={1}
                value={pin[i] || ''}
                onChange={e => digit(i, e.target.value)}
                onKeyDown={e => onKey(i, e)}
                className="w-10 h-12 text-center text-xl font-bold font-mono rounded-lg focus:outline-none transition-all duration-150"
                style={{ background: '#151C26', border: '1px solid #1E2530', color: '#e2e8f0' }}
                onFocus={e => e.currentTarget.style.borderColor = '#0EA5E9'}
                onBlur={e  => e.currentTarget.style.borderColor = '#1E2530'}
              />
            ))}
          </div>
          <div className="flex justify-center gap-1.5">
            {[0,1,2,3,4,5].map(i => (
              <span key={i} className="w-1.5 h-1.5 rounded-full transition-colors duration-150"
                    style={{ background: i < pin.length ? '#0EA5E9' : '#1E2530' }} />
            ))}
          </div>
          {err && <p className="text-xs text-red-400 text-center py-1.5 rounded-lg"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>{err}</p>}
          <div className="flex gap-2.5">
            <button type="button" onClick={close}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ border: '1px solid #1E2530', color: '#94a3b8' }}>
              Cancel
            </button>
            <button type="submit" disabled={busy || pin.length !== 6}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#991b1b,#EF4444)' }}>
              {busy ? 'Verifying…' : 'Delete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Create Portfolio Modal ─────────────────────────────────────────────────────
function CreateModal({ open, onClose, onCreate }) {
  const [name, setName]   = useState('')
  const [desc, setDesc]   = useState('')
  const [busy, setBusy]   = useState(false)
  const [err,  setErr]    = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) { setErr('Portfolio name is required'); return }
    setBusy(true); setErr('')
    try { await onCreate(name.trim(), desc.trim()); setName(''); setDesc(''); onClose() }
    catch { setErr('Failed to create. Please try again.') }
    finally { setBusy(false) }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-md mx-4 rounded-2xl p-6 scale-in"
           style={{ background: '#0D1117', border: '1px solid #1E2530', boxShadow: '0 0 0 1px rgba(14,165,233,0.08),0 24px 64px rgba(0,0,0,0.8)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-2xs uppercase tracking-widest text-brand-500 mb-0.5" style={{ color: '#0EA5E9', fontSize: 10 }}>New Portfolio</div>
            <h2 className="text-lg font-bold text-neutral-100">Create Portfolio</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-neutral-500 hover:text-neutral-300"
            style={{ background: '#151C26', border: '1px solid #1E2530' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Portfolio Name *</label>
            <input
              autoFocus
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Long-Term Growth, Dividend Play…"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none transition-colors"
              style={{ background: '#151C26', border: '1px solid #1E2530', color: '#e2e8f0' }}
              onFocus={e => e.currentTarget.style.borderColor = '#0EA5E9'}
              onBlur={e  => e.currentTarget.style.borderColor = '#1E2530'}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Description <span style={{ color: '#475569' }}>(optional)</span></label>
            <textarea
              value={desc} onChange={e => setDesc(e.target.value)}
              rows={3}
              placeholder="What is this portfolio for?"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none transition-colors resize-none"
              style={{ background: '#151C26', border: '1px solid #1E2530', color: '#e2e8f0' }}
              onFocus={e => e.currentTarget.style.borderColor = '#0EA5E9'}
              onBlur={e  => e.currentTarget.style.borderColor = '#1E2530'}
            />
          </div>
          {err && <p className="text-xs text-red-400 text-center">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ border: '1px solid #1E2530', color: '#94a3b8' }}>
              Cancel
            </button>
            <button type="submit" disabled={busy || !name.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 active:scale-95"
              style={{ background: 'linear-gradient(135deg,#0369a1,#0EA5E9)', boxShadow: '0 4px 12px rgba(14,165,233,0.3)' }}>
              {busy ? 'Creating…' : 'Create Portfolio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ onCreate }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center fade-up">
      {/* Illustration */}
      <svg viewBox="0 0 200 160" className="w-48 h-40 mb-8 opacity-80">
        {/* Grid background */}
        <rect width="200" height="160" fill="#080C12" rx="12"/>
        <line x1="0" y1="40" x2="200" y2="40" stroke="#1E2530" strokeWidth="1"/>
        <line x1="0" y1="80" x2="200" y2="80" stroke="#1E2530" strokeWidth="1"/>
        <line x1="0" y1="120" x2="200" y2="120" stroke="#1E2530" strokeWidth="1"/>
        <line x1="50"  y1="0" x2="50"  y2="160" stroke="#1E2530" strokeWidth="1"/>
        <line x1="100" y1="0" x2="100" y2="160" stroke="#1E2530" strokeWidth="1"/>
        <line x1="150" y1="0" x2="150" y2="160" stroke="#1E2530" strokeWidth="1"/>
        {/* Chart bars */}
        <rect x="20"  y="90" width="20" height="30" rx="3" fill="#1E2530"/>
        <rect x="50"  y="70" width="20" height="50" rx="3" fill="#1E2530"/>
        <rect x="80"  y="50" width="20" height="70" rx="3" fill="#0EA5E9" opacity="0.4"/>
        <rect x="110" y="65" width="20" height="55" rx="3" fill="#1E2530"/>
        <rect x="140" y="40" width="20" height="80" rx="3" fill="#22C55E" opacity="0.3"/>
        <rect x="170" y="55" width="20" height="65" rx="3" fill="#1E2530"/>
        {/* Trend line */}
        <polyline points="30,100 60,80 90,55 120,72 150,45 185,60"
                  fill="none" stroke="#0EA5E9" strokeWidth="2" strokeDasharray="4,2" opacity="0.6"/>
        {/* Plus icon in center */}
        <circle cx="100" cy="80" r="18" fill="#0D1117" stroke="#0EA5E9" strokeWidth="1.5" opacity="0.9"/>
        <line x1="100" y1="72" x2="100" y2="88" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round"/>
        <line x1="92"  y1="80" x2="108" y2="80" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round"/>
      </svg>

      <h2 className="text-2xl font-bold mb-2" style={{ color: '#e2e8f0' }}>No Portfolios Yet</h2>
      <p className="text-sm max-w-xs mb-8" style={{ color: '#64748b' }}>
        Create your first portfolio to start tracking NSE & BSE stocks with AI-powered insights.
      </p>
      <button onClick={onCreate}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white active:scale-95 transition-all"
        style={{ background: 'linear-gradient(135deg,#0369a1,#0EA5E9)', boxShadow: '0 8px 24px rgba(14,165,233,0.3)' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        Create Your First Portfolio
      </button>
    </div>
  )
}

// ── Portfolio Card ─────────────────────────────────────────────────────────────
function PortfolioCard({ p, rating, onDelete, showDelete = true, viewTo = null, viewLabel = 'View Portfolio' }) {
  const pnl    = toFin(p.total_pnl)
  const pnlPct = toFin(p.total_pnl_pct)
  const value  = toFin(p.total_value)
  const isGain = pnl !== null ? pnl >= 0 : true
  const stockCount = Number.isFinite(Number(p?.stock_count))
    ? Number(p.stock_count)
    : Array.isArray(p?.stocks) ? p.stocks.length : 0

  // Fake sector segments for the mini-bar (if real sectors not provided, generate from top_sector)
  const sectors = p.sectors || (p.top_sector ? [{ name: p.top_sector, pct: 60 }, { name: 'Others', pct: 40 }] : [])

  return (
    <div className="port-card rounded-2xl p-5 relative group"
         style={{ background: '#0D1117', border: '1px solid #1E2530' }}>

      {/* Delete button — shows on hover */}
      {showDelete && onDelete && (
        <button onClick={e => { e.preventDefault(); onDelete() }}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}
          title="Delete portfolio">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      {/* Top row: name + stock count */}
      <div className={`mb-3 ${showDelete && onDelete ? 'pr-10' : ''}`}>
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <h3 className="text-base font-bold leading-snug" style={{ color: '#e2e8f0' }}>{p.name}</h3>
          {rating && (
            <div className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full"
                 style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <Stars count={rating.stars} />
            </div>
          )}
        </div>
        <p className="text-xs truncate" style={{ color: '#64748b' }}>{p.description || 'No description'}</p>
      </div>

      {/* Value */}
      <div className="mb-3">
        <div className="text-2xs uppercase tracking-widest mb-0.5" style={{ color: '#475569', fontSize: 10 }}>Current Value</div>
        <div className="text-2xl font-bold font-mono" style={{ color: '#e2e8f0' }}>
          {value !== null ? fmtCompact(value) : '—'}
        </div>
      </div>

      {/* P&L row */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
             style={isGain
               ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }
               : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <span className="text-xs font-bold font-mono" style={{ color: isGain ? '#22C55E' : '#EF4444' }}>
            {isGain ? '▲' : '▼'} {pnl !== null ? `₹${fmtINR(Math.abs(pnl))}` : '—'}
          </span>
          {pnlPct !== null && (
            <span className="text-2xs font-mono font-medium" style={{ color: isGain ? '#22C55E' : '#EF4444', fontSize: 10 }}>
              ({isGain ? '+' : ''}{pnlPct.toFixed(2)}%)
            </span>
          )}
        </div>

        {/* Stock count chip */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg"
             style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2" className="w-3 h-3">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round"/>
          </svg>
          <span className="text-2xs font-mono font-medium" style={{ color: '#38BDF8', fontSize: 10 }}>
            {stockCount} stocks
          </span>
        </div>

        {/* Top sector badge */}
        {p.top_sector && (
          <div className="flex-1 min-w-0">
            <span className="text-2xs px-2 py-1 rounded-lg truncate inline-block max-w-full"
                  style={{ background: '#1E2530', border: '1px solid #334155', color: '#94a3b8', fontSize: 10 }}>
              {p.top_sector}
            </span>
          </div>
        )}
      </div>

      {/* Sector allocation mini-bar */}
      {sectors.length > 0 && (
        <div className="mb-4">
          <div className="text-2xs mb-1.5 flex items-center justify-between" style={{ color: '#475569', fontSize: 10 }}>
            <span>SECTOR ALLOCATION</span>
            {sectors[0] && <span style={{ color: SECTOR_COLORS[0] }}>{sectors[0].name}</span>}
          </div>
          <div className="h-1.5 rounded-full overflow-hidden flex gap-px"
               style={{ background: '#1E2530' }}>
            {sectors.slice(0, 5).map((s, i) => (
              <div key={i} className="h-full rounded-full transition-all duration-500"
                   style={{ width: `${s.pct}%`, background: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
            ))}
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {sectors.slice(0, 4).map((s, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
                <span style={{ color: '#64748b', fontSize: 9 }}>{s.name} {s.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View button */}
      <Link to={viewTo || `/portfolio/${p.id}`}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 hover:opacity-90"
        style={{ background: 'linear-gradient(135deg,#0c4a6e80,#0369a180)', border: '1px solid rgba(14,165,233,0.25)', color: '#38BDF8' }}>
        {viewLabel}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </Link>
    </div>
  )
}

// ── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5" style={{ background: '#0D1117', border: '1px solid #1E2530' }}>
      <Sk h="20px" w="60%" className="rounded mb-2" />
      <Sk h="12px" w="40%" className="rounded mb-4" />
      <Sk h="32px" w="50%" className="rounded mb-3" />
      <Sk h="24px" w="70%" className="rounded mb-4" />
      <Sk h="8px"  w="100%" className="rounded mb-4" />
      <Sk h="38px" w="100%" className="rounded-xl" />
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Portfolio() {
  const [items,       setItems]       = useState([])
  const [ratings,     setRatings]     = useState({})   // { [portfolioId]: ratingData }
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [createOpen,  setCreateOpen]  = useState(false)
  const [mpinOpen,    setMpinOpen]    = useState(false)
  const [pendingDel,  setPendingDel]  = useState(null)  // portfolioId to delete
  const [deletingId,  setDeletingId]  = useState(null)
  const [toast,       setToast]       = useState(null)  // { msg, ok }

  // ── Load ────────────────────────────────────────────────────────────────────
  async function load() {
    setLoading(true); setError(null)
    try {
      const data = await fetchPortfolio()
      setItems(data || [])
      // Fetch ratings in background (fire-and-forget per portfolio)
      ;(data || []).forEach(async p => {
        try {
          const r = await fetchPortfolioRating(p.id)
          setRatings(prev => ({ ...prev, [p.id]: r }))
        } catch {}
      })
    } catch { setError('Failed to load portfolios. Please refresh.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
  }, [])

  // ── Toast helper ────────────────────────────────────────────────────────────
  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Create ──────────────────────────────────────────────────────────────────
  async function onCreate(name, description) {
    await createPortfolio({ name, description })
    showToast(`"${name}" created`)
    await load()
  }

  // ── Delete flow (MPIN gated) ────────────────────────────────────────────────
  function requestDelete(id) { setPendingDel(id); setMpinOpen(true) }

  async function onMpinSuccess() {
    setMpinOpen(false)
    const id = pendingDel; setPendingDel(null)
    setDeletingId(id)
    try {
      await deletePortfolio(id)
      setItems(prev => prev.filter(p => p.id !== id))
      showToast('Portfolio deleted')
    } catch { showToast('Delete failed', false) }
    finally { setDeletingId(null) }
  }

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totalValue    = items.reduce((a, p) => a + (toFin(p.total_value) ?? 0), 0)

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{STYLES}</style>
      <div className="min-h-screen pb-20" style={{ background: '#070B14' }}>
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-6 space-y-5">

          {/* ══════════════════════════════════════════════════════════
              PAGE HEADER
          ══════════════════════════════════════════════════════════ */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 fade-up">
            <div>
              <div className="text-2xs uppercase tracking-widest mb-1" style={{ color: '#0EA5E9', fontSize: 10 }}>Dashboard</div>
              <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: '#e2e8f0', letterSpacing: '-0.01em' }}>
                My Portfolios
              </h1>
              <p className="text-sm mt-1" style={{ color: '#64748b' }}>
                Track, manage and optimise your NSE & BSE equity portfolios.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Total value display */}
              {!loading && items.length > 0 && (
                <div className="text-right">
                  <div className="text-2xs uppercase tracking-widest mb-0.5" style={{ color: '#475569', fontSize: 10 }}>Combined Value</div>
                  <div className="text-xl font-bold font-mono" style={{ color: '#e2e8f0' }}>
                    {fmtCompact(totalValue)}
                  </div>
                </div>
              )}
              <button onClick={() => setCreateOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg,#0369a1,#0EA5E9)', boxShadow: '0 4px 16px rgba(14,165,233,0.3)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                New Portfolio
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
              SUMMARY BAR
          ══════════════════════════════════════════════════════════ */}
          {!loading && items.length > 0 && (
            <div className="grid grid-cols-1 gap-3 fade-up max-w-sm">
              {[
                {
                  label: 'Total Portfolios',
                  value: items.length,
                  accent: '#0EA5E9',
                  bg: 'rgba(14,165,233,0.08)',
                  border: 'rgba(14,165,233,0.2)',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                      <rect x="2" y="7" width="20" height="14" rx="2"/>
                      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
                    </svg>
                  ),
                },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
                     style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                       style={{ background: `${s.accent}18`, color: s.accent }}>
                    {s.icon}
                  </div>
                  <div>
                    <div className="text-2xs uppercase tracking-widest mb-0.5" style={{ color: s.accent + '99', fontSize: 9 }}>{s.label}</div>
                    <div className="text-base font-bold font-mono" style={{ color: s.accent }}>{s.value}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl fade-up"
                 style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <span style={{ color: '#EF4444' }}>⚠ {error}</span>
              <button onClick={load} className="ml-auto text-xs font-medium" style={{ color: '#94a3b8' }}>Retry</button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              PORTFOLIO GRID
          ══════════════════════════════════════════════════════════ */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : items.length === 0 ? (
            <EmptyState onCreate={() => setCreateOpen(true)} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map(p => (
                <div key={p.id} className={`transition-opacity duration-300 ${deletingId === p.id ? 'opacity-30 pointer-events-none' : ''}`}>
                  <PortfolioCard
                    p={p}
                    rating={ratings[p.id]}
                    onDelete={() => requestDelete(p.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Toast notification ─────────────────────────────────────── */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-sm text-white scale-in"
               style={{
                 background: toast.ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                 border: `1px solid ${toast.ok ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
                 backdropFilter: 'blur(8px)',
                 color: toast.ok ? '#4ade80' : '#f87171',
               }}>
            {toast.ok ? '✓' : '⚠'} {toast.msg}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={onCreate}
      />
      <MpinModal
        open={mpinOpen}
        onSuccess={onMpinSuccess}
        onClose={() => { setMpinOpen(false); setPendingDel(null) }}
      />
    </>
  )
}
