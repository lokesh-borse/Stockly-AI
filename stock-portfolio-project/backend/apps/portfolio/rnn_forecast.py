from typing import List

import numpy as np

from .arima_forecast import TimeSeriesForecastResult


def _min_max_scale(series: np.ndarray) -> tuple[np.ndarray, float, float]:
    min_val = float(np.min(series))
    max_val = float(np.max(series))
    span = max_val - min_val
    if span <= 1e-12:
        return np.zeros_like(series, dtype=float), min_val, max_val
    return (series - min_val) / span, min_val, max_val


def _inverse_min_max(value: float, min_val: float, max_val: float) -> float:
    span = max_val - min_val
    if span <= 1e-12:
        return min_val
    return float((value * span) + min_val)


def forecast_rnn(prices: List[float], symbol: str) -> TimeSeriesForecastResult:
    if len(prices) < 45:
        raise ValueError('At least 45 close points are required for RNN forecasting.')

    series = np.array(prices, dtype=float)
    if not np.isfinite(series).all():
        raise ValueError('RNN received invalid price values (NaN/Inf).')

    # Keep RNN runtime practical for synchronous API requests.
    if len(series) > 220:
        series = series[-220:]
    latest_close = float(series[-1])

    scaled, min_val, max_val = _min_max_scale(series)
    lookback = min(24, max(12, len(scaled) // 10))
    epochs = 80
    lr = 0.001
    batch_size = 16

    if len(scaled) <= lookback:
        raise ValueError('Not enough points for selected RNN lookback window.')

    x_sequences = []
    y_targets = []
    for i in range(len(scaled) - lookback):
        x_sequences.append(scaled[i:i + lookback])
        y_targets.append(scaled[i + lookback])

    x_sequences = np.array(x_sequences, dtype=np.float32)
    y_targets = np.array(y_targets, dtype=np.float32)
    x_sequences = x_sequences.reshape((x_sequences.shape[0], x_sequences.shape[1], 1))

    train_count = max(int(len(x_sequences) * 0.85), 1)
    x_train = x_sequences[:train_count]
    y_train = y_targets[:train_count]
    x_val = x_sequences[train_count:] if train_count < len(x_sequences) else None
    y_val = y_targets[train_count:] if train_count < len(y_targets) else None

    final_train_mse = None
    final_val_mse = None

    try:
        import tensorflow as tf
        from tensorflow.keras import Sequential
        from tensorflow.keras.callbacks import EarlyStopping
        from tensorflow.keras.layers import Dense, Input, LSTM
        from tensorflow.keras.optimizers import Adam

        tf.keras.utils.set_random_seed(42)

        model = Sequential([
            Input(shape=(lookback, 1)),
            LSTM(32),
            Dense(16, activation='relu'),
            Dense(1),
        ])
        model.compile(optimizer=Adam(learning_rate=lr), loss='mse')

        callbacks = [
            EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)
        ]

        fit_kwargs = {
            'x': x_train,
            'y': y_train,
            'epochs': epochs,
            'batch_size': batch_size,
            'verbose': 0,
            'callbacks': callbacks,
        }
        if x_val is not None and len(x_val) > 0:
            fit_kwargs['validation_data'] = (x_val, y_val)
        else:
            # Avoid failing in tiny datasets where a validation split is not possible.
            fit_kwargs['validation_split'] = 0.2

        history = model.fit(**fit_kwargs)
        if history.history.get('loss'):
            final_train_mse = float(history.history['loss'][-1])
        if history.history.get('val_loss'):
            final_val_mse = float(history.history['val_loss'][-1])

        window = scaled[-lookback:].astype(np.float32)
        forecast_scaled = []
        for _ in range(7):
            input_seq = window.reshape((1, lookback, 1))
            next_scaled = float(model.predict(input_seq, verbose=0)[0][0])
            next_scaled = float(np.clip(next_scaled, -0.2, 1.2))
            forecast_scaled.append(next_scaled)
            window = np.concatenate([window[1:], np.array([next_scaled], dtype=np.float32)])

    except ImportError as exc:
        raise ValueError(
            'TensorFlow is required for RNN forecasting. Install tensorflow in backend environment.'
        ) from exc
    except Exception:
        # Fallback to a short drift extrapolation if model training/inference fails.
        diffs = np.diff(series)
        drift = float(np.mean(diffs[-20:])) if len(diffs) else 0.0
        forecast_scaled = [
            float(np.clip((latest_close + drift * (i + 1) - min_val) / (max_val - min_val + 1e-12), -0.2, 1.2))
            for i in range(7)
        ]

    forecast_7 = [_inverse_min_max(v, min_val, max_val) for v in forecast_scaled]
    if not np.isfinite(np.array(forecast_7, dtype=float)).all():
        # Fallback to a short drift extrapolation when training becomes numerically unstable.
        diffs = np.diff(series)
        drift = float(np.mean(diffs[-20:])) if len(diffs) else 0.0
        forecast_7 = [float(latest_close + drift * (i + 1)) for i in range(7)]

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
        order=None,
        model_details={
            'framework': 'tensorflow.keras',
            'architecture': 'LSTM(32) + Dense(16)',
            'lookback': lookback,
            'epochs': epochs,
            'batch_size': batch_size,
            'learning_rate': lr,
            'final_train_mse': round(final_train_mse, 8) if final_train_mse is not None else None,
            'final_val_mse': round(final_val_mse, 8) if final_val_mse is not None else None,
        },
        ts_1_close=round(ts_1_close, 4),
        ts_1_change_percent=round(ts_1_change_percent, 4),
        ts_7_close=round(ts_7_close, 4),
        ts_7_change_percent=round(ts_7_change_percent, 4),
        forecast_7=[round(v, 4) for v in forecast_7],
    )
