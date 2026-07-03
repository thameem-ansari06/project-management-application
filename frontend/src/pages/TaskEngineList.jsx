import React, { useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { Folder } from 'lucide-react';

// Import shadcn UI Components
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

export default function TaskEngineList() {
  const getAvatarColor = (name) => {
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
  const {
    selectedList,
    tasks,
    setShowTaskModal,
    setSelectedTask,
    fetchComments,
    fetchAttachments,
    handlePriorityChange,
    handleStartTimer,
    handleStatusChange,
    getStatusColor,
    getPriorityStyle,
    selectedProjectId,
    spaces,
  } = useOutletContext();

  const activeProject = spaces.find(p => p.id === selectedProjectId);

  if (!selectedProjectId && !selectedList) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 p-8 text-center shadow-sm dark:shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-100">No Project Selected</CardTitle>
          </CardHeader>
          <CardContent className="text-zinc-500 dark:text-zinc-400 text-sm">
            No Project Selected. Please select a project from the dropdown above to load your tasks.
          </CardContent>
        </Card>
      </div>
    );
  }

  const fileInputRef = useRef(null);
  const isListSelected = Boolean(selectedList);

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(tasks, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `workspace_tasks_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsedData = JSON.parse(event.target.result);
        const importedTasks = Array.isArray(parsedData) ? parsedData : [parsedData];
        const listId = selectedList?.id;
        
        for (const task of importedTasks) {
          const payload = {
            list_id: listId,
            title: task.title || 'Imported Task',
            description: task.description || '',
            priority: task.priority || 'Medium',
            status: task.status || 'To Do'
          };
          try {
            await axios.post('http://127.0.0.1:8000/api/tasks', payload);
          } catch (err) {
            console.error("Failed to import task", task.title, err);
          }
        }
        
        alert("Import completed successfully!");
        window.location.reload();
      } catch (err) {
        console.error("Error parsing or importing JSON", err);
        alert("Invalid JSON file");
      }
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Tasks Matrix</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">
            {selectedList 
              ? `Workspace ticket listings for "${selectedList.name}"` 
              : `Workspace ticket listings for project "${activeProject?.name || 'Selected Project'}"`}
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <input 
            type="file" 
            accept=".json" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={processImportFile} 
          />
          <button 
            disabled={!isListSelected} 
            className="border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 rounded-md text-sm font-semibold text-zinc-700 dark:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            onClick={handleImport}
          >
            Import
          </button>
          <button 
            disabled={!isListSelected} 
            className="border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 rounded-md text-sm font-semibold text-zinc-700 dark:text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            onClick={handleExport}
          >
            Export
          </button>
          <Button onClick={() => setShowTaskModal(true)} className="font-bold">
            + Create Task
          </Button>
        </div>
      </div>

      <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm dark:shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-extrabold tracking-wider">
                <th className="py-3.5 px-6">Task Title & Subtasks</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4">Timer</th>
                <th className="py-3.5 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {tasks.map(task => {
                const childTasks = [...(task.children || []), ...(task.subtasks || [])];
                const isParent = childTasks.length > 0;
                return (
                  <React.Fragment key={task.id}>
                    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          {isParent ? (
                            <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                          ) : null}
                          {(task.assignee || (task.assignees && task.assignees.length > 0)) && (
                            <Avatar className="w-5.5 h-5.5 text-[10px] border border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                              <AvatarFallback 
                                className="text-white font-extrabold text-[8px] flex items-center justify-center"
                                style={{ backgroundColor: getAvatarColor(task.assignee?.name || task.assignees[0]?.name) }}
                              >
                                {(task.assignee?.name || task.assignees[0]?.name).charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <span onClick={() => { setSelectedTask(task); fetchComments(task.id); fetchAttachments(task.id); }} className={`hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition text-sm ${isParent ? 'font-bold text-zinc-900 dark:text-zinc-100' : 'font-semibold text-zinc-700 dark:text-zinc-300'}`}>
                            {task.title}
                          </span>
                          {task.predecessor_id && (
                            <Badge variant="outline" className="text-[9px] bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 font-extrabold uppercase">
                              Predecessor: #{task.predecessor_id}
                            </Badge>
                          )}
                        </div>
                        {task.description && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm truncate">{task.description}</p>}
                      </td>
                      <td className="py-4 px-4 text-xs font-semibold">
                        <select 
                          value={task.priority} 
                          onChange={(e) => handlePriorityChange(task.id, e.target.value)} 
                          className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 rounded px-2 py-0.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="Urgent">Urgent</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </td>
                      <td className="py-4 px-4 text-zinc-600 dark:text-zinc-400 text-xs font-semibold">{task.end_date || <span className="text-zinc-400 dark:text-zinc-500">No date</span>}</td>
                      <td className="py-4 px-4 text-xs">
                        <Button onClick={() => handleStartTimer(task.id)} variant="outline" size="sm" className="h-7 text-[10px] font-bold border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          ⏱️ Start
                        </Button>
                      </td>
                      <td className="py-4 px-6 flex justify-end">
                        <Select 
                          value={task.status} 
                          onValueChange={(val) => handleStatusChange(task.id, val)}
                          disabled={isParent}
                        >
                          <SelectTrigger className={`w-32 h-8 text-xs font-bold ${getStatusColor(task.status)}`}>
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Todo">Todo</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Review">Review</SelectItem>
                            <SelectItem value="Testing">Testing</SelectItem>
                            <SelectItem value="Done">Done</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                    {childTasks.map(sub => (
                      <tr key={sub.id} className="bg-zinc-50/50 dark:bg-zinc-900/10 border-l-2 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900/30 transition text-zinc-500 dark:text-zinc-400">
                        <td className="py-2.5 px-6 pl-12">
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-400 dark:text-zinc-600 text-xs mr-1">└─</span>
                            {(sub.assignee || (sub.assignees && sub.assignees.length > 0)) && (
                              <Avatar className="w-5 h-5 text-[9px] border border-zinc-200 dark:border-zinc-850 flex-shrink-0">
                                <AvatarFallback 
                                  className="text-white font-bold text-[8px] flex items-center justify-center"
                                  style={{ backgroundColor: getAvatarColor(sub.assignee?.name || sub.assignees[0]?.name) }}
                                >
                                  {(sub.assignee?.name || sub.assignees[0]?.name).charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <span onClick={() => { setSelectedTask(sub); fetchComments(sub.id); fetchAttachments(sub.id); }} className="font-semibold hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer text-xs text-zinc-700 dark:text-zinc-300">{sub.title}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4"><Badge variant={getPriorityStyle(sub.priority)} className="text-[9px] font-bold">{sub.priority}</Badge></td>
                        <td className="py-2.5 px-4 text-[11px] text-zinc-500 dark:text-zinc-400">{sub.end_date || 'N/A'}</td>
                        <td className="py-2.5 px-4" />
                        <td className="py-2.5 px-6 flex justify-end">
                          <Select 
                            value={sub.status} 
                            onValueChange={(val) => handleStatusChange(sub.id, val)}
                            disabled={false}
                          >
                            <SelectTrigger className={`w-28 h-7 text-[10px] font-bold ${getStatusColor(sub.status)}`}>
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Todo">Todo</SelectItem>
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Review">Review</SelectItem>
                              <SelectItem value="Testing">Testing</SelectItem>
                              <SelectItem value="Done">Done</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">
                    No tasks found in list. Add tasks above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
