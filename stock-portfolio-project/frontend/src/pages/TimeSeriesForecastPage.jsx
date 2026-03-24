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
import { Line } from 'react-chartjs-2'
import {
  fetchPortfolio,
  fetchPortfolioById,
  fetchPortfolioTimeSeriesForecast
} from '../api/stocks.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const STYLES = `
  @keyframes shimmer { from{background-position:-200% 0} to{background-position:200% 0} }
  @keyframes fade-up  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse-ring { 0%,100%{opacity:0.6;transform:scale(0.95)} 50%{opacity:1;transform:scale(1)} }

  .shimmer {
    background:linear-gradient(90deg,#151C26 25%,#1E2530 50%,#151C26 75%);
    background-size:200% 100%; animation:shimmer 2s linear infinite; border-radius:4px;
  }
  .fade-up  { animation:fade-up  0.35s ease-out both; }
  .spin-icon { animation:spin 0.8s linear infinite; }
  .pulse-ring { animation:pulse-ring 2s ease-in-out infinite; }

  .dark-select {
    background: #0D1117;
    border: 1px solid #1E2530;
    color: #94a3b8;
    border-radius: 10px;
    padding: 10px 14px;
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

  .model-tab {
    padding: 8px 20px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid #1E2530;
    background: #0D1117;
    color: #475569;
    transition: all 0.15s;
  }
  .model-tab:hover:not(:disabled):not(.active) { border-color: #0EA5E9; color: #94a3b8; }
  .model-tab.active { background: linear-gradient(135deg, #0369a1, #0EA5E9); border-color: transparent; color: #fff; }
  .model-tab:disabled { opacity: 0.4; cursor: not-allowed; }

  .stat-card {
    border-radius: 12px;
    border: 1px solid #1E2530;
    background: #0D1117;
    padding: 16px;
    transition: border-color 0.15s;
  }
  .stat-card:hover { border-color: rgba(14,165,233,0.25); }

  .table-row { border-bottom: 1px solid #1E2530; }
  .table-row:hover { background: rgba(14,165,233,0.04); }

  .running-bar {
    height: 2px;
    border-radius: 99px;
    background: linear-gradient(90deg, transparent, #0EA5E9, transparent);
    background-size: 200% 100%;
    animation: shimmer 1.2s linear infinite;
  }
`

function fmt(value, digits = 2) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return n.toFixed(digits)
}

function fmtINR(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const ChevronDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" className="w-4 h-4 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
    <path d="M6 9l6 6 6-6"/>
  </svg>
)

const darkChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
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
  scales: {
    x: {
      ticks: { maxTicksLimit: 12, color: '#475569', font: { size: 11 } },
      grid: { color: 'rgba(30,37,48,0.8)' },
    },
    y: {
      title: { display: true, text: 'Price (₹)', color: '#475569', font: { size: 11 } },
      ticks: { color: '#475569', font: { size: 11 } },
      grid: { color: 'rgba(30,37,48,0.8)' },
    }
  }
}

export default function TimeSeriesForecastPage() {
  const [portfolios, setPortfolios] = useState([])
  const [portfolioId, setPortfolioId] = useState('')
  const [stocks, setStocks] = useState([])
  const [symbol, setSymbol] = useState('')
  const [horizonDays, setHorizonDays] = useState(1)
  const [selectedModel, setSelectedModel] = useState('ARIMA')
  const [loadingPortfolios, setLoadingPortfolios] = useState(false)
  const [loadingStocks, setLoadingStocks] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    async function loadPortfolios() {
      setLoadingPortfolios(true)
      setError('')
      try {
        const res = await fetchPortfolio()
        setPortfolios(res || [])
        if (res?.length) setPortfolioId(String(res[0].id))
      } catch {
        setError('Failed to load portfolios.')
      } finally {
        setLoadingPortfolios(false)
      }
    }
    loadPortfolios()
  }, [])

  useEffect(() => {
    async function loadStocks() {
      if (!portfolioId) { setStocks([]); setSymbol(''); return }
      setLoadingStocks(true)
      setError('')
      setResult(null)
      try {
        const res = await fetchPortfolioById(portfolioId)
        const rows = res?.stocks || []
        setStocks(rows)
        setSymbol(rows[0]?.symbol || '')
      } catch {
        setError('Failed to load portfolio stocks.')
        setStocks([])
        setSymbol('')
      } finally {
        setLoadingStocks(false)
      }
    }
    loadStocks()
  }, [portfolioId])

  async function onRunForecast() {
    if (!portfolioId || !symbol) return
    setRunning(true)
    setError('')
    try {
      const res = await fetchPortfolioTimeSeriesForecast(portfolioId, symbol, horizonDays, selectedModel)
      setResult(res)
    } catch (e) {
      setResult(null)
      const isTimeout = e?.code === 'ECONNABORTED' || e?.name === 'CanceledError'
      setError(e?.response?.data?.detail || (isTimeout ? 'Forecast timed out. Please try again.' : 'Failed to run forecast.'))
    } finally {
      setRunning(false)
    }
  }

  const chartData = useMemo(() => {
    if (!result?.history?.length || !result?.selected_forecast?.length) return null
    const history = result.history
    const forecast = result.selected_forecast
    const labels = [...history.map(p => p.date), ...forecast.map(p => p.date)]
    const modelName = result.model || selectedModel
    return {
      labels,
      datasets: [
        {
          label: 'Historical Close',
          data: [...history.map(p => p.close), ...Array(forecast.length).fill(null)],
          borderColor: '#0EA5E9',
          backgroundColor: 'rgba(14,165,233,0.06)',
          fill: true,
          pointRadius: 0,
          borderWidth: 2,
          tension: 0.25,
        },
        {
          label: `${modelName} Forecast (TS-${result.selected_horizon_days})`,
          data: [...Array(history.length).fill(null), ...forecast.map(p => p.predicted_close)],
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245,158,11,0.08)',
          fill: true,
          pointRadius: 3,
          borderWidth: 2.5,
          borderDash: [7, 5],
          tension: 0.2,
        }
      ]
    }
  }, [result, selectedModel])

  const ts1Change = Number(result?.ts_1?.predicted_change_percent)
  const ts7Change = Number(result?.ts_7?.predicted_change_percent)

  return (
    <>
      <style>{STYLES}</style>
      <div className="min-h-screen pb-20" style={{ background: '#070B14' }}>
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-6 space-y-5">

          {/* ═══ HEADER ══════════════════════════════════════════════════════ */}
          <div className="fade-up rounded-2xl p-6" style={{ border: '1px solid #1E2530', background: '#0D1117' }}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-widest mb-1" style={{ color: '#0EA5E9', fontSize: 10 }}>ML Forecasting</div>
                <h1 className="text-2xl md:text-3xl font-extrabold mb-1" style={{ color: '#e2e8f0', letterSpacing: '-0.01em' }}>
                  Time Series Forecast
                  <span className="ml-2 text-lg" style={{ color: '#0EA5E9' }}>({selectedModel})</span>
                </h1>
                <p className="text-sm" style={{ color: '#64748b' }}>
                  Choose a portfolio and stock to generate TS-1 or TS-7 close-price forecast.
                </p>
              </div>
              {/* Model toggle */}
              <div className="flex gap-2 flex-shrink-0">
                {['ARIMA', 'RNN'].map(m => (
                  <button
                    key={m}
                    type="button"
                    disabled={running}
                    onClick={() => { setSelectedModel(m); setResult(null) }}
                    className={`model-tab ${selectedModel === m ? 'active' : ''}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Running bar */}
            {running && <div className="running-bar mt-4" />}
          </div>

          {/* ═══ CONTROLS ════════════════════════════════════════════════════ */}
          <div className="fade-up rounded-2xl p-5" style={{ border: '1px solid #1E2530', background: '#0D1117' }}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Portfolio */}
              <div className="relative">
                <select className="dark-select" value={portfolioId} onChange={e => setPortfolioId(e.target.value)} disabled={loadingPortfolios || running}>
                  {!portfolios.length && <option value="">No portfolios</option>}
                  {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronDown />
              </div>

              {/* Stock */}
              <div className="relative">
                <select className="dark-select" value={symbol} onChange={e => setSymbol(e.target.value)} disabled={loadingStocks || running || !stocks.length}>
                  {!stocks.length && <option value="">No stocks in portfolio</option>}
                  {stocks.map(s => <option key={s.symbol} value={s.symbol}>{s.symbol} — {s.name}</option>)}
                </select>
                <ChevronDown />
              </div>

              {/* Horizon */}
              <div className="relative">
                <select className="dark-select" value={horizonDays} onChange={e => setHorizonDays(Number(e.target.value))} disabled={running}>
                  <option value={1}>TS-1 (Next 1 Day)</option>
                  <option value={7}>TS-7 (Next 7 Days)</option>
                </select>
                <ChevronDown />
              </div>

              {/* Run button */}
              <button
                type="button"
                onClick={onRunForecast}
                disabled={!portfolioId || !symbol || running || loadingStocks}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: running ? '#0369a1' : 'linear-gradient(135deg, #0369a1, #0EA5E9)', boxShadow: '0 4px 16px rgba(14,165,233,0.2)' }}
              >
                {running ? (
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
                      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>
                    </svg>
                    Run Forecast
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 flex-shrink-0">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
                {error}
              </div>
            )}
          </div>

          {/* ═══ EMPTY STATE ═════════════════════════════════════════════════ */}
          {!result && !running && (
            <div className="fade-up rounded-2xl py-20 text-center" style={{ border: '1px solid #1E2530', background: '#0D1117' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                   style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="1.8" className="w-8 h-8">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <div className="text-base font-semibold mb-1" style={{ color: '#e2e8f0' }}>Ready to Forecast</div>
              <div className="text-sm" style={{ color: '#475569' }}>Select a portfolio, stock and horizon, then hit <strong style={{ color: '#0EA5E9' }}>Run Forecast</strong>.</div>
            </div>
          )}

          {/* ═══ RESULTS ════════════════════════════════════════════════════ */}
          {result && (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 fade-up">
                {[
                  { label: 'Symbol', value: result.stock_info?.symbol, sub: result.stock_info?.name, mono: true, accent: '#38BDF8' },
                  { label: 'Current Price', value: `₹${fmtINR(result.stock_info?.current_price)}`, mono: true },
                  { label: 'Latest Close', value: `₹${fmtINR(result.stock_info?.latest_close)}`, mono: true },
                  { label: 'TS-1 Forecast', value: `₹${fmtINR(result.ts_1?.predicted_close)}`, sub: `${fmt(ts1Change)}%`, gainLoss: ts1Change, mono: true },
                  { label: 'TS-7 Forecast', value: `₹${fmtINR(result.ts_7?.predicted_close)}`, sub: `${fmt(ts7Change)}%`, gainLoss: ts7Change, mono: true },
                  { label: 'P/E Ratio', value: result.stock_info?.pe_ratio ?? '—', mono: true },
                ].map((c, i) => (
                  <div key={i} className="stat-card">
                    <div className="text-xs mb-1" style={{ color: '#475569' }}>{c.label}</div>
                    <div className="text-lg font-bold font-mono break-all" style={{ color: c.accent || '#e2e8f0' }}>{c.value}</div>
                    {c.sub && (
                      <div className="text-xs mt-1 font-mono"
                           style={{ color: c.gainLoss !== undefined ? (c.gainLoss >= 0 ? '#22C55E' : '#EF4444') : '#64748b' }}>
                        {c.gainLoss !== undefined && (c.gainLoss >= 0 ? '▲ ' : '▼ ')}{c.sub}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="fade-up rounded-2xl p-6" style={{ border: '1px solid #1E2530', background: '#0D1117' }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-block w-0.5 h-4 rounded-full" style={{ background: '#0EA5E9' }} />
                  <h2 className="text-base font-bold" style={{ color: '#e2e8f0' }}>Forecast Chart</h2>
                  <span className="ml-auto px-2 py-0.5 rounded-md text-xs font-mono font-semibold"
                        style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)', color: '#38BDF8' }}>
                    {result.model} · TS-{result.selected_horizon_days}
                  </span>
                </div>
                <div style={{ height: 460 }}>
                  {chartData ? <Line data={chartData} options={darkChartOptions} /> : null}
                </div>
              </div>

              {/* Forecast table */}
              <div className="fade-up rounded-2xl overflow-hidden" style={{ border: '1px solid #1E2530', background: '#0D1117' }}>
                <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid #1E2530', background: '#080C12' }}>
                  <span className="inline-block w-0.5 h-4 rounded-full" style={{ background: '#F59E0B' }} />
                  <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
                    Forecast Points — {result.model || selectedModel}, TS-{result.selected_horizon_days}
                  </span>
                  <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded-md"
                        style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#F59E0B' }}>
                    {result.selected_forecast?.length || 0} points
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left" style={{ minWidth: 480 }}>
                    <thead>
                      <tr style={{ background: '#080C12', borderBottom: '1px solid #1E2530' }}>
                        {['Date', 'Predicted Close'].map(h => (
                          <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#475569', fontSize: 10 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(result.selected_forecast || []).map((row, i) => (
                        <tr key={row.date} className="table-row" style={{ background: i % 2 === 0 ? '#0D1117' : '#080C12' }}>
                          <td className="px-5 py-3 text-sm font-mono" style={{ color: '#94a3b8' }}>{row.date}</td>
                          <td className="px-5 py-3 text-sm font-mono font-semibold" style={{ color: '#e2e8f0' }}>₹{fmtINR(row.predicted_close)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
