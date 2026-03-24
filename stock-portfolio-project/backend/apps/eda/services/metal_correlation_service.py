import pandas as pd
import yfinance as yf
from sklearn.linear_model import LinearRegression


def _extract_close_series(df: pd.DataFrame, name: str) -> pd.Series:
    if "Close" not in df.columns:
        raise ValueError("Close column not found in downloaded data")

    close_data = df["Close"]
    if isinstance(close_data, pd.DataFrame):
        # yfinance can return a single-column DataFrame when using MultiIndex columns.
        close_series = close_data.iloc[:, 0]
    else:
        close_series = close_data

    close_series = pd.to_numeric(close_series, errors="coerce")
    close_series.name = name
    return close_series


def get_gold_silver_correlation(period: str = "5y", interval: str = "1d"):
    gold = yf.download("GC=F", period=period, interval=interval, auto_adjust=False, progress=False, threads=False)
    silver = yf.download("SI=F", period=period, interval=interval, auto_adjust=False, progress=False, threads=False)

    if gold is None or gold.empty or silver is None or silver.empty:
        return None

    gold_close = _extract_close_series(gold, "gold_close")
    silver_close = _extract_close_series(silver, "silver_close")
    merged = pd.concat([gold_close, silver_close], axis=1).dropna()

    if len(merged) < 30:
        return None

    merged["gold_ret"] = merged["gold_close"].pct_change()
    merged["silver_ret"] = merged["silver_close"].pct_change()
    ret_df = merged.dropna().copy()

    if ret_df.empty:
        return None

    x = ret_df[["gold_ret"]].values
    y = ret_df["silver_ret"].values
    model = LinearRegression()
    model.fit(x, y)
    y_pred = model.predict(x)

    corr_returns = float(ret_df["gold_ret"].corr(ret_df["silver_ret"]))
    corr_prices = float(merged["gold_close"].corr(merged["silver_close"]))
    r2 = float(model.score(x, y))

    # Price regression: Gold as a function of Silver.
    x_price = merged[["silver_close"]].values
    y_price = merged["gold_close"].values
    price_model = LinearRegression()
    price_model.fit(x_price, y_price)
    price_r2 = float(price_model.score(x_price, y_price))

    points = ret_df.tail(250)
    price_points = merged.tail(250)
    gold_price_fit = pd.Series(
        price_model.predict(price_points[["silver_close"]].values),
        index=price_points.index,
    )

    return {
        "period": period,
        "interval": interval,
        "rows_used": int(len(ret_df)),
        "correlation_returns": round(corr_returns, 4),
        "correlation_prices": round(corr_prices, 4),
        "linear_regression": {
            "equation": "silver_return = intercept + slope * gold_return",
            "intercept": round(float(model.intercept_), 6),
            "slope": round(float(model.coef_[0]), 6),
            "r2": round(r2, 4),
        },
        "price_regression": {
            "equation": "gold_price = intercept + slope * silver_price",
            "intercept": round(float(price_model.intercept_), 6),
            "slope": round(float(price_model.coef_[0]), 6),
            "r2": round(price_r2, 4),
        },
        "series": {
            "dates": points.index.strftime("%Y-%m-%d").tolist(),
            "gold_close": points["gold_close"].round(4).tolist(),
            "silver_close": points["silver_close"].round(4).tolist(),
            "gold_return": points["gold_ret"].round(6).tolist(),
            "silver_return": points["silver_ret"].round(6).tolist(),
            "silver_return_pred": pd.Series(y_pred, index=ret_df.index).loc[points.index].round(6).tolist(),
            "price_scatter_silver": price_points["silver_close"].round(4).tolist(),
            "price_scatter_gold": price_points["gold_close"].round(4).tolist(),
            "price_fit_gold": gold_price_fit.round(4).tolist(),
        },
    }
