import React, { useState, useEffect, useRef } from 'react';
import { ROW_H } from './ganttUtils';

const highlightText = (text, highlight) => {
  if (!highlight || !highlight.trim()) return text;
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/60 text-zinc-900 dark:text-zinc-100 rounded-sm px-0.5">{part}</mark> : part
  );
};

export function GanttLeftPanelHeader() {
  return (
    <div
      style={{ width: 'var(--left-col-width)', minWidth: 'var(--left-col-width)' }}
      className="flex-shrink-0 sticky left-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 z-50 flex flex-col justify-end py-1"
    >
      <div className="grid text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-0"
        style={{ gridTemplateColumns: '2rem 1fr 3.5rem 4.5rem 4.5rem' }}
      >
        <span className="pl-2 text-center">#</span>
        <span className="pl-2">Name</span>
        <span className="text-center">Dur.</span>
        <span className="text-center">Start</span>
        <span className="text-center">Finish</span>
      </div>
    </div>
  );
}

export const GanttLeftPanelRow = React.memo(function GanttLeftPanelRow({
  task,
  isParentTask,
  isChildTask,
  isCollapsed,
  durationDays,
  setCollapsedRows,
  wbs,
  isSelected,
  searchQuery = '',
  isEditing,
  setEditingTaskId,
  onRenameTask,
}) {
  const depth = task._depth ?? (isChildTask ? 1 : 0);
  const [editValue, setEditValue] = useState(task.title);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing) setEditValue(task.title);
  }, [isEditing, task.title]);

  const handleSave = () => {
    if (editValue.trim() && editValue !== task.title) {
      onRenameTask(task.id, editValue.trim());
    }
    setEditingTaskId(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(task.title);
      setEditingTaskId(null);
    }
  };

  return (
    <div
      style={{ width: 'var(--left-col-width)', minWidth: 'var(--left-col-width)', height: `${ROW_H}px` }}
      className={`flex-shrink-0 sticky left-0 border-r border-b border-zinc-200 dark:border-zinc-800 z-20 transition-colors cursor-pointer ${
        isSelected 
          ? 'bg-blue-50 dark:bg-blue-900/30 border-l-[3px] border-l-blue-500' 
          : 'bg-white dark:bg-zinc-900 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 border-l-[3px] border-l-transparent'
      }`}
    >
      <div
        className="grid items-center h-full"
        style={{ gridTemplateColumns: '2rem 1fr 3.5rem 4.5rem 4.5rem' }}
      >
        {/* WBS number */}
        <span className="text-[9px] text-zinc-300 dark:text-zinc-600 font-mono text-center px-1 truncate">
          {wbs || ''}
        </span>

        {/* Name cell */}
        <div
          className="flex items-center gap-1 min-w-0 overflow-hidden pr-1"
          style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
          title={task.title}
        >
          {isParentTask && (
            <button
              className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors rounded cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setCollapsedRows(prev => {
                  const next = new Set(prev);
                  next.has(task.id) ? next.delete(task.id) : next.add(task.id);
                  return next;
                });
              }}
            >
              <span className="text-[8px] leading-none select-none">{isCollapsed ? '▶' : '▼'}</span>
            </button>
          )}
          {isChildTask && !isParentTask && (
            <span className="text-zinc-300 dark:text-zinc-700 text-[9px] mr-0.5 flex-shrink-0">└</span>
          )}
          {isEditing ? (
            <input
              ref={inputRef}
              autoFocus
              className="flex-1 min-w-0 bg-white dark:bg-zinc-800 border border-blue-500 rounded px-1 text-[11px] font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-500/50"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : (
            <span 
              className={`truncate text-[11px] select-none ${
                isParentTask
                  ? 'font-bold text-zinc-900 dark:text-zinc-100'
                  : 'font-medium text-zinc-700 dark:text-zinc-300'
              }`}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingTaskId(task.id);
              }}
            >
              {searchQuery ? highlightText(task.title, searchQuery) : task.title}
            </span>
          )}
        </div>

        {/* Duration */}
        <span className="text-zinc-400 dark:text-zinc-500 text-[11px] text-center tabular-nums">{durationDays}d</span>
        {/* Start */}
        <span className="text-zinc-400 dark:text-zinc-500 text-[11px] text-center tabular-nums">
          {task.start_date ? task.start_date.slice(5) : '—'}
        </span>
        {/* Finish */}
        <span className="text-zinc-400 dark:text-zinc-500 text-[11px] text-center tabular-nums">
          {task.end_date ? task.end_date.slice(5) : '—'}
        </span>
      </div>
    </div>
  );
}, (prev, next) => {
  if (prev.task.id !== next.task.id) return false;
  if (prev.task.title !== next.task.title) return false;
  if (prev.task.start_date !== next.task.start_date) return false;
  if (prev.task.end_date !== next.task.end_date) return false;
  
  if (prev.isParentTask !== next.isParentTask) return false;
  if (prev.isChildTask !== next.isChildTask) return false;
  if (prev.isCollapsed !== next.isCollapsed) return false;
  if (prev.durationDays !== next.durationDays) return false;
  if (prev.wbs !== next.wbs) return false;
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.searchQuery !== next.searchQuery) return false;
  if (prev.isEditing !== next.isEditing) return false;

  return true;
});
