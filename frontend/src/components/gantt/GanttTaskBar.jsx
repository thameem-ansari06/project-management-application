import React, { useRef, useEffect, useId, useState } from 'react';
import {
  getAvatarColor,
  getCompletion,
  getSnappedResizeGeometry,
  getTaskBarWidthPx,
  isMilestone,
} from './ganttUtils';
import { shiftDateStr } from '../../lib/dateUtils';
import { normalizeTaskDependencies } from '../../lib/taskDependencyUtils';
import { showDragTooltip } from './useGanttDrag';
import GanttTaskTooltip from './GanttTaskTooltip';

function GanttTaskBar({
  task,
  dragState,
  setDragState,
  dayColWidth,
  offsetDays,
  durationDays,
  barBg,
  isBarCritical,
  showCritical,
  setSelectedTask,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  startXRef,
  deltaXRef,
  openAssigneePicker,
  wbs,
}) {
  const barRef = useRef(null);
  const dragFrameRef = useRef(null);
  const latestPointerRef = useRef(null);
  const suppressDetailsUntilRef = useRef(0);
  const [tooltipAnchor, setTooltipAnchor] = useState(null);
  const tooltipId = useId();

  const isPrimaryDrag   = dragState.taskId === task.id;
  const isCascading     = dragState.mode === 'move' && dragState.cascadingIds?.has(task.id);
  const isDragging      = isPrimaryDrag || isCascading;
  const canDrag         = normalizeTaskDependencies(task).length === 0;

  const completion      = getCompletion(task);
  const milestone       = isMilestone(task, durationDays);

  // Pixel-based positioning (avoids % rounding gaps between bars and grid)
  const leftPx  = offsetDays * dayColWidth;
  const widthPx = getTaskBarWidthPx(durationDays, dayColWidth, milestone);

  const barStyle = {
    left:  `${leftPx}px`,
    width: milestone ? `${dayColWidth}px` : `${widthPx}px`,
    transition: isDragging ? 'opacity 0.15s' : undefined,
  };

  const completionFillRef = useRef(null);
  const progressHandleRef = useRef(null);

  const showTaskTooltip = () => {
    if (!isDragging && barRef.current) setTooltipAnchor(barRef.current.getBoundingClientRect());
  };

  const hideTaskTooltip = () => setTooltipAnchor(null);

  const openTaskDetails = (event) => {
    event.stopPropagation();
    if (Date.now() < suppressDetailsUntilRef.current) return;
    setSelectedTask(task);
  };

  const handleTaskBarKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openTaskDetails(event);
    }
  };

  const paintDragFrame = () => {
    dragFrameRef.current = null;
    if (isPrimaryDrag && latestPointerRef.current) {
      const { clientX, clientY } = latestPointerRef.current;
      const deltaX = deltaXRef.current;
      const daysShifted = Math.round(deltaX / dayColWidth);
      const bEnd = task.end_date || task.due_date || task.start_date;
      let tText = '';

      if (dragState.mode === 'move' && barRef.current) {
        const snappedDeltaX = daysShifted * dayColWidth;
        barRef.current.style.transform = 'translate3d(0, -50%, 0)';
        barRef.current.style.left = `${leftPx + snappedDeltaX}px`;
        barRef.current.style.width = `${widthPx}px`;
        tText = `Start: ${shiftDateStr(task.start_date, daysShifted)}\nEnd: ${shiftDateStr(bEnd, daysShifted)}\nDuration: ${durationDays}d\nDelta: ${daysShifted > 0 ? '+' : ''}${daysShifted}d`;
      } else if (dragState.mode === 'resize-right' && barRef.current) {
        const preview = getSnappedResizeGeometry({
          mode: dragState.mode, durationDays, dayColWidth, leftPx, deltaX,
        });
        barRef.current.style.width = `${preview.widthPx}px`;
        const newEnd = shiftDateStr(bEnd, preview.daysShifted);
        tText = `End: ${newEnd}\nDuration: ${preview.durationDays}d\nDelta: ${preview.daysShifted > 0 ? '+' : ''}${preview.daysShifted}d`;
      } else if (dragState.mode === 'resize-left' && barRef.current) {
        const preview = getSnappedResizeGeometry({
          mode: dragState.mode, durationDays, dayColWidth, leftPx, deltaX,
        });
        barRef.current.style.left = `${preview.leftPx}px`;
        barRef.current.style.width = `${preview.widthPx}px`;
        const newStart = shiftDateStr(task.start_date, preview.daysShifted);
        tText = `Start: ${newStart}\nDuration: ${preview.durationDays}d\nDelta: ${preview.daysShifted > 0 ? '+' : ''}${preview.daysShifted}d`;
      } else if (dragState.mode === 'progress' && completionFillRef.current) {
        const pDelta = (deltaX / widthPx) * 100;
        let newProg = completion + pDelta;
        newProg = Math.max(0, Math.min(100, Math.round(newProg / 5) * 5));
        completionFillRef.current.style.width = `${newProg}%`;
        if (progressHandleRef.current) progressHandleRef.current.style.left = `${newProg}%`;
        tText = `Progress: ${newProg}%`;
      }

      if (tText) showDragTooltip(clientX, clientY + 20, tText);
    }
  };

  const localPointerMove = (e) => {
    e.stopPropagation();
    handlePointerMove(e);
    latestPointerRef.current = { clientX: e.clientX, clientY: e.clientY };
    if (!dragFrameRef.current) dragFrameRef.current = requestAnimationFrame(paintDragFrame);
  };

  const localPointerUp = (e) => {
    e.stopPropagation();
    const wasManipulation = dragState.mode !== 'move' || Math.abs(deltaXRef.current) > 3;
    if (wasManipulation) suppressDetailsUntilRef.current = Date.now() + 500;
    if (dragFrameRef.current) cancelAnimationFrame(dragFrameRef.current);
    dragFrameRef.current = null;
    latestPointerRef.current = null;
    if (barRef.current) {
      barRef.current.style.transform = 'translate3d(0, -50%, 0)';
      if (dragState.mode === 'resize-left' || dragState.mode === 'resize-right') {
        const finalPreview = getSnappedResizeGeometry({
          mode: dragState.mode,
          durationDays,
          dayColWidth,
          leftPx,
          deltaX: deltaXRef.current,
        });
        barRef.current.style.left = `${finalPreview.leftPx}px`;
        barRef.current.style.width = `${finalPreview.widthPx}px`;
      } else if (dragState.mode === 'move') {
        const snappedDeltaX = Math.round(deltaXRef.current / dayColWidth) * dayColWidth;
        barRef.current.style.left = `${leftPx + snappedDeltaX}px`;
        barRef.current.style.width = `${widthPx}px`;
      } else {
        barRef.current.style.left = `${leftPx}px`;
        barRef.current.style.width = `${widthPx}px`;
      }
    }
    if (completionFillRef.current) {
      completionFillRef.current.style.width = `${completion}%`;
    }
    if (progressHandleRef.current) progressHandleRef.current.style.left = `${completion}%`;
    handlePointerUp(e, task);
  };

  useEffect(() => {
    const handleCancel = () => {
      if (!isDragging && barRef.current) {
        barRef.current.style.transform = 'translate3d(0, -50%, 0)';
        barRef.current.style.left  = `${leftPx}px`;
        barRef.current.style.width = milestone ? `${dayColWidth}px` : `${widthPx}px`;
        if (completionFillRef.current) completionFillRef.current.style.width = `${completion}%`;
        if (progressHandleRef.current) progressHandleRef.current.style.left = `${completion}%`;
      }
    };
    window.addEventListener('gantt-drag-cancel', handleCancel);
    return () => {
      window.removeEventListener('gantt-drag-cancel', handleCancel);
      if (dragFrameRef.current) cancelAnimationFrame(dragFrameRef.current);
    };
  }, [isDragging, leftPx, widthPx, milestone, dayColWidth, completion]);

  // ── Milestone diamond ──────────────────────────────────────────────────────
  if (milestone) {
    const size = 14;
    return (
      <div
        ref={barRef}
        className={`gantt-task-bar absolute flex items-center justify-center z-10 ${canDrag ? 'cursor-grab' : 'cursor-pointer'}`}
        style={{ ...barStyle, height: '100%' }}
        onPointerDown={canDrag ? (e) => { hideTaskTooltip(); handlePointerDown(e, task); } : undefined}
        onPointerMove={canDrag ? localPointerMove : undefined}
        onPointerUp={canDrag ? localPointerUp : undefined}
        onPointerEnter={showTaskTooltip}
        onPointerLeave={hideTaskTooltip}
        onFocus={showTaskTooltip}
        onBlur={hideTaskTooltip}
        onDoubleClick={openTaskDetails}
        onKeyDown={handleTaskBarKeyDown}
        tabIndex={0}
        aria-label={`${task.title}, milestone`}
        aria-describedby={tooltipAnchor ? tooltipId : undefined}
      >
        <div
          style={{
            width: size, height: size,
            background: isBarCritical ? '#ef4444' : '#8b5cf6',
            transform: 'rotate(45deg)',
            borderRadius: 2,
          }}
        />
        <span className="absolute left-full ml-2 text-[10px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap font-medium pointer-events-none">
          {task.title}
        </span>
        <GanttTaskTooltip
          task={task}
          anchorRect={tooltipAnchor}
          durationDays={durationDays}
          progress={completion}
          tooltipId={tooltipId}
          wbs={wbs}
        />
      </div>
    );
  }

  return (
    <>
    {isDragging && (
      <div
        className={`absolute rounded-sm border border-dashed border-zinc-400 dark:border-zinc-500 z-0 pointer-events-none ${barBg}`}
        style={{
          left: `${leftPx}px`,
          width: milestone ? `${dayColWidth}px` : `${widthPx}px`,
          height: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: 0.35,
        }}
      />
    )}
    <div
      ref={barRef}
      onPointerDown={canDrag ? (e) => { hideTaskTooltip(); handlePointerDown(e, task); } : undefined}
      onPointerMove={canDrag ? localPointerMove : undefined}
      onPointerUp={canDrag ? localPointerUp : undefined}
      onPointerEnter={showTaskTooltip}
      onPointerLeave={hideTaskTooltip}
      onFocus={showTaskTooltip}
      onBlur={hideTaskTooltip}
      onDoubleClick={openTaskDetails}
      onKeyDown={handleTaskBarKeyDown}
      tabIndex={0}
      aria-label={`${task.title}, ${completion}% complete`}
      aria-describedby={tooltipAnchor ? tooltipId : undefined}
      data-dragging={isDragging}
      className={`gantt-task-bar absolute flex items-center rounded pl-2 pr-3 text-[10px] font-semibold text-white z-10 group/bar
        ${isDragging ? 'opacity-90 shadow-xl cursor-grabbing ring-2 ring-white/20' : canDrag ? 'cursor-grab hover:brightness-110' : 'cursor-pointer'}
        ${showCritical && !isBarCritical ? 'opacity-30' : ''}
        ${isBarCritical ? 'ring-2 ring-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)] z-20' : ''}
      `}
      style={{
        ...barStyle,
        height: '18px',
        top: '50%',
        transform: 'translate3d(0, -50%, 0)',
      }}
    >
      {/* Base background */}
      <div
        className={`gantt-task-bar__surface absolute inset-0 rounded ${isBarCritical ? 'bg-red-500' : barBg}`}
      />

      {/* Completion fill — darker stripe inside bar */}
      <div
        className="absolute inset-0 overflow-hidden rounded pointer-events-none"
        aria-hidden="true"
      >
          <div
            ref={completionFillRef}
            className="h-full overflow-hidden rounded-l bg-zinc-950/35 shadow-[inset_-1px_0_rgba(255,255,255,0.45)]"
            style={{ width: `${completion}%`, willChange: isPrimaryDrag ? 'width' : 'auto' }}
          >
            <div
              className="h-full w-full"
              style={{
              background: 'repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(255,255,255,0.15) 3px, rgba(255,255,255,0.15) 6px)',
              }}
            />
          </div>
      </div>

      {/* Left resize handle */}
      {canDrag && (
        <div
          className="absolute left-0 top-0 bottom-0 w-3 cursor-w-resize z-20 hover:bg-white/20 rounded-l-sm flex justify-start"
          onPointerDown={(e) => {
            e.stopPropagation();
            hideTaskTooltip();
            e.currentTarget.setPointerCapture(e.pointerId);
            startXRef.current = e.clientX;
            deltaXRef.current = 0;
            setDragState({
              taskId: task.id, mode: 'resize-left',
              originalLeftPx: leftPx, originalWidthPx: widthPx, isDragging: true,
            });
          }}
          onPointerMove={localPointerMove}
          onPointerUp={localPointerUp}
        >
          <div className="w-[2px] h-full bg-white/30 ml-[1px]" />
        </div>
      )}

      {/* Task label */}
      <span className="relative z-10 min-w-0 flex-1 truncate pointer-events-none select-none text-[9px] font-semibold drop-shadow-sm leading-none pt-0.5">
        {widthPx >= 60 ? task.title : ''}
      </span>

      {/* % complete label on right if room */}
      {completion > 0 && widthPx >= 90 && (
        <span className="relative z-10 ml-auto mr-1 flex-shrink-0 text-[8px] font-bold text-white/80 pointer-events-none select-none leading-none pt-0.5">
          {completion}%
        </span>
      )}

      {/* Keep the assignee control inside the bar so it cannot overflow or deform. */}
      {widthPx >= 36 && (() => {
        const name = task.assignee?.name || task.assignees?.[0]?.name;
        return (
          <button
            type="button"
            className="relative z-10 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-white/80 text-[8px] font-bold text-white shadow-sm transition-transform hover:scale-110 dark:border-zinc-700"
            style={{ backgroundColor: name ? getAvatarColor(name) : 'rgba(24, 24, 27, 0.65)' }}
            onClick={(event) => {
              event.stopPropagation();
              openAssigneePicker?.(event, task.id);
            }}
            onDoubleClick={openTaskDetails}
            aria-label={name ? `Assigned to ${name}` : `Assign ${task.title}`}
            title={name || 'Assign task'}
          >
            {name ? name.charAt(0).toUpperCase() : '+'}
          </button>
        );
      })()}

      {/* Right resize handle */}
      {canDrag && (
        <div
          className="absolute right-0 top-0 bottom-0 w-3 cursor-e-resize z-20 hover:bg-white/20 rounded-r-sm flex justify-end"
          onPointerDown={(e) => {
            e.stopPropagation();
            hideTaskTooltip();
            e.currentTarget.setPointerCapture(e.pointerId);
            startXRef.current = e.clientX;
            deltaXRef.current = 0;
            setDragState({
              taskId: task.id, mode: 'resize-right',
              originalLeftPx: leftPx, originalWidthPx: widthPx, isDragging: true,
            });
          }}
          onPointerMove={localPointerMove}
          onPointerUp={localPointerUp}
        >
          <div className="w-[2px] h-full bg-white/30 mr-[1px]" />
        </div>
      )}

      {/* Progress slider handle */}
      {canDrag && (
        <div
          ref={progressHandleRef}
          className="absolute top-0 bottom-0 w-3 cursor-ew-resize z-30 opacity-0 group-hover/bar:opacity-100 transition-opacity flex items-center justify-center -ml-1.5"
          style={{ left: `${completion}%` }}
          onPointerDown={(e) => {
            e.stopPropagation();
            hideTaskTooltip();
            e.currentTarget.setPointerCapture(e.pointerId);
            startXRef.current = e.clientX;
            deltaXRef.current = 0;
            setDragState({
              taskId: task.id, mode: 'progress',
              originalLeftPx: leftPx, originalWidthPx: widthPx, isDragging: true, originalTask: { ...task, progress: completion }
            });
          }}
          onPointerMove={localPointerMove}
          onPointerUp={localPointerUp}
        >
          <div className="w-1.5 h-3.5 bg-white border border-zinc-400 rounded-sm shadow-sm" />
        </div>
      )}

      {/* Assignee name label (outside bar, right) */}
      <span className="absolute left-full ml-7 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 dark:text-zinc-500 whitespace-nowrap pointer-events-none hidden group-hover/bar:block">
        {task.assignee?.name || task.assignees?.[0]?.name || ''}
      </span>

      <GanttTaskTooltip
        task={task}
        anchorRect={tooltipAnchor}
        durationDays={durationDays}
        progress={completion}
        tooltipId={tooltipId}
        wbs={wbs}
      />

    </div>
    </>
  );
}

export default React.memo(GanttTaskBar, (prev, next) => {
  if (prev.task.id !== next.task.id) return false;
  if (prev.task.title !== next.task.title) return false;
  if (prev.task.start_date !== next.task.start_date) return false;
  if (prev.task.end_date !== next.task.end_date) return false;
  if (prev.task.due_date !== next.task.due_date) return false;
  if (prev.task.status !== next.task.status) return false;
  if (prev.task.progress !== next.task.progress) return false;
  if (prev.task.dependencies !== next.task.dependencies) return false;
  if (prev.task.predecessors !== next.task.predecessors) return false;
  
  if (prev.dayColWidth !== next.dayColWidth) return false;
  if (prev.offsetDays !== next.offsetDays) return false;
  if (prev.durationDays !== next.durationDays) return false;
  if (prev.isBarCritical !== next.isBarCritical) return false;
  if (prev.showCritical !== next.showCritical) return false;
  if (prev.wbs !== next.wbs) return false;

  const wasDragging = prev.dragState.taskId === prev.task.id || (prev.dragState.cascadingIds && prev.dragState.cascadingIds.has(prev.task.id));
  const isDragging  = next.dragState.taskId === next.task.id || (next.dragState.cascadingIds && next.dragState.cascadingIds.has(next.task.id));
  if (wasDragging !== isDragging) return false;
  
  if (isDragging) {
    if (prev.dragState.mode !== next.dragState.mode) return false;
  }

  const prevAssignee = prev.task.assignee?.name || prev.task.assignees?.[0]?.name;
  const nextAssignee = next.task.assignee?.name || next.task.assignees?.[0]?.name;
  if (prevAssignee !== nextAssignee) return false;

  return true;
});
