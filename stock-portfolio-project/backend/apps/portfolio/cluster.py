import json
import os
import sys
from pathlib import Path

import pandas as pd


def _init_django():
    project_root = Path(__file__).resolve().parents[2]
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "settings")
    import django

    django.setup()


def fetch_stocks_from_portfolio(portfolio_id, csv_path=None):
    _init_django()
    from apps.portfolio.models import Portfolio, PortfolioStock

    portfolio = Portfolio.objects.filter(id=portfolio_id).first()
    if not portfolio:
        print(f"Portfolio not found for id={portfolio_id}")
        return None

    queryset = (
        PortfolioStock.objects
        .filter(portfolio_id=portfolio_id)
        .select_related("stock")
        .order_by("id")
    )
    if not queryset.exists():
        print(f"No stocks found for portfolio id={portfolio_id}")
        return None

    rows = []
    for h in queryset:
        last_price_obj = h.stock.prices.order_by("-date").first()
        rows.append(
            {
                "id": h.id,
                "portfolio_id": h.portfolio_id,
                "portfolio_name": portfolio.name,
                "company_name": h.stock.name,
                "ticker": h.stock.symbol,
                "current_price": float(last_price_obj.close_price) if last_price_obj else None,
                "pe_ratio": float(h.stock.pe_ratio) if h.stock.pe_ratio is not None else None,
                "high_52w": float(h.stock._52_week_high) if h.stock._52_week_high is not None else None,
                "low_52w": float(h.stock._52_week_low) if h.stock._52_week_low is not None else None,
                "intrinsic_value": None,
            }
        )

    df = pd.DataFrame(rows)

    if csv_path is None:
        csv_path = Path.cwd() / f"portfolio_{portfolio_id}_stocks.csv"
    else:
        csv_path = Path(csv_path)

    df.to_csv(csv_path, index=False)

    print(f"Saved CSV: {csv_path}")
    print("Stocks JSON:")
    print(json.dumps(rows, indent=2, default=str))
    return df


def main():
    portfolio_id_text = input("Enter portfolio id: ").strip()
    if not portfolio_id_text.isdigit():
        print("Invalid portfolio id. Please enter a number.")
        return

    fetch_stocks_from_portfolio(int(portfolio_id_text))


if __name__ == "__main__":
    main()
