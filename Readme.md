# Stockly-AI - Stock Portfolio Management System

An AI-powered platform for analyzing and managing stock portfolios with intelligent price forecasting, real-time market data, and ML-based portfolio ratings.

**🌐 Live Site**: https://stockly-ai.duckdns.org

---

## ✨ Features

- **User Authentication**: Secure JWT login with email validation
- **Portfolio Management**: Create and manage multiple stock portfolios
- **Real-time Stock Data**: Live quotes and historical price data via yfinance
- **Price Forecasting**: ARIMA, RNN, and Linear Regression models
- **Portfolio Rating**: ML-based 1-5 star rating system
- **Analytics Dashboard**: Growth analysis, Sharpe ratio, performance metrics
- **Market Analysis**: Nifty clustering, gold/silver correlation
- **Security**: 6-digit MPIN, Telegram OTP password reset
- **Admin Panel**: User activity tracking and system monitoring
- **Responsive UI**: Modern React interface with Tailwind CSS

---

## 🛠 Tech Stack

**Backend**: Django 6.0, Django REST Framework, PostgreSQL, TensorFlow, scikit-learn, statsmodels, yfinance

**Frontend**: React 18, Vite 5, Tailwind CSS 3, Chart.js

**Deployment**: Azure, PM2 process manager, Docker ready

---

## 📁 Project Structure

```
stock-portfolio-project/
├── backend/
│   ├── apps/
│   │   ├── auth/              # User registration, login, OTP
│   │   ├── portfolio/         # Portfolio management & forecasting
│   │   ├── stocks/            # Stock data & queries
│   │   └── eda/               # Market analysis & clustering
│   ├── services/
│   │   └── stock_service.py   # yfinance integration
│   ├── manage.py
│   ├── settings.py
│   └── wsgi.py
├── frontend/
│   ├── src/
│   │   ├── pages/             # Login, Portfolio, Stocks, Forecasts
│   │   ├── components/        # Reusable UI components
│   │   ├── context/           # Auth & Toast state
│   │   └── api/               # API client
│   ├── package.json
│   └── vite.config.js
├── requirements.txt           # Python dependencies
├── ecosystem.config.js        # PM2 configuration
└── Readme.md
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 16+
- PostgreSQL 12+ (or SQLite for development)

### Step 1: Clone & Setup Backend

```bash
cd stock-portfolio-project
python -m venv env
env\Scripts\activate
pip install -r requirements.txt
```

### Step 2: Setup Frontend

```bash
cd frontend
npm install
cd ..
```

### Step 3: Create `.env` File

Create `.env` in the project root:

```env
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=stockly_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

TELEGRAM_BOT_TOKEN=your-telegram-token
GEMINI_API_KEY=optional-for-future
```

### Step 4: Setup Database

```bash
cd backend
python manage.py migrate
python manage.py createsuperuser
cd ..
```

### Step 5: Run the Project

**Option A: Separate Terminals**

Terminal 1 (Backend on port 8000):
```bash
cd backend
python manage.py runserver 0.0.0.0:8000
```

Terminal 2 (Frontend on port 5173):
```bash
cd frontend
npm run dev
```

**Option B: Using PM2**
```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

**Access**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api
- Admin: http://localhost:8000/admin

---

## 📡 Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/register/` | POST | User registration |
| `/api/login/` | POST | User login |
| `/api/portfolios/` | GET/POST | List/create portfolios |
| `/api/portfolios/{id}/` | GET/PUT | Portfolio details |
| `/api/stocks/` | GET | Browse stocks |
| `/api/portfolios/{id}/forecast/` | POST | Generate price forecast |
| `/api/portfolios/{id}/rate/` | POST | Get portfolio rating |
| `/api/eda/metals-correlation/` | GET | Gold/silver analysis |

---

## 🤖 ML Models

- **ARIMA**: Time-series price forecasting (statsmodels)
- **RNN/LSTM**: Deep learning predictions (TensorFlow)
- **Linear Regression**: Trend-based forecasting
- **Logistic Regression**: Portfolio rating classification
- **K-Means Clustering**: Market segmentation

---

## 🚢 Deployment

### Production (Azure)

```env
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=stockly-ai.duckdns.org

DB_HOST=your-azure-postgres-server
DB_NAME=stockly_prod
DB_USER=admin@servername
```

1. Push to GitHub
2. Connect to Azure DevOps
3. Set environment variables in Azure App Service
4. Deploy: `python manage.py migrate && python manage.py collectstatic`

---

## 🔒 Security

- All secrets in `.env` (never commit)
- JWT token-based auth
- MPIN storage (hashed with Django)
- PostgreSQL for production
- CORS configured for allowed origins

---

## 📞 Support

For issues or questions, check logs or contact the development team.

**Last Updated**: March 2026
