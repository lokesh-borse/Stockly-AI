import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/portfolio',           label: 'Dashboard' },
  { to: '/stocks',              label: 'Stocks'    },
  { to: '/time-series-forecast',label: 'Forecast'  },
  { to: '/metals',              label: 'Gold·Silver'},
  { to: '/nifty-clusters',      label: 'Clusters'  },
]

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate    = useNavigate()
  const [open, setOpen] = useState(false)  // mobile menu

  function handleLogout() { logout(); navigate('/login'); setOpen(false) }

  // Active link style — bottom-border indicator, no background pill
  const linkClass = ({ isActive }) =>
    `relative px-3 py-1.5 text-sm font-medium transition-colors duration-150 rounded-lg
     ${isActive
       ? 'text-brand-400 bg-brand-500/8'
       : 'text-neutral-400 hover:text-neutral-200 hover:bg-surface-800'
     }`

  // Mobile link — full width row
  const mobileLinkClass = ({ isActive }) =>
    `block px-4 py-3 text-sm font-medium border-l-2 transition-colors duration-150
     ${isActive
       ? 'border-brand-500 text-brand-400 bg-brand-500/6'
       : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-surface-800 hover:border-surface-600'
     }`

  return (
    <header
      className="sticky top-0 z-50"
      style={{ background: '#080C12', borderBottom: '1px solid #1E2530', backdropFilter: 'blur(12px)' }}
    >
      {/* ── Main bar ─────────────────────────────────────────────────────── */}
      <div className="max-w-[1700px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">

        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2.5 flex-shrink-0 group"
          onClick={() => setOpen(false)}
        >
          {/* Terminal bracket logo */}
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono transition-colors"
            style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.3)', color: '#38BDF8' }}
          >
            ▸
          </span>
          <span className="font-bold text-sm tracking-tight" style={{ color: '#e2e8f0' }}>
            <span style={{ color: '#38BDF8' }} className="font-mono">AI</span>
            {' '}Stock
          </span>
        </Link>

        {/* ── Desktop nav ──────────────────────────────────────────────────── */}
        {isAuthenticated ? (
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {NAV_ITEMS.map(item => (
              <NavLink key={item.to} to={item.to} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
            {user?.is_staff && (
              <NavLink to="/admin-panel" className={linkClass}>
                <span className="mr-1">🛡</span>Admin
              </NavLink>
            )}
          </nav>
        ) : (
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            <a href="#features"     className="relative px-3 py-1.5 text-sm font-medium transition-colors duration-150 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-surface-800">Features</a>
            <a href="#how-it-works" className="relative px-3 py-1.5 text-sm font-medium transition-colors duration-150 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-surface-800">How It Works</a>
            <a href="#models"       className="relative px-3 py-1.5 text-sm font-medium transition-colors duration-150 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-surface-800">ML Models</a>
          </nav>
        )}

        {/* ── Desktop right side ────────────────────────────────────────────── */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          {isAuthenticated && !user?.mpin_set && (
            <NavLink
              to="/set-mpin"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#F59E0B' }}
            >
              🔐 Set MPIN
            </NavLink>
          )}

          {isAuthenticated && (
            <>
              {/* Username chip */}
              <span
                className="px-2.5 py-1 rounded-lg text-xs font-mono"
                style={{ background: '#0D1117', border: '1px solid #1E2530', color: '#475569' }}
              >
                {user?.username || ''}
              </span>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 active:scale-95"
                style={{ border: '1px solid #1E2530', color: '#94a3b8' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#cbd5e1' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E2530'; e.currentTarget.style.color = '#94a3b8' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Logout
              </button>
            </>
          )}

          {!isAuthenticated && (
            <>
              <NavLink
                to="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                style={{ border: '1px solid #1E2530', color: '#94a3b8' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#cbd5e1' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E2530'; e.currentTarget.style.color = '#94a3b8' }}
              >
                Login
              </NavLink>
              <NavLink
                to="/register"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-150 active:scale-95"
                style={{ background: 'linear-gradient(135deg,#0369a1,#0EA5E9)', boxShadow: '0 3px 10px rgba(14,165,233,0.25)' }}
              >
                Get Started
              </NavLink>
            </>
          )}
        </div>

        {/* ── Hamburger (mobile) ────────────────────────────────────────────── */}
        <button
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
          style={{ border: '1px solid #1E2530', color: open ? '#38BDF8' : '#64748b' }}
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round"/>
            </svg>
          )}
        </button>
      </div>

      {/* ── Mobile dropdown ───────────────────────────────────────────────── */}
      {open && (
        <div
          className="md:hidden border-t"
          style={{ background: '#080C12', borderColor: '#1E2530' }}
        >
          <nav className="py-2">
            {isAuthenticated ? (
              <>
                {NAV_ITEMS.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={mobileLinkClass}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                ))}
                {user?.is_staff && (
                  <NavLink
                    to="/admin-panel"
                    className={mobileLinkClass}
                    onClick={() => setOpen(false)}
                  >
                    🛡 Admin
                  </NavLink>
                )}
                {!user?.mpin_set && (
                  <NavLink
                    to="/set-mpin"
                    className={mobileLinkClass}
                    onClick={() => setOpen(false)}
                  >
                    🔐 Set MPIN
                  </NavLink>
                )}
              </>
            ) : (
              <>
                <NavLink to="/login"    className={mobileLinkClass} onClick={() => setOpen(false)}>Login</NavLink>
                <NavLink to="/register" className={mobileLinkClass} onClick={() => setOpen(false)}>Register</NavLink>
              </>
            )}
          </nav>

          {/* Mobile footer — user + logout */}
          {isAuthenticated && (
            <div
              className="flex items-center justify-between px-4 py-3 border-t"
              style={{ borderColor: '#1E2530' }}
            >
              <span className="text-xs font-mono" style={{ color: '#475569' }}>
                @{user?.username || ''}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ border: '1px solid #1E2530', color: '#94a3b8' }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
