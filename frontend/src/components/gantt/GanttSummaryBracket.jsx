import React, { useRef } from 'react';
import { parseDate, getDiffDays } from '../../lib/dateUtils';
import { normalizeTaskDependencies } from '../../lib/taskDependencyUtils';
import { getCompletion } from './ganttUtils';

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
  deltaXRef,
  setSelectedTask,
}) {
  const bracketRef = useRef(null);
  const suppressDetailsUntilRef = useRef(0);

  // Compute bracket span from children
  const children = [...(task.children || []), ...(task.subtasks || [])];
  let bracketStart = taskStart;
  let bracketEnd   = taskDue;

  children.forEach(child => {
    const cs = parseDate(child.start_date);
    const childFinish = child.end_date || child.due_date;
    const ce = childFinish ? parseDate(childFinish) : cs ? new Date(cs) : null;
    if (cs && cs < bracketStart) bracketStart = cs;
    if (ce && ce > bracketEnd)   bracketEnd   = ce;
  });

  const offsetDays   = Math.max(0, getDiffDays(bracketStart, earliestDate));
  const durationDays = Math.max(1, getDiffDays(bracketEnd, bracketStart) + 1);
  const leftPx  = offsetDays   * dayColWidth;
  const widthPx = durationDays * dayColWidth;

  const completion = getCompletion(task);
  const isPrimary  = dragState?.taskId === task.id;
  const canDrag    = normalizeTaskDependencies(task).length === 0;

  const localPointerMove = (e) => {
    e.stopPropagation();
    handlePointerMove(e);
    if (bracketRef.current && isPrimary && dragState?.mode === 'move') {
      const snappedDeltaX = Math.round(deltaXRef.current / dayColWidth) * dayColWidth;
      bracketRef.current.style.transform = 'translate3d(0, -50%, 0)';
      bracketRef.current.style.left = `${leftPx + snappedDeltaX}px`;
      bracketRef.current.style.width = `${widthPx}px`;
    }
  };
  const localPointerUp = (e) => {
    e.stopPropagation();
    if (Math.abs(deltaXRef.current) > 3) suppressDetailsUntilRef.current = Date.now() + 500;
    if (bracketRef.current) {
      const snappedDeltaX = Math.round(deltaXRef.current / dayColWidth) * dayColWidth;
      bracketRef.current.style.transform = 'translate3d(0, -50%, 0)';
      bracketRef.current.style.left = `${leftPx + snappedDeltaX}px`;
      bracketRef.current.style.width = `${widthPx}px`;
    }
    handlePointerUp(e, task);
  };

  const openTaskDetails = (event) => {
    event.stopPropagation();
    if (Date.now() < suppressDetailsUntilRef.current) return;
    setSelectedTask?.(task);
  };

  const color = isTaskCritical ? '#ef4444' : '#71717a';

  return (
    <div
      ref={bracketRef}
      onPointerDown={canDrag ? (e) => handlePointerDown(e, task) : undefined}
      onPointerMove={canDrag ? localPointerMove : undefined}
      onPointerUp={canDrag ? localPointerUp : undefined}
      onDoubleClick={openTaskDetails}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openTaskDetails(event);
        }
      }}
      tabIndex={0}
      aria-label={`${task.title}, summary task`}
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
  if (prev.task.dependencies !== next.task.dependencies) return false;
  if (prev.task.predecessors !== next.task.predecessors) return false;
  
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
