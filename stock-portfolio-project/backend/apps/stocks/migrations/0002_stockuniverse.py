from django.db import migrations, models


IN_SYMBOLS = [
    "360ONE.NS", "ABB.NS", "ACC.NS", "APLAPOLLO.NS", "AUBANK.NS", "ADANIENSOL.NS", "ADANIENT.NS", "ADANIGREEN.NS",
    "ADANIPORTS.NS", "ADANIPOWER.NS", "ATGL.NS", "ABCAPITAL.NS", "ALKEM.NS", "AMBUJACEM.NS", "APOLLOHOSP.NS",
    "ASHOKLEY.NS", "ASIANPAINT.NS", "ASTRAL.NS", "AUROPHARMA.NS", "DMART.NS", "AXISBANK.NS", "BSE.NS",
    "BAJAJ-AUTO.NS", "BAJFINANCE.NS", "BAJAJFINSV.NS", "BAJAJHLDNG.NS", "BAJAJHFL.NS", "BANKBARODA.NS",
    "BANKINDIA.NS", "BDL.NS", "BEL.NS", "BHARATFORG.NS", "BHEL.NS", "BPCL.NS", "BHARTIARTL.NS", "BHARTIHEXA.NS",
    "BIOCON.NS", "BLUESTARCO.NS", "BOSCHLTD.NS", "BRITANNIA.NS", "CGPOWER.NS", "CANBK.NS", "CHOLAFIN.NS", "CIPLA.NS",
    "COALINDIA.NS", "COCHINSHIP.NS", "COFORGE.NS", "COLPAL.NS", "CONCOR.NS", "COROMANDEL.NS", "CUMMINSIND.NS",
    "DLF.NS", "DABUR.NS", "DIVISLAB.NS", "DIXON.NS", "DRREDDY.NS", "EICHERMOT.NS", "ETERNAL.NS", "EXIDEIND.NS",
    "NYKAA.NS", "FEDERALBNK.NS", "FORTIS.NS", "GAIL.NS", "GMRAIRPORT.NS", "GLENMARK.NS", "GODFRYPHLP.NS",
    "GODREJCP.NS", "GODREJPROP.NS", "GRASIM.NS", "HCLTECH.NS", "HDFCAMC.NS", "HDFCBANK.NS", "HDFCLIFE.NS",
    "HAVELLS.NS", "HEROMOTOCO.NS", "HINDALCO.NS", "HAL.NS", "HINDPETRO.NS", "HINDUNILVR.NS", "HINDZINC.NS",
    "POWERINDIA.NS", "HUDCO.NS", "HYUNDAI.NS", "ICICIBANK.NS", "ICICIGI.NS", "IDFCFIRSTB.NS", "IRB.NS",
    "ITCHOTELS.NS", "ITC.NS", "INDIANB.NS", "INDHOTEL.NS", "IOC.NS", "IRCTC.NS", "IRFC.NS", "IREDA.NS", "IGL.NS",
    "INDUSTOWER.NS", "INDUSINDBK.NS", "NAUKRI.NS", "INFY.NS", "INDIGO.NS", "JSWENERGY.NS", "JSWSTEEL.NS",
    "JINDALSTEL.NS", "JIOFIN.NS", "JUBLFOOD.NS", "KEI.NS", "KPITTECH.NS", "KALYANKJIL.NS", "KOTAKBANK.NS",
    "LTF.NS", "LICHSGFIN.NS", "LTM.NS", "LT.NS", "LICI.NS", "LODHA.NS", "LUPIN.NS", "MRF.NS", "M&MFIN.NS", "M&M.NS",
    "MANKIND.NS", "MARICO.NS", "MARUTI.NS", "MFSL.NS", "MAXHEALTH.NS", "MAZDOCK.NS", "MOTILALOFS.NS", "MPHASIS.NS",
    "MUTHOOTFIN.NS", "NHPC.NS", "NMDC.NS", "NTPCGREEN.NS", "NTPC.NS", "NATIONALUM.NS", "NESTLEIND.NS",
    "OBEROIRLTY.NS", "ONGC.NS", "OIL.NS", "PAYTM.NS", "OFSS.NS", "POLICYBZR.NS", "PIIND.NS", "PAGEIND.NS",
    "PATANJALI.NS", "PERSISTENT.NS", "PHOENIXLTD.NS", "PIDILITIND.NS", "POLYCAB.NS", "PFC.NS", "POWERGRID.NS",
    "PREMIERENE.NS", "PRESTIGE.NS", "PNB.NS", "RECLTD.NS", "RVNL.NS", "RELIANCE.NS", "SBICARD.NS", "SBILIFE.NS",
    "SRF.NS", "MOTHERSON.NS", "SHREECEM.NS", "SHRIRAMFIN.NS", "ENRIN.NS", "SIEMENS.NS", "SOLARINDS.NS",
    "SONACOMS.NS", "SBIN.NS", "SAIL.NS", "SUNPHARMA.NS", "SUPREMEIND.NS", "SUZLON.NS", "SWIGGY.NS", "TVSMOTOR.NS",
    "TATACOMM.NS", "TCS.NS", "TATACONSUM.NS", "TATAELXSI.NS", "TMPV.NS", "TATAPOWER.NS", "TATASTEEL.NS",
    "TATATECH.NS", "TECHM.NS", "TITAN.NS", "TORNTPHARM.NS", "TORNTPOWER.NS", "TRENT.NS", "TIINDIA.NS", "UPL.NS",
    "ULTRACEMCO.NS", "UNIONBANK.NS", "UNITDSPR.NS", "VBL.NS", "VEDL.NS", "VMM.NS", "IDEA.NS", "VOLTAS.NS",
    "WAAREEENER.NS", "WIPRO.NS", "YESBANK.NS", "ZYDUSLIFE.NS",
]

US_SYMBOLS = [
    "NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "GOOG", "META", "AVGO", "TSLA", "BRK.B", "WMT", "LLY", "JPM", "XOM", "V",
    "JNJ", "MU", "MA", "COST", "ORCL", "CVX", "NFLX", "ABBV", "PLTR", "BAC", "PG", "AMD", "KO", "HD", "CAT", "CSCO",
    "GE", "LRCX", "AMAT", "MRK", "RTX", "MS", "PM", "UNH", "GS", "WFC", "TMUS", "GEV", "IBM", "LIN", "MCD", "INTC",
    "VZ", "PEP", "AXP", "T", "KLAC", "C", "AMGN", "NEE", "ABT", "CRM", "DIS", "TMO", "TJX", "TXN", "GILD", "ISRG",
    "SCHW", "ANET", "APH", "COP", "PFE", "BA", "UBER", "DE", "ADI", "APP", "BLK", "LMT", "HON", "UNP", "QCOM", "ETN",
    "BKNG", "WELL", "DHR", "PANW", "SYK", "SPGI", "LOW", "INTU", "CB", "ACN", "PGR", "PLD", "BMY", "NOW", "VRTX",
    "PH", "COF", "MDT", "HCA", "CME", "MCK", "MO", "GLW", "SBUX", "SNDK", "SO", "CMCSA", "NEM", "CRWD", "BSX", "CEG",
    "DELL", "ADBE", "NOC", "WDC", "DUK", "EQIX", "GD", "WM", "HWM", "STX", "CVS", "TT", "ICE", "WMB", "BX", "MRSH",
    "MAR", "FDX", "ADP", "PWR", "AMT", "UPS", "PNC", "SNPS", "KKR", "USB", "JCI", "BK", "CDNS", "NKE", "REGN", "MCO",
    "ABNB", "SHW", "MSI", "FCX", "EOG", "MMM", "ITW", "CMI", "ORLY", "KMI", "ECL", "MNST", "MDLZ", "EMR", "CTAS",
    "VLO", "RCL", "CSX", "PSX", "SLB", "AON", "CI", "MPC", "ROST", "CL", "DASH", "WBD", "AEP", "RSG", "CRH", "HLT",
    "TDG", "LHX", "GM", "APO", "ELV", "TRV", "HOOD", "COR", "NSC", "APD", "FTNT", "SPG", "SRE", "OXY", "BKR", "DLR",
    "PCAR", "TEL", "O", "OKE", "AJG", "AFL", "TFC", "CIEN", "AZO", "FANG", "ALL",
]


def seed_stock_universe(apps, schema_editor):
    StockUniverse = apps.get_model('stocks', 'StockUniverse')
    rows = []

    for idx, symbol in enumerate(IN_SYMBOLS, start=1):
        rows.append(StockUniverse(symbol=symbol, market='IN', display_order=idx, is_active=True))
    for idx, symbol in enumerate(US_SYMBOLS, start=1):
        rows.append(StockUniverse(symbol=symbol, market='US', display_order=idx, is_active=True))

    StockUniverse.objects.bulk_create(rows, ignore_conflicts=True)


def unseed_stock_universe(apps, schema_editor):
    StockUniverse = apps.get_model('stocks', 'StockUniverse')
    StockUniverse.objects.filter(symbol__in=IN_SYMBOLS, market='IN').delete()
    StockUniverse.objects.filter(symbol__in=US_SYMBOLS, market='US').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('stocks', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='StockUniverse',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('symbol', models.CharField(max_length=32)),
                ('market', models.CharField(choices=[('IN', 'Indian'), ('US', 'US')], max_length=2)),
                ('display_order', models.PositiveIntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['market', 'display_order', 'symbol'],
            },
        ),
        migrations.AddIndex(
            model_name='stockuniverse',
            index=models.Index(fields=['market', 'is_active', 'display_order'], name='stocks_stoc_market_c95adf_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='stockuniverse',
            unique_together={('symbol', 'market')},
        ),
        migrations.RunPython(seed_stock_universe, unseed_stock_universe),
    ]
