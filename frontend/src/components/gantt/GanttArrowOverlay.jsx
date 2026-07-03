import React from 'react';
import { ROW_H } from './ganttUtils';

/**
 * Arrow overlay rendered INSIDE the body div (which includes both left panel + right grid).
 * arrowPaths coordinates are relative to the RIGHT grid only (x=0 = start of timeline).
 * We shift the SVG left by leftOffset so it aligns with the right grid.
 */
export default function GanttArrowOverlay({
  arrowPaths,
  rightGridWidth,
  rowCount,
  showCritical,
}) {
  if (arrowPaths.length === 0) return null;

  return (
    <svg
      className="absolute top-0 pointer-events-none z-[15] overflow-visible"
      style={{
        left:   'var(--left-col-width)',
        width:  `${rightGridWidth}px`,
        height: `${rowCount * ROW_H}px`,
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <marker id="arr-normal"   markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <polygon points="0 0, 5 2.5, 0 5" fill="#7c3aed" opacity="0.85" />
        </marker>
        <marker id="arr-critical" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <polygon points="0 0, 5 2.5, 0 5" fill="#ef4444" />
        </marker>
        <marker id="arr-float"    markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <polygon points="0 0, 5 2.5, 0 5" fill="#f59e0b" opacity="0.85" />
        </marker>
      </defs>

      {arrowPaths.map(({ d, key, critical, float }) => {
        const nearCritical = !critical && typeof float === 'number' && float >= 0 && float <= 2;
        const stroke  = showCritical && critical ? '#ef4444' : nearCritical ? '#f59e0b' : '#7c3aed';
        const marker  = showCritical && critical ? 'url(#arr-critical)' : nearCritical ? 'url(#arr-float)' : 'url(#arr-normal)';
        const width   = showCritical && critical ? 1.5 : 1;
        const dash    = showCritical && critical ? undefined : '5 3';

        return (
          <path
            key={key}
            d={d}
            fill="none"
            stroke={stroke}
            strokeWidth={width}
            strokeDasharray={dash}
            markerEnd={marker}
            opacity={showCritical && critical ? 1 : 0.75}
          />
        );
      })}
    </svg>
  );
}
