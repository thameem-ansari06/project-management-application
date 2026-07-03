import React, { useRef, useEffect } from 'react';
import { getAvatarColor, getCompletion, isMilestone } from './ganttUtils';
import { shiftDateStr } from '../../lib/dateUtils';
import { showDragTooltip } from './useGanttDrag';

function GanttTaskBar({
  task,
  dragState,
  setDragState,
  dayColWidth,
  offsetDays,
  durationDays,
  barColor,
  barBg,
  badgeBg,
  isBarCritical,
  showCritical,
  setSelectedTask,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  startXRef,
  deltaXRef,
  wbs,
}) {
  const barRef = useRef(null);

  const isPrimaryDrag   = dragState.taskId === task.id;
  const isCascading     = dragState.mode === 'move' && dragState.cascadingIds?.has(task.id);
  const isDragging      = isPrimaryDrag || isCascading;
  const canDrag         = !task.predecessor_id;

  const completion      = getCompletion(task);
  const milestone       = isMilestone(task, durationDays);

  // Pixel-based positioning (avoids % rounding gaps between bars and grid)
  const leftPx  = offsetDays * dayColWidth;
  const widthPx = Math.max(milestone ? dayColWidth : 2 * dayColWidth, durationDays * dayColWidth);

  const barStyle = {
    left:  `${leftPx}px`,
    width: milestone ? `${dayColWidth}px` : `${widthPx}px`,
    transition: isDragging ? 'opacity 0.15s' : undefined,
  };

  const completionFillRef = useRef(null);

  const localPointerMove = (e) => {
    handlePointerMove(e);
    if (isPrimaryDrag) {
      const deltaX = deltaXRef.current;
      const daysShifted = Math.round(deltaX / dayColWidth);
      const bEnd = task.end_date || task.due_date || task.start_date;
      let tText = '';

      if (dragState.mode === 'move' && barRef.current) {
        barRef.current.style.transform = `translateX(${deltaX}px)`;
        tText = `Start: ${shiftDateStr(task.start_date, daysShifted)}\nEnd: ${shiftDateStr(bEnd, daysShifted)}\nDuration: ${durationDays}d\nDelta: ${daysShifted > 0 ? '+' : ''}${daysShifted}d`;
      } else if (dragState.mode === 'resize-right' && barRef.current) {
        const newW = Math.max(dayColWidth, dragState.originalWidthPx + deltaX);
        barRef.current.style.width = `${newW}px`;
        const newEnd = shiftDateStr(bEnd, daysShifted);
        const newDur = Math.max(1, durationDays + daysShifted);
        tText = `End: ${newEnd}\nDuration: ${newDur}d\nDelta: ${daysShifted > 0 ? '+' : ''}${daysShifted}d`;
      } else if (dragState.mode === 'resize-left' && barRef.current) {
        const clamped = Math.min(deltaX, dragState.originalWidthPx - dayColWidth);
        barRef.current.style.left  = `${dragState.originalLeftPx + clamped}px`;
        barRef.current.style.width = `${Math.max(dayColWidth, dragState.originalWidthPx - clamped)}px`;
        const cDaysShifted = Math.round(clamped / dayColWidth);
        const newStart = shiftDateStr(task.start_date, cDaysShifted);
        const newDur = Math.max(1, durationDays - cDaysShifted);
        tText = `Start: ${newStart}\nDuration: ${newDur}d\nDelta: ${cDaysShifted > 0 ? '+' : ''}${cDaysShifted}d`;
      } else if (dragState.mode === 'progress' && completionFillRef.current) {
        const pDelta = (deltaX / widthPx) * 100;
        let newProg = completion + pDelta;
        newProg = Math.max(0, Math.min(100, Math.round(newProg / 5) * 5));
        completionFillRef.current.style.width = `${newProg}%`;
        tText = `Progress: ${newProg}%`;
      }

      if (tText) showDragTooltip(e.clientX, e.clientY + 20, tText);
    }
  };

  const localPointerUp = (e) => {
    if (barRef.current) {
      barRef.current.style.transform = 'none';
      barRef.current.style.left  = `${leftPx}px`;
      barRef.current.style.width = milestone ? `${dayColWidth}px` : `${widthPx}px`;
    }
    if (completionFillRef.current) {
      completionFillRef.current.style.width = `${completion}%`;
    }
    handlePointerUp(e, task);
  };

  useEffect(() => {
    const handleCancel = () => {
      if (!isDragging && barRef.current) {
        barRef.current.style.transform = 'none';
        barRef.current.style.left  = `${leftPx}px`;
        barRef.current.style.width = milestone ? `${dayColWidth}px` : `${widthPx}px`;
        if (completionFillRef.current) completionFillRef.current.style.width = `${completion}%`;
      }
    };
    window.addEventListener('gantt-drag-cancel', handleCancel);
    return () => window.removeEventListener('gantt-drag-cancel', handleCancel);
  }, [isDragging, leftPx, widthPx, milestone, dayColWidth, completion]);

  // ── Milestone diamond ──────────────────────────────────────────────────────
  if (milestone) {
    const size = 14;
    return (
      <div
        ref={barRef}
        className={`absolute flex items-center justify-center z-10 ${canDrag ? 'cursor-grab' : 'cursor-pointer'}`}
        style={{ ...barStyle, height: '100%' }}
        onPointerDown={canDrag ? (e) => handlePointerDown(e, task) : undefined}
        onPointerMove={canDrag ? localPointerMove : undefined}
        onPointerUp={canDrag ? localPointerUp : undefined}
        onClick={() => setSelectedTask(task)}
        title={`${task.title} (Milestone)`}
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
      onPointerDown={canDrag ? (e) => handlePointerDown(e, task) : undefined}
      onPointerMove={canDrag ? localPointerMove : undefined}
      onPointerUp={canDrag ? localPointerUp : undefined}
      className={`absolute flex items-center rounded-sm text-[10px] font-semibold text-white z-10 group/bar
        ${isDragging ? 'opacity-90 shadow-xl cursor-grabbing ring-2 ring-white/20' : canDrag ? 'cursor-grab hover:brightness-110' : 'cursor-pointer'}
        ${showCritical && !isBarCritical ? 'opacity-30' : ''}
        ${isBarCritical ? 'ring-2 ring-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)] z-20' : ''}
      `}
      style={{
        ...barStyle,
        height: '14px',
        top: '50%',
        transform: 'translateY(-50%)',
      }}
    >
      {/* Base background */}
      <div
        className={`absolute inset-0 rounded-sm ${isBarCritical ? 'bg-red-500' : barBg}`}
      />

      {/* Completion fill — darker stripe inside bar */}
      {completion > 0 && (
        <div
          className="absolute inset-0 rounded-sm overflow-hidden"
          style={{ pointerEvents: 'none' }}
        >
          <div
            ref={completionFillRef}
            className="h-full rounded-sm opacity-40 bg-black"
            style={{ width: `${completion}%` }}
          />
          {/* Hatching on the complete portion */}
          <div
            className="absolute top-0 left-0 h-full"
            style={{
              width: `${completion}%`,
              background: 'repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(255,255,255,0.15) 3px, rgba(255,255,255,0.15) 6px)',
            }}
          />
        </div>
      )}

      {/* Left resize handle */}
      {canDrag && (
        <div
          className="absolute left-0 top-0 bottom-0 w-3 cursor-w-resize z-20 hover:bg-white/20 rounded-l-sm flex justify-start"
          onPointerDown={(e) => {
            e.stopPropagation();
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
      <span className="relative z-10 truncate px-2 pointer-events-none select-none text-[9px] font-semibold drop-shadow-sm leading-none pt-0.5">
        {widthPx >= 60 ? task.title : ''}
      </span>

      {/* % complete label on right if room */}
      {completion > 0 && widthPx >= 90 && (
        <span className="relative z-10 ml-auto pr-2 text-[8px] font-bold text-white/80 pointer-events-none select-none leading-none pt-0.5">
          {completion}%
        </span>
      )}

      {/* Right resize handle */}
      {canDrag && (
        <div
          className="absolute right-0 top-0 bottom-0 w-3 cursor-e-resize z-20 hover:bg-white/20 rounded-r-sm flex justify-end"
          onPointerDown={(e) => {
            e.stopPropagation();
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
          className="absolute top-0 bottom-0 w-3 cursor-ew-resize z-30 opacity-0 group-hover/bar:opacity-100 transition-opacity flex items-center justify-center -ml-1.5"
          style={{ left: `${completion}%` }}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.currentTarget.setPointerCapture(e.pointerId);
            startXRef.current = e.clientX;
            deltaXRef.current = 0;
            setDragState({
              taskId: task.id, mode: 'progress',
              originalLeftPx: leftPx, originalWidthPx: widthPx, isDragging: true, originalTask: { ...task }
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

      {/* Hover tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 hidden group-hover/bar:flex flex-col bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-xs rounded-xl p-4 shadow-xl border border-zinc-200 dark:border-zinc-700 z-[999] pointer-events-none">
        <div className="font-bold text-sm border-b border-zinc-200 dark:border-zinc-800 pb-1.5 mb-2 truncate">{task.title}</div>
        {wbs && <div className="text-[10px] text-zinc-400 mb-1 font-mono">WBS {wbs}</div>}
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between"><span className="text-zinc-400">Status:</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${badgeBg}`}>{task.status}</span>
          </div>
          <div className="flex justify-between"><span className="text-zinc-400">Start:</span><span className="font-medium">{task.start_date}</span></div>
          <div className="flex justify-between"><span className="text-zinc-400">Due:</span><span className="font-medium">{task.end_date || '—'}</span></div>
          <div className="flex justify-between"><span className="text-zinc-400">Duration:</span><span className="font-bold text-blue-500">{durationDays}d</span></div>
          {completion > 0 && (
            <div className="flex justify-between"><span className="text-zinc-400">Complete:</span><span className="font-bold text-emerald-500">{completion}%</span></div>
          )}
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white dark:border-t-zinc-900" />
      </div>

      {/* Assignee avatar */}
      {(() => {
        const name = task.assignee?.name || task.assignees?.[0]?.name;
        return (
          <div
            className="absolute top-1/2 -translate-y-1/2 -right-6 z-20 cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
          >
            {name ? (
              <div
                className="w-5 h-5 rounded-full border-2 border-white dark:border-zinc-700 text-white font-bold text-[9px] flex items-center justify-center shadow hover:scale-110 transition-transform"
                style={{ backgroundColor: getAvatarColor(name) }}
              >
                {name.charAt(0).toUpperCase()}
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-dashed border-zinc-400 dark:border-zinc-600 flex items-center justify-center hover:border-blue-400 transition-colors bg-white/10">
                <span className="text-zinc-400 text-[9px] font-bold">+</span>
              </div>
            )}
          </div>
        );
      })()}
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
  
  if (prev.dayColWidth !== next.dayColWidth) return false;
  if (prev.offsetDays !== next.offsetDays) return false;
  if (prev.durationDays !== next.durationDays) return false;
  if (prev.isBarCritical !== next.isBarCritical) return false;
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
