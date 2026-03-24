import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchAdminUsers, adminDeletePortfolio } from '../api/stocks.js'

export default function AdminPanel() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return }
    if (user && !user.is_staff) { navigate('/portfolio'); return }
    load()
  }, [isAuthenticated, user])

  async function load() {
    setLoading(true)
    try {
      const data = await fetchAdminUsers()
      setUsers(data)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to load users. Admin access required.')
    } finally { setLoading(false) }
  }

  async function onDeletePortfolio(portfolioId) {
    if (!window.confirm('Delete this portfolio? This cannot be undone.')) return
    setDeletingId(portfolioId)
    try {
      await adminDeletePortfolio(portfolioId)
      await load()
    } catch { setError('Delete failed.') }
    finally { setDeletingId(null) }
  }

  return (
    <div className="mx-auto w-[96vw] max-w-[1600px] p-4 md:p-6">
      <div className="rounded-3xl border border-white/70 bg-gradient-to-r from-slate-800 via-slate-700 to-teal-900 p-6 shadow-lg mb-6">
        <div className="text-xs uppercase tracking-widest text-slate-300">Administration</div>
        <h1 className="text-4xl font-extrabold text-white mt-1">Admin Panel</h1>
        <p className="text-slate-300 mt-2">Manage all users and their portfolios.</p>
      </div>

      {loading && <div className="text-slate-600">Loading users...</div>}
      {error && <div className="text-rose-600 mb-4 p-3 bg-rose-50 rounded-xl">{error}</div>}

      {!loading && !error && (
        <div className="space-y-4">
          {users.map((u) => (
            <div key={u.id} className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-lg">{u.username}</span>
                    {u.is_staff && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg font-semibold">Admin</span>}
                  </div>
                  <div className="text-sm text-slate-500">{u.email}</div>
                  {u.telegram_handle && (
                    <div className="text-sm text-teal-600 mt-0.5">📱 {u.telegram_handle}</div>
                  )}
                  <div className="text-xs text-slate-400 mt-0.5">
                    Joined: {new Date(u.date_joined).toLocaleDateString()} · {u.portfolio_count} portfolio(s)
                  </div>
                </div>
                <Link
                  to={`/admin/user/${u.id}`}
                  className="px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold hover:bg-teal-800 transition text-sm text-center"
                >
                  View All Activities →
                </Link>
              </div>

              {u.portfolios.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left min-w-[500px]">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-100">
                        <th className="py-2 px-3">Portfolio</th>
                        <th className="py-2 px-3">Created</th>
                        <th className="py-2 px-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {u.portfolios.map((p) => (
                        <tr key={p.id} className="border-t border-slate-50 hover:bg-slate-50 transition">
                          <td className="py-2 px-3 font-medium text-slate-900">{p.name}</td>
                          <td className="py-2 px-3 text-slate-500">{new Date(p.created_at).toLocaleDateString()}</td>
                          <td className="py-2 px-3">
                            <button
                              onClick={() => onDeletePortfolio(p.id)}
                              disabled={deletingId === p.id}
                              className="bg-rose-600 text-white px-3 py-1 rounded-lg text-xs font-semibold hover:bg-rose-700 transition disabled:opacity-50"
                            >
                              {deletingId === p.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {u.portfolios.length === 0 && (
                <div className="text-slate-400 text-sm mt-1">No portfolios yet.</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
