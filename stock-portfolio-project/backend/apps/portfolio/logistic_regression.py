from dataclasses import dataclass
from typing import List

import numpy as np


@dataclass
class LogisticRegressionResult:
    symbol: str
    points_used: int
    positive_days: int
    test_accuracy: float
    probability_up_next_close: float
    signal: str


def _sigmoid(z: np.ndarray) -> np.ndarray:
    z = np.clip(z, -500, 500)
    return 1.0 / (1.0 + np.exp(-z))


def _standardize(x: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    mean = x.mean(axis=0)
    std = x.std(axis=0)
    std = np.where(std == 0, 1.0, std)
    return (x - mean) / std, mean, std


def _train_logistic_regression(
    x_train: np.ndarray, y_train: np.ndarray, learning_rate: float = 0.1, epochs: int = 800
) -> tuple[np.ndarray, float]:
    n_samples, n_features = x_train.shape
    weights = np.zeros(n_features, dtype=float)
    bias = 0.0

    for _ in range(epochs):
        linear_model = np.dot(x_train, weights) + bias
        probs = _sigmoid(linear_model)
        error = probs - y_train

        dw = np.dot(x_train.T, error) / n_samples
        db = float(np.sum(error) / n_samples)

        weights -= learning_rate * dw
        bias -= learning_rate * db

    return weights, bias


def predict_next_direction(closes: List[float], symbol: str) -> LogisticRegressionResult:
    if len(closes) < 35:
        raise ValueError("At least 35 close points are required for logistic regression.")

    prices = np.array(closes, dtype=float)
    returns = np.diff(prices) / prices[:-1]
    if len(returns) < 30:
        raise ValueError("Not enough return points for logistic regression.")

    window = 5
    x_rows = []
    y_rows = []
    for i in range(window, len(returns) - 1):
        trailing = returns[i - window : i]
        x_rows.append(
            [
                returns[i],
                float(np.mean(trailing)),
                float(np.std(trailing)),
            ]
        )
        y_rows.append(1 if returns[i + 1] > 0 else 0)

    x = np.array(x_rows, dtype=float)
    y = np.array(y_rows, dtype=float)
    if len(x) < 20:
        raise ValueError("Not enough samples after feature engineering.")

    split = max(int(len(x) * 0.8), 1)
    if split >= len(x):
        split = len(x) - 1

    x_train, x_test = x[:split], x[split:]
    y_train, y_test = y[:split], y[split:]
    x_train_std, mean, std = _standardize(x_train)
    x_test_std = (x_test - mean) / std

    weights, bias = _train_logistic_regression(x_train_std, y_train)

    test_probs = _sigmoid(np.dot(x_test_std, weights) + bias)
    test_preds = (test_probs >= 0.5).astype(float)
    accuracy = float((test_preds == y_test).mean()) if len(y_test) else 0.0

    latest_trailing = returns[-window:]
    latest_features = np.array(
        [
            returns[-1],
            float(np.mean(latest_trailing)),
            float(np.std(latest_trailing)),
        ],
        dtype=float,
    ).reshape(1, -1)
    latest_std = (latest_features - mean) / std
    probability_up = float(_sigmoid(np.dot(latest_std, weights) + bias)[0])
    signal = "BUY" if probability_up >= 0.6 else "HOLD" if probability_up >= 0.45 else "AVOID"

    positive_days = int(np.sum(y))
    return LogisticRegressionResult(
        symbol=symbol,
        points_used=int(len(closes)),
        positive_days=positive_days,
        test_accuracy=round(accuracy, 4),
        probability_up_next_close=round(probability_up, 4),
        signal=signal,
    )
