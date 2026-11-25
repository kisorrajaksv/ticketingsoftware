import React from 'react';

/**
 * Reusable Theme-Aware Skeleton Loader Component.
 * Automatically adapts shimmer colors to Light and Dark themes (`html[data-theme="dark"]`).
 *
 * Variants:
 * - "table"  : Table rows with avatar & text bars
 * - "cards"  : Responsive grid of workspace cards
 * - "stats"  : 4-column KPI stat card skeletons
 * - "detail" : Modal / 2-column detail workspace skeleton
 * - "sheet"  : Spreadsheet grid skeleton
 * - "inline" : Compact inline pill shimmer for metric numbers
 */
export default function SkeletonLoader({
  variant = 'table',
  rows = 5,
  count = 4,
  width = 48,
  height = 24,
  className = ''
}) {
  if (variant === 'inline') {
    return (
      <span
        className={`sk-shimmer sk-inline ${className}`}
        style={{ width, height, display: 'inline-block', borderRadius: '6px' }}
        aria-hidden="true"
      />
    );
  }

  if (variant === 'stats') {
    return (
      <div className={`sk-stats-grid ${className}`} aria-busy="true" aria-label="Loading statistics">
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className="sk-card sk-stat-card">
            <div className="sk-shimmer sk-icon-box" />
            <div className="sk-stat-lines">
              <div className="sk-shimmer sk-line sk-w-60" style={{ height: '12px' }} />
              <div className="sk-shimmer sk-line sk-w-40" style={{ height: '24px' }} />
            </div>
            <div className="sk-shimmer sk-pill" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div className={`sk-cards-grid ${className}`} aria-busy="true" aria-label="Loading items">
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className="sk-card sk-grid-card">
            <div className="sk-card-top">
              <div className="sk-shimmer sk-icon-box" />
              <div className="sk-shimmer sk-pill" />
            </div>
            <div className="sk-shimmer sk-line sk-w-75" style={{ height: '16px', marginTop: '14px' }} />
            <div className="sk-shimmer sk-line sk-w-50" style={{ height: '12px', marginTop: '8px' }} />
            <div className="sk-card-meta-row">
              <div className="sk-shimmer sk-line sk-w-30" style={{ height: '11px' }} />
              <div className="sk-shimmer sk-line sk-w-35" style={{ height: '11px' }} />
            </div>
            <div className="sk-card-footer-row">
              <div className="sk-shimmer sk-btn" />
              <div className="sk-shimmer sk-btn" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div className={`sk-detail-wrap ${className}`} aria-busy="true" aria-label="Loading details">
        <div className="sk-detail-main">
          <div className="sk-card" style={{ padding: '20px' }}>
            <div className="sk-shimmer sk-line sk-w-40" style={{ height: '14px' }} />
            <div className="sk-shimmer sk-line sk-w-85" style={{ height: '20px', marginTop: '12px' }} />
            <div className="sk-shimmer sk-line sk-w-100" style={{ height: '12px', marginTop: '16px' }} />
            <div className="sk-shimmer sk-line sk-w-90" style={{ height: '12px', marginTop: '8px' }} />
            <div className="sk-shimmer sk-line sk-w-70" style={{ height: '12px', marginTop: '8px' }} />
          </div>
          <div className="sk-card" style={{ padding: '20px' }}>
            <div className="sk-shimmer sk-line sk-w-35" style={{ height: '14px' }} />
            <div className="sk-shimmer sk-block" style={{ height: '90px', marginTop: '14px' }} />
          </div>
        </div>
        <div className="sk-detail-side">
          <div className="sk-card" style={{ padding: '18px' }}>
            <div className="sk-shimmer sk-line sk-w-50" style={{ height: '14px' }} />
            <div className="sk-shimmer sk-line sk-w-80" style={{ height: '12px', marginTop: '14px' }} />
            <div className="sk-shimmer sk-line sk-w-65" style={{ height: '12px', marginTop: '10px' }} />
            <div className="sk-shimmer sk-line sk-w-75" style={{ height: '12px', marginTop: '10px' }} />
            <div className="sk-shimmer sk-line sk-w-55" style={{ height: '12px', marginTop: '10px' }} />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'sheet') {
    return (
      <div className={`sk-card sk-sheet-wrap ${className}`} aria-busy="true" aria-label="Loading spreadsheet">
        <div className="sk-sheet-toolbar">
          <div className="sk-shimmer sk-pill" style={{ width: '120px', height: '28px' }} />
          <div className="sk-shimmer sk-pill" style={{ width: '96px', height: '28px' }} />
          <div className="sk-shimmer sk-pill" style={{ width: '110px', height: '28px' }} />
        </div>
        <div className="sk-sheet-rows">
          {Array.from({ length: rows }).map((_, rIdx) => (
            <div key={rIdx} className="sk-sheet-row">
              <div className="sk-shimmer sk-cell-sm" />
              <div className="sk-shimmer sk-cell-lg" />
              <div className="sk-shimmer sk-cell-md" />
              <div className="sk-shimmer sk-cell-md" />
              <div className="sk-shimmer sk-cell-sm" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default: 'table'
  return (
    <div className={`sk-table-wrap ${className}`} aria-busy="true" aria-label="Loading table data">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="sk-table-row">
          <div className="sk-row-user">
            <div className="sk-shimmer sk-avatar" />
            <div className="sk-row-text">
              <div className="sk-shimmer sk-line sk-w-65" style={{ height: '13px' }} />
              <div className="sk-shimmer sk-line sk-w-45" style={{ height: '10px' }} />
            </div>
          </div>
          <div className="sk-shimmer sk-line sk-w-60" style={{ height: '12px' }} />
          <div className="sk-shimmer sk-pill" />
          <div className="sk-shimmer sk-line sk-w-50" style={{ height: '12px' }} />
          <div className="sk-shimmer sk-btn" style={{ width: '76px', height: '30px', justifySelf: 'end' }} />
        </div>
      ))}
    </div>
  );
}
