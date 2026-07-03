import React, { useState, useRef, useEffect, useCallback, useMemo, useDeferredValue } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';

import { parseDate, getDiffDays } from '../lib/dateUtils';
import {
  DAY_COL_WIDTHS, getStatusTheme, getFlattenedTasks,
  ROW_H, buildWbsMap, isMilestone,
} from '../components/gantt/ganttUtils';
import useGanttDrag from '../components/gantt/useGanttDrag';
import useArrowPaths from '../components/gantt/useArrowPaths';

import GanttEmptyState       from '../components/gantt/GanttEmptyState';
import GanttHeader, { GanttControls } from '../components/gantt/GanttHeader';
import GanttTimelineHeader   from '../components/gantt/GanttTimelineHeader';
import { GanttLeftPanelHeader, GanttLeftPanelRow } from '../components/gantt/GanttLeftPanel';
import GanttSummaryBracket   from '../components/gantt/GanttSummaryBracket';
import GanttTaskBar          from '../components/gantt/GanttTaskBar';
import GanttArrowOverlay     from '../components/gantt/GanttArrowOverlay';
import GanttGridOverlay      from '../components/gantt/GanttGridOverlay';
import GanttAssigneePicker   from '../components/gantt/GanttAssigneePicker';


export default function GanttChart() {
  const {
    tasks, setTasks, selectedTask, setSelectedTask,
    workspaceMembers = [], selectedProjectId, selectedSpace,
  } = useOutletContext();

  const [leftColWidth, setLeftColWidth] = useState(() => {
    const saved = localStorage.getItem('ganttLeftColWidth');
    return saved ? parseInt(saved, 10) : 260;
  });

  useEffect(() => {
    localStorage.setItem('ganttLeftColWidth', leftColWidth);
  }, [leftColWidth]);

  const [isResetting, setIsResetting] = useState(false);

  const handleSplitterDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startW = leftColWidth;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (me) => {
      let newW = startW + (me.clientX - startX);
      newW = Math.max(200, Math.min(800, newW));
      setLeftColWidth(newW);
    };

    const onUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [leftColWidth]);

  const handleSplitterDoubleClick = useCallback(() => {
    setIsResetting(true);
    setLeftColWidth(260);
    setTimeout(() => setIsResetting(false), 150);
  }, []);

  const scrollContainerRef = useRef(null);
  const rightGridRef        = useRef(null);

  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);

  const [viewMode,     setViewMode]     = useState('day');
  const [showCritical, setShowCritical] = useState(false);
  const [collapsedRows, setCollapsedRows] = useState(new Set());
  const [assigneePicker, setAssigneePicker] = useState({ taskId: null, x: 0, y: 0 });
  const [pickerSearch,  setPickerSearch]  = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);

  const [dragState, setDragState] = useState({
    taskId: null, mode: 'move',
    originalLeftPx: 0, originalWidthPx: 0, isDragging: false,
    cascadingIds: null,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // â”€â”€ Derived task lists â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const flatTasks = useMemo(() => getFlattenedTasks(tasks), [tasks]);
  const wbsMap    = useMemo(() => buildWbsMap(tasks), [tasks]);

  // Tasks with valid start date
  const validTasks = useMemo(() => flatTasks.filter(t => t.start_date), [flatTasks]);

  // Hide children of collapsed parents, UNLESS search is active
  const visibleTasks = useMemo(() => {
    if (!deferredSearchQuery.trim()) {
      return validTasks.filter(task => {
        if (task.parent_id != null && collapsedRows.has(task.parent_id)) return false;
        if (task.parent_task_id != null && collapsedRows.has(task.parent_task_id)) return false;
        if (task.parent_phase   != null && collapsedRows.has(task.parent_phase))   return false;
        return true;
      });
    }

    const q = deferredSearchQuery.toLowerCase();
    const matchIds = new Set();
    const ancestorIds = new Set();

    // 1. Identify direct matches
    validTasks.forEach(task => {
      const titleMatch = task.title?.toLowerCase().includes(q);
      const wbsMatch = wbsMap[task.id]?.toLowerCase().includes(q);
      const assigneeMatch = task.assignee?.name?.toLowerCase().includes(q) || task.assignees?.[0]?.name?.toLowerCase().includes(q);
      if (titleMatch || wbsMatch || assigneeMatch) {
        matchIds.add(task.id);
      }
    });

    // 2. Walk up to find ancestors of matches
    const taskById = {};
    validTasks.forEach(t => taskById[t.id] = t);

    matchIds.forEach(id => {
      let current = taskById[id];
      while (current) {
        const pId = current.parent_id || current.parent_task_id || current.parent_phase;
        if (pId && !ancestorIds.has(pId)) {
          ancestorIds.add(pId);
          current = taskById[pId];
        } else {
          break;
        }
      }
    });

    // 3. Filter list to ONLY matches and their ancestors
    return validTasks.filter(t => matchIds.has(t.id) || ancestorIds.has(t.id));
  }, [validTasks, collapsedRows, deferredSearchQuery, wbsMap]);

  // â”€â”€ Date boundaries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { earliestDate, latestDate, paddedStart, totalTimelineDays, timelineDays } = useMemo(() => {
    let earliest = null;
    let latest   = null;

    validTasks.forEach(task => {
      const start = parseDate(task.start_date);
      if (!start) return;
      if (!earliest || start < earliest) earliest = start;
      const end = task.end_date ? parseDate(task.end_date) : new Date(start);
      if (!latest || end > latest) latest = end;
    });

    if (!earliest) {
      const t = new Date();
      earliest = new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()));
      latest   = new Date(earliest);
      latest.setUTCDate(latest.getUTCDate() + 30);
    } else {
      // Clamp to 3 years max
      const maxEnd = new Date(earliest);
      maxEnd.setUTCDate(maxEnd.getUTCDate() + 1095);
      if (latest > maxEnd) latest = maxEnd;
      // Add 7-day right padding
      latest = new Date(latest);
      latest.setUTCDate(latest.getUTCDate() + 7);
    }

    // Always start at Monday of the week containing earliestDate
    const pStart = new Date(earliest);
    const dow = pStart.getUTCDay();
    pStart.setUTCDate(pStart.getUTCDate() - (dow === 0 ? 6 : dow - 1));

    const tDays = Math.max(1, getDiffDays(latest, pStart));
    const tDaysArr = [];
    for (let i = 0; i < tDays; i++) {
      const d = new Date(pStart);
      d.setUTCDate(d.getUTCDate() + i);
      tDaysArr.push(d);
    }

    return { earliestDate: earliest, latestDate: latest, paddedStart: pStart, totalTimelineDays: tDays, timelineDays: tDaysArr };
  }, [validTasks]);

  const [fitWidth, setFitWidth] = useState(20);

  useEffect(() => {
    if (viewMode === 'fit' && scrollContainerRef.current) {
      const cw = scrollContainerRef.current.clientWidth - leftColWidth;
      const tDays = totalTimelineDays || 1;
      setFitWidth(Math.min(120, Math.max(18, cw / tDays)));
    }
  }, [viewMode, totalTimelineDays, leftColWidth]);

  const dayColWidth = viewMode === 'fit' ? fitWidth : DAY_COL_WIDTHS[viewMode];
  const rightGridWidth = totalTimelineDays * dayColWidth;

  // Today
  const now    = new Date();
  const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const todayOffsetDays = getDiffDays(todayUTC, paddedStart);
  const isTodayInRange  = todayOffsetDays >= 0 && todayOffsetDays < totalTimelineDays;
  const todayLeftPx     = todayOffsetDays * dayColWidth;

  // Scroll to today on mount / view-mode change
  useEffect(() => {
    if (!scrollContainerRef.current || !isTodayInRange) return;
    const halfVisible = scrollContainerRef.current.clientWidth / 2;
    scrollContainerRef.current.scrollLeft = leftColWidth + todayLeftPx - halfVisible;
  }, [validTasks.length, viewMode, leftColWidth]);

  // â”€â”€ Zoom via Ctrl+Scroll â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault(); // Prevent browser zoom
        
        const modes = ['fit', 'month', 'week', 'day'];
        const currentIdx = modes.indexOf(viewMode);
        
        if (e.deltaY < 0 && currentIdx < modes.length - 1) {
          // scroll up / zoom in
          setViewMode(modes[currentIdx + 1]);
        } else if (e.deltaY > 0 && currentIdx > 0) {
          // scroll down / zoom out
          setViewMode(modes[currentIdx - 1]);
        }
      }
    };
    
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [viewMode]);

  // â”€â”€ Drag & drop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { handlePointerDown, handlePointerMove, handlePointerUp, startXRef, deltaXRef } =
    useGanttDrag({ tasks, setTasks, dragState, setDragState, dayColWidth });

  // â”€â”€ Arrow paths â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { arrowPaths, isCritical } = useArrowPaths({
    flatTasks, visibleTasks, earliestDate: paddedStart, dayColWidth,
  });

  // â”€â”€ Assignee picker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const openAssigneePicker = useCallback((e, taskId) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setAssigneePicker({ taskId, x: rect.left + rect.width + 6, y: rect.top });
    setPickerSearch('');
  }, []);
  const closePicker = useCallback(() => setAssigneePicker({ taskId: null, x: 0, y: 0 }), []);

  const patchTree = (list, id, patch) =>
    list.map(t => ({
      ...t,
      ...(t.id === id ? patch : {}),
      children: t.children ? patchTree(t.children, id, patch) : t.children,
      subtasks: t.subtasks ? patchTree(t.subtasks, id, patch) : t.subtasks,
    }));

  const handleAssign = async (member) => {
    const { taskId } = assigneePicker;
    closePicker();
    const prev = tasks;
    setTasks(patchTree(tasks, taskId, { assignee: member.user, assignees: [member.user] }));
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/tasks/${taskId}`,
        { assignee_ids: [member.user.id] });
    } catch {
      setTasks(prev);
    }
  };

  useEffect(() => {
    const handleKeyDown = async (e) => {
      const tag = e.target.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable;
      if (isInput) return;

      if (e.key === 'Delete' && selectedTask) {
        e.preventDefault();
        if (window.confirm(`Are you sure you want to delete task "${selectedTask.title}"?`)) {
          const filterTree = (list, id) => list.filter(t => t.id !== id).map(t => ({
            ...t,
            children: t.children ? filterTree(t.children, id) : t.children,
            subtasks: t.subtasks ? filterTree(t.subtasks, id) : t.subtasks,
          }));
          const prevTasks = tasks;
          setTasks(filterTree(tasks, selectedTask.id));
          setSelectedTask(null);
          
          try {
            const token = localStorage.getItem('token');
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/tasks/${selectedTask.id}`, { headers: { Authorization: `Bearer ${token}` } });
          } catch (err) {
            console.error('Failed to delete task', err);
            setTasks(prevTasks);
          }
        }
      } else if (e.key === 'F2' && selectedTask) {
        e.preventDefault();
        setEditingTaskId(selectedTask.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTask, tasks, setTasks, setSelectedTask]);

  const handleRenameTask = async (taskId, newName) => {
    if (!newName.trim()) return;
    const prevTasks = tasks;
    const patchTree = (list) => list.map(t => {
      if (t.id === taskId) return { ...t, title: newName };
      return { ...t, children: t.children ? patchTree(t.children) : t.children, subtasks: t.subtasks ? patchTree(t.subtasks) : t.subtasks };
    });
    setTasks(patchTree(tasks));
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${import.meta.env.VITE_API_URL}/api/tasks/${taskId}`, { title: newName }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Rename failed', err);
      setTasks(prevTasks);
    }
  };

  // â”€â”€ Scroll to today â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const scrollToToday = () => {
    if (!scrollContainerRef.current || !isTodayInRange) return;
    const half = scrollContainerRef.current.clientWidth / 2;
    scrollContainerRef.current.scrollLeft = leftColWidth + todayLeftPx - half;
  };

  if (flatTasks.length === 0) return <GanttEmptyState />;

  return (
    <>
      <div 
        className="max-w-full mx-auto px-1"
        style={{ '--left-col-width': isLeftPanelCollapsed ? '0px' : `${leftColWidth}px` }}
      >
        <GanttHeader
          earliestDate={earliestDate}
          latestDate={latestDate}
          selectedSpace={selectedSpace}
        />

        <GanttControls
          viewMode={viewMode}
          setViewMode={setViewMode}
          showCritical={showCritical}
          setShowCritical={setShowCritical}
          projectId={selectedProjectId}
          onScrollToToday={scrollToToday}
          isTodayInRange={isTodayInRange}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* â”€â”€ Main chart container â”€â”€ */}
        <div className={`bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm dark:shadow-xl relative ${
          isResetting ? 'transition-[--left-col-width] duration-150 ease-out' : ''
        }`}>
          <div
            ref={scrollContainerRef}
            className="overflow-auto relative"
            style={{ maxHeight: 'calc(100vh - 230px)' }}
          >
            {/* Total width wrapper */}
            <div style={{ width: `calc(var(--left-col-width) + ${rightGridWidth}px)`, minWidth: '100%' }}>

              {/* â”€â”€ Sticky header row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              <div className="flex sticky top-0 z-40 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-b from-zinc-50 to-zinc-100/50 dark:from-zinc-900 dark:to-zinc-900/50 backdrop-blur-sm">
                <GanttLeftPanelHeader />
                <GanttTimelineHeader
                  rightGridWidth={rightGridWidth}
                  timelineDays={timelineDays}
                  totalTimelineDays={totalTimelineDays}
                  dayColWidth={dayColWidth}
                  isTodayInRange={isTodayInRange}
                  todayOffsetDays={todayOffsetDays}
                  viewMode={viewMode}
                />
              </div>

              {/* â”€â”€ Body â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              <div className="relative bg-white dark:bg-zinc-900">
                <GanttGridOverlay
                  timelineDays={timelineDays}
                  viewMode={viewMode}
                  dayColWidth={dayColWidth}
                  isTodayInRange={isTodayInRange}
                  todayOffsetDays={todayOffsetDays}
                />

                {/* Splitter */}
                <div
                  onPointerDown={isLeftPanelCollapsed ? undefined : handleSplitterDown}
                  onDoubleClick={handleSplitterDoubleClick}
                  className={`absolute top-0 bottom-0 z-[60] group flex justify-center w-2 ${isLeftPanelCollapsed ? 'cursor-pointer' : 'cursor-col-resize'}`}
                  style={{ left: `calc(var(--left-col-width) - 1px)` }}
                >
                  <div className="w-[2px] h-full bg-transparent group-hover:bg-blue-500 transition-colors relative">
                    <button 
                      onPointerDown={(e) => e.stopPropagation()} 
                      onClick={() => setIsLeftPanelCollapsed(v => !v)}
                      className="absolute top-4 -left-3 w-6 h-6 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-md hover:bg-zinc-50 transition-all z-10"
                      title={isLeftPanelCollapsed ? "Expand left panel" : "Collapse left panel"}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${isLeftPanelCollapsed ? 'rotate-180' : ''}`}>
                        <path d="m15 18-6-6 6-6"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Today vertical line â€” spans full body height */}
                {isTodayInRange && (
                  <div
                    className="absolute top-0 bottom-0 z-[5] pointer-events-none"
                    style={{ left: `calc(var(--left-col-width) + ${todayLeftPx}px)`, width: '2px' }}
                  >
                    <div className="absolute inset-0 bg-red-500/60 dark:bg-red-400/60" />
                    <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-b shadow whitespace-nowrap z-10">
                      Today
                    </div>
                  </div>
                )}

                {/* Task rows */}
                {visibleTasks.map((task) => {
                  const taskStart = parseDate(task.start_date);
                  if (!taskStart) return null;
                  const taskDue = task.end_date ? parseDate(task.end_date) : new Date(taskStart);

                  const durationDays = Math.max(0, getDiffDays(taskDue, taskStart) + 1);
                  const offsetDays   = Math.max(0, getDiffDays(taskStart, paddedStart));

                  const { barBg, barColor, badgeBg } = getStatusTheme(task.status);

                  const isParentTask = !!(task.children?.length || task.subtasks?.length);
                  const isChildTask  = task.parent_id != null || task.parent_task_id != null;
                  const isCollapsed  = collapsedRows.has(task.id);
                  const milestone    = isMilestone(task, durationDays);
                  const isSelected   = selectedTask?.id === task.id;

                  return (
                    <div
                      key={task.id}
                      className={`flex group border-b border-zinc-100 dark:border-zinc-800/70 transition-colors relative z-10 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/30'
                          : 'hover:bg-blue-50/50 dark:hover:bg-blue-900/20'
                      }`}
                      style={{ height: `${ROW_H}px` }}
                      onClick={() => setSelectedTask && setSelectedTask(task)}
                    >
                      {/* Left panel */}
                      <GanttLeftPanelRow
                        task={task}
                        isParentTask={isParentTask}
                        isChildTask={isChildTask}
                        isCollapsed={isCollapsed}
                        durationDays={durationDays}
                        setCollapsedRows={setCollapsedRows}
                        wbs={wbsMap[task.id]}
                        isSelected={isSelected}
                        searchQuery={deferredSearchQuery}
                        isEditing={editingTaskId === task.id}
                        setEditingTaskId={setEditingTaskId}
                        onRenameTask={handleRenameTask}
                      />

                      {/* Right timeline grid row */}
                      <div
                        ref={rightGridRef}
                        style={{ width: `${rightGridWidth}px`, height: `${ROW_H}px`, flexShrink: 0 }}
                        className="relative overflow-visible"
                      >
                        {/* Task bar or summary bracket */}
                        {isParentTask ? (
                          <GanttSummaryBracket
                            task={task}
                            taskStart={taskStart}
                            taskDue={taskDue}
                            earliestDate={paddedStart}
                            dayColWidth={dayColWidth}
                            isTaskCritical={showCritical && isCritical(task.id)}
                            dragState={dragState}
                            handlePointerDown={handlePointerDown}
                            handlePointerMove={handlePointerMove}
                            handlePointerUp={handlePointerUp}
                            startXRef={startXRef}
                            deltaXRef={deltaXRef}
                          />
                        ) : (
                          <GanttTaskBar
                            task={task}
                            dragState={dragState}
                            setDragState={setDragState}
                            dayColWidth={dayColWidth}
                            offsetDays={offsetDays}
                            durationDays={durationDays}
                            barBg={barBg}
                            barColor={barColor}
                            badgeBg={badgeBg}
                            isBarCritical={showCritical && isCritical(task.id)}
                            showCritical={showCritical}
                            setSelectedTask={setSelectedTask}
                            handlePointerDown={handlePointerDown}
                            handlePointerMove={handlePointerMove}
                            handlePointerUp={handlePointerUp}
                            startXRef={startXRef}
                            deltaXRef={deltaXRef}
                            openAssigneePicker={openAssigneePicker}
                            wbs={wbsMap[task.id]}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Arrow overlay â€” rendered ONCE over the right grid, inside body */}
                <GanttArrowOverlay
                  arrowPaths={arrowPaths}
                  rightGridWidth={rightGridWidth}
                  rowCount={visibleTasks.length}
                  showCritical={showCritical}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <GanttAssigneePicker
        assigneePicker={assigneePicker}
        closePicker={closePicker}
        pickerSearch={pickerSearch}
        setPickerSearch={setPickerSearch}
        workspaceMembers={workspaceMembers}
        handleAssign={handleAssign}
      />
    </>
  );
}
