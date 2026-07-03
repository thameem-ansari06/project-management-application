import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { TaskBasicInfo, TaskSchedule, TaskAssignment, TaskDependencies, TaskEstimation } from './TaskFormSections';

export default function TaskModal({ isOpen, onClose, mode, initialData, onSubmit, tasks, workspaceMembers }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [taskData, setTaskData] = useState(initialData || {
    title: '', description: '', priority: 'Medium', status: 'To Do',
    task_type: 'task', progress: 0,
    start_date: '', due_date: '',
    parent_id: '', predecessor_id: '',
    dependency_type: 'FS', lag_days: 0,
    estimated_hours: 0, actual_hours: 0, remaining_hours: 0,
    assigned_to_id: '', assignee_ids: []
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(taskData);
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="p-6 w-full max-w-lg border-zinc-850 bg-zinc-900 shadow-2xl flex flex-col max-h-[90vh]">
        <h3 className="text-base font-bold mb-4 text-zinc-100 flex-shrink-0">
          {mode === 'create' ? 'Create Task' : 'Edit Task'}
        </h3>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2 space-y-4 text-xs font-semibold custom-scrollbar">
          <TaskBasicInfo task={taskData} setTask={setTaskData} tasks={tasks} />
          <TaskSchedule task={taskData} setTask={setTaskData} />
          <TaskAssignment task={taskData} setTask={setTaskData} workspaceMembers={workspaceMembers} />

          <div className="pt-2 border-t border-zinc-800 mt-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-zinc-400 hover:text-zinc-200 transition-colors py-2"
            >
              <span className="text-[10px] uppercase font-bold tracking-wider">Advanced Settings</span>
              {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            {showAdvanced && (
              <div className="mt-3 space-y-4">
                <TaskDependencies task={taskData} setTask={setTaskData} tasks={tasks} />
                <TaskEstimation task={taskData} setTask={setTaskData} />
              </div>
            )}
          </div>
        </form>

        <div className="flex gap-3 justify-end pt-4 mt-2 border-t border-zinc-800 flex-shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="font-semibold">Cancel</Button>
          <Button type="button" onClick={handleSubmit} size="sm" className="font-bold">
            {mode === 'create' ? 'Create' : 'Save Changes'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
