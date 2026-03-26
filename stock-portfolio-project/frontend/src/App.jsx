import { Routes, Route, Navigate } from 'react-router-dom'
import './utils/chartDefaults.js'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Home from './pages/Home.jsx'
import Portfolio from './pages/Portfolio.jsx'
import RecommendedPortfolios from './pages/RecommendedPortfolios.jsx'
import Quality from './pages/Quality.jsx'
import PortfolioDetail from './pages/PortfolioDetail.jsx'
import Stocks from './pages/Stocks.jsx'
import StockDetail from './pages/StockDetail.jsx'
import LiveStockDetail from './pages/LiveStockDetail.jsx'
import MetalsCorrelationPage from './pages/MetalsCorrelationPage.jsx'
import NiftyClustersPage from './pages/NiftyClustersPage.jsx'
import TimeSeriesForecastPage from './pages/TimeSeriesForecastPage.jsx'
import AdminPanel from './pages/AdminPanel.jsx'
import AdminUserActivities from './pages/AdminUserActivities.jsx'
import SetMpin from './pages/SetMpin.jsx'
import Navbar from './components/Navbar.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { ToastContainer } from './components/ui/Toast.jsx'
import GlobalChatbot from './components/chat/GlobalChatbot.jsx'

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Navbar />
        <ToastContainer />
        <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Authenticated routes */}
        <Route path="/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
        <Route path="/portfolio/recommended" element={<ProtectedRoute><RecommendedPortfolios /></ProtectedRoute>} />
        <Route path="/quality" element={<ProtectedRoute><Quality /></ProtectedRoute>} />
        <Route path="/portfolio/recommended/:market/:sector" element={<ProtectedRoute><PortfolioDetail /></ProtectedRoute>} />
        <Route path="/portfolio/:id" element={<ProtectedRoute><PortfolioDetail /></ProtectedRoute>} />
        <Route path="/stocks" element={<ProtectedRoute><Stocks /></ProtectedRoute>} />
        <Route path="/stocks/:id" element={<ProtectedRoute><StockDetail /></ProtectedRoute>} />
        <Route path="/stocks/live/:symbol" element={<ProtectedRoute><LiveStockDetail /></ProtectedRoute>} />
        <Route path="/time-series-forecast" element={<ProtectedRoute><TimeSeriesForecastPage /></ProtectedRoute>} />
        <Route path="/metals" element={<ProtectedRoute><MetalsCorrelationPage /></ProtectedRoute>} />
        <Route path="/nifty-clusters" element={<ProtectedRoute><NiftyClustersPage /></ProtectedRoute>} />
        <Route path="/set-mpin" element={<ProtectedRoute><SetMpin /></ProtectedRoute>} />

        {/* Admin routes */}
        <Route path="/admin-panel" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
        <Route path="/admin/user/:userId" element={<ProtectedRoute><AdminUserActivities /></ProtectedRoute>} />
        </Routes>
        <GlobalChatbot />
      </AuthProvider>
    </ToastProvider>
  )
}
