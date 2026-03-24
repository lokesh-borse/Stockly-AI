import math
from typing import Dict, List

import numpy as np
import pandas as pd
import yfinance as yf
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler


NIFTY50_SYMBOLS = [
    "ADANIENT.NS", "ADANIPORTS.NS", "APOLLOHOSP.NS", "ASIANPAINT.NS", "AXISBANK.NS",
    "BAJAJ-AUTO.NS", "BAJFINANCE.NS", "BAJAJFINSV.NS", "BEL.NS", "BHARTIARTL.NS",
    "BPCL.NS", "BRITANNIA.NS", "CIPLA.NS", "COALINDIA.NS", "DRREDDY.NS",
    "EICHERMOT.NS", "ETERNAL.NS", "GRASIM.NS", "HCLTECH.NS", "HDFCBANK.NS",
    "HDFCLIFE.NS", "HEROMOTOCO.NS", "HINDALCO.NS", "HINDUNILVR.NS", "ICICIBANK.NS",
    "ITC.NS", "INDUSINDBK.NS", "INFY.NS", "JSWSTEEL.NS", "KOTAKBANK.NS",
    "LT.NS", "M&M.NS", "MARUTI.NS", "NTPC.NS", "NESTLEIND.NS",
    "ONGC.NS", "POWERGRID.NS", "RELIANCE.NS", "SBILIFE.NS", "SHRIRAMFIN.NS",
    "SBIN.NS", "SUNPHARMA.NS", "TCS.NS", "TATACONSUM.NS", "TATAMOTORS.NS",
    "TATASTEEL.NS", "TECHM.NS", "TITAN.NS", "TRENT.NS", "ULTRACEMCO.NS",
    "WIPRO.NS",
]

FEATURE_COLUMNS = [
    "ret_1m",
    "ret_3m",
    "ret_6m",
    "ret_1y",
    "vol_1y",
    "max_drawdown_1y",
    "avg_volume_3m",
]


def _label_clusters(summary_rows: List[Dict]) -> Dict[int, str]:
    if not summary_rows or len(summary_rows) != 3:
        return {}

    scored: List[tuple[int, float]] = []
    for row in summary_rows:
        cid = int(row["cluster_id"])
        vol = float(row.get("vol_1y") or 0.0)
        # max_drawdown is negative; deeper drawdown => larger risk component.
        dd_component = abs(float(row.get("max_drawdown_1y") or 0.0))
        risk_score = (0.7 * vol) + (0.3 * dd_component)
        scored.append((cid, risk_score))

    scored.sort(key=lambda x: x[1], reverse=True)
    return {
        scored[0][0]: "High-Risk",
        scored[1][0]: "Medium-Risked",
        scored[2][0]: "Low-Risked",
    }


def _extract_series(df: pd.DataFrame, column_name: str) -> pd.Series:
    if column_name not in df.columns:
        raise ValueError(f"{column_name} column not found in downloaded data")
    col = df[column_name]
    if isinstance(col, pd.DataFrame):
        series = col.iloc[:, 0]
    else:
        series = col
    return pd.to_numeric(series, errors="coerce")


def _period_return(close: pd.Series, lookback: int) -> float | None:
    if len(close) <= lookback:
        return None
    start = close.iloc[-(lookback + 1)]
    end = close.iloc[-1]
    if start is None or end is None or start == 0 or np.isnan(start) or np.isnan(end):
        return None
    return float((end / start) - 1.0)


def _max_drawdown(close: pd.Series) -> float | None:
    if close.empty:
        return None
    running_max = close.cummax()
    drawdown = (close / running_max) - 1.0
    return float(drawdown.min()) if not drawdown.empty else None


def _build_stock_features(symbol: str, period: str = "1y", interval: str = "1d") -> Dict[str, float] | None:
    df = yf.download(symbol, period=period, interval=interval, auto_adjust=False, progress=False, threads=False)
    if df is None or df.empty:
        return None

    close = _extract_series(df, "Close").dropna()
    volume = _extract_series(df, "Volume").dropna()
    if len(close) < 80:
        return None

    returns = close.pct_change().dropna()
    if returns.empty:
        return None

    ret_1m = _period_return(close, 22)
    ret_3m = _period_return(close, 66)
    ret_6m = _period_return(close, 126)
    ret_1y = _period_return(close, 252)
    vol_1y = float(returns.std() * math.sqrt(252)) if len(returns) > 1 else None
    max_dd = _max_drawdown(close)
    avg_volume_3m = float(volume.tail(66).mean()) if not volume.empty else None

    return {
        "symbol": symbol,
        "ret_1m": ret_1m,
        "ret_3m": ret_3m,
        "ret_6m": ret_6m,
        "ret_1y": ret_1y,
        "vol_1y": vol_1y,
        "max_drawdown_1y": max_dd,
        "avg_volume_3m": avg_volume_3m,
    }


def _get_symbol_frame_from_batch(df_batch: pd.DataFrame, symbol: str) -> pd.DataFrame:
    if df_batch is None or df_batch.empty:
        return pd.DataFrame()

    cols = df_batch.columns
    if getattr(cols, "nlevels", 1) == 1:
        # Single-symbol shape fallback.
        return df_batch

    # yfinance multi-ticker shape typically has either:
    # (Field, Ticker) or (Ticker, Field). Handle both.
    level0 = list(cols.get_level_values(0))
    level1 = list(cols.get_level_values(1))
    if symbol in level0:
        sub = df_batch[symbol]
        return sub.copy() if isinstance(sub, pd.DataFrame) else pd.DataFrame(sub)
    if symbol in level1:
        try:
            return df_batch.xs(symbol, axis=1, level=1).copy()
        except Exception:
            return pd.DataFrame()
    return pd.DataFrame()


def get_nifty_clusters(period: str = "1y", interval: str = "1d") -> Dict:
    # Batch download dramatically reduces latency vs 50 sequential calls.
    batch = yf.download(
        NIFTY50_SYMBOLS,
        period=period,
        interval=interval,
        auto_adjust=False,
        progress=False,
        threads=True,
        group_by="ticker",
    )

    rows: List[Dict] = []
    for symbol in NIFTY50_SYMBOLS:
        symbol_df = _get_symbol_frame_from_batch(batch, symbol)
        if symbol_df is None or symbol_df.empty:
            # Fallback for symbols not present in batch response.
            feature_row = _build_stock_features(symbol, period=period, interval=interval)
        else:
            close = _extract_series(symbol_df, "Close").dropna()
            volume = _extract_series(symbol_df, "Volume").dropna()
            if len(close) < 80:
                feature_row = None
            else:
                returns = close.pct_change().dropna()
                if returns.empty:
                    feature_row = None
                else:
                    feature_row = {
                        "symbol": symbol,
                        "ret_1m": _period_return(close, 22),
                        "ret_3m": _period_return(close, 66),
                        "ret_6m": _period_return(close, 126),
                        "ret_1y": _period_return(close, 252),
                        "vol_1y": float(returns.std() * math.sqrt(252)) if len(returns) > 1 else None,
                        "max_drawdown_1y": _max_drawdown(close),
                        "avg_volume_3m": float(volume.tail(66).mean()) if not volume.empty else None,
                    }
        if feature_row:
            rows.append(feature_row)

    if len(rows) < 10:
        return {}

    df = pd.DataFrame(rows)
    x = df[FEATURE_COLUMNS].astype(float)
    x_imputed = SimpleImputer(strategy="median").fit_transform(x)
    x_scaled = StandardScaler().fit_transform(x_imputed)

    selected_k = 3
    if len(df) <= selected_k:
        return {}

    kmeans = KMeans(n_clusters=selected_k, n_init=10, random_state=42)
    labels = kmeans.fit_predict(x_scaled)
    df["cluster_id"] = labels

    pca = PCA(n_components=2, random_state=42)
    pca_points = pca.fit_transform(x_scaled)
    df["pca_x"] = pca_points[:, 0]
    df["pca_y"] = pca_points[:, 1]

    summary = (
        df.groupby("cluster_id")[FEATURE_COLUMNS]
        .mean()
        .reset_index()
        .to_dict(orient="records")
    )
    cluster_counts = df["cluster_id"].value_counts().sort_index().to_dict()
    cluster_labels = _label_clusters(summary)

    items = []
    for _, row in df.iterrows():
        cid = int(row["cluster_id"])
        items.append(
            {
                "symbol": row["symbol"],
                "cluster_id": cid,
                "cluster_label": cluster_labels.get(cid, "Balanced"),
                "pca_x": round(float(row["pca_x"]), 6),
                "pca_y": round(float(row["pca_y"]), 6),
                "ret_1m": round(float(row["ret_1m"]), 6) if pd.notna(row["ret_1m"]) else None,
                "ret_3m": round(float(row["ret_3m"]), 6) if pd.notna(row["ret_3m"]) else None,
                "ret_6m": round(float(row["ret_6m"]), 6) if pd.notna(row["ret_6m"]) else None,
                "ret_1y": round(float(row["ret_1y"]), 6) if pd.notna(row["ret_1y"]) else None,
                "vol_1y": round(float(row["vol_1y"]), 6) if pd.notna(row["vol_1y"]) else None,
                "max_drawdown_1y": round(float(row["max_drawdown_1y"]), 6) if pd.notna(row["max_drawdown_1y"]) else None,
                "avg_volume_3m": round(float(row["avg_volume_3m"]), 2) if pd.notna(row["avg_volume_3m"]) else None,
            }
        )

    for row in summary:
        for key in FEATURE_COLUMNS:
            value = row.get(key)
            row[key] = round(float(value), 6) if value is not None and not pd.isna(value) else None
        row["cluster_id"] = int(row["cluster_id"])
        row["count"] = int(cluster_counts.get(row["cluster_id"], 0))
        row["cluster_label"] = cluster_labels.get(row["cluster_id"], "Balanced")

    return {
        "period": period,
        "interval": interval,
        "universe_size": len(NIFTY50_SYMBOLS),
        "rows_used": len(df),
        "features_used": FEATURE_COLUMNS,
        "selected_k": int(selected_k),
        "k_scores": [],
        "cluster_summary": summary,
        "items": items,
    }
