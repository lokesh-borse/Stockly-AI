export default function LogisticRegressionAnalysis({ data, loading, onRefresh }) {
  const predictions = data?.predictions || []
  const skipped = data?.skipped || []

  function fmtPct(value) {
    const n = Number(value)
    if (!Number.isFinite(n)) return '-'
    return `${(n * 100).toFixed(2)}%`
  }

  return (
    <section className="rounded-2xl border border-white/80 bg-white/90 overflow-hidden shadow-sm mb-6">
      <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500">ML Analysis</div>
          <h2 className="text-xl font-bold text-slate-900">Logistic Regression (Direction Probability)</h2>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="px-3 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="p-5 text-slate-600">Loading predictions...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[980px]">
            <thead>
              <tr className="bg-slate-50 text-slate-900">
                <th className="p-3">Symbol</th>
                <th className="p-3">Points Used</th>
                <th className="p-3">Positive Days</th>
                <th className="p-3">Test Accuracy</th>
                <th className="p-3">Prob(Up Next)</th>
                <th className="p-3">Signal</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((row) => (
                <tr key={row.symbol} className="border-t border-slate-100">
                  <td className="p-3 font-semibold text-slate-900">{row.symbol}</td>
                  <td className="p-3">{row.points_used}</td>
                  <td className="p-3">{row.positive_days}</td>
                  <td className="p-3">{fmtPct(row.test_accuracy)}</td>
                  <td className="p-3 font-medium">{fmtPct(row.probability_up_next_close)}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        row.signal === 'BUY'
                          ? 'bg-emerald-100 text-emerald-700'
                          : row.signal === 'HOLD'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {row.signal}
                    </span>
                  </td>
                </tr>
              ))}
              {!predictions.length && (
                <tr>
                  <td className="p-3 text-slate-600" colSpan={6}>
                    No logistic predictions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!!skipped.length && (
        <div className="p-4 border-t border-amber-100 bg-amber-50 text-sm text-amber-900">
          Skipped: {skipped.map((s) => `${s.symbol} (${s.reason})`).join(', ')}
        </div>
      )}
    </section>
  )
}
