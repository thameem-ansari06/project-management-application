import React, { useRef } from 'react';
import { parseDate, getDiffDays } from '../../lib/dateUtils';
import { ROW_H, getCompletion } from './ganttUtils';

function GanttSummaryBracket({
  task,
  taskStart,
  taskDue,
  earliestDate,
  dayColWidth,
  isTaskCritical,
  dragState,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  startXRef,
  deltaXRef,
}) {
  const bracketRef = useRef(null);

  // Compute bracket span from children
  const children = [...(task.children || []), ...(task.subtasks || [])];
  let bracketStart = taskStart;
  let bracketEnd   = taskDue;

  children.forEach(child => {
    const cs = parseDate(child.start_date);
    const ce = child.end_date ? parseDate(child.end_date) : cs ? new Date(cs) : null;
    if (cs && cs < bracketStart) bracketStart = cs;
    if (ce && ce > bracketEnd)   bracketEnd   = ce;
  });

  const offsetDays   = Math.max(0, getDiffDays(bracketStart, earliestDate));
  const durationDays = Math.max(1, getDiffDays(bracketEnd, bracketStart) + 1);
  const leftPx  = offsetDays   * dayColWidth;
  const widthPx = durationDays * dayColWidth;

  const completion = getCompletion(task);
  const isPrimary  = dragState?.taskId === task.id;
  const canDrag    = !task.predecessor_id;

  const localPointerMove = (e) => {
    handlePointerMove(e);
    if (bracketRef.current && isPrimary && dragState?.mode === 'move') {
      bracketRef.current.style.transform = `translateX(${deltaXRef.current}px)`;
    }
  };
  const localPointerUp = (e) => {
    if (bracketRef.current) bracketRef.current.style.transform = 'none';
    handlePointerUp(e, task);
  };

  const color = isTaskCritical ? '#ef4444' : '#71717a';

  return (
    <div
      ref={bracketRef}
      onPointerDown={canDrag ? (e) => handlePointerDown(e, task) : undefined}
      onPointerMove={canDrag ? localPointerMove : undefined}
      onPointerUp={canDrag ? localPointerUp : undefined}
      className={`absolute z-10 ${canDrag ? 'cursor-grab' : ''}`}
      style={{
        left: `${leftPx}px`,
        width: `${widthPx}px`,
        top: '50%',
        transform: 'translateY(-50%)',
        height: '18px',
        minWidth: '16px',
      }}
    >
      {/* SVG bracket shape — Project Libre style */}
      <svg
        width={widthPx}
        height="18"
        style={{ overflow: 'visible', display: 'block' }}
      >
        {/* Top bar */}
        <rect x="0" y="2" width={widthPx} height="4" rx="1" fill={color} />

        {/* Completion fill on top bar */}
        {completion > 0 && (
          <rect
            x="0" y="2"
            width={widthPx * (completion / 100)}
            height="4" rx="1"
            fill={isTaskCritical ? '#fca5a5' : '#a1a1aa'}
            opacity="0.7"
          />
        )}

        {/* Left wing (downward arrow) */}
        <polygon points={`0,6 5,6 0,14`} fill={color} />
        {/* Right wing (downward arrow) */}
        <polygon points={`${widthPx},6 ${widthPx - 5},6 ${widthPx},14`} fill={color} />
      </svg>

      {/* Drag handle overlay */}
      {canDrag && (
        <div
          className="absolute inset-0 cursor-grab"
          onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, task); }}
          onPointerMove={localPointerMove}
          onPointerUp={localPointerUp}
        />
      )}
    </div>
  );
}

export default React.memo(GanttSummaryBracket, (prev, next) => {
  if (prev.task.id !== next.task.id) return false;
  if (prev.task.status !== next.task.status) return false;
  if (prev.task.progress !== next.task.progress) return false;
  
  if (prev.taskStart?.getTime() !== next.taskStart?.getTime()) return false;
  if (prev.taskDue?.getTime() !== next.taskDue?.getTime()) return false;
  
  if (prev.earliestDate?.getTime() !== next.earliestDate?.getTime()) return false;
  if (prev.dayColWidth !== next.dayColWidth) return false;
  if (prev.isTaskCritical !== next.isTaskCritical) return false;

  const wasDragging = prev.dragState?.taskId === prev.task.id;
  const isDragging  = next.dragState?.taskId === next.task.id;
  if (wasDragging !== isDragging) return false;

  if (isDragging && prev.dragState.mode !== next.dragState.mode) return false;

  if (prev.task.children !== next.task.children) return false;
  if (prev.task.subtasks !== next.task.subtasks) return false;

  return true;
});
