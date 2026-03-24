/**
 * chartDefaults.js — Chart.js global dark theme defaults
 * Import this once at the top of App.jsx: import './utils/chartDefaults.js'
 *
 * Design tokens intentionally match the platform's CSS custom properties:
 *   --surface-700  = #1E2530 (grid lines)
 *   --text-muted   = #64748b (tick labels)
 *   --surface-900  = #0D1117 (tooltip bg)
 *   --text-primary = #e2e8f0 (tooltip text)
 */
import {
  Chart,
  defaults,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

// Register all components so plugin defaults (Tooltip, Legend) are accessible
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
)

// ── Global color defaults ────────────────────────────────────────────────────
defaults.color            = '#64748b'         // neutral-500 — axis tick labels
defaults.borderColor      = 'rgba(30,37,48,0.6)' // surface-700 @ 60% — grid lines
defaults.backgroundColor  = '#0D1117'         // surface-900 — fill fallback

// ── Font ────────────────────────────────────────────────────────────────────
defaults.font.family = "'Inter', system-ui, sans-serif"
defaults.font.size   = 11

// ── Tooltip ─────────────────────────────────────────────────────────────────
defaults.plugins.tooltip.backgroundColor    = '#080C12'     // surface-950
defaults.plugins.tooltip.titleColor         = '#e2e8f0'     // neutral-200
defaults.plugins.tooltip.bodyColor          = '#94a3b8'     // neutral-400
defaults.plugins.tooltip.borderColor        = '#1E2530'     // surface-700
defaults.plugins.tooltip.borderWidth        = 1
defaults.plugins.tooltip.padding            = 10
defaults.plugins.tooltip.cornerRadius       = 8
defaults.plugins.tooltip.titleFont          = { family: "'Inter', sans-serif", weight: '600', size: 12 }
defaults.plugins.tooltip.bodyFont           = { family: "'JetBrains Mono', monospace", size: 11 }
defaults.plugins.tooltip.displayColors      = true
defaults.plugins.tooltip.boxWidth           = 8
defaults.plugins.tooltip.boxHeight          = 8
defaults.plugins.tooltip.boxPadding         = 4

// ── Legend ───────────────────────────────────────────────────────────────────
defaults.plugins.legend.labels.color        = '#64748b'     // neutral-500
defaults.plugins.legend.labels.usePointStyle = true
defaults.plugins.legend.labels.pointStyleWidth = 8
defaults.plugins.legend.labels.font         = { size: 11, family: "'Inter', sans-serif" }
defaults.plugins.legend.labels.padding      = 16

// ── Scale defaults (line / bar charts) ──────────────────────────────────────
defaults.scale.grid.color        = 'rgba(30,37,48,0.5)'   // very subtle grid
defaults.scale.grid.drawTicks    = false
defaults.scale.ticks.color       = '#475569'               // neutral-600
defaults.scale.ticks.padding     = 8
defaults.scale.border.display    = false                   // no axis spine line

// ── Animation ────────────────────────────────────────────────────────────────
defaults.animation.duration = 600
defaults.animation.easing   = 'easeInOutQuart'

// ── Responsive ───────────────────────────────────────────────────────────────
defaults.responsive         = true
defaults.maintainAspectRatio = false
