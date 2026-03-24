import { useState, useCallback } from 'react'
import { verifyMpin } from '../api/stocks.js'

/**
 * MpinModal — shows a 6-digit PIN input. Calls onSuccess(true) when verified.
 * Usage:
 *   const [mpinOpen, setMpinOpen] = useState(false)
 *   const [pendingAction, setPendingAction] = useState(null)
 *   ...
 *   <MpinModal open={mpinOpen} onSuccess={() => { setMpinOpen(false); pendingAction() }} onClose={() => setMpinOpen(false)} />
 */
export default function MpinModal({ open, onSuccess, onClose, title = 'Confirm MPIN' }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    if (pin.length !== 6) { setError('Enter all 6 digits.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await verifyMpin(pin)
      if (res.mpin_valid) {
        setPin('')
        onSuccess()
      } else {
        setError('Incorrect MPIN. Please try again.')
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'Incorrect MPIN.')
    } finally { setLoading(false) }
  }

  function handleClose() { setPin(''); setError(''); onClose() }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm mx-4 rounded-3xl bg-white shadow-2xl p-8 border border-slate-200">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔐</div>
          <h2 className="text-xl font-extrabold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500 mt-1">Enter your 6-digit MPIN to proceed</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-3xl tracking-[0.7em] text-center bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="••••••"
            value={pin}
            onChange={(e) => { setError(''); setPin(e.target.value.replace(/\D/g, '').slice(0, 6)) }}
          />
          {error && <div className="text-rose-600 text-sm text-center">{error}</div>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 border border-slate-200 text-slate-700 px-4 py-3 rounded-xl font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || pin.length !== 6}
              className="flex-1 bg-gradient-to-r from-teal-700 to-cyan-700 text-white px-4 py-3 rounded-xl font-bold hover:from-teal-600 hover:to-cyan-600 transition disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
