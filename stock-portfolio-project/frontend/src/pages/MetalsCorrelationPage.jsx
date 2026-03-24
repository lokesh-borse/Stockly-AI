import { useEffect, useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line, Scatter } from 'react-chartjs-2'
import { fetchMetalsCorrelation } from '../api/stocks.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const STYLES = `
  @keyframes shimmer { from{background-position:-200% 0} to{background-position:200% 0} }
  @keyframes fade-up  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
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
    padding: 18px;
    transition: border-color 0.15s, transform 0.15s;
  }
  .stat-card:hover { border-color: rgba(14,165,233,0.25); transform: translateY(-1px); }

  .chart-card {
    border-radius: 16px;
    border: 1px solid #1E2530;
    background: #0D1117;
    overflow: hidden;
  }
  .chart-card-header {
    padding: 16px 20px;
    border-bottom: 1px solid #1E2530;
    background: #080C12;
    display: flex;
    align-items: center;
    gap: 8px;
  }
`

const DARK_CHART_BASE = {
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
    }
  },
}

const AXIS_STYLE = {
  ticks: { color: '#475569', font: { size: 11 } },
  grid: { color: 'rgba(30,37,48,0.8)' },
}

function MetricCard({ label, value, sub, accent = '#e2e8f0', icon }) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-2">
        <div className="text-xs uppercase tracking-widest" style={{ color: '#475569', fontSize: 10 }}>{label}</div>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className="text-xl font-bold font-mono break-words leading-snug" style={{ color: accent }}>{value}</div>
      {sub && <div className="text-xs mt-1 font-mono" style={{ color: '#64748b' }}>{sub}</div>}
    </div>
  )
}

export default function MetalsCorrelationPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetchMetalsCorrelation('5y', '1d')
      setData(res)
    } catch (e) {
      setData(null)
      setError(e?.response?.data?.detail || 'Failed to load metals correlation data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const lineData = useMemo(() => {
    if (!data?.series) return null
    return {
      labels: data.series.dates,
      datasets: [
        {
          label: 'Gold Close',
          data: data.series.gold_close,
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245,158,11,0.08)',
          yAxisID: 'yGold',
          pointRadius: 0,
          borderWidth: 2,
          fill: true,
        },
        {
          label: 'Silver Close',
          data: data.series.silver_close,
          borderColor: '#94a3b8',
          backgroundColor: 'rgba(148,163,184,0.06)',
          yAxisID: 'ySilver',
          pointRadius: 0,
          borderWidth: 2,
          fill: true,
        }
      ]
    }
  }, [data])

  const lineOptions = {
    ...DARK_CHART_BASE,
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: { ...AXIS_STYLE, title: { display: true, text: 'Date', color: '#475569', font: { size: 11 } }, ticks: { ...AXIS_STYLE.ticks, maxTicksLimit: 12 } },
      yGold: {
        type: 'linear',
        position: 'left',
        title: { display: true, text: 'Gold (₹)', color: '#F59E0B', font: { size: 11 } },
        ticks: { color: '#F59E0B', font: { size: 11 } },
        grid: { color: 'rgba(30,37,48,0.8)' },
      },
      ySilver: {
        type: 'linear',
        position: 'right',
        title: { display: true, text: 'Silver (₹)', color: '#94a3b8', font: { size: 11 } },
        ticks: { color: '#94a3b8', font: { size: 11 } },
        grid: { drawOnChartArea: false },
      }
    }
  }

  const scatterData = useMemo(() => {
    if (!data?.series) return null
    const points = data.series.price_scatter_silver.map((x, i) => ({ x, y: data.series.price_scatter_gold[i] }))
    const fit = data.series.price_scatter_silver.map((x, i) => ({ x, y: data.series.price_fit_gold[i] }))
    return {
      datasets: [
        {
          type: 'scatter',
          label: 'Actual Prices',
          data: points,
          borderColor: '#0EA5E9',
          backgroundColor: 'rgba(14,165,233,0.4)',
          pointRadius: 3.5,
        },
        {
          type: 'line',
          label: 'Linear Fit',
          data: fit,
          borderColor: '#EF4444',
          backgroundColor: '#EF4444',
          pointRadius: 0,
          borderWidth: 2.5,
        }
      ]
    }
  }, [data])

  const scatterOptions = {
    ...DARK_CHART_BASE,
    scales: {
      x: { ...AXIS_STYLE, type: 'linear', title: { display: true, text: 'Silver Price', color: '#475569', font: { size: 11 } } },
      y: { ...AXIS_STYLE, title: { display: true, text: 'Gold Price', color: '#475569', font: { size: 11 } } },
    }
  }

  const corrReturns = Number(data?.correlation_returns)
  const corrPrices = Number(data?.correlation_prices)

  return (
    <>
      <style>{STYLES}</style>
      <div className="min-h-screen pb-20" style={{ background: '#070B14' }}>
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-6 space-y-5">

          {/* ═══ HEADER ══════════════════════════════════════════════════════ */}
          <div className="fade-up rounded-2xl p-6" style={{ border: '1px solid #1E2530', background: '#0D1117' }}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-widest mb-1" style={{ color: '#F59E0B', fontSize: 10 }}>EDA · Precious Metals</div>
                <h1 className="text-2xl md:text-3xl font-extrabold mb-1" style={{ color: '#e2e8f0', letterSpacing: '-0.01em' }}>
                  Gold-Silver{' '}
                  <span style={{ color: '#F59E0B' }}>Correlation</span>
                </h1>
                <p className="text-sm" style={{ color: '#64748b' }}>
                  Historical correlation and linear regression using yfinance data — 5-year / 1-day interval.
                </p>
              </div>

              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #92400e, #F59E0B)', boxShadow: '0 4px 16px rgba(245,158,11,0.2)' }}
              >
                {loading ? (
                  <>
                    <svg className="spin-icon w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                      <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                    </svg>
                    Loading…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                      <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" strokeLinecap="round"/>
                    </svg>
                    Refresh
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 flex-shrink-0">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
                {error}
              </div>
            )}
          </div>

          {/* ═══ LOADING SKELETON ════════════════════════════════════════════ */}
          {loading && !data && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="stat-card">
                  <div className="shimmer mb-3" style={{ height: 10, width: '60%' }} />
                  <div className="shimmer mb-2" style={{ height: 24, width: '80%' }} />
                  <div className="shimmer" style={{ height: 10, width: '45%' }} />
                </div>
              ))}
            </div>
          )}

          {data && (
            <>
              {/* ═══ METRIC CARDS ══════════════════════════════════════════ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 fade-up">
                <MetricCard
                  label="Return Correlation"
                  value={data.correlation_returns}
                  sub={`${data.period} / ${data.interval}`}
                  accent={corrReturns >= 0.7 ? '#22C55E' : corrReturns >= 0.4 ? '#F59E0B' : '#EF4444'}
                  icon="📈"
                />
                <MetricCard
                  label="Price Correlation"
                  value={data.correlation_prices}
                  sub={`Rows: ${data.rows_used}`}
                  accent={corrPrices >= 0.7 ? '#22C55E' : corrPrices >= 0.4 ? '#F59E0B' : '#EF4444'}
                  icon="💰"
                />
                <MetricCard
                  label="Return Regression"
                  value={`y = ${data.linear_regression?.slope}x + ${data.linear_regression?.intercept}`}
                  sub={`R² = ${data.linear_regression?.r2}`}
                  accent="#0EA5E9"
                  icon="📐"
                />
                <MetricCard
                  label="Price Regression"
                  value={`y = ${data.price_regression?.slope}x + ${data.price_regression?.intercept}`}
                  sub={`R² = ${data.price_regression?.r2}`}
                  accent="#0EA5E9"
                  icon="📐"
                />
              </div>

              {/* Correlation strength indicator */}
              <div className="fade-up rounded-xl px-5 py-3.5 flex flex-wrap gap-6" style={{ border: '1px solid #1E2530', background: '#0D1117' }}>
                {[
                  { label: 'Price Correlation Strength', val: corrPrices },
                  { label: 'Return Correlation Strength', val: corrReturns },
                ].map(item => (
                  <div key={item.label} className="flex-1" style={{ minWidth: 200 }}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs" style={{ color: '#64748b' }}>{item.label}</span>
                      <span className="text-xs font-mono font-bold" style={{ color: item.val >= 0.7 ? '#22C55E' : item.val >= 0.4 ? '#F59E0B' : '#EF4444' }}>
                        {(item.val * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1E2530' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                           style={{ width: `${Math.abs(item.val) * 100}%`, background: item.val >= 0.7 ? '#22C55E' : item.val >= 0.4 ? '#F59E0B' : '#EF4444' }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* ═══ PRICE CHART ════════════════════════════════════════════ */}
              <div className="chart-card fade-up">
                <div className="chart-card-header">
                  <span className="inline-block w-0.5 h-4 rounded-full" style={{ background: '#F59E0B' }} />
                  <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Gold vs Silver Price (Recent Window)</span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-md font-mono" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#F59E0B' }}>
                    {data.period} · {data.interval}
                  </span>
                </div>
                <div className="p-5" style={{ height: 480 }}>
                  {lineData ? <Line data={lineData} options={lineOptions} /> : null}
                </div>
              </div>

              {/* ═══ SCATTER CHART ══════════════════════════════════════════ */}
              <div className="chart-card fade-up">
                <div className="chart-card-header">
                  <span className="inline-block w-0.5 h-4 rounded-full" style={{ background: '#0EA5E9' }} />
                  <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Gold vs Silver Correlation Scatter (Price)</span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-md font-mono" style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)', color: '#38BDF8' }}>
                    Price Regression
                  </span>
                </div>
                <div className="p-5" style={{ height: 480 }}>
                  {scatterData ? <Scatter data={scatterData} options={scatterOptions} /> : null}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
