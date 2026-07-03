import React from 'react';

const GanttGridOverlay = React.memo(({
  timelineDays,
  viewMode,
  dayColWidth,
  isTodayInRange,
  todayOffsetDays
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-[0]">
      {/* Weekend / weekday column backgrounds */}
      {timelineDays.map((day, idx) => {
        const isWeekend = day.getUTCDay() === 0 || day.getUTCDay() === 6;
        const isToday   = isTodayInRange && idx === todayOffsetDays;
        
        if (!isWeekend && !isToday) return null;
        
        return (
          <div
            key={`bg-${idx}`}
            className={`absolute top-0 bottom-0 ${
              isToday
                ? 'bg-red-50/30 dark:bg-red-950/10'
                : 'bg-zinc-100/40 dark:bg-zinc-950/40'
            }`}
            style={{ left: `calc(var(--left-col-width) + ${idx * dayColWidth}px)`, width: dayColWidth }}
          />
        );
      })}

      {/* Vertical grid lines */}
      {timelineDays.map((day, idx) => {
        const isMonday = day.getUTCDay() === 1;
        const isFirst  = day.getUTCDate() === 1;
        if (viewMode === 'week'  && !isMonday && idx !== 0) return null;
        if (viewMode === 'month' && !isFirst  && idx !== 0) return null;
        let borderClass = "border-zinc-200/50 dark:border-zinc-800/50";
        if (isFirst) borderClass = "border-l-2 border-zinc-300 dark:border-zinc-700 z-0";
        else if (isMonday) borderClass = "border-zinc-200 dark:border-zinc-700/80 z-0";

        return (
          <div
            key={`grid-${idx}`}
            className={`absolute top-0 bottom-0 border-l ${borderClass}`}
            style={{ left: `calc(var(--left-col-width) + ${idx * dayColWidth}px)` }}
          />
        );
      })}
    </div>
  );
});

export default GanttGridOverlay;
