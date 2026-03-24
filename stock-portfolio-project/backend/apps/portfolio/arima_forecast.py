from dataclasses import dataclass
from typing import List, Optional

import numpy as np
from statsmodels.tsa.arima.model import ARIMA

@dataclass
class TimeSeriesForecastResult:
    symbol: str
    points_used: int
    latest_close: float
    order: Optional[tuple[int, int, int]]
    model_details: Optional[dict]
    ts_1_close: float
    ts_1_change_percent: float
    ts_7_close: float
    ts_7_change_percent: float
    forecast_7: List[float]


def forecast_arima(prices: List[float], symbol: str) -> TimeSeriesForecastResult:
    if len(prices) < 30:
        raise ValueError('At least 30 close points are required for ARIMA forecasting.')

    series = np.array(prices, dtype=float)
    latest_close = float(series[-1])
    order = (5, 1, 0) if len(series) >= 60 else (2, 1, 0)

    try:
        model = ARIMA(series, order=order)
        fitted = model.fit()
        forecast_7 = [float(v) for v in np.asarray(fitted.forecast(steps=7), dtype=float).tolist()]
    except Exception:
        # Fallback to a drift model when ARIMA fitting fails for edge-case series.
        diffs = np.diff(series)
        drift = float(np.mean(diffs[-20:])) if len(diffs) else 0.0
        forecast_7 = [float(latest_close + drift * (i + 1)) for i in range(7)]
        order = (0, 1, 0)

    ts_1_close = float(forecast_7[0])
    ts_7_close = float(forecast_7[6])

    ts_1_change_percent = 0.0
    ts_7_change_percent = 0.0
    if latest_close != 0:
        ts_1_change_percent = ((ts_1_close - latest_close) / latest_close) * 100.0
        ts_7_change_percent = ((ts_7_close - latest_close) / latest_close) * 100.0

    return TimeSeriesForecastResult(
        symbol=symbol,
        points_used=len(prices),
        latest_close=round(latest_close, 4),
        order=order,
        model_details=None,
        ts_1_close=round(ts_1_close, 4),
        ts_1_change_percent=round(ts_1_change_percent, 4),
        ts_7_close=round(ts_7_close, 4),
        ts_7_change_percent=round(ts_7_change_percent, 4),
        forecast_7=[round(v, 4) for v in forecast_7],
    )


