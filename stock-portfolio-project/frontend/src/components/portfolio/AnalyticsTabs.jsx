/**
 * AnalyticsTabs.jsx
 * Five collapsible analytics panels for the PortfolioDetail page.
 * Each tab is lazy-loaded on first open.
 * Dark terminal theme — all charts use surface-900 background.
 */
import { useMemo, useState, useEffect } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line, Scatter } from 'react-chartjs-2'
import api from '../../api/axios.js'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
)

// ── Cluster colours (vivid, distinct on dark bg) ──────────────────────────────
const CLUSTER_COLORS = [
  '#0EA5E9','#22C55E','#F59E0B','#a855f7','#EF4444','#06b6d4',
]

// ── Shared dark Chart.js defaults ─────────────────────────────────────────────
const darkDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 250 },
  plugins: {
    legend: {
      labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, boxWidth: 10 },
    },
    tooltip: {
      backgroundColor: '#151C26',
      borderColor: '#1E2530',
      borderWidth: 1,
      titleColor: '#e2e8f0',
      bodyColor: '#94a3b8',
      padding: 10,
      cornerRadius: 6,
    },
  },
  scales: {
    x: {
      ticks: { color: '#64748b', font: { size: 10 } },
      grid: { color: 'rgba(255,255,255,0.04)' },
    },
    y: {
      ticks: { color: '#64748b', font: { size: 10 } },
      grid: { color: 'rgba(255,255,255,0.04)' },
    },
  },
}

// ── Shimmer Skeleton ──────────────────────────────────────────────────────────
const shimmer = {
  background: 'linear-gradient(90deg,#151C26 25%,#1E2530 50%,#151C26 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 2s linear infinite',
}
const SkeletonBlock = ({ h = '16px', w = '100%', className = '' }) => (
  <span className={`block rounded ${className}`} style={{ ...shimmer, height: h, width: w }} />
)

// ─── TAB 1 : ML Forecast (Linear Regression) ─────────────────────────────────
export function MLForecastTab({ lrData, logData, loading }) {
  const resolveCurrent = (p) => {
    const n = Number(p?.current_price)
    if (Number.isFinite(n)) return n
    const c = Number(p?.close_price)
    if (Number.isFinite(c)) return c
    const l = Number(p?.latest_close)
    if (Number.isFinite(l)) return l
    return 0
  }

  const signalBySymbol = useMemo(() => {
    const preds = logData?.predictions || []
    return Object.fromEntries(preds.map((p) => [p.symbol, p.signal]))
  }, [logData])

  const chartData = useMemo(() => {
    if (!lrData?.predictions?.length) return null
    const preds = lrData.predictions
    return {
      labels: preds.map((p) => p.symbol),
      datasets: [
        {
          label: 'Current Price (Rs)',
          data: preds.map(resolveCurrent),
          borderColor: '#0EA5E9',
          backgroundColor: 'rgba(14,165,233,0.1)',
          fill: false,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 7,
          pointBackgroundColor: '#0EA5E9',
        },
        {
          label: 'Predicted Next Close (Rs)',
          data: preds.map((p) => Number(p.lr_predict ?? p.predicted_next_close ?? 0)),
          borderColor: '#22ff88',
          backgroundColor: 'rgba(34,255,136,0.08)',
          fill: false,
          tension: 0.35,
          borderWidth: 3,
          borderDash: [7, 4],
          pointRadius: 5,
          pointHoverRadius: 8,
          pointBackgroundColor: '#22ff88',
        },
      ],
    }
  }, [lrData])

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <SkeletonBlock h="180px" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <SkeletonBlock key={i} h="52px" />)}
        </div>
      </div>
    )
  }

  if (!chartData) {
    return (
      <div className="p-6 text-center text-neutral-500 text-sm">
        No linear regression predictions available yet.
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="h-64">
        <Line data={chartData} options={{
          ...darkDefaults,
          plugins: {
            ...darkDefaults.plugins,
            tooltip: {
              ...darkDefaults.plugins.tooltip,
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: Rs${Number(ctx.raw).toFixed(2)}`,
              },
            },
          },
          scales: {
            ...darkDefaults.scales,
            y: { ...darkDefaults.scales.y, ticks: { ...darkDefaults.scales.y.ticks, callback: (v) => `Rs${v}` } },
          },
        }} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-surface-700">
              {['Symbol', 'Curr Val', 'LR Pred', 'Signal'].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-2xs uppercase tracking-wider text-neutral-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lrData.predictions.map((p) => {
              const current = resolveCurrent(p)
              const lrPred = Number.isFinite(Number(p.lr_predict)) ? Number(p.lr_predict) : Number(p.predicted_next_close || 0)
              const signal = signalBySymbol[p.symbol] || p.signal || (Number(p.predicted_change_percent || 0) >= 0 ? 'BUY' : 'SELL')
              const signalClass = signal === 'BUY'
                ? 'text-gain-500 bg-gain-500/10 border-gain-500/20'
                : signal === 'SELL'
                  ? 'text-loss-500 bg-loss-500/10 border-loss-500/20'
                  : 'text-amber-400 bg-amber-500/10 border-amber-500/20'

              return (
                <tr key={p.symbol} className="border-b border-surface-700/50 hover:bg-surface-800 transition-colors">
                  <td className="px-3 py-2 font-medium text-neutral-200">{p.symbol}</td>
                  <td className="px-3 py-2 font-mono text-neutral-300">Rs{current.toFixed(2)}</td>
                  <td className="px-3 py-2 font-mono text-brand-400">Rs{lrPred.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <span className={`text-2xs font-medium px-1.5 py-0.5 rounded border ${signalClass}`}>
                      {signal}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {lrData.skipped?.length > 0 && (
        <p className="text-2xs text-neutral-600">
          Skipped (insufficient data): {lrData.skipped.map((s) => s.symbol || s).join(', ')}
        </p>
      )}
    </div>
  )
}
// ─── TAB 2 : Cluster Analysis (K-Means Scatter) ──────────────────────────────
export function ClusterTab({ portfolioId, fetchFn }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ran, setRan] = useState(false)

  async function run() {
    setLoading(true); setError('')
    try { const d = await fetchFn(portfolioId); setData(d); setRan(true) }
    catch (e) { setError(e?.response?.data?.detail || 'Clustering failed.') }
    finally { setLoading(false) }
  }

  const scatterData = useMemo(() => {
    if (!data?.items?.length) return null
    const map = new Map()
    for (const item of data.items) {
      const cid = item.cluster_id
      if (!map.has(cid)) map.set(cid, { points: [], label: item.cluster_label })
      map.get(cid).points.push({ x: item.pca_x, y: item.pca_y, symbol: item.symbol })
    }
    return {
      datasets: [...map.entries()].map(([cid, { points, label }], idx) => ({
        label: `${label}`,
        data: points,
        pointRadius: 9,
        pointHoverRadius: 12,
        borderColor: CLUSTER_COLORS[idx % CLUSTER_COLORS.length],
        backgroundColor: `${CLUSTER_COLORS[idx % CLUSTER_COLORS.length]}99`,
      })),
    }
  }, [data])

  if (!ran) {
    return (
      <div className="p-8 flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 text-xl">⬡</div>
        <div>
          <p className="text-sm text-neutral-300 font-medium">K-Means Cluster Analysis</p>
          <p className="text-xs text-neutral-500 mt-1">Groups stocks by return, volatility, drawdown &amp; 52W position via PCA.</p>
        </div>
        <button onClick={run} disabled={loading}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-500 transition disabled:opacity-60">
          {loading ? 'Running…' : 'Run Clustering'}
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {error && <p className="text-xs text-loss-400">{error}</p>}

      {/* Cluster summary chips */}
      {data?.summary && (
        <div className="flex flex-wrap gap-2">
          {data.summary.map((s, idx) => (
            <div key={s.cluster_id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs"
              style={{ borderColor: `${CLUSTER_COLORS[idx % CLUSTER_COLORS.length]}50`, background: `${CLUSTER_COLORS[idx % CLUSTER_COLORS.length]}10` }}>
              <span className="font-medium" style={{ color: CLUSTER_COLORS[idx % CLUSTER_COLORS.length] }}>{s.cluster_label}</span>
              <span className="text-neutral-500">·</span>
              <span className="text-neutral-400 font-mono">{s.count} stocks</span>
              <span className="text-neutral-500">·</span>
              <span className={s.avg_ret_1y >= 0 ? 'text-gain-500 font-mono' : 'text-loss-500 font-mono'}>
                {(s.avg_ret_1y * 100).toFixed(1)}% ret
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Scatter plot */}
      {scatterData && (
        <div className="h-72">
          <Scatter data={scatterData} options={{
            ...darkDefaults,
            plugins: {
              ...darkDefaults.plugins,
              tooltip: {
                ...darkDefaults.plugins.tooltip,
                callbacks: { label: ctx => `${ctx.raw.symbol} (${ctx.dataset.label})` }
              }
            },
            scales: {
              x: { ...darkDefaults.scales.x, title: { display: true, text: 'PCA 1', color: '#64748b', font: { size: 10 } } },
              y: { ...darkDefaults.scales.y, title: { display: true, text: 'PCA 2', color: '#64748b', font: { size: 10 } } },
            }
          }} />
        </div>
      )}

      {/* Cluster table */}
      {data?.items && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-surface-700">
                {['Symbol','Cluster','1Y Return','Volatility','Max Drawdown','52W Pos'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-2xs uppercase tracking-wider text-neutral-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((row, idx) => {
                const ci = data.summary?.findIndex(s => s.cluster_id === row.cluster_id) ?? 0
                const col = CLUSTER_COLORS[ci % CLUSTER_COLORS.length]
                return (
                  <tr key={row.symbol} className="border-b border-surface-700/50 hover:bg-surface-800 transition-colors">
                    <td className="px-3 py-2 font-medium text-neutral-200">{row.symbol}</td>
                    <td className="px-3 py-2">
                      <span className="text-2xs px-1.5 py-0.5 rounded font-medium border"
                        style={{ color: col, borderColor: `${col}40`, background: `${col}15` }}>
                        {row.cluster_label}
                      </span>
                    </td>
                    <td className={`px-3 py-2 font-mono ${row.ret_1y >= 0 ? 'text-gain-500' : 'text-loss-500'}`}>
                      {(row.ret_1y * 100).toFixed(2)}%
                    </td>
                    <td className="px-3 py-2 font-mono text-neutral-400">{(row.vol * 100).toFixed(2)}%</td>
                    <td className="px-3 py-2 font-mono text-loss-400">{(row.max_drawdown * 100).toFixed(2)}%</td>
                    <td className="px-3 py-2 font-mono text-neutral-400">{(row.pos_52w * 100).toFixed(1)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <button onClick={run} disabled={loading}
        className="text-xs text-brand-400 hover:text-brand-300 transition">
        {loading ? 'Re-running…' : '↻ Re-run clustering'}
      </button>
    </div>
  )
}

// ─── TAB 3 : Growth Analysis ─────────────────────────────────────────────────
export function GrowthTab({ growthData, loading }) {
  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <SkeletonBlock key={i} h="64px" />)}
        </div>
        <SkeletonBlock h="200px" />
      </div>
    )
  }
  if (!growthData) return <div className="p-8 text-center text-neutral-500 text-sm">Growth analysis not loaded.</div>
  if (growthData.error) return <div className="p-4 text-xs text-loss-400">{growthData.error}</div>

  const sharpe = Number(growthData.annualised_sharpe_ratio || 0)
  const sharpeColor = sharpe >= 1.5 ? '#22C55E' : sharpe >= 0.5 ? '#F59E0B' : '#EF4444'
  const ratio = Math.min(100, Math.max(0, ((sharpe + 1) / 4) * 100))

  return (
    <div className="p-4 space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Mean Daily Return', value: `${growthData.portfolio_mean_daily_return_pct}%`, color: '#0EA5E9' },
          { label: 'Std Deviation',     value: `${growthData.portfolio_std_dev_pct}%`,     color: '#F59E0B' },
          { label: 'Sharpe (Ann.)',     value: sharpe.toFixed(3),                           color: sharpeColor },
          { label: 'Period',            value: growthData.period || '3M',                  color: '#94a3b8' },
        ].map(card => (
          <div key={card.label} className="bg-surface-800 border border-surface-700 rounded-lg p-3">
            <div className="text-2xs uppercase tracking-wider text-neutral-500 mb-1">{card.label}</div>
            <div className="text-lg font-bold font-mono" style={{ color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Sharpe ratio meter */}
      <div className="bg-surface-800 border border-surface-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-neutral-400">Sharpe Ratio Meter</span>
          <span className="text-xs font-mono font-bold" style={{ color: sharpeColor }}>{sharpe.toFixed(3)}</span>
        </div>
        <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${ratio}%`, background: sharpeColor }} />
        </div>
        <div className="flex justify-between mt-1">
          {['Poor (<0.5)','Fair (0.5–1)','Good (1–1.5)','Excellent (>1.5)'].map(l => (
            <span key={l} className="text-2xs text-neutral-600">{l}</span>
          ))}
        </div>
      </div>

      {/* Best / Worst */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gain-500/5 border border-gain-500/20 rounded-lg p-3">
          <div className="text-2xs text-gain-500 uppercase tracking-wider mb-1">🏆 Best Performer</div>
          <div className="font-bold text-neutral-200 font-mono">{growthData.best_stock?.symbol}</div>
          <div className="text-sm text-gain-500 font-mono">{growthData.best_stock?.total_return}%</div>
        </div>
        <div className="bg-loss-500/5 border border-loss-500/20 rounded-lg p-3">
          <div className="text-2xs text-loss-500 uppercase tracking-wider mb-1">⬇ Worst Performer</div>
          <div className="font-bold text-neutral-200 font-mono">{growthData.worst_stock?.symbol}</div>
          <div className="text-sm text-loss-500 font-mono">{growthData.worst_stock?.total_return}%</div>
        </div>
      </div>

      {/* Breakdown table */}
      {growthData.stock_breakdown?.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-surface-700">
                {['Symbol','3M Return','Mean Daily Ret','Volatility'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-2xs uppercase tracking-wider text-neutral-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {growthData.stock_breakdown.map(s => (
                <tr key={s.symbol} className="border-b border-surface-700/50 hover:bg-surface-800 transition-colors">
                  <td className="px-3 py-2 font-medium text-neutral-200">{s.symbol}</td>
                  <td className={`px-3 py-2 font-mono font-medium ${Number(s.total_return) >= 0 ? 'text-gain-500' : 'text-loss-500'}`}>
                    {s.total_return}%
                  </td>
                  <td className="px-3 py-2 font-mono text-neutral-400">{s.mean_daily_return}%</td>
                  <td className="px-3 py-2 font-mono text-neutral-400">{s.volatility}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── TAB 4 : AI Summary Report (AI Enhanced) ──────────────────────────────────
// AI calls are streamed from /api/chat/

function renderSummaryMarkdown(text, baseColor = '#94a3b8') {
  return (text || '').split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} style={{ height: 6 }} />
    if (line.startsWith('## '))
      return <h3 key={i} style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', margin: '12px 0 4px' }}>{line.slice(3)}</h3>
    if (line.startsWith('# '))
      return <h2 key={i} style={{ fontSize: 15, fontWeight: 800, color: '#38bdf8', margin: '14px 0 6px' }}>{line.slice(2)}</h2>
    if (line.startsWith('- ') || line.startsWith('• '))
      return (
        <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: baseColor, margin: '3px 0', lineHeight: 1.6 }}>
          <span style={{ color: '#38bdf8', flexShrink: 0 }}>·</span>
          <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e2e8f0">$1</strong>') }} />
        </div>
      )
    if (line.startsWith('⚠️') || line.startsWith('✅'))
      return <p key={i} style={{ fontSize: 12, color: line.startsWith('⚠️') ? '#f59e0b' : '#22c55e', margin: '4px 0', lineHeight: 1.6 }}>{line}</p>
    return (
      <p key={i} style={{ fontSize: 12, color: baseColor, margin: '2px 0', lineHeight: 1.6 }}
        dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e2e8f0">$1</strong>') }} />
    )
  })
}

export function SummaryTab({ summaryData, loading }) {
  const [aiReport, setAiReport] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  useEffect(() => {
    if (!summaryData?.report || aiReport || aiLoading) return

    const prompt = `You are an expert financial analyst AI. A user's stock portfolio has been analysed using K-Means clustering. Here is the cluster summary report:

---
${summaryData.report}
---

Portfolio name: ${summaryData.portfolio_name || 'My Portfolio'}

Based on this data, generate a rich, actionable AI insights report with the following sections:
1. Overall Portfolio Health - 2-3 sentences on the overall risk/return balance
2. Key Risks to Watch - bullet points for 2-3 specific risks based on the cluster data
3. Opportunities - 2-3 actionable suggestions using the existing holdings
4. Diversification Score - rate from 1-10 and explain briefly
5. Suggested Next Steps - 2-3 concrete steps the investor can take

Keep the response concise (max 200 words), practical, and avoid repeating what's already in the report. End with a one-line SEBI disclaimer.`

    setAiLoading(true)

    const run = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL
        const access = localStorage.getItem('access')
        const headers = { 'Content-Type': 'application/json' }
        if (access) headers.Authorization = `Bearer ${access}`

        const response = await fetch(`${baseUrl}chat/`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
        })

        if (!response.ok) {
          const errPayload = await response.json().catch(() => null)
          throw new Error(errPayload?.detail || 'Unable to fetch AI insights.')
        }
        if (!response.body) {
          throw new Error('Streaming unavailable in this browser.')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let buffer = ''
        let text = ''

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          let idx = buffer.indexOf('\n\n')
          while (idx !== -1) {
            const event = buffer.slice(0, idx)
            buffer = buffer.slice(idx + 2)

            for (const line of event.split('\n')) {
              if (!line.startsWith('data: ')) continue
              const payload = line.slice(6).trim()
              if (payload === '[DONE]') continue
              const parsed = JSON.parse(payload)
              if (parsed?.text) {
                text += parsed.text
                setAiReport(text)
              }
            }
            idx = buffer.indexOf('\n\n')
          }
        }

        if (!text.trim()) {
          setAiError('AI assistant returned an empty response.')
        }
      } catch (err) {
        console.error('SummaryTab AI error:', err)
        setAiError(err?.message || 'Unable to fetch AI insights.')
      } finally {
        setAiLoading(false)
      }
    }

    run()
  }, [summaryData, aiReport, aiLoading])

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1,2,3,4,5].map(i => <SkeletonBlock key={i} h="14px" w={`${60 + Math.random() * 40}%`} />)}
      </div>
    )
  }
  if (!summaryData) return <div className="p-8 text-center text-neutral-500 text-sm">Summary not loaded.</div>
  if (summaryData.error) return <div className="p-4 text-xs text-loss-400">{summaryData.error}</div>

  return (
    <div className="p-5 space-y-5 max-h-[580px] overflow-y-auto">

      <div style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>📊</div>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cluster Analysis</span>
        </div>
        <div>{renderSummaryMarkdown(summaryData.report)}</div>
      </div>

      <div style={{ borderLeft: '3px solid #38bdf8', paddingLeft: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(56,189,248,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(56,189,248,0.04)', borderBottom: '1px solid rgba(56,189,248,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>🤖</div>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>AI Insights</span>
          </div>
          <span style={{ fontSize: 10, color: '#38bdf8', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', padding: '2px 8px', borderRadius: 100 }}>
            Stockly Assistant
          </span>
        </div>

        <div style={{ padding: 14, background: '#0a0e1a' }}>
          {aiLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[100, 85, 92, 70, 88].map((w, i) => (
                <SkeletonBlock key={i} h="12px" w={`${w}%`} />
              ))}
              <div style={{ height: 8 }} />
              {[78, 95, 60].map((w, i) => (
                <SkeletonBlock key={`b${i}`} h="12px" w={`${w}%`} />
              ))}
            </div>
          )}
          {aiError && !aiLoading && (
            <p style={{ fontSize: 12, color: '#ef4444' }}>{aiError}</p>
          )}
          {aiReport && !aiLoading && (
            <div>{renderSummaryMarkdown(aiReport, '#94a3b8')}</div>
          )}
          {!aiLoading && !aiReport && !aiError && (
            <p style={{ fontSize: 12, color: '#475569', fontStyle: 'italic' }}>Generating AI insights...</p>
          )}
        </div>
      </div>
    </div>
  )
}
// ─── TAB 5 : Recommendations ─────────────────────────────────────────────────
export function RecommendTab({ recommendData, loading, onAdd }) {
  if (loading) {
    return (
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {[1,2,3,4].map(i => <SkeletonBlock key={i} h="80px" />)}
      </div>
    )
  }
  if (!recommendData) return <div className="p-8 text-center text-neutral-500 text-sm">Recommendations not loaded.</div>
  if (recommendData.error) return <div className="p-4 text-xs text-loss-400">{recommendData.error}</div>

  const recs = (recommendData.recommendations || []).slice(0, 3)
  if (!recs.length)
    return <div className="p-8 text-center text-neutral-500 text-sm">No top-quality recommendations found for this sector.</div>

  return (
    <div className="p-4">
      <p className="text-xs text-neutral-500 mb-4">
        Sector: <span className="text-neutral-300 font-medium">{recommendData.focus_sector || 'Current Sector'}</span>
        {' | '}Top picks: <span className="text-brand-400 font-medium">{recs.length}</span>
        {' of '}<span className="text-neutral-300">{recommendData.candidate_count ?? recs.length}</span>
        {' stocks ranked by return.'}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {recs.map(r => (
          <div key={r.symbol}
            className="bg-surface-800 border border-surface-700 rounded-lg p-3 hover:border-brand-700 transition-colors group">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-sm font-semibold text-neutral-200">{r.symbol}</div>
                <div className="text-xs text-neutral-500 mt-0.5 truncate max-w-[140px]">{r.name}</div>
              </div>
              {r.current_price && (
                <div className="text-sm font-bold font-mono text-brand-400">
                  INR {parseFloat(r.current_price).toFixed(2)}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xs text-neutral-600 bg-surface-700 px-1.5 py-0.5 rounded">{r.sector}</span>
              {r.pe_ratio && (
                <span className="text-2xs text-neutral-600 bg-surface-700 px-1.5 py-0.5 rounded font-mono">P/E {r.pe_ratio}</span>
              )}
              {r.one_year_return_pct !== undefined && (
                <span className={`text-2xs px-1.5 py-0.5 rounded font-mono ${
                  Number(r.one_year_return_pct) >= 0 ? 'text-gain-400 bg-gain-500/10' : 'text-loss-400 bg-loss-500/10'
                }`}>
                  1Y {Number(r.one_year_return_pct).toFixed(2)}%
                </span>
              )}
            </div>
            {onAdd && (
              <button onClick={() => onAdd(r.symbol)}
                className="mt-3 w-full py-1.5 rounded text-xs font-medium text-brand-400 border border-brand-500/20 bg-brand-500/5
                  hover:bg-brand-500/15 hover:border-brand-500/40 transition-colors group-hover:border-brand-500/30">
                + Add to Portfolio
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}




