import axios from 'axios'

function resolveBaseUrl() {
  const raw = String(import.meta.env.VITE_API_BASE_URL || '').trim()
  if (!raw) return '/api/'
  return raw.endsWith('/') ? raw : `${raw}/`
}

const BASE_URL = resolveBaseUrl()

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000
})

// ─── Request interceptor: attach JWT Bearer token ────────────────────────────
api.interceptors.request.use((config) => {
  const access = localStorage.getItem('access')
  if (access) {
    config.headers.Authorization = `Bearer ${access}`
  }
  return config
})

// ─── Response interceptor: auto-refresh on 401 ───────────────────────────────
let isRefreshing = false
let failedQueue = []

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const refresh = localStorage.getItem('refresh')
      if (!refresh) {
        localStorage.removeItem('access')
        localStorage.removeItem('refresh')
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const res = await axios.post(`${BASE_URL}token/refresh/`, { refresh })
        const newAccess = res.data.access
        localStorage.setItem('access', newAccess)
        processQueue(null, newAccess)
        originalRequest.headers.Authorization = `Bearer ${newAccess}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem('access')
        localStorage.removeItem('refresh')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
