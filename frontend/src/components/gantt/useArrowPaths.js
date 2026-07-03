import { parseDate, getDiffDays } from '../../lib/dateUtils';
import { ROW_H, BAR_H } from './ganttUtils';
import { useMemo } from 'react';

/**
 * Critical path: a task is on the critical path if its total float = 0.
 * Float = successor.start - predecessor.end  (in days)
 * Float ≤ 0 means there's no slack.
 */
export default function useArrowPaths({
  flatTasks,
  visibleTasks,
  earliestDate,
  dayColWidth,
}) {
  return useMemo(() => {
    // Build maps
  const taskById = {};
  const taskRowIndex = {};
  const successorsByPredId = {}; // Map<taskId, successor[]>

  visibleTasks.forEach((t, i) => {
    taskById[t.id] = t;
    taskRowIndex[t.id] = i;
  });

  // Also include non-visible tasks in taskById and build successors map
  flatTasks.forEach(t => { 
    if (!taskById[t.id]) taskById[t.id] = t;
    
    if (!successorsByPredId[t.id]) {
      successorsByPredId[t.id] = [];
    }
    
    if (t.predecessor_id) {
      if (!successorsByPredId[t.predecessor_id]) {
        successorsByPredId[t.predecessor_id] = [];
      }
      successorsByPredId[t.predecessor_id].push(t);
    }
  });

  // Compute float for a predecessor → successor pair (in days)
  const getPairFloat = (pred, succ) => {
    const predEnd   = pred.end_date ? parseDate(pred.end_date)     : parseDate(pred.start_date);
    const succStart = succ.start_date ? parseDate(succ.start_date) : null;
    if (!predEnd || !succStart) return Infinity;
    return getDiffDays(succStart, predEnd); // 0 means back-to-back (critical)
  };

  const isCritical = (taskId) => {
    const task = taskById[taskId];
    if (!task) return false;
    // Check as predecessor: any successor has float ≤ 0?
    const successors = successorsByPredId[taskId] || [];
    if (successors.some(s => getPairFloat(task, s) <= 0)) return true;
    // Check as successor: its own predecessor has float ≤ 0?
    if (task.predecessor_id) {
      const pred = taskById[task.predecessor_id];
      if (pred && getPairFloat(pred, task) <= 0) return true;
    }
    return false;
  };

  // Returns pixel geometry relative to the RIGHT grid (x=0 is start of timeline)
  const getBarGeometry = (task) => {
    const start = parseDate(task.start_date);
    if (!start) return null;
    const due = task.end_date ? parseDate(task.end_date) : new Date(start);
    const offsetDays   = Math.max(0, getDiffDays(start, earliestDate));
    const durationDays = Math.max(1, getDiffDays(due, start) + 1);
    const x     = offsetDays   * dayColWidth;
    const width = durationDays * dayColWidth;
    const rowIdx = taskRowIndex[task.id] ?? 0;
    // vertical center of bar
    const y = rowIdx * ROW_H + (ROW_H / 2);
    return { x, width, y };
  };

  const arrowPaths = [];

  visibleTasks.forEach(task => {
    const predId = task.predecessor_id;
    if (!predId || !taskById[predId]) return;
    const pred = taskById[predId];
    // Only draw if predecessor is also visible
    if (taskRowIndex[pred.id] === undefined) return;

    const from = getBarGeometry(pred);
    const to   = getBarGeometry(task);
    if (!from || !to) return;

    // Orthogonal elbow: right-edge of pred → left-edge of succ
    // with a small horizontal jog so arrows don't overlap bars
    const sx = from.x + from.width; // relative to right grid
    const sy = from.y;
    const ex = to.x;
    const ey = to.y;

    const jog = 10; // px horizontal jog after leaving pred bar
    let d;
    if (ex > sx + jog * 2) {
      // Normal: go right, drop/rise, then go right to target
      const midX = sx + jog;
      d = `M ${sx} ${sy} H ${midX} V ${ey} H ${ex}`;
    } else {
      // Backward or tight: go right small jog, drop below both rows, come back left
      const midX = sx + jog;
      const bypassY = Math.max(sy, ey) + ROW_H * 0.6;
      d = `M ${sx} ${sy} H ${midX} V ${bypassY} H ${ex - jog} V ${ey} H ${ex}`;
    }

    const critical = isCritical(pred.id) || isCritical(task.id);
    const float = getPairFloat(pred, task);

    arrowPaths.push({ d, key: `${pred.id}-${task.id}`, critical, float });
  });

    return { arrowPaths, isCritical };
  }, [flatTasks, visibleTasks, earliestDate, dayColWidth]);
}
