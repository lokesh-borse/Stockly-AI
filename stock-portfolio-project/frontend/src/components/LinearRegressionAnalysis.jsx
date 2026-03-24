export default function LinearRegressionAnalysis({ data, loading, onRefresh }) {
  const predictions = data?.predictions || []
  const skipped = data?.skipped || []

  return (
    <section className="rounded-2xl border border-white/80 bg-white/90 overflow-hidden shadow-sm mb-6">
      <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-cyan-50">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500">ML Analysis</div>
          <h2 className="text-xl font-bold text-slate-900">Linear Regression (Next Close Prediction)</h2>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="px-3 py-2 rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="p-5 text-slate-600">Loading predictions...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 text-slate-900">
                <th className="p-3">Symbol</th>
                <th className="p-3">Points Used</th>
                <th className="p-3">Latest Close</th>
                <th className="p-3">Predicted Next Close</th>
                <th className="p-3">Predicted Change</th>
                <th className="p-3">Slope</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((row) => (
                <tr key={row.symbol} className="border-t border-slate-100">
                  <td className="p-3 font-semibold text-slate-900">{row.symbol}</td>
                  <td className="p-3">{row.points_used}</td>
                  <td className="p-3">{row.latest_close?.toFixed?.(2) ?? row.latest_close}</td>
                  <td className="p-3">{row.predicted_next_close?.toFixed?.(2) ?? row.predicted_next_close}</td>
                  <td className={`p-3 font-medium ${Number(row.predicted_change_percent) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {Number.isFinite(Number(row.predicted_change_percent))
                      ? `${Number(row.predicted_change_percent).toFixed(2)}%`
                      : '-'}
                  </td>
                  <td className="p-3">{row.slope}</td>
                </tr>
              ))}
              {!predictions.length && (
                <tr>
                  <td className="p-3 text-slate-600" colSpan={6}>
                    No predictions yet. Add stocks with historical price data.
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
