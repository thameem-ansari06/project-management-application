import { useRef } from 'react';
import axios from 'axios';
import { shiftDateStr, getDiffDays } from '../../lib/dateUtils';
import { getFlattenedTasks } from './ganttUtils';

let tooltipEl = null;

export const showDragTooltip = (x, y, text) => {
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'fixed z-[9999] pointer-events-none bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-bold px-2.5 py-1.5 rounded shadow-xl whitespace-pre-line border border-zinc-700 dark:border-zinc-300';
    document.body.appendChild(tooltipEl);
  }
  tooltipEl.style.left = `${x + 15}px`;
  tooltipEl.style.top = `${y + 15}px`;
  tooltipEl.textContent = text;
  tooltipEl.style.display = 'block';
};

export const hideDragTooltip = () => {
  if (tooltipEl) tooltipEl.style.display = 'none';
};

const getCascadingUpdates = (draggedTaskId, daysShifted, allTasks) => {
  const visited = new Set();
  const updates = [];
  const flatTasks = getFlattenedTasks(allTasks);

  const queue = [draggedTaskId];

  while (queue.length > 0) {
    const currentId = queue.shift();

    flatTasks.forEach(task => {
      if ((task.parent_phase === currentId || task.parent_id === currentId || task.parent_task_id === currentId || task.predecessor_id === currentId) && !visited.has(task.id)) {
        visited.add(task.id);
        queue.push(task.id);
        updates.push({
          id: task.id,
          start_date: shiftDateStr(task.start_date, daysShifted),
          end_date: shiftDateStr(task.end_date, daysShifted),
          due_date: shiftDateStr(task.due_date, daysShifted)
        });
      }
    });
  }

  return updates;
};

export default function useGanttDrag({
  tasks,
  setTasks,
  dragState,
  setDragState,
  dayColWidth,
}) {
  const startXRef = useRef(0);
  const deltaXRef = useRef(0);
  const escListenerRef = useRef(null);

  const cleanupEsc = () => {
    if (escListenerRef.current) {
      window.removeEventListener('keydown', escListenerRef.current);
      escListenerRef.current = null;
    }
  };

  // Move mode — fires from the bar body (not the edge handles)
  const handlePointerDown = (e, task) => {
    // Tasks controlled by predecessor_id have server-managed dates — skip drag
    if (task.predecessor_id) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    const cascadingUpdates = getCascadingUpdates(task.id, 0, tasks);
    const cascadingIds = new Set(cascadingUpdates.map(u => u.id));

    startXRef.current = e.clientX;
    deltaXRef.current = 0;

    setDragState({
      taskId: task.id,
      cascadingIds,
      mode: 'move',
      originalLeftPx: 0,
      originalWidthPx: 0,
      isDragging: true,
      originalTask: { ...task },
    });

    const onKeyDown = (ke) => {
      if (ke.key === 'Escape') {
        cleanupEsc();
        hideDragTooltip();
        startXRef.current = 0;
        deltaXRef.current = 0;
        setDragState({ taskId: null, cascadingIds: null, mode: 'move', originalLeftPx: 0, originalWidthPx: 0, isDragging: false });
        window.dispatchEvent(new CustomEvent('gantt-drag-cancel'));
      }
    };
    escListenerRef.current = onKeyDown;
    window.addEventListener('keydown', onKeyDown);
  };

  const handlePointerMove = (e) => {
    if (!dragState.taskId) return;
    deltaXRef.current = e.clientX - startXRef.current;
  };

  const handlePointerUp = async (e, task) => {
    cleanupEsc();
    hideDragTooltip();

    if (!dragState.taskId || dragState.taskId !== task.id) return;
    const deltaX = deltaXRef.current;
    const daysShifted = Math.round(deltaX / dayColWidth);
    const { mode, originalTask } = dragState;

    startXRef.current = 0;
    deltaXRef.current = 0;

    // Wait a tiny bit before clearing dragState so onClick can read deltaX and suppress the popup
    setTimeout(() => {
      setDragState({ taskId: null, cascadingIds: null, mode: 'move', originalLeftPx: 0, originalWidthPx: 0, isDragging: false });
    }, 50);

    if (mode === 'progress') {
      const pDelta = Math.round((deltaX / dragState.originalWidthPx) * 100);
      let newProg = (originalTask.progress || 0) + pDelta;
      newProg = Math.max(0, Math.min(100, Math.round(newProg / 5) * 5)); // snap to 5%
      
      if (newProg === originalTask.progress) return;
      
      const prevTasks = tasks;
      const patchTasks = (list) => list.map(t => {
        if (t.id === task.id) return { ...t, progress: newProg };
        return { ...t, children: t.children ? patchTasks(t.children) : t.children, subtasks: t.subtasks ? patchTasks(t.subtasks) : t.subtasks };
      });
      setTasks(patchTasks(tasks));

      try {
        const token = localStorage.getItem('token');
        await axios.put(`http://127.0.0.1:8000/api/tasks/${task.id}`, { progress: newProg }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        setTasks(prevTasks);
      }
      return;
    }

    if (daysShifted === 0) return;

    let newStart = task.start_date;
    let newEnd   = task.end_date;
    let newDue   = task.due_date;

    if (mode === 'move') {
      // Shift both edges together
      newStart = shiftDateStr(task.start_date, daysShifted);
      newEnd   = shiftDateStr(task.end_date,   daysShifted);
      newDue   = shiftDateStr(task.due_date,   daysShifted);
    } else if (mode === 'resize-right') {
      // Stretch / shrink the right edge only
      const baseEnd = task.end_date || task.due_date || task.start_date;
      newEnd = shiftDateStr(baseEnd, daysShifted);
      newDue = shiftDateStr(baseEnd, daysShifted);
    } else if (mode === 'resize-left') {
      // Move the left edge only; right (due_date) stays fixed
      newStart = shiftDateStr(task.start_date, daysShifted);
    }

    const patchMap = {};
    patchMap[task.id] = { start_date: newStart, end_date: newEnd, due_date: newDue };

    if (mode === 'move') {
      const updates = getCascadingUpdates(task.id, daysShifted, tasks);
      updates.forEach(u => {
        patchMap[u.id] = { start_date: u.start_date, end_date: u.end_date, due_date: u.due_date };
      });
    }

    // Optimistic UI: patch tasks tree in-place
    const patchTasks = (list, patches) =>
      list.map(t => {
        let updatedTask = { ...t };
        if (patches[t.id]) {
          updatedTask = { ...updatedTask, ...patches[t.id] };
        }
        return {
          ...updatedTask,
          children: updatedTask.children ? patchTasks(updatedTask.children, patches) : updatedTask.children,
          subtasks: updatedTask.subtasks ? patchTasks(updatedTask.subtasks, patches) : updatedTask.subtasks,
        };
      });

    const prevTasks = tasks;
    setTasks(patchTasks(tasks, patchMap));

    // Persist to backend
    try {
      const token = localStorage.getItem('token');
      const updatePromises = Object.keys(patchMap).map(id => {
        const payload = {
          start_date: patchMap[id].start_date,
        };
        if (patchMap[id].end_date !== undefined) payload.end_date = patchMap[id].end_date;
        if (patchMap[id].due_date !== undefined) payload.due_date = patchMap[id].due_date;
        return axios.put(`http://127.0.0.1:8000/api/tasks/${id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      });
      await Promise.all(updatePromises);
    } catch (err) {
      console.error('Gantt reschedule failed:', err);
      setTasks(prevTasks); // roll back optimistic update
    }
  };

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    startXRef,
    deltaXRef,
  };
}
