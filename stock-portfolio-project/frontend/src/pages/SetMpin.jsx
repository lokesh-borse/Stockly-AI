import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { setMpin } from '../api/stocks.js'

const STYLES = `
  @keyframes fade-up  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse-dot { 0%,100%{opacity:0.4;transform:scale(0.85)} 50%{opacity:1;transform:scale(1)} }
  @keyframes glow-in { from{box-shadow:0 0 0 0 rgba(14,165,233,0)} to{box-shadow:0 0 24px 4px rgba(14,165,233,0.18)} }
  @keyframes spin { to { transform: rotate(360deg); } }

  .fade-up { animation: fade-up 0.35s ease-out both; }
  .spin-icon { animation: spin 0.8s linear infinite; }

  .pin-dot {
    width: 14px; height: 14px;
    border-radius: 50%;
    border: 2px solid #1E2530;
    background: #0D1117;
    transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
  }
  .pin-dot.filled {
    background: #0EA5E9;
    border-color: #0EA5E9;
    box-shadow: 0 0 8px rgba(14,165,233,0.5);
  }
  .pin-dot.mismatch {
    background: #EF4444;
    border-color: #EF4444;
    box-shadow: 0 0 8px rgba(239,68,68,0.5);
  }

  .mpin-input {
    background: #0D1117;
    border: 1px solid #1E2530;
    color: #e2e8f0;
    transition: border-color 0.15s, box-shadow 0.15s;
    caret-color: #0EA5E9;
    letter-spacing: 0.6em;
  }
  .mpin-input:focus {
    outline: none;
    border-color: #0EA5E9;
    box-shadow: 0 0 0 3px rgba(14,165,233,0.1);
  }
  .mpin-input::placeholder { letter-spacing: 0.3em; color: #334155; }
`

export default function SetMpin() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) navigate('/login')
  }, [isAuthenticated, navigate])

  const pinMatch = confirm.length > 0 && pin.length === 6 && confirm.length === 6 && pin !== confirm

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (!/^\d{6}$/.test(pin)) { setError('MPIN must be exactly 6 digits.'); return }
    if (pin !== confirm) { setError('PINs do not match.'); return }
    setLoading(true)
    try {
      await setMpin(pin)
      setSuccess(true)
      setTimeout(() => navigate('/portfolio'), 1800)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to set MPIN.')
    } finally { setLoading(false) }
  }

  if (success) return (
    <>
      <style>{STYLES}</style>
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#070B14' }}>
        <div className="text-center fade-up">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
               style={{ background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.3)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" className="w-10 h-10">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="text-2xl font-bold mb-2" style={{ color: '#22C55E' }}>MPIN Set Successfully!</div>
          <div className="text-sm" style={{ color: '#64748b' }}>Redirecting to your portfolios…</div>
        </div>
      </div>
    </>
  )

  return (
    <>
      <style>{STYLES}</style>
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#070B14' }}>
        <div className="w-full max-w-md fade-up">

          {/* Card */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #1E2530', background: '#0D1117' }}>

            {/* Header strip */}
            <div className="px-8 pt-8 pb-6 text-center" style={{ borderBottom: '1px solid #1E2530' }}>
              {/* Lock Icon */}
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                   style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.15), rgba(3,105,161,0.1))', border: '1px solid rgba(14,165,233,0.25)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="1.8" className="w-8 h-8">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round"/>
                  <circle cx="12" cy="16" r="1" fill="#0EA5E9"/>
                </svg>
              </div>
              <div className="text-xs uppercase tracking-widest mb-1" style={{ color: '#0EA5E9', fontSize: 10 }}>Security</div>
              <h1 className="text-2xl font-extrabold mb-2" style={{ color: '#e2e8f0', letterSpacing: '-0.01em' }}>Set Your MPIN</h1>
              <p className="text-sm" style={{ color: '#64748b' }}>A 6-digit security PIN required for all buy / sell operations</p>
            </div>

            {/* Form body */}
            <form onSubmit={onSubmit} className="px-8 py-7 space-y-5">

              {/* PIN field */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: '#475569', fontSize: 10 }}>
                  6-Digit MPIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="\d{6}"
                  className="mpin-input w-full px-4 py-3.5 rounded-xl text-center text-2xl font-mono font-bold"
                  placeholder="••••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoFocus
                />
                {/* Dot indicators */}
                <div className="flex justify-center gap-3 mt-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <span key={i} className={`pin-dot ${pin.length > i ? 'filled' : ''}`} />
                  ))}
                </div>
              </div>

              {/* Confirm field */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: '#475569', fontSize: 10 }}>
                  Confirm MPIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="\d{6}"
                  className="mpin-input w-full px-4 py-3.5 rounded-xl text-center text-2xl font-mono font-bold"
                  style={pinMatch ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.1)' } : {}}
                  placeholder="••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                {/* Dot indicators */}
                <div className="flex justify-center gap-3 mt-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <span key={i} className={`pin-dot ${confirm.length > i ? (pinMatch ? 'mismatch' : 'filled') : ''}`} />
                  ))}
                </div>
              </div>

              {/* Strength hint */}
              {pin.length === 6 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0">
                    <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
                  </svg>
                  <span style={{ color: '#64748b' }}>Do not share your MPIN with anyone. It cannot be recovered.</span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 flex-shrink-0">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || pin.length < 6 || confirm.length < 6}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #0369a1, #0EA5E9)', boxShadow: '0 4px 16px rgba(14,165,233,0.25)' }}
              >
                {loading ? (
                  <>
                    <svg className="spin-icon w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                      <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                    </svg>
                    Setting MPIN…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round"/>
                    </svg>
                    Set MPIN
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="px-8 pb-6 text-center">
              <p className="text-xs" style={{ color: '#334155' }}>
                You can update your MPIN anytime from{' '}
                <span style={{ color: '#0EA5E9', cursor: 'pointer' }}>profile settings</span>.
              </p>
            </div>
          </div>

          {/* Security badges */}
          <div className="flex items-center justify-center gap-6 mt-5">
            {[
              { icon: '🔒', label: 'End-to-end encrypted' },
              { icon: '🛡️', label: 'Not stored in plaintext' },
            ].map(b => (
              <div key={b.label} className="flex items-center gap-1.5 text-xs" style={{ color: '#334155' }}>
                <span>{b.icon}</span> {b.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
