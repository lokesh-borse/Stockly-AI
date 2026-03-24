import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_BASE_URL
// Your Telegram bot — users must open this and press Start to receive OTPs
const BOT_URL = 'https://t.me/StocklyAIBot'

export default function ForgotPassword() {
  const navigate = useNavigate()

  // 3-step flow:
  // step 1 → Open our Telegram bot
  // step 2 → Enter email → send OTP
  // step 3 → Enter OTP + new password
  const [step, setStep] = useState(1)

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── Step 2: Send OTP ──────────────────────────────────────────────
  async function handleSendOtp(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}forgot-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Something went wrong.')
      } else {
        setStep(3)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3: Verify OTP + Reset password ───────────────────────────
  async function handleResetPassword(e) {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API}reset-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, new_password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Something went wrong.')
      } else {
        navigate('/login', { state: { message: 'Password reset! Please log in.' } })
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step indicator ────────────────────────────────────────────────
  const steps = ['Open Bot', 'Verify Email', 'Reset Password']

  return (
    <div className="mx-auto w-[94vw] max-w-md p-4 md:p-8">
      <div className="rounded-3xl border border-white/70 bg-white/85 p-7 shadow-xl shadow-teal-900/10 backdrop-blur">

        {/* Header */}
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Forgot Password</div>
        <h1 className="text-3xl font-bold text-slate-900 mt-1 mb-4">Reset via Telegram</h1>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-6">
          {steps.map((label, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                ${step > i + 1 ? 'bg-teal-600 text-white' : step === i + 1 ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-400'}`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`text-xs hidden sm:inline ${step === i + 1 ? 'text-teal-700 font-semibold' : 'text-slate-400'}`}>
                {label}
              </span>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px mx-1 ${step > i + 1 ? 'bg-teal-400' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Open the bot ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800 space-y-2">
              <p className="font-semibold text-base">📱 First, open our Telegram bot</p>
              <p>You will receive your OTP password via Telegram. To receive it, you must <strong>start our bot once</strong>.</p>
            </div>

            <a
              href={BOT_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-[#2AABEE] hover:bg-[#1d97d8] transition text-white rounded-xl px-4 py-3 font-semibold text-base"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.5l-2.945-.918c-.64-.203-.652-.64.135-.954l11.566-4.461c.537-.194 1.006.131.968.054z"/>
              </svg>
              Open @StocklyAIBot on Telegram
            </a>

            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              <strong>👆 Inside the bot:</strong> Press the <strong>Start</strong> button. That's it — you'll come back here next.
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full bg-gradient-to-r from-teal-700 to-cyan-700 text-white rounded-xl px-4 py-3 font-semibold hover:from-teal-600 hover:to-cyan-600 transition"
            >
              I've started the bot → Continue
            </button>
          </div>
        )}

        {/* ── STEP 2: Enter email ── */}
        {step === 2 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <p className="text-sm text-slate-500">Enter your registered email and we'll send a 6-digit OTP to your Telegram.</p>
            <input
              className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-500"
              type="email"
              placeholder="Your registered email"
              value={email}
              required
              autoFocus
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && (
              <div className="text-rose-700 text-sm bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {error}
                {error.includes('started') && (
                  <a href={BOT_URL} target="_blank" rel="noreferrer" className="ml-1 underline font-semibold text-blue-600">
                    Open bot again →
                  </a>
                )}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-teal-700 to-cyan-700 text-white rounded-xl px-4 py-3 font-semibold hover:from-teal-600 hover:to-cyan-600 transition"
            >
              {loading ? 'Sending OTP...' : '📨 Send OTP to Telegram'}
            </button>
            <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-slate-500 hover:text-teal-700">
              ← Back
            </button>
          </form>
        )}

        {/* ── STEP 3: OTP + new password ── */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
              ✓ OTP sent to your Telegram! Check <strong>@StocklyAIBot</strong> for the code.
            </div>
            <input
              className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-500 tracking-widest text-lg font-bold text-center"
              type="text"
              placeholder="6-digit OTP"
              value={otp}
              maxLength={6}
              required
              autoFocus
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            />
            <input
              className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-500"
              type="password"
              placeholder="New password"
              value={newPassword}
              required
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <input
              className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-500"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              required
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {error && <div className="text-rose-700 text-sm bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</div>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-teal-700 to-cyan-700 text-white rounded-xl px-4 py-3 font-semibold hover:from-teal-600 hover:to-cyan-600 transition"
            >
              {loading ? 'Resetting...' : '🔐 Reset Password'}
            </button>
            <button
              type="button"
              onClick={() => { setStep(2); setError('') }}
              className="w-full text-sm text-slate-500 hover:text-teal-700"
            >
              ← Resend OTP
            </button>
          </form>
        )}

        {/* Back to login */}
        <div className="mt-5 text-sm text-slate-600 text-center">
          Remember your password?{' '}
          <Link to="/login" className="text-teal-700 font-semibold hover:text-teal-800">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
