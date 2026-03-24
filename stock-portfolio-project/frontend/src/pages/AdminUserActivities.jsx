import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchAdminUserPortfolios } from '../api/stocks.js'

export default function AdminUserActivities() {
  const { userId } = useParams()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [userId])

  async function load() {
    setLoading(true)
    try {
      const res = await fetchAdminUserPortfolios(userId)
      setData(res)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to load user data.')
    } finally { setLoading(false) }
  }

  return (
    <div className="mx-auto w-[96vw] max-w-[1600px] p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin-panel" className="text-teal-700 hover:text-teal-900 font-semibold text-sm">← Back to Admin Panel</Link>
      </div>

      {loading && <div className="text-slate-600">Loading...</div>}
      {error && <div className="text-rose-600">{error}</div>}

      {data && (
        <>
          <div className="rounded-3xl border border-white/70 bg-gradient-to-r from-slate-800 to-teal-900 p-6 shadow-lg mb-6">
            <div className="text-xs uppercase tracking-widest text-slate-300">User Activities</div>
            <h1 className="text-3xl font-extrabold text-white mt-1">{data.user.username}</h1>
            <div className="text-slate-300 text-sm mt-1">{data.user.email}</div>
            {data.user.telegram_handle && (
              <div className="text-teal-300 text-sm mt-0.5">📱 {data.user.telegram_handle}</div>
            )}
          </div>

          <div className="space-y-5">
            {data.portfolios.length === 0 && (
              <div className="text-slate-500 p-5 bg-white/80 rounded-2xl">This user has no portfolios yet.</div>
            )}
            {data.portfolios.map((p) => (
              <div key={p.id} className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-extrabold text-xl text-slate-900">{p.name}</div>
                    <div className="text-sm text-slate-500">{p.description || 'No description'}</div>
                  </div>
                  <div className="text-sm text-slate-500">
                    Total Value: <span className="font-bold text-teal-700">{p.total_value ?? '-'}</span>
                  </div>
                </div>

                {p.stocks?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-700">
                          <th className="p-3">Symbol</th>
                          <th className="p-3">Name</th>
                          <th className="p-3">Qty</th>
                          <th className="p-3">Purchase Price</th>
                          <th className="p-3">Purchase Date</th>
                          <th className="p-3">P/E</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.stocks.map((s) => (
                          <tr key={s.symbol} className="border-t border-slate-100 hover:bg-sky-50/50 transition">
                            <td className="p-3 font-bold text-teal-700">{s.symbol}</td>
                            <td className="p-3 text-slate-800">{s.name}</td>
                            <td className="p-3">{s.quantity}</td>
                            <td className="p-3">₹{s.purchase_price}</td>
                            <td className="p-3">{s.purchase_date || '-'}</td>
                            <td className="p-3">{s.pe_ratio ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-slate-400 text-sm">No stocks in this portfolio.</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
