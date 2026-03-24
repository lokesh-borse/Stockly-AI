import { useEffect, useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js'
import { Scatter } from 'react-chartjs-2'
import { fetchNiftyClusters } from '../api/stocks.js'

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend)

const STYLES = `
  @keyframes shimmer { from{background-position:-200% 0} to{background-position:200% 0} }
  @keyframes fade-up { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin { to { transform: rotate(360deg); } }

  .shimmer {
    background:linear-gradient(90deg,#151C26 25%,#1E2530 50%,#151C26 75%);
    background-size:200% 100%; animation:shimmer 2s linear infinite; border-radius:4px;
  }
  .fade-up { animation:fade-up 0.35s ease-out both; }
  .spin-icon { animation:spin 0.8s linear infinite; }

  .stat-card {
    border-radius: 12px;
    border: 1px solid #1E2530;
    background: #0D1117;
    padding: 16px;
    transition: border-color 0.15s, transform 0.15s;
  }
  .stat-card:hover { border-color: rgba(14,165,233,0.25); transform: translateY(-1px); }

  .dark-select {
    background: #0D1117;
    border: 1px solid #1E2530;
    color: #94a3b8;
    border-radius: 10px;
    padding: 10px 36px 10px 14px;
    font-size: 13px;
    appearance: none;
    -webkit-appearance: none;
    cursor: pointer;
    transition: border-color 0.15s;
    width: 100%;
  }
  .dark-select:focus {
    outline: none;
    border-color: #0EA5E9;
    box-shadow: 0 0 0 3px rgba(14,165,233,0.1);
    color: #e2e8f0;
  }
  .dark-select:disabled { opacity: 0.4; cursor: not-allowed; }

  .cluster-row { border-bottom: 1px solid #1E2530; transition: background 0.12s; }
  .cluster-row:hover { background: rgba(14,165,233,0.04) !important; }

  .chart-card { border-radius: 16px; border: 1px solid #1E2530; background: #0D1117; overflow: hidden; }
  .chart-card-header {
    padding: 16px 20px;
    border-bottom: 1px solid #1E2530;
    background: #080C12;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .running-bar {
    height: 2px;
    border-radius: 99px;
    background: linear-gradient(90deg, transparent, #0EA5E9, transparent);
    background-size: 200% 100%;
    animation: shimmer 1.2s linear infinite;
    margin-top: 16px;
  }
`

const CLUSTER_COLORS = ['#0EA5E9', '#22C55E', '#F59E0B', '#A855F7', '#EF4444', '#06B6D4', '#84CC16', '#3B82F6']

const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        color: '#94a3b8',
        font: { family: 'Inter', size: 12 },
        usePointStyle: true,
        pointStyleWidth: 8,
        padding: 16,
      }
    },
    tooltip: {
      backgroundColor: '#0D1117',
      borderColor: '#1E2530',
      borderWidth: 1,
      titleColor: '#e2e8f0',
      bodyColor: '#94a3b8',
      padding: 10,
      callbacks: {
        label: (ctx) => {
          const p = ctx.raw
          return `${ctx.dataset.label.split(' - ')[0]}  |  ${p.symbol}  |  (${Number(p.x).toFixed(2)}, ${Number(p.y).toFixed(2)})`
        }
      }
    }
  },
  scales: {
    x: {
      title: { display: true, text: 'PCA Component 1', color: '#475569', font: { size: 11 } },
      ticks: { color: '#475569', font: { size: 11 } },
      grid: { color: 'rgba(30,37,48,0.8)' },
    },
    y: {
      title: { display: true, text: 'PCA Component 2', color: '#475569', font: { size: 11 } },
      ticks: { color: '#475569', font: { size: 11 } },
      grid: { color: 'rgba(30,37,48,0.8)' },
    }
  }
}

const LABEL_COLORS = {
  'High-Risk':   { bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)',  text: '#f87171' },
  'Medium-Risked': { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', text: '#fbbf24' },
  'Low-Risked':  { bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.3)',  text: '#4ade80' },
}

function getLabelStyle(label = '') {
  const key = Object.keys(LABEL_COLORS).find(k => label.includes(k))
  return key ? LABEL_COLORS[key] : { bg: 'rgba(14,165,233,0.1)', border: 'rgba(14,165,233,0.3)', text: '#38BDF8' }
}

function fmt(v, d = 4) {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(d) : '—'
}

export default function NiftyClustersPage() {
  const [period, setPeriod] = useState('1y')
  const [interval, setInterval] = useState('1d')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetchNiftyClusters(period, interval)
      setData(res)
    } catch (e) {
      setData(null)
      setError(e?.response?.data?.detail || 'Failed to load NIFTY clusters.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const scatterData = useMemo(() => {
    if (!data?.items?.length) return null
    const clusterMap = new Map()
    for (const item of data.items) {
      const cid = item.cluster_id
      if (!clusterMap.has(cid)) clusterMap.set(cid, { points: [], label: item.cluster_label || `Cluster ${cid}` })
      clusterMap.get(cid).points.push({ x: item.pca_x, y: item.pca_y, symbol: item.symbol })
    }
    const datasets = [...clusterMap.entries()].map(([cid, payload], idx) => ({
      label: `Cluster ${cid} - ${payload.label}`,
      data: payload.points,
      pointRadius: 7,
      pointHoverRadius: 9,
      borderColor: CLUSTER_COLORS[idx % CLUSTER_COLORS.length],
      backgroundColor: `${CLUSTER_COLORS[idx % CLUSTER_COLORS.length]}88`,
      borderWidth: 1.5,
    }))
    return { datasets }
  }, [data])

  const sortedItems = useMemo(() => {
    const rows = data?.items || []
    return [...rows].sort((a, b) => {
      const ca = Number(a.cluster_id), cb = Number(b.cluster_id)
      if (ca !== cb) return ca - cb
      return String(a.symbol).localeCompare(String(b.symbol))
    })
  }, [data])

  return (
    <>
      <style>{STYLES}</style>
      <div className="min-h-screen pb-20" style={{ background: '#070B14' }}>
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-6 space-y-5">

          {/* ═══ HEADER ══════════════════════════════════════════════════════ */}
          <div className="fade-up rounded-2xl p-6" style={{ border: '1px solid #1E2530', background: '#0D1117' }}>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div className="flex-1">
                <div className="text-xs uppercase tracking-widest mb-1" style={{ color: '#0EA5E9', fontSize: 10 }}>EDA · Machine Learning</div>
                <h1 className="text-2xl md:text-3xl font-extrabold mb-1" style={{ color: '#e2e8f0', letterSpacing: '-0.01em' }}>
                  NIFTY Clustering{' '}
                  <span style={{ color: '#0EA5E9' }}>(K-Means)</span>
                </h1>
                <p className="text-sm" style={{ color: '#64748b' }}>
                  Clusters NIFTY stocks using momentum, volatility, drawdown, and volume features via PCA projection.
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row gap-3" style={{ minWidth: 380 }}>
                <div className="relative flex-1">
                  <select className="dark-select" value={period} onChange={e => setPeriod(e.target.value)} disabled={loading}>
                    <option value="1y">1 Year</option>
                    <option value="2y">2 Years</option>
                    <option value="5y">5 Years</option>
                  </select>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" className="w-4 h-4 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
                <div className="relative flex-1">
                  <select className="dark-select" value={interval} onChange={e => setInterval(e.target.value)} disabled={loading}>
                    <option value="1d">Daily (1d)</option>
                    <option value="1wk">Weekly (1wk)</option>
                  </select>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" className="w-4 h-4 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
                <button
                  type="button"
                  onClick={load}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #0369a1, #0EA5E9)', boxShadow: '0 4px 16px rgba(14,165,233,0.2)', whiteSpace: 'nowrap' }}
                >
                  {loading ? (
                    <>
                      <svg className="spin-icon w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                        <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                      </svg>
                      Running…
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                        <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" strokeLinecap="round"/>
                      </svg>
                      Run Clustering
                    </>
                  )}
                </button>
              </div>
            </div>

            {loading && <div className="running-bar" />}

            {error && (
              <div className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 flex-shrink-0">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
                {error}
              </div>
            )}
          </div>

          {/* ═══ STAT CARDS ══════════════════════════════════════════════════ */}
          {data && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4 fade-up">
                {[
                  { title: 'Universe Size', value: data.universe_size, sub: 'NIFTY symbols configured', accent: '#0EA5E9' },
                  { title: 'Rows Used', value: data.rows_used, sub: `${data.period} / ${data.interval}`, accent: '#94a3b8' },
                  { title: 'Selected K', value: data.selected_k, sub: 'Fixed to 3', accent: '#F59E0B' },
                  {
                    title: 'Features Used',
                    value: Array.isArray(data.features_used) ? data.features_used.length : 0,
                    sub: Array.isArray(data.features_used) ? data.features_used.join(', ') : '',
                    accent: '#22C55E'
                  },
                  { title: 'K Scores', value: data.k_scores?.length || 0, sub: 'silhouette candidates', accent: '#A855F7' },
                ].map((c, i) => (
                  <div key={i} className="stat-card">
                    <div className="text-xs uppercase tracking-widest mb-2" style={{ color: '#475569', fontSize: 10 }}>{c.title}</div>
                    <div className="text-2xl font-extrabold font-mono mb-1" style={{ color: c.accent }}>{c.value}</div>
                    {c.sub && <div className="text-xs leading-snug" style={{ color: '#475569' }}>{c.sub}</div>}
                  </div>
                ))}
              </div>

              {/* ═══ SCATTER CHART ══════════════════════════════════════════ */}
              <div className="chart-card fade-up">
                <div className="chart-card-header">
                  <span className="inline-block w-0.5 h-4 rounded-full" style={{ background: '#0EA5E9' }} />
                  <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Cluster Map (PCA Projection)</span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-md font-mono"
                        style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)', color: '#38BDF8' }}>
                    K={data.selected_k}
                  </span>
                </div>
                <div className="p-5" style={{ height: 520 }}>
                  {scatterData ? <Scatter data={scatterData} options={CHART_OPTIONS} /> : null}
                </div>
              </div>

              {/* ═══ CLUSTER SUMMARY TABLE ══════════════════════════════════ */}
              <div className="chart-card fade-up">
                <div className="chart-card-header">
                  <span className="inline-block w-0.5 h-4 rounded-full" style={{ background: '#22C55E' }} />
                  <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Cluster Summary</span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-md font-mono"
                        style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}>
                    {data.cluster_summary?.length || 0} clusters
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left" style={{ minWidth: 980 }}>
                    <thead>
                      <tr style={{ background: '#080C12', borderBottom: '1px solid #1E2530' }}>
                        {['Cluster', 'Label', 'Count', 'ret_1m', 'ret_3m', 'ret_6m', 'ret_1y', 'vol_1y', 'max_drawdown_1y', 'avg_volume_3m'].map(h => (
                          <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#475569', fontSize: 10 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(data.cluster_summary || []).map((row, i) => {
                        const style = getLabelStyle(row.cluster_label)
                        const color = CLUSTER_COLORS[Number(row.cluster_id) % CLUSTER_COLORS.length]
                        return (
                          <tr key={row.cluster_id} className="cluster-row" style={{ background: i % 2 === 0 ? '#0D1117' : '#080C12' }}>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5 font-mono font-bold text-sm" style={{ color }}>
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                                {row.cluster_id}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-md text-xs font-semibold" style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.text }}>
                                {row.cluster_label}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-sm font-semibold" style={{ color: '#e2e8f0' }}>{row.count}</td>
                            {['ret_1m', 'ret_3m', 'ret_6m', 'ret_1y', 'vol_1y', 'max_drawdown_1y', 'avg_volume_3m'].map(k => (
                              <td key={k} className="px-4 py-3 font-mono text-sm" style={{ color: Number(row[k]) >= 0 ? '#94a3b8' : '#64748b' }}>
                                {fmt(row[k])}
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ═══ STOCK ASSIGNMENTS TABLE ════════════════════════════════ */}
              <div className="chart-card fade-up">
                <div className="chart-card-header">
                  <span className="inline-block w-0.5 h-4 rounded-full" style={{ background: '#F59E0B' }} />
                  <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Stock Assignments</span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-md font-mono"
                        style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24' }}>
                    {sortedItems.length} stocks
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left" style={{ minWidth: 900 }}>
                    <thead>
                      <tr style={{ background: '#080C12', borderBottom: '1px solid #1E2530' }}>
                        {['Symbol', 'Cluster', 'Label', 'ret_1m', 'ret_3m', 'ret_6m', 'vol_1y', 'drawdown'].map(h => (
                          <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#475569', fontSize: 10 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedItems.map((row, i) => {
                        const style = getLabelStyle(row.cluster_label)
                        const color = CLUSTER_COLORS[Number(row.cluster_id) % CLUSTER_COLORS.length]
                        return (
                          <tr key={row.symbol} className="cluster-row" style={{ background: i % 2 === 0 ? '#0D1117' : '#080C12' }}>
                            <td className="px-4 py-3">
                              <span className="font-mono font-bold text-sm" style={{ color: '#38BDF8' }}>
                                {String(row.symbol).replace(/\.(NS|BO)$/, '')}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5 font-mono text-sm" style={{ color }}>
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                                {row.cluster_id}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-md text-xs font-semibold" style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.text }}>
                                {row.cluster_label}
                              </span>
                            </td>
                            {[
                              { key: 'ret_1m', val: row.ret_1m },
                              { key: 'ret_3m', val: row.ret_3m },
                              { key: 'ret_6m', val: row.ret_6m },
                              { key: 'vol_1y', val: row.vol_1y },
                              { key: 'max_drawdown_1y', val: row.max_drawdown_1y },
                            ].map(({ key, val }) => {
                              const n = Number(val)
                              const isRet = key.startsWith('ret')
                              const clr = isRet ? (n >= 0 ? '#22C55E' : '#EF4444') : '#94a3b8'
                              return (
                                <td key={key} className="px-4 py-3 font-mono text-sm" style={{ color: clr }}>
                                  {fmt(val)}{isRet ? '%' : ''}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ═══ EMPTY STATE ═════════════════════════════════════════════════ */}
          {!data && !loading && (
            <div className="fade-up rounded-2xl py-20 text-center" style={{ border: '1px solid #1E2530', background: '#0D1117' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                   style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="1.8" className="w-8 h-8">
                  <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="text-base font-semibold mb-1" style={{ color: '#e2e8f0' }}>No cluster data yet</div>
              <div className="text-sm" style={{ color: '#475569' }}>Select a period and interval, then click <strong style={{ color: '#0EA5E9' }}>Run Clustering</strong>.</div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
