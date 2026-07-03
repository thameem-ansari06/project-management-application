import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Lock, Clock, AlertTriangle } from 'lucide-react';

// Import shadcn UI Components
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

export default function KanbanBoard() {
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
  const { selectedWorkspace, selectedProjectId, spaces } = useOutletContext();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Group columns strictly based on status values
  const [columns, setColumns] = useState({
    'To Do': [],
    'In Progress': [],
    'Done': [],
  });

  useEffect(() => {
    if (selectedWorkspace && selectedProjectId) {
      fetchTasks();
    }
  }, [selectedWorkspace, selectedProjectId]);

  const fetchTasks = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const url = `${import.meta.env.VITE_API_URL}/api/tasks?project_id=${selectedProjectId}`;
      const res = await axios.get(url);
      const fetchedTasks = res.data;
      setTasks(fetchedTasks);

      // Group tasks into our strict columns
      const grouped = {
        'To Do': [],
        'In Progress': [],
        'Done': [],
      };

      fetchedTasks.forEach((task) => {
        // Handle database status to column status grouping
        const status = task.status || 'To Do';
        if (grouped[status]) {
          grouped[status].push(task);
        } else {
          // If status is Review, Testing or empty/other fallback, default to In Progress
          grouped['In Progress'].push(task);
        }
      });

      setColumns(grouped);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };


  // Drag and drop event handler
  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    // Dropped outside a valid droppable column
    if (!destination) return;

    // Dropped in the same position
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const sourceColId = source.droppableId;
    const destColId = destination.droppableId;

    const sourceTasks = Array.from(columns[sourceColId]);
    const destTasks = Array.from(columns[destColId]);

    // Find task
    const taskIndex = sourceTasks.findIndex((t) => String(t.id) === draggableId);
    if (taskIndex === -1) return;

    const [movedTask] = sourceTasks.splice(taskIndex, 1);
    
    // Check WBS constraint: Parent tasks are locked (cannot be dragged)
    const isParent = (movedTask.children && movedTask.children.length > 0) || 
                     (movedTask.subtasks && movedTask.subtasks.length > 0);
    if (isParent) {
      alert('Dragging is disabled for phase/parent tasks as their status is automatically computed.');
      return;
    }

    // Update the task status to destination column ID
    movedTask.status = destColId;

    if (sourceColId === destColId) {
      sourceTasks.splice(destination.index, 0, movedTask);
      setColumns({
        ...columns,
        [sourceColId]: sourceTasks,
      });
    } else {
      destTasks.splice(destination.index, 0, movedTask);
      setColumns({
        ...columns,
        [sourceColId]: sourceTasks,
        [destColId]: destTasks,
      });
    }

    // Fire API call to update status in PostgreSQL
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/tasks/${movedTask.id}`, {
        status: destColId, // Payload strictly matches "To Do", "In Progress", or "Done"
      });
    } catch (err) {
      console.error('Failed to save task status:', err);
      // Revert in case of API failure
      fetchTasks();
    }
  };

  // Lookup helper for project names
  const getProjectName = (task) => {
    const activeProject = spaces.find(p => p.id === selectedProjectId);
    return activeProject ? activeProject.name : 'Selected Project';
  };

  if (!selectedWorkspace) {
    return (
      <div className="max-w-6xl mx-auto mt-12 text-center">
        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 p-8 shadow-sm dark:shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-100">No Workspace Selected</CardTitle>
          </CardHeader>
          <CardContent className="text-zinc-500 dark:text-zinc-400 text-sm">
            Please switch to or create a workspace to view the Kanban Board.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedProjectId) {
    return (
      <div className="max-w-6xl mx-auto mt-12 text-center">
        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 p-8 shadow-sm dark:shadow-xl">
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Kanban Board</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">
            Drag and drop cards across columns to swap status states.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-zinc-500 dark:text-zinc-400 font-medium animate-pulse">
          Syncing Kanban Board columns...
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[70vh] items-stretch">
            {Object.keys(columns).map((status) => {
              const statusTasks = columns[status];
              return (
                <Droppable key={status} droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col max-h-full transition-colors duration-250 ${
                        snapshot.isDraggingOver ? 'bg-zinc-100 dark:bg-zinc-900/80 border-zinc-300 dark:border-zinc-700' : ''
                      }`}
                    >
                      {/* Column Header */}
                      <div className="flex justify-between items-center mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2 flex-shrink-0">
                        <span className="font-extrabold text-xs text-zinc-650 dark:text-zinc-300 uppercase tracking-wider">
                          {status}
                        </span>
                        <Badge
                          variant="secondary"
                          className="bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 font-extrabold"
                        >
                          {statusTasks.length}
                        </Badge>
                      </div>

                      {/* Task cards scroll wrapper */}
                      <div className="space-y-3 overflow-y-auto flex-grow pb-4 min-h-[150px]">
                        {statusTasks.map((t, index) => {
                          const childTasks = [...(t.children || []), ...(t.subtasks || [])];
                          const isParent = childTasks.length > 0;
                          const durationText = t.duration_days ? `${t.duration_days} Days` : 'N/A';
                          
                          return (
                            <Draggable
                              key={String(t.id)}
                              draggableId={String(t.id)}
                              index={index}
                              isDragDisabled={isParent}
                            >
                              {(providedDraggable, snapshotDraggable) => (
                                <Card
                                  ref={providedDraggable.innerRef}
                                  {...providedDraggable.draggableProps}
                                  {...providedDraggable.dragHandleProps}
                                  className={`bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer select-none transition-all flex flex-col gap-2 p-3.5 shadow-sm dark:shadow-md ${
                                    snapshotDraggable.isDragging ? 'shadow-2xl border-zinc-400 dark:border-zinc-600 scale-[1.02]' : ''
                                  } ${isParent ? 'opacity-85 border-amber-300/40 dark:border-amber-900/40 bg-amber-50/10 dark:bg-zinc-955/90' : ''}`}
                                >
                                  {/* Task Title & Header Badges */}
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="font-semibold text-zinc-900 dark:text-zinc-200 text-sm leading-snug">
                                      {t.title}
                                    </span>
                                    {isParent && (
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] bg-amber-500/10 dark:bg-amber-955/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900 flex items-center gap-1 font-bold whitespace-nowrap"
                                      >
                                        <Lock className="w-2.5 h-2.5" /> Phase
                                      </Badge>
                                    )}
                                  </div>

                                  {t.description && (
                                    <p className="text-zinc-500 dark:text-zinc-400 text-xs truncate max-w-full">
                                      {t.description}
                                    </p>
                                  )}

                                  {/* Card bottom metadata elements */}
                                  <div className="flex justify-between items-center mt-2.5 border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
                                    <div className="flex items-center gap-2">
                                      {/* Project name Badge */}
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 font-bold"
                                      >
                                        ðŸ“ {getProjectName(t)}
                                      </Badge>

                                      {/* Duration display */}
                                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {durationText}
                                      </span>
                                    </div>

                                    {/* Assignee Avatar */}
                                    {(t.assignee || (t.assignees && t.assignees.length > 0)) ? (
                                      <Avatar className="w-5.5 h-5.5 text-[10px] border border-zinc-200 dark:border-zinc-800">
                                        <AvatarFallback 
                                          className="text-white font-extrabold text-[8px] flex items-center justify-center"
                                          style={{ backgroundColor: getAvatarColor(t.assignee?.name || t.assignees[0]?.name) }}
                                        >
                                          {(t.assignee?.name || t.assignees[0]?.name).charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                    ) : (
                                      <Avatar className="w-5.5 h-5.5 text-[10px] border border-zinc-200 dark:border-zinc-800">
                                        <AvatarFallback className="bg-zinc-650 text-white font-extrabold text-[8px] flex items-center justify-center">
                                          U
                                        </AvatarFallback>
                                      </Avatar>
                                    )}
                                  </div>
                                </Card>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                        
                        {statusTasks.length === 0 && (
                          <div className="flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-650 py-12 text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-100/50 dark:bg-zinc-950/10">
                            <AlertTriangle className="w-5 h-5 mb-1.5 text-zinc-400 dark:text-zinc-600" />
                            No tasks in this column
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}
