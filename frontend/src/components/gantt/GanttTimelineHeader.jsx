import React from 'react';
import { formatDayHeader } from '../../lib/dateUtils';

export default function GanttTimelineHeader({
  rightGridWidth,
  timelineDays,
  totalTimelineDays,
  dayColWidth,
  isTodayInRange,
  todayOffsetDays,
  viewMode,
}) {
  /** Month label row — renders one label per month group */
  const renderMonthLabels = () => {
    const groups = [];
    timelineDays.forEach((day, idx) => {
      const isFirst    = idx === 0;
      const isNewMonth = !isFirst && day.getUTCMonth() !== timelineDays[idx - 1].getUTCMonth();
      if (isFirst || isNewMonth) {
        groups.push({ name: day.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }), idx });
      }
    });

    return groups.map((g, i) => {
      const left = g.idx * dayColWidth;
      // Width = pixels to next group (or end)
      const nextLeft = i + 1 < groups.length ? groups[i + 1].idx * dayColWidth : rightGridWidth;
      const width = nextLeft - left;
      return (
        <div
          key={i}
          className="absolute top-0 bottom-0 flex items-center pl-2 text-[11px] font-extrabold text-zinc-700 dark:text-zinc-200 border-l-2 border-zinc-300 dark:border-zinc-700 bg-zinc-100/80 dark:bg-zinc-800/80 select-none overflow-hidden"
          style={{ left, width }}
        >
          {g.name}
        </div>
      );
    });
  };

  return (
    <div style={{ width: `${rightGridWidth}px`, minWidth: `${rightGridWidth}px` }} className="flex-shrink-0 flex flex-col">
      {/* Month row */}
      <div className="h-5 relative border-b border-zinc-200 dark:border-zinc-800">
        {renderMonthLabels()}
      </div>

      {/* Day / Week / Month row */}
      <div className="flex h-8 relative">
        {timelineDays.map((day, idx) => {
          const { day: dayNum, weekday, isWeekend } = formatDayHeader(day);
          const isToday = isTodayInRange && idx === todayOffsetDays;

          // Week mode: only show label on Mondays
          if (viewMode === 'week' && day.getUTCDay() !== 1 && idx !== 0) {
            return (
              <div
                key={idx}
                style={{ width: `${dayColWidth}px`, flexShrink: 0 }}
                className={`border-l ${
                  isWeekend
                    ? 'border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-100/40 dark:bg-zinc-950/40'
                    : 'border-zinc-200/40 dark:border-zinc-800/40'
                }`}
              />
            );
          }

          // Month mode: only show label on 1st of month
          if (viewMode === 'month' && day.getUTCDate() !== 1 && idx !== 0) {
            return (
              <div
                key={idx}
                style={{ width: `${dayColWidth}px`, flexShrink: 0 }}
                className={isWeekend ? 'bg-zinc-100/30 dark:bg-zinc-950/30' : ''}
              />
            );
          }

          return (
            <div
              key={idx}
              style={{ width: `${dayColWidth}px`, flexShrink: 0 }}
              className={`flex flex-col items-center justify-center border-l select-none ${
                isToday
                  ? 'border-red-400 dark:border-red-500 bg-red-100 dark:bg-red-900/40'
                  : isWeekend
                  ? 'border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/60 dark:bg-zinc-950/60'
                  : 'border-zinc-200 dark:border-zinc-800'
              } ${day.getUTCDate() === 1 ? 'border-l-2 border-zinc-300 dark:border-zinc-700' : ''}`}
            >
              <span className={`text-[9px] font-semibold uppercase leading-none ${
                isToday ? 'text-red-500 dark:text-red-400' : 'text-zinc-400 dark:text-zinc-500'
              }`}>{weekday}</span>
              <span className={`text-[11px] font-bold leading-none mt-0.5 ${
                isToday
                  ? 'text-red-500 dark:text-red-400'
                  : isWeekend
                  ? 'text-zinc-400 dark:text-zinc-600'
                  : 'text-zinc-700 dark:text-zinc-300'
              }`}>{dayNum}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
