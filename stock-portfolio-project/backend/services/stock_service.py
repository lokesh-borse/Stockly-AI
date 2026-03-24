import yfinance as yf
import math
from datetime import date

def _clean_number(value):
    if value is None:
        return None
    try:
        numeric = float(value)
        if math.isnan(numeric) or math.isinf(numeric):
            return None
    except (TypeError, ValueError):
        return value
    return value

def _normalize_ohlcv_df(df, symbol: str):
    if df is None or df.empty:
        return df
    try:
        columns = df.columns
        if getattr(columns, "nlevels", 1) > 1:
            level_values = list(columns.get_level_values(-1))
            if symbol in level_values:
                df = df.xs(symbol, axis=1, level=-1)
            else:
                df = df.droplevel(-1, axis=1)
    except Exception:
        return df
    return df

def _series_value(row, field: str):
    value = row.get(field, None) if hasattr(row, "get") else None
    if value is None:
        return None
    if hasattr(value, "iloc"):
        try:
            value = value.iloc[0]
        except Exception:
            return None
    return _clean_number(value)

def search_symbols(query: str, limit: int = 10):
    if not query:
        return []
    try:
        search = yf.Search(query=query, max_results=limit)
        quotes = getattr(search, "quotes", []) or []
        results = []
        for q in quotes[:limit]:
            symbol = q.get("symbol")
            if not symbol:
                continue
            results.append(
                {
                    "symbol": symbol,
                    "name": q.get("shortname") or q.get("longname") or symbol,
                    "exchange": q.get("exchange"),
                    "type": q.get("quoteType"),
                }
            )
        return results
    except Exception:
        return []

def get_stock_profile(symbol: str):
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.get_info() or {}
        fast = getattr(ticker, "fast_info", {}) or {}
        name = info.get("shortName") or info.get("longName") or symbol
        pe_ratio = info.get("trailingPE") if info.get("trailingPE") is not None else info.get("forwardPE")
        return {
            "symbol": symbol,
            "name": name,
            "sector": info.get("sector") or "",
            "industry": info.get("industry") or "",
            "market_cap": _clean_number(info.get("marketCap")),
            "pe_ratio": _clean_number(pe_ratio),
            "dividend_yield": _clean_number(info.get("dividendYield")),
            "52_week_high": _clean_number(info.get("fiftyTwoWeekHigh") or fast.get("yearHigh")),
            "52_week_low": _clean_number(info.get("fiftyTwoWeekLow") or fast.get("yearLow")),
        }
    except Exception:
        return None

def get_live_quote(symbol: str):
    symbol = (symbol or "").strip().upper()
    if not symbol:
        return None

    def _persist_live_price(symbol_value: str, live_price: float, live_volume: int | None):
        try:
            from apps.stocks.models import Stock, StockPrice

            stock = Stock.objects.filter(symbol=symbol_value).first()
            if not stock:
                return

            today = date.today()
            existing = StockPrice.objects.filter(stock=stock, date=today).first()
            if existing:
                existing.open_price = float(existing.open_price or live_price)
                existing.close_price = live_price
                existing.high_price = max(float(existing.high_price or live_price), live_price)
                existing.low_price = min(float(existing.low_price or live_price), live_price)
                if live_volume is not None:
                    existing.volume = max(int(existing.volume or 0), int(live_volume))
                existing.save()
                return

            StockPrice.objects.create(
                stock=stock,
                date=today,
                open_price=live_price,
                close_price=live_price,
                high_price=live_price,
                low_price=live_price,
                volume=int(live_volume or 0),
            )
        except Exception:
            # Live persistence should never block quote delivery.
            return

    try:
        ticker = yf.Ticker(symbol)
        fast = getattr(ticker, "fast_info", {}) or {}

        price_val = _clean_number(
            fast.get("last_price")
            or fast.get("regularMarketPrice")
            or fast.get("lastPrice")
        )
        volume_val = _clean_number(
            fast.get("last_volume")
            or fast.get("regularMarketVolume")
            or fast.get("volume")
        )

        if price_val is None:
            df = ticker.history(period="1d", interval="1m", auto_adjust=False)
            df = _normalize_ohlcv_df(df, symbol)
            if df is not None and not df.empty:
                last = df.tail(1).iloc[0]
                price_val = _series_value(last, "Close")
                if volume_val is None:
                    volume_val = _series_value(last, "Volume")

        if price_val is None:
            info = ticker.get_info() or {}
            price_val = _clean_number(
                info.get("regularMarketPrice")
                or info.get("currentPrice")
                or info.get("previousClose")
            )
            if volume_val is None:
                volume_val = _clean_number(info.get("regularMarketVolume") or info.get("volume"))

        if price_val is None:
            return None

        price = float(price_val)
        volume = int(volume_val) if volume_val is not None else 0
        _persist_live_price(symbol, price, volume)
        return {"symbol": symbol, "price": price, "change": None, "volume": volume}
    except Exception:
        return None

def get_history(symbol: str, period: str = "1y", interval: str = "1d"):
    try:
        df = yf.download(symbol, period=period, interval=interval, progress=False, threads=False)
        df = _normalize_ohlcv_df(df, symbol)
        if df is None or df.empty:
            return []
        out = []
        for idx, row in df.iterrows():
            open_v = _series_value(row, "Open")
            close_v = _series_value(row, "Close")
            high_v = _series_value(row, "High")
            low_v = _series_value(row, "Low")
            volume_v = _series_value(row, "Volume")
            if close_v is None:
                continue
            out.append({
                "date": idx.date().isoformat(),
                "open_price": float(open_v) if open_v is not None else float(close_v),
                "close_price": float(close_v),
                "high_price": float(high_v) if high_v is not None else float(close_v),
                "low_price": float(low_v) if low_v is not None else float(close_v),
                "volume": int(volume_v) if volume_v is not None else 0,
            })
        return out
    except Exception:
        return []
