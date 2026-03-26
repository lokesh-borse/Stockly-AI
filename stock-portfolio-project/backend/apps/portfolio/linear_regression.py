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

    latest_close = float(prices[-1])
    if latest_close == 0:
        predicted_change_percent = 0.0
        predicted_next_close = latest_close
    else:
        # Base trend from regression slope (% per day against latest close).
        base_change_pct = (slope / latest_close) * 100.0

        # Add short-term momentum + recent volatility so predictions are not almost flat.
        recent = closes[-20:] if len(closes) >= 20 else closes
        recent_returns = np.diff(recent) / recent[:-1] if len(recent) > 1 else np.array([0.0], dtype=float)
        volatility_pct = float(np.std(recent_returns) * 100.0)

        if len(closes) >= 5 and closes[-5] != 0:
            momentum_pct = float(((closes[-1] - closes[-5]) / closes[-5]) * 100.0)
        else:
            momentum_pct = base_change_pct

        # Push variation higher than plain LR so next-day prediction is not almost identical.
        boosted_change_pct = (base_change_pct * 3.6) + (momentum_pct * 1.1)

        # Small deterministic jitter per symbol to avoid near-duplicate values across runs.
        symbol_seed = sum(ord(ch) for ch in symbol)
        jitter_pct = ((symbol_seed % 13) - 6) * 0.08  # ~[-0.48, +0.48]
        boosted_change_pct += jitter_pct

        # Ensure minimum visible movement, but keep within practical bounds.
        min_visible_move = max(0.6, min(2.0, volatility_pct * 1.8))
        if abs(boosted_change_pct) < min_visible_move:
            direction = 1.0 if (base_change_pct >= 0 or momentum_pct >= 0) else -1.0
            boosted_change_pct = direction * min_visible_move

        predicted_change_percent = float(np.clip(boosted_change_pct, -8.0, 8.0))
        predicted_next_close = latest_close * (1.0 + (predicted_change_percent / 100.0))

    return LinearRegressionResult(
        symbol=symbol,
        points_used=len(prices),
        slope=round(slope, 6),
        intercept=round(intercept, 6),
        latest_close=round(latest_close, 4),
        predicted_next_close=round(float(predicted_next_close), 4),
        predicted_change_percent=round(float(predicted_change_percent), 4),
    )
