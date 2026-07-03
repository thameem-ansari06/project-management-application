export const ROW_H = 26;   // px — compact row height
export const BAR_H = 14;   // px — compact task bar height
export const HEADER_H = 53; // month row (20px) + day row (32px) + 1px border

export const DAY_COL_WIDTHS = { day: 44, week: 18, month: 7 };

export const getAvatarColor = (name) => {
  if (!name) return '#2563eb';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
    '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6'
  ];
  return colors[Math.abs(hash) % colors.length];
};

export const getStatusTheme = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'done' || s === 'completed') {
    return {
      barBg:   'bg-emerald-600 hover:bg-emerald-500',
      barColor: '#059669',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900',
      textColor: 'text-emerald-600 dark:text-emerald-400',
    };
  } else if (s === 'in progress' || s === 'progress' || s === 'active') {
    return {
      barBg:   'bg-blue-600 hover:bg-blue-500',
      barColor: '#2563eb',
      badgeBg: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900',
      textColor: 'text-blue-600 dark:text-blue-400',
    };
  } else if (s === 'review' || s === 'testing') {
    return {
      barBg:   'bg-amber-500 hover:bg-amber-400',
      barColor: '#d97706',
      badgeBg: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900',
      textColor: 'text-amber-600 dark:text-amber-400',
    };
  } else {
    return {
      barBg:   'bg-slate-500 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500',
      barColor: '#64748b',
      badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
      textColor: 'text-slate-500 dark:text-slate-400',
    };
  }
};

export const getFlattenedTasks = (taskList) => {
  const flat = [];
  const flatten = (items, depth = 0) => {
    items.forEach(item => {
      flat.push({ ...item, _depth: depth });
      if (item.children && item.children.length > 0) flatten(item.children, depth + 1);
      if (item.subtasks && item.subtasks.length > 0) flatten(item.subtasks, depth + 1);
    });
  };
  flatten(taskList);
  return flat;
};

/** Derive WBS number for a task — e.g. "2.3.1" */
export const buildWbsMap = (tasks) => {
  const map = {};
  const walk = (items, prefix) => {
    items.forEach((t, i) => {
      const num = prefix ? `${prefix}.${i + 1}` : `${i + 1}`;
      map[t.id] = num;
      if (t.children?.length) walk(t.children, num);
      if (t.subtasks?.length) walk(t.subtasks, num);
    });
  };
  walk(tasks, '');
  return map;
};

/** Compute completion % from progress field (0-100) or children */
export const getCompletion = (task) => {
  if (typeof task.progress === 'number') return Math.min(100, Math.max(0, task.progress));
  if (task.status?.toLowerCase() === 'done' || task.status?.toLowerCase() === 'completed') return 100;
  if (task.status?.toLowerCase() === 'in progress' || task.status?.toLowerCase() === 'active') return 50;
  return 0;
};

/** Detect milestone: duration 0 or task.is_milestone flag */
export const isMilestone = (task, durationDays) =>
  task.is_milestone === true || durationDays === 0;
