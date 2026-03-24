/**
 * ─────────────────────────────────────────────────────────────────────────────
 * UI Component Library — Indian Stock Portfolio Platform
 * Dark Terminal Theme | Bloomberg / Zerodha / Koyfin inspired
 *
 * DESIGN RULES (enforced throughout):
 *  1. All prices/numbers → font-mono (JetBrains Mono) + tabular-nums
 *  2. Backgrounds → surface-900 or bg-950 only
 *  3. Card borders → border-surface-700 (subtle separator)
 *  4. Text → text-neutral-200 (primary) or text-neutral-300 (body) ONLY
 *  5. Green = gain, Red = loss — NEVER swapped
 *  6. No pure white (#ffffff) anywhere
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
} from 'react';

// ─── ICONS (inline SVG — no icon library dependency) ─────────────────────────
const TriangleUp = ({ className = '' }) => (
  <svg
    viewBox="0 0 8 6"
    fill="currentColor"
    className={`inline-block ${className}`}
    width="8"
    height="6"
    aria-hidden="true"
  >
    <path d="M4 0L8 6H0L4 0Z" />
  </svg>
);

const TriangleDown = ({ className = '' }) => (
  <svg
    viewBox="0 0 8 6"
    fill="currentColor"
    className={`inline-block ${className}`}
    width="8"
    height="6"
    aria-hidden="true"
  >
    <path d="M4 6L0 0H8L4 6Z" />
  </svg>
);

const CheckIcon = ({ className = '' }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 ${className}`} aria-hidden="true">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const XIcon = ({ className = '' }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 ${className}`} aria-hidden="true">
    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

const InfoIcon = ({ className = '' }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 ${className}`} aria-hidden="true">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
  </svg>
);

const SortIcon = ({ direction = null, className = '' }) => (
  <svg viewBox="0 0 16 16" fill="currentColor" className={`w-3 h-3 ${className}`} aria-hidden="true">
    {/* Up arrow */}
    <path
      d="M8 3L5 7h6L8 3Z"
      opacity={direction === 'asc' ? 1 : 0.3}
    />
    {/* Down arrow */}
    <path
      d="M8 13L5 9h6L8 13Z"
      opacity={direction === 'desc' ? 1 : 0.3}
    />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// 1. PriceTag
// ─────────────────────────────────────────────────────────────────────────────
/**
 * PriceTag — Displays a monetary price value
 *
 * @param {number|string} value     - The price number (e.g. 2547.35)
 * @param {number}        change    - Change amount (positive = green, negative = red, null = neutral)
 * @param {string}        currency  - Currency prefix (default: "₹")
 * @param {number}        decimals  - Decimal places (default: 2)
 * @param {boolean}       live      - Show blinking live dot
 * @param {string}        size      - 'sm' | 'md' | 'lg' | 'xl'
 * @param {boolean}       animate   - Enable pulse animation on change direction
 * @param {string}        className - Additional classes
 *
 * Design note: Uses JetBrains Mono for precise decimal alignment.
 * Color is purely direction-driven (gain=green, loss=red, neutral=white).
 */
export const PriceTag = ({
  value,
  change = null,
  currency = '₹',
  decimals = 2,
  live = false,
  size = 'md',
  animate = false,
  className = '',
}) => {
  const isGain = change !== null && change > 0;
  const isLoss = change !== null && change < 0;
  const isNeutral = change === null || change === 0;

  // Color mapping — NEVER swap gain/loss
  const colorClass = isGain
    ? 'text-gain-500'
    : isLoss
      ? 'text-loss-500'
      : 'text-neutral-200';

  const animateClass = animate
    ? isGain
      ? 'animate-pulse-gain'
      : isLoss
        ? 'animate-pulse-loss'
        : ''
    : '';

  // Size variants — larger = bigger deal on the page
  const sizeClass = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-3xl font-semibold',
  }[size] || 'text-base';

  const formatted =
    typeof value === 'number'
      ? value.toLocaleString('en-IN', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : value ?? '—';

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        font-mono tabular-nums lining-nums
        ${colorClass} ${sizeClass} ${animateClass} ${className}
      `}
      aria-label={`Price: ${currency}${formatted}`}
    >
      {/* Live blinking dot — shown only when live=true */}
      {live && (
        <span
          className={`
            inline-block w-1.5 h-1.5 rounded-full flex-shrink-0
            ${isGain ? 'bg-gain-500' : isLoss ? 'bg-loss-500' : 'bg-brand-500'}
            animate-blink
          `}
          title="Live"
          aria-label="Live"
        />
      )}
      <span className="font-normal text-neutral-400 text-xs mr-0.5">{currency}</span>
      {formatted}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. ChangeBadge
// ─────────────────────────────────────────────────────────────────────────────
/**
 * ChangeBadge — Percentage / absolute change indicator
 *
 * @param {number}  value      - Change value (positive or negative)
 * @param {boolean} isPercent  - Show % symbol (default: true)
 * @param {string}  size       - 'xs' | 'sm' | 'md'
 * @param {boolean} showIcon   - Show triangle up/down icon
 * @param {boolean} pill       - Render as pill badge with background
 * @param {string}  className  - Additional classes
 *
 * Design note: Triangle icons are intentional — mirrors real trading UIs.
 * The muted background pill is for use in table cells for readability.
 */
export const ChangeBadge = ({
  value,
  isPercent = true,
  size = 'sm',
  showIcon = true,
  pill = false,
  className = '',
}) => {
  if (value === null || value === undefined) {
    return (
      <span className={`text-neutral-500 font-mono text-xs ${className}`}>—</span>
    );
  }

  const isPositive = value > 0;
  const isNegative = value < 0;
  const absValue = Math.abs(value);

  const colorClass = isPositive
    ? 'text-gain-500'
    : isNegative
      ? 'text-loss-500'
      : 'text-neutral-400';

  const pillClass = pill
    ? isPositive
      ? 'bg-gain-muted border border-gain-border rounded-xs px-1.5 py-0.5'
      : isNegative
        ? 'bg-loss-muted border border-loss-border rounded-xs px-1.5 py-0.5'
        : 'bg-surface-800 border border-surface-700 rounded-xs px-1.5 py-0.5'
    : '';

  const sizeClass = {
    xs: 'text-2xs',
    sm: 'text-xs',
    md: 'text-sm',
  }[size] || 'text-xs';

  const formatted = absValue.toFixed(2);

  return (
    <span
      className={`
        inline-flex items-center gap-1 font-mono tabular-nums font-medium
        ${colorClass} ${sizeClass} ${pillClass} ${className}
      `}
      aria-label={`Change: ${isPositive ? '+' : isNegative ? '-' : ''}${formatted}${isPercent ? '%' : ''}`}
    >
      {showIcon && (
        isPositive ? (
          <TriangleUp className="flex-shrink-0" />
        ) : isNegative ? (
          <TriangleDown className="flex-shrink-0" />
        ) : (
          <span className="w-2" /> // neutral dash spacer
        )
      )}
      {isPositive ? '+' : isNegative ? '-' : ''}
      {formatted}
      {isPercent ? '%' : ''}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. StatCard
// ─────────────────────────────────────────────────────────────────────────────
/**
 * StatCard — KPI card for dashboard metrics
 *
 * @param {string}      label      - Top label (e.g. "Total P&L")
 * @param {string|node} value      - Big number / value in center
 * @param {string|node} subtitle   - Small bottom context (e.g. "vs yesterday")
 * @param {node}        icon       - Optional icon to show in top-right
 * @param {'gain'|'loss'|'brand'|'neutral'} accent - Color accent for top border
 * @param {boolean}     loading    - Show skeleton loading state
 * @param {string}      className  - Additional classes
 *
 * Design note: Top border accent line is the only color element — everything
 * else stays neutral to keep the data dense layout scannable.
 */
export const StatCard = ({
  label,
  value,
  subtitle,
  icon,
  accent = 'brand',
  loading = false,
  className = '',
}) => {
  // Top accent border color
  const accentColor = {
    gain:    'border-t-gain-500',
    loss:    'border-t-loss-500',
    brand:   'border-t-brand-500',
    amber:   'border-t-amber-500',
    neutral: 'border-t-surface-700',
    ai:      'border-t-ai-500',
  }[accent] || 'border-t-brand-500';

  if (loading) {
    return (
      <div className={`card p-4 border-t-2 border-t-surface-700 ${className}`}>
        <Skeleton lines={3} />
      </div>
    );
  }

  return (
    <div
      className={`
        card p-4 border-t-2 ${accentColor}
        transition-all duration-200 hover:shadow-card-md
        animate-fade-in-up
        ${className}
      `}
    >
      {/* Label row */}
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xs font-medium text-neutral-400 uppercase tracking-widest">
          {label}
        </span>
        {icon && (
          <span className="text-neutral-500 flex-shrink-0 ml-2">{icon}</span>
        )}
      </div>

      {/* Main value — large, monospaced */}
      <div className="text-xl font-semibold font-mono tabular-nums text-neutral-200 mb-1 lining-nums">
        {value ?? '—'}
      </div>

      {/* Subtitle / context */}
      {subtitle && (
        <div className="text-xs text-neutral-500 leading-tight">{subtitle}</div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. SectionHeader
// ─────────────────────────────────────────────────────────────────────────────
/**
 * SectionHeader — Consistent section titles
 *
 * @param {string}  title      - Section heading text
 * @param {string}  subtitle   - Optional smaller subtitle below
 * @param {boolean} live       - Show blinking "LIVE" indicator
 * @param {node}    action     - Optional action button (right side)
 * @param {string}  className  - Additional classes
 *
 * Design note: Left border uses brand accent for visual hierarchy.
 * Keeps the page scanneable by providing clear section boundaries.
 */
export const SectionHeader = ({
  title,
  subtitle,
  live = false,
  action,
  className = '',
}) => {
  return (
    <div className={`flex items-start justify-between mb-4 ${className}`}>
      {/* Left — title + subtitle */}
      <div className="flex items-center gap-3">
        {/* Brand accent bar */}
        <span className="inline-block w-0.5 h-5 bg-brand-500 rounded-full flex-shrink-0" aria-hidden="true" />

        <div>
          <h2 className="text-sm font-semibold text-neutral-200 leading-tight tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Live indicator */}
        {live && (
          <span className="inline-flex items-center gap-1 ml-1">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-gain-500 animate-blink"
              aria-hidden="true"
            />
            <span className="text-2xs font-medium text-gain-500 uppercase tracking-wider">
              LIVE
            </span>
          </span>
        )}
      </div>

      {/* Right — optional action */}
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. Skeleton
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Skeleton — Shimmer loading placeholders
 *
 * @param {number} lines   - Number of text lines (for text skeletons)
 * @param {'text'|'card'|'table'|'circle'|'custom'} variant
 * @param {string} height  - For custom variant
 * @param {string} width   - For single custom skeleton
 * @param {string} className
 *
 * Design note: Uses the shimmer keyframe animation. Background matches
 * surface-800 so it blends with card backgrounds seamlessly.
 */
export const Skeleton = ({
  lines = 3,
  variant = 'text',
  height,
  width,
  className = '',
}) => {
  // Shimmer gradient — moves left-to-right
  const shimmerStyle = {
    background: 'linear-gradient(90deg, #151C26 25%, #1E2530 50%, #151C26 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 2s linear infinite',
  };

  if (variant === 'circle') {
    return (
      <span
        className={`block rounded-full flex-shrink-0 ${className}`}
        style={{ ...shimmerStyle, width: width || '40px', height: height || '40px' }}
        aria-hidden="true"
      />
    );
  }

  if (variant === 'custom') {
    return (
      <span
        className={`block rounded-card ${className}`}
        style={{ ...shimmerStyle, width: width || '100%', height: height || '16px' }}
        aria-hidden="true"
      />
    );
  }

  if (variant === 'card') {
    return (
      <div className={`card p-4 space-y-3 ${className}`} aria-hidden="true">
        <span className="block h-3 w-1/3 rounded" style={shimmerStyle} />
        <span className="block h-7 w-2/3 rounded" style={shimmerStyle} />
        <span className="block h-2.5 w-1/2 rounded" style={shimmerStyle} />
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className="space-y-px" aria-hidden="true">
        {/* Header row */}
        <div className="flex gap-4 px-4 py-2 border-b border-surface-700">
          {[40, 20, 20, 20].map((w, i) => (
            <span
              key={i}
              className="block h-2.5 rounded"
              style={{ ...shimmerStyle, width: `${w}%` }}
            />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3">
            {[35, 18, 20, 15].map((w, j) => (
              <span
                key={j}
                className="block h-3 rounded"
                style={{ ...shimmerStyle, width: `${w}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Default — text lines
  const widths = ['w-full', 'w-5/6', 'w-3/4', 'w-2/3', 'w-4/5', 'w-1/2'];
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <span
          key={i}
          className={`block h-3 rounded ${widths[i % widths.length]}`}
          style={shimmerStyle}
        />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. Toast / Notification System
// ─────────────────────────────────────────────────────────────────────────────

// Internal toast store
let _toasts = [];
let _listeners = [];

const toastStore = {
  subscribe: (listener) => {
    _listeners.push(listener);
    return () => {
      _listeners = _listeners.filter((l) => l !== listener);
    };
  },
  emit: () => _listeners.forEach((l) => l([..._toasts])),
  add: (toast) => {
    const id = Date.now() + Math.random();
    _toasts = [..._toasts, { id, ...toast }];
    toastStore.emit();
    return id;
  },
  remove: (id) => {
    _toasts = _toasts.filter((t) => t.id !== id);
    toastStore.emit();
  },
};

/**
 * toast — Imperative toast trigger (call this anywhere)
 *
 * @example
 *   toast.success('Order placed successfully');
 *   toast.error('Connection failed');
 *   toast.info('Market opens in 5 minutes');
 */
export const toast = {
  success: (message, options = {}) =>
    toastStore.add({ type: 'success', message, duration: 4000, ...options }),
  error: (message, options = {}) =>
    toastStore.add({ type: 'error', message, duration: 5000, ...options }),
  info: (message, options = {}) =>
    toastStore.add({ type: 'info', message, duration: 4000, ...options }),
  warning: (message, options = {}) =>
    toastStore.add({ type: 'warning', message, duration: 4500, ...options }),
};

// Individual toast item
const ToastItem = ({ id, type, message, duration }) => {
  const [exiting, setExiting] = useState(false);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => toastStore.remove(id), 300);
  }, [id]);

  useEffect(() => {
    if (!duration) return;
    const timer = setTimeout(dismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, dismiss]);

  const config = {
    success: {
      icon: <CheckIcon />,
      bar: 'bg-gain-500',
      iconClass: 'text-gain-400',
      label: 'Success',
    },
    error: {
      icon: <XIcon />,
      bar: 'bg-loss-500',
      iconClass: 'text-loss-400',
      label: 'Error',
    },
    info: {
      icon: <InfoIcon />,
      bar: 'bg-brand-500',
      iconClass: 'text-brand-400',
      label: 'Info',
    },
    warning: {
      icon: <InfoIcon />,
      bar: 'bg-amber-500',
      iconClass: 'text-amber-400',
      label: 'Warning',
    },
  };

  const { icon, bar, iconClass, label } = config[type] || config.info;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        relative flex items-start gap-3
        bg-surface-800 border border-surface-700
        rounded-card shadow-card-lg overflow-hidden
        min-w-[280px] max-w-[360px] p-3 pr-8
        transition-all duration-300
        ${exiting ? 'opacity-0 translate-x-4' : 'animate-slide-in-right'}
      `}
    >
      {/* Left accent bar */}
      <span className={`absolute left-0 top-0 bottom-0 w-0.5 ${bar}`} aria-hidden="true" />

      {/* Icon */}
      <span className={`flex-shrink-0 mt-0.5 ${iconClass}`} aria-hidden="true">
        {icon}
      </span>

      {/* Message */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-neutral-200 leading-snug">{message}</p>
      </div>

      {/* Dismiss button */}
      <button
        onClick={dismiss}
        className="
          absolute top-2 right-2 text-neutral-500
          hover:text-neutral-300 transition-colors p-0.5 rounded
        "
        aria-label="Dismiss notification"
      >
        <XIcon className="w-3 h-3" />
      </button>
    </div>
  );
};

/**
 * ToastContainer — Mount this once in your App root
 *
 * @example
 *   // In App.jsx
 *   <ToastContainer />
 */
export const ToastContainer = ({ position = 'bottom-right' }) => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsub = toastStore.subscribe(setToasts);
    return unsub;
  }, []);

  const positionClass = {
    'top-right':    'top-4 right-4',
    'top-left':     'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left':  'bottom-4 left-4',
    'top-center':   'top-4 left-1/2 -translate-x-1/2',
  }[position] || 'bottom-4 right-4';

  if (toasts.length === 0) return null;

  return (
    <div
      className={`fixed z-[9999] flex flex-col gap-2 ${positionClass}`}
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. DataTable
// ─────────────────────────────────────────────────────────────────────────────
/**
 * DataTable — Dark-themed sortable table
 *
 * @param {Array<{key, label, sortable, align, render, width}>} columns
 * @param {Array<object>} data           - Array of row objects
 * @param {string}        rowKey         - Key used as React key (default: 'id')
 * @param {function}      onRowClick     - Row click handler (receives row object)
 * @param {boolean}       loading        - Show skeleton
 * @param {string}        emptyMessage   - Empty state message
 * @param {boolean}       stickyHeader   - Stick header on scroll
 * @param {number}        maxHeight      - Max height for scroll (px)
 * @param {string}        className
 *
 * Design note:
 * - First column is sticky (position: sticky) for horizontal scroll on mobile
 * - Hover row uses surface-800 which is slightly lighter than surface-900 (card)
 * - Sort state is internal — controlled via sortable prop per column
 * - Numbers right-aligned; text left-aligned (controlled via column.align)
 */
export const DataTable = ({
  columns = [],
  data = [],
  rowKey = 'id',
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
  stickyHeader = false,
  maxHeight,
  className = '',
}) => {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Client-side sort
  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  if (loading) {
    return (
      <div className={`card overflow-hidden ${className}`}>
        <Skeleton variant="table" lines={6} />
      </div>
    );
  }

  return (
    <div
      className={`card overflow-hidden ${className}`}
      style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs" role="grid">
          {/* ── TABLE HEAD ─────────────────────────────────────────────── */}
          <thead
            className={`
              bg-surface-950 border-b border-surface-700
              ${stickyHeader ? 'sticky top-0 z-10' : ''}
            `}
          >
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key}
                  scope="col"
                  style={col.width ? { width: col.width } : undefined}
                  className={`
                    px-3 py-2.5 text-2xs font-medium uppercase tracking-widest
                    text-neutral-500 whitespace-nowrap select-none
                    ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                    ${idx === 0 ? 'sticky left-0 z-10 bg-surface-950' : ''}
                    ${col.sortable ? 'cursor-pointer hover:text-neutral-300 transition-colors' : ''}
                  `}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  aria-sort={
                    col.sortable && sortKey === col.key
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <SortIcon
                        direction={sortKey === col.key ? sortDir : null}
                        className="flex-shrink-0"
                      />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          {/* ── TABLE BODY ──────────────────────────────────────────────── */}
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-neutral-500 text-xs"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, rowIdx) => (
                <tr
                  key={row[rowKey] ?? rowIdx}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`
                    border-b border-surface-700 last:border-0
                    transition-colors duration-100
                    ${onRowClick ? 'cursor-pointer hover:bg-surface-800' : ''}
                    ${rowIdx % 2 === 0 ? '' : 'bg-surface-950/30'}
                  `}
                  role={onRowClick ? 'button' : 'row'}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => e.key === 'Enter' && onRowClick(row)
                      : undefined
                  }
                >
                  {columns.map((col, idx) => {
                    const rawValue = row[col.key];
                    const displayValue = col.render
                      ? col.render(rawValue, row, rowIdx)
                      : rawValue ?? '—';

                    return (
                      <td
                        key={col.key}
                        className={`
                          px-3 py-2.5 text-neutral-300 whitespace-nowrap
                          ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                          ${col.mono !== false && col.align === 'right' ? 'font-mono tabular-nums lining-nums' : ''}
                          ${idx === 0 ? 'sticky left-0 bg-surface-900 hover:bg-surface-800 z-[5] font-medium text-neutral-200' : ''}
                        `}
                      >
                        {displayValue}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. Badge — Signal Chips (BUY / HOLD / SELL / custom)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Badge — Color-coded signal / category chips
 *
 * @param {'BUY'|'SELL'|'HOLD'|'STRONG_BUY'|'STRONG_SELL'|string} variant
 * @param {string} label    - Override label text (defaults to variant)
 * @param {string} size     - 'xs' | 'sm'
 * @param {boolean} dot     - Show colored dot prefix
 * @param {string} className
 *
 * Signal colors:
 *   BUY / STRONG_BUY  → gain (green)
 *   SELL / STRONG_SELL → loss (red)
 *   HOLD              → amber (yellow)
 *   Others            → brand (blue) or neutral
 *
 * Design note: Uppercase + wide tracking mimics real trading terminals.
 * The dot prefix aids quick scanning in dense table rows.
 */
export const Badge = ({
  variant = 'HOLD',
  label,
  size = 'sm',
  dot = true,
  className = '',
}) => {
  const variantConfig = {
    BUY: {
      bg: 'bg-gain-500/10 border-gain-500/30 text-gain-400',
      dot: 'bg-gain-500',
      label: 'BUY',
    },
    STRONG_BUY: {
      bg: 'bg-gain-500/20 border-gain-500/50 text-gain-300 font-semibold',
      dot: 'bg-gain-400',
      label: 'STRONG BUY',
    },
    SELL: {
      bg: 'bg-loss-500/10 border-loss-500/30 text-loss-400',
      dot: 'bg-loss-500',
      label: 'SELL',
    },
    STRONG_SELL: {
      bg: 'bg-loss-500/20 border-loss-500/50 text-loss-300 font-semibold',
      dot: 'bg-loss-400',
      label: 'STRONG SELL',
    },
    HOLD: {
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      dot: 'bg-amber-500',
      label: 'HOLD',
    },
    ACCUMULATE: {
      bg: 'bg-brand-500/10 border-brand-500/30 text-brand-400',
      dot: 'bg-brand-500',
      label: 'ACCUMULATE',
    },
    NEUTRAL: {
      bg: 'bg-surface-700/50 border-surface-700 text-neutral-400',
      dot: 'bg-neutral-500',
      label: 'NEUTRAL',
    },
  };

  const config = variantConfig[variant] || variantConfig.NEUTRAL;
  const displayLabel = label || config.label;

  const sizeClass = {
    xs: 'text-2xs px-1.5 py-px gap-1',
    sm: 'text-xs px-2 py-0.5 gap-1.5',
  }[size] || 'text-xs px-2 py-0.5 gap-1.5';

  return (
    <span
      className={`
        inline-flex items-center rounded-xs border font-medium
        uppercase tracking-wider leading-none
        ${config.bg} ${sizeClass} ${className}
      `}
      aria-label={`Signal: ${displayLabel}`}
    >
      {dot && (
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot}`}
          aria-hidden="true"
        />
      )}
      {displayLabel}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// BONUS: Divider — thin separator line
// ─────────────────────────────────────────────────────────────────────────────
export const Divider = ({ className = '', label }) => {
  if (label) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <span className="flex-1 h-px bg-surface-700" />
        <span className="text-2xs text-neutral-500 uppercase tracking-widest">
          {label}
        </span>
        <span className="flex-1 h-px bg-surface-700" />
      </div>
    );
  }
  return <hr className={`border-t border-surface-700 ${className}`} />;
};

// ─────────────────────────────────────────────────────────────────────────────
// BONUS: LiveDot — standalone live indicator
// ─────────────────────────────────────────────────────────────────────────────
export const LiveDot = ({ color = 'gain', className = '' }) => {
  const colorMap = {
    gain:  'bg-gain-500',
    loss:  'bg-loss-500',
    brand: 'bg-brand-500',
    amber: 'bg-amber-500',
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full animate-blink ${colorMap[color] || colorMap.brand} ${className}`}
      aria-label="Live"
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// BONUS: EmptyState — clean empty state component
// ─────────────────────────────────────────────────────────────────────────────
export const EmptyState = ({
  icon,
  title = 'No data',
  description,
  action,
  className = '',
}) => (
  <div
    className={`
      flex flex-col items-center justify-center py-12 px-4
      text-center ${className}
    `}
  >
    {icon && (
      <span className="text-neutral-600 mb-4 text-4xl" aria-hidden="true">
        {icon}
      </span>
    )}
    <h3 className="text-sm font-medium text-neutral-400 mb-1">{title}</h3>
    {description && (
      <p className="text-xs text-neutral-500 max-w-xs">{description}</p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// BONUS: ProgressBar — for allocation / weight visualizations
// ─────────────────────────────────────────────────────────────────────────────
export const ProgressBar = ({
  value = 0,       // 0–100
  max = 100,
  color = 'brand', // 'brand' | 'gain' | 'loss' | 'amber'
  showLabel = false,
  height = 'h-1',
  className = '',
}) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  const barColor = {
    brand: 'bg-brand-500',
    gain:  'bg-gain-500',
    loss:  'bg-loss-500',
    amber: 'bg-amber-500',
  }[color] || 'bg-brand-500';

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full ${height} bg-surface-700 rounded-full overflow-hidden`}>
        <div
          className={`${height} ${barColor} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemax={max}
          aria-valuemin={0}
        />
      </div>
      {showLabel && (
        <span className="text-2xs text-neutral-500 mt-0.5 font-mono">{pct.toFixed(1)}%</span>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// BONUS: Tooltip — simple dark tooltip wrapper
// ─────────────────────────────────────────────────────────────────────────────
export const Tooltip = ({ content, children, placement = 'top', className = '' }) => {
  const [visible, setVisible] = useState(false);

  const placementClass = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left:   'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right:  'left-full top-1/2 -translate-y-1/2 ml-1.5',
  }[placement] || 'bottom-full left-1/2 -translate-x-1/2 mb-1.5';

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && content && (
        <span
          className={`
            absolute z-50 ${placementClass}
            px-2 py-1 rounded text-2xs text-neutral-200
            bg-surface-700 border border-surface-700 shadow-card-md
            whitespace-nowrap pointer-events-none
            animate-fade-in-up
          `}
          role="tooltip"
        >
          {content}
        </span>
      )}
    </span>
  );
};
