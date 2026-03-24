import React from 'react';

/* ─────────────────────────────────────────────
   Shimmer keyframes injected once via a <style> tag
───────────────────────────────────────────── */
const shimmerStyle = `
@keyframes skeleton-shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}

.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    #1e2433 0%,
    #2a3045 40%,
    #1e2433 80%
  );
  background-size: 600px 100%;
  animation: skeleton-shimmer 1.5s infinite linear;
  border-radius: 4px;
}
`;

let shimmerInjected = false;
function injectShimmer() {
  if (shimmerInjected || typeof document === 'undefined') return;
  const tag = document.createElement('style');
  tag.textContent = shimmerStyle;
  document.head.appendChild(tag);
  shimmerInjected = true;
}

/* ─────────────────────────────────────────────
   SkeletonLine — single animated line
   @param width  – Tailwind width class or CSS value (default '100%')
   @param height – CSS height string (default '14px')
   @param className – extra Tailwind classes
───────────────────────────────────────────── */
export function SkeletonLine({ width = '100%', height = '14px', className = '' }) {
  injectShimmer();
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{ width, height }}
    />
  );
}

/* ─────────────────────────────────────────────
   SkeletonCard — dark card with multiple shimmer lines
───────────────────────────────────────────── */
export function SkeletonCard({ className = '' }) {
  injectShimmer();
  return (
    <div
      className={`bg-surface-800 border border-surface-700 rounded-xl p-5 space-y-3 ${className}`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <SkeletonLine width="40%" height="18px" />
        <SkeletonLine width="18%" height="18px" />
      </div>
      {/* Body lines */}
      <SkeletonLine width="100%" height="12px" />
      <SkeletonLine width="85%"  height="12px" />
      <SkeletonLine width="60%"  height="12px" />
      {/* Footer */}
      <div className="flex gap-3 pt-1">
        <SkeletonLine width="30%" height="12px" />
        <SkeletonLine width="30%" height="12px" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SkeletonTable — full table skeleton
   @param rows – number of shimmer rows (default 6)
───────────────────────────────────────────── */
export function SkeletonTable({ rows = 6, className = '' }) {
  injectShimmer();
  const colWidths = ['28%', '15%', '15%', '14%', '14%', '14%'];

  return (
    <div className={`bg-surface-800 border border-surface-700 rounded-xl overflow-hidden ${className}`}>
      {/* Table header */}
      <div className="flex gap-4 px-5 py-3 border-b border-surface-700 bg-surface-900">
        {colWidths.map((w, i) => (
          <SkeletonLine key={i} width={w} height="13px" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className={`flex gap-4 px-5 py-4 border-b border-surface-700/50 ${
            rowIdx % 2 === 0 ? 'bg-surface-800' : 'bg-surface-800/60'
          }`}
        >
          {colWidths.map((w, colIdx) => (
            <SkeletonLine
              key={colIdx}
              width={colIdx === 0 ? w : `${Math.max(40, parseInt(w) - Math.random() * 6 | 0)}%`}
              height="13px"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SkeletonStatCard — shimmer version of stat/KPI cards
───────────────────────────────────────────── */
export function SkeletonStatCard({ className = '' }) {
  injectShimmer();
  return (
    <div
      className={`bg-surface-800 border border-surface-700 rounded-xl p-4 flex flex-col gap-3 ${className}`}
    >
      {/* Icon placeholder */}
      <div className="flex items-center justify-between">
        <SkeletonLine width="42px" height="42px" className="rounded-lg" />
        <SkeletonLine width="60px" height="20px" className="rounded-full" />
      </div>
      {/* Value */}
      <SkeletonLine width="70%" height="28px" />
      {/* Label */}
      <SkeletonLine width="50%" height="13px" />
    </div>
  );
}

/* ─────────────────────────────────────────────
   SkeletonPortfolioCard — shimmer version of portfolio list cards
───────────────────────────────────────────── */
export function SkeletonPortfolioCard({ className = '' }) {
  injectShimmer();
  return (
    <div
      className={`bg-surface-800 border border-surface-700 rounded-xl p-5 space-y-4 ${className}`}
    >
      {/* Top row: name + badge */}
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <SkeletonLine width="55%" height="20px" />
          <SkeletonLine width="80%" height="13px" />
        </div>
        <SkeletonLine width="64px" height="24px" className="rounded-full ml-3" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <SkeletonLine width="60%" height="11px" />
          <SkeletonLine width="80%" height="22px" />
        </div>
        <div className="space-y-1">
          <SkeletonLine width="60%" height="11px" />
          <SkeletonLine width="70%" height="22px" />
        </div>
      </div>

      {/* Sector allocation bar */}
      <div className="space-y-2">
        <SkeletonLine width="40%" height="11px" />
        <SkeletonLine width="100%" height="8px" className="rounded-full" />
      </div>

      {/* Footer row: stock count + stars */}
      <div className="flex items-center justify-between pt-1">
        <SkeletonLine width="30%" height="13px" />
        <SkeletonLine width="80px" height="16px" />
      </div>
    </div>
  );
}
