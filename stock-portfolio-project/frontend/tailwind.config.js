/** @type {import('tailwindcss').Config} */
// ─────────────────────────────────────────────────────────────────────────────
// DESIGN SYSTEM — Indian Stock Portfolio Platform
// Inspired by Zerodha Kite, Bloomberg Terminal, Koyfin
// Theme: Dark, data-dense, professional trading terminal
// ─────────────────────────────────────────────────────────────────────────────
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      // ── COLOR PALETTE ────────────────────────────────────────────────────
      colors: {
        // Primary accent — electric blue/cyan (Bloomberg-inspired)
        brand: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0EA5E9', // ← primary CTA / highlight
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },

        // Dark card / container surfaces
        surface: {
          700: '#1E2530', // card borders — subtle separator
          800: '#151C26', // inner panels / secondary cards
          900: '#0D1117', // main card background
          950: '#080C12', // deepest nesting
        },

        // Page-level backgrounds
        bg: {
          900: '#0A0F1A', // sidebar / secondary page bg
          950: '#070B14', // root page background ← html base
        },

        // Positive P&L — gain (green)
        gain: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22C55E', // ← primary gain color
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          DEFAULT: '#22C55E',
        },

        // Negative P&L — loss (red)
        loss: {
          50:  '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#EF4444', // ← primary loss color
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          DEFAULT: '#EF4444',
        },

        // Muted grays — secondary text, metadata, labels
        neutral: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0', // max brightness for body text — NEVER pure white
          300: '#cbd5e1', // standard body text on dark
          400: '#94a3b8', // secondary / muted text
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },

        // Amber — warnings, signals, alerts, pending states
        amber: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#F59E0B', // ← primary warning color
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          DEFAULT: '#F59E0B',
        },

        // Purple — for AI / LLM related elements
        ai: {
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
        },
      },

      // ── TYPOGRAPHY ───────────────────────────────────────────────────────
      fontFamily: {
        // JetBrains Mono — all price / number displays MUST use this
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        // Inter — clean sans-serif for UI labels and body
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },

      // ── FONT SIZES (tighter for data density) ───────────────────────────
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }], // 10px — micro labels
        'xs':  ['0.75rem',  { lineHeight: '1rem' }],     // 12px
        'sm':  ['0.8125rem',{ lineHeight: '1.25rem' }],  // 13px — table data
      },

      // ── SPACING (additional fine-grained tokens) ─────────────────────────
      spacing: {
        '4.5': '1.125rem',
        '13':  '3.25rem',
        '15':  '3.75rem',
        '18':  '4.5rem',
      },

      // ── BORDER RADIUS ────────────────────────────────────────────────────
      borderRadius: {
        'xs':  '0.125rem', // 2px — badges, chips
        'card': '0.5rem',  // 8px — cards
        'panel': '0.75rem',// 12px — major panels
      },

      // ── BOX SHADOWS (glow effects for data elements) ─────────────────────
      boxShadow: {
        // Default card shadow — subtle depth on dark bg
        'card':     '0 1px 3px 0 rgba(0,0,0,0.4), 0 1px 2px -1px rgba(0,0,0,0.4)',
        'card-md':  '0 4px 6px -1px rgba(0,0,0,0.5), 0 2px 4px -2px rgba(0,0,0,0.5)',
        'card-lg':  '0 10px 15px -3px rgba(0,0,0,0.6), 0 4px 6px -4px rgba(0,0,0,0.6)',

        // Gain glow — green halo for positive P&L highlights
        'glow-gain': '0 0 12px 2px rgba(34, 197, 94, 0.35)',
        'glow-gain-sm': '0 0 6px 1px rgba(34, 197, 94, 0.25)',

        // Loss glow — red halo for negative P&L highlights
        'glow-loss': '0 0 12px 2px rgba(239, 68, 68, 0.35)',
        'glow-loss-sm': '0 0 6px 1px rgba(239, 68, 68, 0.25)',

        // Brand glow — electric blue for active elements / focus
        'glow-brand': '0 0 12px 2px rgba(14, 165, 233, 0.35)',
        'glow-brand-sm': '0 0 6px 1px rgba(14, 165, 233, 0.25)',

        // Inset for pressed states
        'inset-surface': 'inset 0 1px 3px 0 rgba(0,0,0,0.5)',
      },

      // ── BACKGROUND GRADIENT UTILITIES ────────────────────────────────────
      backgroundImage: {
        // Subtle scanline overlay for terminal aesthetics
        'terminal-grid': `
          linear-gradient(rgba(14,165,233,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(14,165,233,0.03) 1px, transparent 1px)
        `,
        // Gain gradient — for sparkline fills
        'gradient-gain': 'linear-gradient(180deg, rgba(34,197,94,0.2) 0%, transparent 100%)',
        // Loss gradient — for sparkline fills
        'gradient-loss': 'linear-gradient(180deg, rgba(239,68,68,0.2) 0%, transparent 100%)',
        // Card border gradient
        'border-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
      },

      // ── KEYFRAME ANIMATIONS ───────────────────────────────────────────────
      keyframes: {
        // Green glow pulse — live positive price changes
        'pulse-gain': {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)',
            color: '#22C55E',
          },
          '50%': {
            boxShadow: '0 0 8px 3px rgba(34, 197, 94, 0.5)',
            color: '#86efac',
          },
        },

        // Red glow pulse — live negative price changes
        'pulse-loss': {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)',
            color: '#EF4444',
          },
          '50%': {
            boxShadow: '0 0 8px 3px rgba(239, 68, 68, 0.5)',
            color: '#fca5a5',
          },
        },

        // Live indicator dot blink
        'blink': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.2' },
        },

        // Shimmer skeleton loading
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },

        // Ticker tape horizontal scroll
        'ticker-scroll': {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },

        // Fade-in slide-up for cards/toasts
        'fade-in-up': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },

        // Toast slide-in from right
        'slide-in-right': {
          '0%':   { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },

        // Number counter spin (value change animation)
        'count-up': {
          '0%':   { opacity: '0', transform: 'translateY(100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },

        // P&L flash — green bg flash when price increases
        'flash-up': {
          '0%':   { backgroundColor: 'rgba(34,197,94,0.2)' },
          '100%': { backgroundColor: 'transparent' },
        },

        // P&L flash — red bg flash when price decreases
        'flash-down': {
          '0%':   { backgroundColor: 'rgba(239,68,68,0.2)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },

      // ── ANIMATION UTILITIES ───────────────────────────────────────────────
      animation: {
        'pulse-gain':      'pulse-gain 1.5s ease-in-out infinite',
        'pulse-loss':      'pulse-loss 1.5s ease-in-out infinite',
        'blink':           'blink 1.2s ease-in-out infinite',
        'shimmer':         'shimmer 2s linear infinite',
        'ticker-scroll':   'ticker-scroll 30s linear infinite',
        'fade-in-up':      'fade-in-up 0.3s ease-out forwards',
        'slide-in-right':  'slide-in-right 0.3s ease-out forwards',
        'count-up':        'count-up 0.25s ease-out forwards',
        'flash-up':        'flash-up 0.8s ease-out forwards',
        'flash-down':      'flash-down 0.8s ease-out forwards',
      },

      // ── TRANSITION TIMING ─────────────────────────────────────────────────
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      // ── BACKGROUND SIZE ───────────────────────────────────────────────────
      backgroundSize: {
        'shimmer': '200% 100%',
        'grid-sm': '20px 20px',
        'grid-md': '40px 40px',
      },
    },
  },
  plugins: [],
};
