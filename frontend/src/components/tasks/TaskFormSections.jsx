import React from 'react';
import { Input } from '../ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const TaskBasicInfo = ({ task, setTask, tasks }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-[10px] text-zinc-400 uppercase mb-1">Title</label>
      <Input required placeholder="Task Title" value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} />
    </div>
    <div>
      <label className="block text-[10px] text-zinc-400 uppercase mb-1">Description</label>
      <textarea value={task.description || ''} onChange={(e) => setTask({ ...task, description: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 outline-none h-16 text-zinc-200 placeholder-zinc-650" placeholder="Details..." />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-[10px] text-zinc-400 uppercase mb-1">Priority</label>
        <select value={task.priority} onChange={(e) => setTask({ ...task, priority: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 outline-none text-zinc-200">
          <option value="Urgent">Urgent</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>
      <div>
        <label className="block text-[10px] text-zinc-400 uppercase mb-1">Parent Phase (Optional)</label>
        <Select 
          value={task.parent_id || "none"} 
          onValueChange={(val) => setTask({ ...task, parent_id: val === "none" ? "" : val })}
        >
          <SelectTrigger className="w-full bg-zinc-950 border-zinc-800 text-zinc-200">
            <SelectValue placeholder="Select Parent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None (Root Task)</SelectItem>
            {tasks.map(t => (
              <SelectItem key={t.id} value={String(t.id)}>{t.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-[10px] text-zinc-400 uppercase mb-1">Task Type</label>
        <select value={task.task_type || "task"} onChange={(e) => setTask({ ...task, task_type: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 outline-none text-zinc-200">
          <option value="task">Task</option>
          <option value="milestone">Milestone</option>
          <option value="epic">Epic</option>
          <option value="bug">Bug</option>
        </select>
      </div>
      <div>
        <label className="block text-[10px] text-zinc-400 uppercase mb-1">Status</label>
        <select value={task.status || "To Do"} onChange={(e) => setTask({ ...task, status: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 outline-none text-zinc-200">
          <option value="To Do">To Do</option>
          <option value="In Progress">In Progress</option>
          <option value="Review">Review</option>
          <option value="Testing">Testing</option>
          <option value="Done">Done</option>
        </select>
      </div>
    </div>
  </div>
);

export const TaskSchedule = ({ task, setTask }) => (
  <div className="space-y-4 pt-4 border-t border-zinc-800 mt-4">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-[10px] text-zinc-400 uppercase mb-1">Start Date</label>
        <Input type="date" disabled={!!task.predecessor_id} value={task.predecessor_id ? '' : (task.start_date || '')} onChange={(e) => setTask({ ...task, start_date: e.target.value })} className="disabled:bg-zinc-900 disabled:cursor-not-allowed" />
      </div>
      <div>
        <label className="block text-[10px] text-zinc-400 uppercase mb-1">Due Date</label>
        <Input type="date" disabled={!!task.predecessor_id} value={task.predecessor_id ? '' : (task.due_date || '')} onChange={(e) => setTask({ ...task, due_date: e.target.value })} className="disabled:bg-zinc-900 disabled:cursor-not-allowed" />
      </div>
    </div>
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="block text-[10px] text-zinc-400 uppercase">Progress</label>
        <span className="text-[10px] font-bold text-zinc-300">{task.progress || 0}%</span>
      </div>
      <input
        type="range"
        min="0" max="100" step="5"
        value={task.progress || 0}
        onChange={(e) => setTask({ ...task, progress: parseInt(e.target.value) })}
        className="w-full accent-blue-500"
      />
    </div>
  </div>
);

export const TaskAssignment = ({ task, setTask, workspaceMembers }) => (
  <div className="space-y-4 pt-4 border-t border-zinc-800 mt-4">
    <div>
      <label className="block text-[10px] text-zinc-400 uppercase mb-1">Assigned To (Primary)</label>
      <select
        value={task.assigned_to_id || ''}
        onChange={(e) => setTask({ ...task, assigned_to_id: e.target.value ? Number(e.target.value) : null })}
        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 outline-none text-zinc-200 text-xs font-semibold"
      >
        <option value="">Unassigned</option>
        {workspaceMembers.map(m => (
          <option key={m.id} value={m.user.id}>{m.user.name} ({m.user.email})</option>
        ))}
      </select>
    </div>
    <div>
      <label className="block text-[10px] text-zinc-400 uppercase mb-1.5">Assign Users (M2M)</label>
      <div className="grid grid-cols-2 gap-2 border border-zinc-800 bg-zinc-950 rounded p-2 max-h-24 overflow-y-auto">
        {workspaceMembers.map(m => (
          <label key={m.id} className="flex items-center gap-2 font-semibold text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={(task.assignee_ids || []).includes(m.user.id)}
              onChange={(e) => {
                let ids = [...(task.assignee_ids || [])];
                if (e.target.checked) ids.push(m.user.id);
                else ids = ids.filter(id => id !== m.user.id);
                setTask({ ...task, assignee_ids: ids });
              }}
              className="accent-blue-500"
            />
            <span className="text-xs">{m.user.name}</span>
          </label>
        ))}
      </div>
    </div>
  </div>
);

export const TaskDependencies = ({ task, setTask, tasks }) => (
  <div className="space-y-4 bg-zinc-950/50 p-3 rounded border border-zinc-800">
    <div>
      <label className="block text-[10px] text-zinc-400 uppercase mb-1">Predecessor</label>
      <select value={task.predecessor_id || ''} onChange={(e) => setTask({ ...task, predecessor_id: e.target.value })} className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 outline-none text-zinc-200">
        <option value="">None</option>
        {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
      </select>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-[10px] text-zinc-400 uppercase mb-1">Dependency Type</label>
        <select disabled={!task.predecessor_id} value={task.dependency_type || 'FS'} onChange={(e) => setTask({ ...task, dependency_type: e.target.value })} className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 outline-none text-zinc-200 disabled:opacity-50">
          <option value="FS">Finish to Start (FS)</option>
          <option value="SS">Start to Start (SS)</option>
          <option value="FF">Finish to Finish (FF)</option>
          <option value="SF">Start to Finish (SF)</option>
        </select>
      </div>
      <div>
        <label className="block text-[10px] text-zinc-400 uppercase mb-1">Lag (Days)</label>
        <Input disabled={!task.predecessor_id} type="number" value={task.lag_days || 0} onChange={(e) => setTask({ ...task, lag_days: parseInt(e.target.value) || 0 })} className="bg-zinc-900 border-zinc-700 disabled:opacity-50" />
      </div>
    </div>
  </div>
);

export const TaskEstimation = ({ task, setTask }) => (
  <div className="space-y-4 bg-zinc-950/50 p-3 rounded border border-zinc-800">
    <div className="grid grid-cols-3 gap-3">
      <div>
        <label className="block text-[10px] text-zinc-400 uppercase mb-1">Estimated Hrs</label>
        <Input type="number" step="0.5" min="0" value={task.estimated_hours || 0} onChange={(e) => setTask({ ...task, estimated_hours: parseFloat(e.target.value) || 0 })} className="bg-zinc-900 border-zinc-700" />
      </div>
      <div>
        <label className="block text-[10px] text-zinc-400 uppercase mb-1">Actual Hrs</label>
        <Input type="number" step="0.5" min="0" value={task.actual_hours || 0} onChange={(e) => setTask({ ...task, actual_hours: parseFloat(e.target.value) || 0 })} className="bg-zinc-900 border-zinc-700" />
      </div>
      <div>
        <label className="block text-[10px] text-zinc-400 uppercase mb-1">Remaining Hrs</label>
        <Input type="number" step="0.5" min="0" value={task.remaining_hours || 0} onChange={(e) => setTask({ ...task, remaining_hours: parseFloat(e.target.value) || 0 })} className="bg-zinc-900 border-zinc-700" />
      </div>
    </div>
  </div>
);
