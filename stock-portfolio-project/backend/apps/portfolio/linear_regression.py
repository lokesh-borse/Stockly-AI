from dataclasses import dataclass
from typing import List

import numpy as np


@dataclass
class LinearRegressionResult:
    symbol: str
    points_used: int
    slope: float
    intercept: float
    latest_close: float
    predicted_next_close: float
    predicted_change_percent: float


def _fit_line(day_index: np.ndarray, closes: np.ndarray) -> tuple[float, float]:
    """
    Fit y = slope * x + intercept using least squares on sequential day index.
    """
    x = day_index.reshape(-1).astype(float)
    y = closes.astype(float)
    design = np.column_stack([x, np.ones_like(x)])
    slope, intercept = np.linalg.lstsq(design, y, rcond=None)[0]
    return float(slope), float(intercept)


def predict_next_close(prices: List[float], symbol: str) -> LinearRegressionResult:
    if len(prices) < 2:
        raise ValueError("At least 2 price points are required for linear regression.")

    closes = np.array(prices, dtype=float)
    day_index = np.arange(len(closes), dtype=float).reshape(-1, 1)
    slope, intercept = _fit_line(day_index, closes)

    last_index = float(day_index[-1][0])
    next_index = last_index + 1.0

    # Predict current and next point on the regression line.
    pred_last_on_line = (slope * last_index) + intercept
    pred_next_on_line = (slope * next_index) + intercept

    # One-step line delta equals daily slope; anchor to latest close for smooth next-day move.
    one_day_change = pred_next_on_line - pred_last_on_line
    latest_close = float(prices[-1])
    predicted_next_close = latest_close + one_day_change
    predicted_change_percent = 0.0
    if latest_close != 0:
        predicted_change_percent = ((predicted_next_close - latest_close) / latest_close) * 100.0

    return LinearRegressionResult(
        symbol=symbol,
        points_used=len(prices),
        slope=round(slope, 6),
        intercept=round(intercept, 6),
        latest_close=round(latest_close, 4),
        predicted_next_close=round(float(predicted_next_close), 4),
        predicted_change_percent=round(float(predicted_change_percent), 4),
    )
