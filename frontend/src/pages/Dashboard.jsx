import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Folder } from 'lucide-react';
import axios from 'axios';

// Import shadcn UI Components
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Separator } from '../components/ui/separator';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '../components/ui/table';

export default function Dashboard() {
  const {
    selectedWorkspace,
    selectedList,
    setSelectedList,
    tasks,
    fetchTasks,
    fetchProjects,
    selectedProjectId,
    setSelectedProjectId,
    notifications,
    markNotificationRead,
    timeEntries,
    activeTimer,
    timerSeconds,
    handleStartTimer,
    handleStopTimer,
    documents,
    selectedDoc,
    setSelectedDoc,
    handleCreateDoc,
    handleSaveDocContent,
    chatChannels,
    selectedChannel,
    setSelectedChannel,
    chatMessages,
    newMessage,
    setNewMessage,
    handlePostChatMessage,
    handleCreateChannel,
    forms,
    selectedForm,
    setSelectedForm,
    formSubmissionData,
    setFormSubmissionData,
    handleCreateForm,
    handleSubmitFormResult,
    automationRules,
    goals,
    setGoals,
    burndownReport,
    velocityReport,
    showAIConsole,
    setShowAIConsole,
    aiPrompt,
    setAiPrompt,
    aiResponse,
    setAiResponse,
    aiLoading,
    handleCallAIAssistant,
    handleDragStart,
    handleDrop,
    handleDragOver,
    handleStatusChange,
    handlePriorityChange,
    handleUpdateTaskDescription,
    handleUpdateTaskDates,
    handleUpdateTaskAssignees,
    handleCreateSubtask,
    handlePostComment,
    handleUploadAttachment,
    canvasRef,
    paintColor,
    setPaintColor,
    startDrawing,
    draw,
    stopDrawing,
    clearCanvas,
    getPriorityStyle,
    taskComments,
    newComment,
    setNewComment,
    taskAttachments,
    attachmentFile,
    setAttachmentFile,
    subtaskTitle,
    setSubtaskTitle,
    fetchComments,
    fetchAttachments,
    newWorkspaceName,
    setNewWorkspaceName,
    newSpaceName,
    setNewSpaceName,
    newFolderName,
    setNewFolderName,
    newListName,
    setNewListName,
    newFormTitle,
    setNewFormTitle,
    newGoal,
    setNewGoal,
    newRule,
    setNewRule,
    newTask,
    setNewTask,
    showWorkspaceModal,
    setShowWorkspaceModal,
    showSpaceModal,
    setShowSpaceModal,
    showFolderModal,
    setShowFolderModal,
    showListModal,
    setShowListModal,
    showTaskModal,
    setShowTaskModal,
    showFormModal,
    setShowFormModal,
    showGoalModal,
    setShowGoalModal,
    showAutomationModal,
    setShowAutomationModal,
    fetchDashboardStats,
    selectedTask,
    setSelectedTask,
    stats,
    workspaceMembers,
    spaces,
  } = useOutletContext();


  // Local state for dashboard Forms and Table
  const [newProject, setNewProject] = useState({ name: '', manager: '', due_date: '' });
  const [newDashboardTask, setNewDashboardTask] = useState({ title: '', duration: '', predecessor_id: '', parent_id: '', list_id: '', project_id: '' });
  const [workspaceTasks, setWorkspaceTasks] = useState([]);

  const fetchWorkspaceTasks = async () => {
    if (!selectedWorkspace) return;
    try {
      let url = `${import.meta.env.VITE_API_URL}/api/tasks?workspace_id=${selectedWorkspace.id}`;
      if (selectedProjectId) {
        url = `${import.meta.env.VITE_API_URL}/api/tasks?project_id=${selectedProjectId}`;
      }
      const res = await axios.get(url);
      setWorkspaceTasks(res.data);
    } catch (err) {
      console.error("Error fetching workspace tasks:", err);
    }
  };

  useEffect(() => {
    fetchWorkspaceTasks();
  }, [selectedWorkspace, selectedProjectId]);

  // Compute local stats if project is selected
  const total = workspaceTasks.length;
  const completed = workspaceTasks.filter(t => t.status === 'Done').length;
  const pending = workspaceTasks.filter(t => t.status !== 'Done').length;
  const todayStr = new Date().toISOString().split('T')[0];
  const overdue = workspaceTasks.filter(t => t.status !== 'Done' && t.end_date && t.end_date < todayStr).length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const displayStats = selectedProjectId ? {
    total_tasks: total,
    completed_tasks: completed,
    pending_tasks: pending,
    overdue_tasks: overdue,
    completion_rate: rate
  } : (stats || { total_tasks: 0, completed_tasks: 0, pending_tasks: 0, overdue_tasks: 0, completion_rate: 0 });

  // Project Creation Handler (maps to a database Space)
  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/projects`, {
        workspace_id: selectedWorkspace.id,
        name: newProject.name,
        description: `Manager: ${newProject.manager}, Target End Date: ${newProject.due_date}`
      });
      alert('Project created successfully!');
      setNewProject({ name: '', manager: '', due_date: '' });
      // Refresh projects
      await fetchProjects(selectedWorkspace.id);
      setSelectedProjectId(res.data.id);
      fetchDashboardStats(selectedWorkspace.id);
    } catch (err) {
      console.error("Error creating project:", err);
      alert('Failed to create project.');
    }
  };

  // Helper to auto-create Default Folder/List under selected Project to enable immediate task seeding
  const resolveListIdForProject = async (projectId) => {
    try {
      const foldersRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/folders?project_id=${projectId}`);
      let listId = null;
      if (foldersRes.data.length > 0) {
        const firstFolder = foldersRes.data[0];
        const listsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/lists?folder_id=${firstFolder.id}`);
        if (listsRes.data.length > 0) {
          listId = listsRes.data[0].id;
        } else {
          const listCreateRes = await axios.post(`${import.meta.env.VITE_API_URL}/api/lists`, {
            folder_id: firstFolder.id,
            name: 'Default List'
          });
          listId = listCreateRes.data.id;
        }
      } else {
        const folderCreateRes = await axios.post(`${import.meta.env.VITE_API_URL}/api/folders`, {
          project_id: Number(projectId),
          name: 'Default Folder'
        });
        const listCreateRes = await axios.post(`${import.meta.env.VITE_API_URL}/api/lists`, {
          folder_id: folderCreateRes.data.id,
          name: 'Default List'
        });
        listId = listCreateRes.data.id;
      }
      setNewDashboardTask(prev => ({ ...prev, list_id: String(listId) }));
    } catch (err) {
      console.error("Error resolving list for project:", err);
    }
  };

  useEffect(() => {
    if (newDashboardTask.project_id) {
      resolveListIdForProject(newDashboardTask.project_id);
    }
  }, [newDashboardTask.project_id]);

  // Dashboard Task Creation Handler
  const handleCreateDashboardTask = async (e) => {
    e.preventDefault();
    if (!newDashboardTask.list_id) {
      alert('Please select a project with at least one list, or wait for one to be resolved.');
      return;
    }
    try {
      const durationVal = newDashboardTask.duration ? Number(newDashboardTask.duration) : 1;
      const startStr = new Date().toISOString().split('T')[0];
      const dueStr = new Date(Date.now() + (durationVal - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const payload = {
        list_id: Number(newDashboardTask.list_id),
        title: newDashboardTask.title,
        priority: 'Medium',
        status: 'Todo',
        duration_days: durationVal,
        predecessor_id: newDashboardTask.predecessor_id ? Number(newDashboardTask.predecessor_id) : null,
        parent_id: newDashboardTask.parent_id ? Number(newDashboardTask.parent_id) : null,
        start_date: startStr,
        due_date: dueStr
      };
      
      await axios.post(`${import.meta.env.VITE_API_URL}/api/tasks`, payload);
      alert('Task created successfully!');
      setNewDashboardTask({ title: '', duration: '', predecessor_id: '', parent_id: '', list_id: '', project_id: '' });
      fetchWorkspaceTasks();
      fetchDashboardStats(selectedWorkspace.id);
      if (selectedList) {
        fetchTasks(selectedList.id);
      }
    } catch (err) {
      console.error("Error creating dashboard task:", err);
      alert(err.response?.data?.detail || 'Failed to create task.');
    }
  };

  // Status Change Handler inside Task Table
  const handleStatusChangeLocal = async (taskId, newStatus) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/tasks/${taskId}`, { status: newStatus });
      fetchDashboardStats(selectedWorkspace.id);
      fetchWorkspaceTasks();
      if (selectedList) {
        fetchTasks(selectedList.id);
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // Helper to flatten tasks hierarchy
  const getFlattenedTasks = (taskList) => {
    const flat = [];
    const flatten = (items) => {
      items.forEach(item => {
        flat.push(item);
        if (item.children && item.children.length > 0) {
          flatten(item.children);
        }
        if (item.subtasks && item.subtasks.length > 0) {
          flatten(item.subtasks);
        }
      });
    };
    flatten(taskList);
    return flat;
  };

  const allFlattenedTasks = getFlattenedTasks(workspaceTasks);

  return (
    <div className="max-w-6xl mx-auto space-y-7">
          <div>
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Overview Dashboard</h2>
            <p className="text-muted-foreground text-sm mt-1">Analytics overview and metrics monitoring for the active workspace.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="pb-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">{displayStats.total_tasks}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Completed Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-success">{displayStats.completed_tasks}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-info">{displayStats.pending_tasks}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overdue Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-destructive">{displayStats.overdue_tasks}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold">Workspace Tasks Progress Completion</CardTitle>
              <Badge variant="secondary" className="font-extrabold">{displayStats.completion_rate}%</Badge>
            </CardHeader>
            <CardContent>
              <Progress value={displayStats.completion_rate} className="h-2" />
            </CardContent>
          </Card>



          {/* Recent Tasks Table */}
          <Card className="shadow-xl w-full">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Recent Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="py-3.5 px-6 text-muted-foreground">Task Title</TableHead>
                    <TableHead className="py-3.5 px-4 text-muted-foreground">Priority</TableHead>
                    <TableHead className="py-3.5 px-4 text-muted-foreground">Due Date</TableHead>
                    <TableHead className="py-3.5 px-4 text-muted-foreground">Duration</TableHead>
                    <TableHead className="py-3.5 px-6 text-right text-muted-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allFlattenedTasks.map(task => {
                    const childTasks = [...(task.children || []), ...(task.subtasks || [])];
                    const isParent = childTasks.length > 0;
                    return (
                      <TableRow key={task.id} className="transition">
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            {isParent ? (
                              <Folder className="w-4 h-4 text-primary fill-primary/20" />
                            ) : null}
                            {(task.assignee || (task.assignees && task.assignees.length > 0)) && (
                              <Avatar className="w-6 h-6 flex-shrink-0">
                                <AvatarFallback 
                                  className="font-bold text-[10px] flex items-center justify-center"
                                >
                                  {(task.assignee?.name || task.assignees[0]?.name).charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <span 
                              onClick={() => { setSelectedTask(task); fetchComments(task.id); fetchAttachments(task.id); }} 
                              className={`hover:text-primary cursor-pointer transition text-sm ${isParent ? 'font-bold text-foreground' : 'font-semibold text-card-foreground'}`}
                            >
                              {task.title}
                            </span>
                            {task.predecessor_id && (
                              <Badge variant="outline" className="text-[9px] font-extrabold uppercase">
                                Predecessor: #{task.predecessor_id}
                              </Badge>
                            )}
                          </div>
                          {task.description && <p className="text-xs text-muted-foreground mt-1 max-w-sm truncate">{task.description}</p>}
                        </TableCell>
                        <TableCell className="py-4 px-4 text-xs font-semibold">
                          <Badge variant={getPriorityStyle(task.priority)} className="text-[9px] font-bold">{task.priority}</Badge>
                        </TableCell>
                        <TableCell className="py-4 px-4 text-muted-foreground text-xs font-semibold">{task.end_date || <span className="text-muted-foreground">No date</span>}</TableCell>
                        <TableCell className="py-4 px-4 text-muted-foreground text-xs font-semibold">{task.duration_days ? `${task.duration_days} Days` : <span className="text-muted-foreground">N/A</span>}</TableCell>
                        <TableCell className="py-4 px-6 flex justify-end">
                          <Select 
                            value={task.status} 
                            onValueChange={(val) => handleStatusChangeLocal(task.id, val)}
                            disabled={isParent}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs font-bold">
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
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {allFlattenedTasks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan="5" className="py-12 text-center text-muted-foreground text-sm">
                        {selectedProjectId 
                          ? "No tasks found in this project. Create tasks above." 
                          : "No tasks found in workspace. Create tasks above."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
  );
}
