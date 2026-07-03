import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { NavLink, Link, Outlet, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { 
  Home, 
  Inbox, 
  CheckSquare, 
  Layers, 
  Search, 
  Bell, 
  Settings, 
  Plus, 
  Clock, 
  Play, 
  Square, 
  Sparkles, 
  BookOpen, 
  MessageSquare, 
  ClipboardList, 
  Sliders, 
  Target, 
  PenTool, 
  BarChart2, 
  Calendar as CalendarIcon,
  Calendar,
  ChevronDown,
  LogOut,
  FolderOpen,
  Folder,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  Users,
  Trash2,
  UserPlus,
  FileText,
  Grid,
  Zap,
  ArrowUp
} from 'lucide-react';

import InviteMemberModal from '../InviteMemberModal';
import TeamDirectory from '../TeamDirectory';
import TaskModal from '../tasks/TaskModal';

// Import shadcn UI Components
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { Progress } from '../ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator 
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from '../ui/tooltip';
import { cn } from '../../lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // --- DUAL-TIER NAV STATE ---
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeNavTab') || 'home';
  });
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  useEffect(() => {
    localStorage.setItem('activeNavTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const path = location.pathname;
    if (path === '/' || path === '/home') {
      setActiveTab('home');
    } else if (path === '/calendar' || path === '/gantt') {
      setActiveTab('calendar');
    } else if (path === '/docs') {
      setActiveTab('docs');
    } else if (path === '/dashboard') {
      setActiveTab('dashboard');
    }
  }, [location.pathname]);

  // --- AUTHENTICATION STATE ---
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [currentUser, setCurrentUser] = useState(null);
  const [authView, setAuthView] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');

  // --- Read invite context from JoinTeam navigation state ---
  const inviteState = location.state || {};
  const [pendingInviteToken, setPendingInviteToken] = useState(inviteState.inviteToken || '');
  const [pendingInviteEmail, setPendingInviteEmail] = useState(inviteState.inviteEmail || '');

  // Automatically switch to login view and pre-fill email if coming from JoinTeam
  useEffect(() => {
    if (inviteState.fromInvite) {
      setAuthView('login');
      if (inviteState.inviteEmail) {
        setAuthForm(f => ({ ...f, email: inviteState.inviteEmail }));
      }
      setAuthError('');
    } else if (window.location.pathname === '/register') {
      setAuthView('register');
    }
  }, []);

  // --- Handle Google OAuth token returned in URL (after /api/auth/google/callback redirect) ---
  useEffect(() => {
    const googleToken = searchParams.get('google_token');
    if (googleToken && !token) {
      localStorage.setItem('token', googleToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${googleToken}`;
      setToken(googleToken);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams]);

  // --- HIERARCHY STATE ---
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [spaces, setSpaces] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    const val = localStorage.getItem('selectedProjectId');
    return val ? Number(val) : null;
  });
  const isFirstWorkspaceLoad = useRef(true);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [lists, setLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);

  // --- COMPONENT LEVEL LISTINGS ---
  const [tasks, setTasks] = useState([]);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [timeEntries, setTimeEntries] = useState([]);
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // --- COLLABORATION & ENTERPRISE ---
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [chatChannels, setChatChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [forms, setForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [formSubmissionData, setFormSubmissionData] = useState({ title: '', description: '', priority: 'Medium' });
  const [automationRules, setAutomationRules] = useState([]);
  const [goals, setGoals] = useState([]);
  const [burndownReport, setBurndownReport] = useState([]);
  const [velocityReport, setVelocityReport] = useState([]);
  const [stats, setStats] = useState({ total_tasks: 0, completed_tasks: 0, pending_tasks: 0, overdue_tasks: 0, completion_rate: 0 });

  // --- MODALS ---
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showSpaceModal, setShowSpaceModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showAutomationModal, setShowAutomationModal] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // --- CREATION BUFFER STATS ---
  const [itemToDelete, setItemToDelete] = useState(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [newListName, setNewListName] = useState('');
  const [newFormTitle, setNewFormTitle] = useState('');
  const [newGoal, setNewGoal] = useState({ title: '', target_value: 100, due_date: '' });
  const [newRule, setNewRule] = useState({ trigger_type: 'status_changed', condition_value: 'Done', action_type: 'notify_user', action_value: '' });
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'Medium', start_date: '', due_date: '', predecessor_id: '', parent_id: '', assignee_ids: [], assigned_to_id: null });

  // --- TASK DETAILS ---
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskComments, setTaskComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [taskAttachments, setTaskAttachments] = useState([]);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [subtaskTitle, setSubtaskTitle] = useState('');

  // --- AI CONSOLE ---
  const [showAIConsole, setShowAIConsole] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // --- WEBSOCKET REF ---
  const wsRef = useRef(null);

  const currentUserRole = (workspaceMembers || [])
    .find(m => m.user_id === currentUser?.id)
    ?.role?.toLowerCase();

  // Headers
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // --- TRIGGERS ---
  useEffect(() => { if (token) fetchCurrentUser(); }, [token]);

  // Handle invitation token for existing logged in users
  useEffect(() => {
    const inviteToken = searchParams.get('token');
    if (inviteToken && token) {
      const acceptInvitation = async () => {
        try {
          const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/workspaces/accept-invite?token=${inviteToken}`);
          alert(res.data.message || 'Successfully accepted invitation!');
          fetchWorkspaces();
          if (selectedWorkspace) {
            fetchWorkspaceMembers(selectedWorkspace.id);
          }
          // Remove token from URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          alert(err.response?.data?.detail || 'Failed to accept invitation.');
        }
      };
      acceptInvitation();
    }
  }, [token, searchParams]);

  useEffect(() => { if (currentUser) fetchWorkspaces(); }, [currentUser]);

  useEffect(() => {
    if (selectedWorkspace && selectedWorkspace.id) {
      localStorage.setItem('selectedWorkspaceId', selectedWorkspace.id);
      fetchProjects(selectedWorkspace.id);
      fetchWorkspaceMembers(selectedWorkspace.id);
      fetchDocuments(selectedWorkspace.id);
      
      if (isFirstWorkspaceLoad.current) {
        isFirstWorkspaceLoad.current = false;
      } else {
        setSelectedProjectId(null);
        localStorage.removeItem('selectedProjectId');
      }
      
      fetchDashboardStats(selectedWorkspace.id);
      fetchNotifications();
    }
  }, [selectedWorkspace]);

  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem('selectedProjectId', selectedProjectId);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedSpace) fetchFolders(selectedSpace.id);
    else setFolders([]);
    setSelectedFolder(null);
    setSelectedList(null);
  }, [selectedSpace]);

  useEffect(() => {
    if (selectedFolder) fetchLists(selectedFolder.id);
    else setLists([]);
    setSelectedList(null);
  }, [selectedFolder]);

  useEffect(() => {
    if (selectedList) {
      fetchTasks(selectedList.id);
      fetchForms(selectedList.id);
    } else {
      setTasks([]);
      setForms([]);
    }
  }, [selectedList]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchTasks();
    } else {
      setTasks([]);
    }
  }, [selectedProjectId]);

  // Floating timer counter logic
  useEffect(() => {
    let interval = null;
    if (activeTimer) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  // Chat WebSocket streaming connection
  useEffect(() => {
    if (selectedChannel) {
      fetchChatMessages(selectedChannel.id);
      if (wsRef.current) wsRef.current.close();
      
      const wsUrl = `${import.meta.env.VITE_API_URL.replace(/^http/, 'ws')}/api/chat/ws/${selectedChannel.id}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onmessage = () => {
        fetchChatMessages(selectedChannel.id);
      };
      
      return () => {
        if (wsRef.current) wsRef.current.close();
      };
    }
  }, [selectedChannel]);

  // --- DATA FETCHING SERVICES ---
  const fetchCurrentUser = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/me`);
      setCurrentUser(res.data);
    } catch (err) { handleLogout(); }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authView === 'login') {
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, { email: authForm.email, password: authForm.password });
        const tokenVal = res.data.access_token;
        localStorage.setItem('token', tokenVal);
        axios.defaults.headers.common['Authorization'] = `Bearer ${tokenVal}`;
        setToken(tokenVal);
      } else {
        const inviteToken = searchParams.get('token');
        let registerUrl = `${import.meta.env.VITE_API_URL}/api/auth/register`;
        if (inviteToken) {
          registerUrl += `?token=${inviteToken}`;
        }
        await axios.post(registerUrl, authForm);
        setAuthView('login');
        setAuthError('Account created successfully. Login below.');
      }
    } catch (err) { setAuthError(err.response?.data?.detail || 'Authentication failed'); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('selectedWorkspaceId');
    localStorage.removeItem('selectedProjectId');
    delete axios.defaults.headers.common['Authorization'];
    setToken('');
    setCurrentUser(null);
    setWorkspaces([]);
    setSelectedWorkspace(null);
    setSpaces([]);
    setTasks([]);
    navigate('/');
  };

  const fetchWorkspaces = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/workspace`);
      setWorkspaces(res.data);
      if (res.data.length > 0) {
        const savedId = localStorage.getItem('selectedWorkspaceId');
        if (savedId) {
          const found = res.data.find(w => w.id === Number(savedId));
          if (found) {
            setSelectedWorkspace(found);
            return;
          }
        }
        setSelectedWorkspace(res.data[0]);
      }
    } catch (err) { console.error(err); }
  };

  const fetchWorkspaceMembers = async (wid) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/workspaces/${wid}/members`);
      setWorkspaceMembers(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchProjects = async (wid) => {
    const workspaceId = wid || selectedWorkspace?.id;
    if (!workspaceId) return;
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/projects?workspace_id=${workspaceId}`);
      setSpaces(res.data);
      
      const savedProjectId = localStorage.getItem('selectedProjectId');
      if (savedProjectId && res.data.some(p => p.id === Number(savedProjectId))) {
        setSelectedProjectId(Number(savedProjectId));
      }
      return res.data;
    } catch (err) { console.error(err); }
  };

  const resolveListIdForProject = async (projectId) => {
    if (!projectId) return null;
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
      return listId;
    } catch (err) {
      console.error("Error resolving list for project:", err);
      return null;
    }
  };

  const fetchFolders = async (sid) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/folders?project_id=${sid}`);
      setFolders(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchLists = async (fid) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/lists?folder_id=${fid}`);
      setLists(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchTasks = async (lid) => {
    try {
      let url = `${import.meta.env.VITE_API_URL}/api/tasks`;
      const targetLid = lid && (typeof lid === 'number' || typeof lid === 'string') ? lid : null;
      if (targetLid) {
        url += `?list_id=${targetLid}`;
      } else if (selectedProjectId) {
        url += `?project_id=${selectedProjectId}`;
      } else if (selectedWorkspace) {
        url += `?workspace_id=${selectedWorkspace.id}`;
      } else {
        setTasks([]);
        return;
      }
      const res = await axios.get(url);
      setTasks(res.data);
      return res.data;
    } catch (err) { 
      console.error(err); 
      setTasks([]);
    }
  };

  const fetchDashboardStats = async (wid) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/dashboard/overview?workspace_id=${wid}`);
      setStats(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/notifications`);
      setNotifications(res.data);
    } catch (err) { console.error(err); }
  };

  const markNotificationRead = async (nid) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/notifications/${nid}/read`);
      fetchNotifications();
    } catch (err) { console.error(err); }
  };

  const fetchDocuments = async (wid) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/documents?workspace_id=${wid}`);
      setDocuments(res.data);
      if (res.data.length > 0 && !selectedDoc) setSelectedDoc(res.data[0]);
    } catch (err) { console.error(err); }
  };

  const fetchChatChannels = async (wid) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/chat/channels?workspace_id=${wid}`);
      setChatChannels(res.data);
      if (res.data.length > 0 && !selectedChannel) setSelectedChannel(res.data[0]);
    } catch (err) { console.error(err); }
  };

  const fetchChatMessages = async (cid) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/chat/messages?channel_id=${cid}`);
      setChatMessages(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchForms = async (lid) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/forms?list_id=${lid}`);
      setForms(res.data);
      if (res.data.length > 0) setSelectedForm(res.data[0]);
    } catch (err) { console.error(err); }
  };

  const fetchAutomationRules = async (wid) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/automation/rules?workspace_id=${wid}`);
      setAutomationRules(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchGoals = async (wid) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/goals?workspace_id=${wid}`);
      setGoals(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchReports = async (wid) => {
    try {
      const burn = await axios.get(`${import.meta.env.VITE_API_URL}/api/reports/burndown?workspace_id=${wid}`);
      const vel = await axios.get(`${import.meta.env.VITE_API_URL}/api/reports/velocity?workspace_id=${wid}`);
      setBurndownReport(burn.data);
      setVelocityReport(vel.data);
    } catch (err) { console.error(err); }
  };

  const fetchComments = async (taskId) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/comments?task_id=${taskId}`);
      setTaskComments(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchAttachments = async (taskId) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/attachments?task_id=${taskId}`);
      setTaskAttachments(res.data);
    } catch (err) { console.error(err); }
  };

  // --- DELETION HANDLERS ---
  const handleDeleteWorkspace = async (workspaceId) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/workspace/${workspaceId}`);
      const updatedWorkspaces = workspaces.filter(w => w.id !== workspaceId);
      setWorkspaces(updatedWorkspaces);
      if (selectedWorkspace?.id === workspaceId) {
        localStorage.removeItem('selectedWorkspaceId');
        localStorage.removeItem('selectedProjectId');
        setSelectedProjectId(null);
        setSelectedWorkspace(updatedWorkspaces.length > 0 ? updatedWorkspaces[0] : null);
        navigate('/');
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}`);
      setSpaces(spaces.filter(s => s.id !== projectId));
      if (selectedProjectId === projectId) {
        localStorage.removeItem('selectedProjectId');
        setSelectedProjectId(null);
        navigate('/');
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteFolder = async (folderId) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/folders/${folderId}`);
      setFolders(folders.filter(f => f.id !== folderId));
      if (selectedFolder?.id === folderId) {
        setSelectedFolder(null);
        setSelectedList(null);
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteList = async (listId) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/lists/${listId}`);
      setLists(lists.filter(l => l.id !== listId));
      if (selectedList?.id === listId) {
        setSelectedList(null);
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/tasks/${taskId}`);
      if (selectedList) fetchTasks(selectedList.id);
      else if (selectedProjectId) fetchTasks();
      
      if (selectedWorkspace) fetchDashboardStats(selectedWorkspace.id);
      if (selectedTask?.id === taskId) setSelectedTask(null);
    } catch (err) { console.error(err); }
  };

  // --- WRAPPERS & POST HANDLERS ---
  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/workspace`, { name: newWorkspaceName });
      setWorkspaces([...workspaces, res.data]);
      setSelectedWorkspace(res.data);
      setNewWorkspaceName('');
      setShowWorkspaceModal(false);
    } catch (err) { console.error(err); }
  };

  const handleCreateSpace = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/projects`, { workspace_id: selectedWorkspace.id, name: newSpaceName });
      setSpaces([...spaces, res.data]);
      setNewSpaceName('');
      setShowSpaceModal(false);
      // Auto select new project if none is currently selected
      if (!selectedProjectId) {
        setSelectedProjectId(res.data.id);
      }
    } catch (err) { console.error(err); }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/folders`, { project_id: selectedSpace.id, name: newFolderName });
      setFolders([...folders, res.data]);
      setNewFolderName('');
      setShowFolderModal(false);
    } catch (err) { console.error(err); }
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/lists`, { folder_id: selectedFolder.id, name: newListName });
      setLists([...lists, res.data]);
      setNewListName('');
      setShowListModal(false);
    } catch (err) { console.error(err); }
  };

  const handleCreateTaskFromModal = async (taskData) => {
    try {
      let listId = selectedList?.id;
      if (!listId) {
        if (!selectedProjectId) {
          alert("Please select a project first.");
          return;
        }
        listId = await resolveListIdForProject(selectedProjectId);
        if (!listId) {
          alert("Failed to resolve a list for the selected project.");
          return;
        }
      }
      const payload = {
        list_id: listId,
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        start_date: taskData.start_date || null,
        due_date: taskData.due_date || null,
        predecessor_id: taskData.predecessor_id ? Number(taskData.predecessor_id) : null,
        parent_id: taskData.parent_id ? Number(taskData.parent_id) : null,
        assignee_ids: (taskData.assignee_ids || []).map(Number),
        assigned_to_id: taskData.assigned_to_id ? Number(taskData.assigned_to_id) : null,
        // v2 fields
        progress: taskData.progress || 0,
        task_type: taskData.task_type || "task",
        status: taskData.status || "To Do",
        dependency_type: taskData.dependency_type || "FS",
        lag_days: taskData.lag_days || 0,
        estimated_hours: taskData.estimated_hours || 0.0,
        actual_hours: taskData.actual_hours || 0.0,
        remaining_hours: taskData.remaining_hours || 0.0
      };
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/tasks`, payload);
      if (selectedList) {
        fetchTasks(selectedList.id);
      } else {
        fetchTasks();
      }
      setShowTaskModal(false);
      fetchDashboardStats(selectedWorkspace.id);
    } catch (err) { alert(err.response?.data?.detail || 'Failed'); }
  };

  // --- TIME TRACKING ENGINE ---
  const handleStartTimer = async (taskId) => {
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/time-tracking/start`, { task_id: taskId });
      setActiveTimer(res.data);
      setTimerSeconds(0);
    } catch (err) { console.error(err); }
  };

  const handleStopTimer = async () => {
    if (!activeTimer) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/time-tracking/stop/${activeTimer.id}`);
      setActiveTimer(null);
      setTimerSeconds(0);
      alert('Time Entry Logged!');
    } catch (err) { console.error(err); }
  };

  // --- AUTOMATIONS AND GOALS ---
  const handleCreateGoal = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/goals`, {
        workspace_id: selectedWorkspace.id,
        title: newGoal.title,
        target_value: Number(newGoal.target_value),
        due_date: newGoal.due_date || null
      });
      setGoals([...goals, res.data]);
      setNewGoal({ title: '', target_value: 100, due_date: '' });
      setShowGoalModal(false);
    } catch (err) { console.error(err); }
  };

  const handleCreateAutomationRule = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/automation/rules`, {
        workspace_id: selectedWorkspace.id,
        trigger_type: newRule.trigger_type,
        condition_value: newRule.condition_value,
        action_type: newRule.action_type,
        action_value: newRule.action_value
      });
      setAutomationRules([...automationRules, res.data]);
      setShowAutomationModal(false);
    } catch (err) { console.error(err); }
  };

  // --- DOCS WRITER ---
  const handleCreateDoc = async () => {
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/documents`, {
        workspace_id: selectedWorkspace.id,
        title: 'Untitled Document',
        content: ''
      });
      setDocuments([...documents, res.data]);
      setSelectedDoc(res.data);
    } catch (err) { console.error(err); }
  };

  const handleSaveDocContent = async (title, content) => {
    if (!selectedDoc) return;
    try {
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/documents/${selectedDoc.id}`, {
        workspace_id: selectedWorkspace.id,
        title: title,
        content: content
      });
      setDocuments(documents.map(d => d.id === selectedDoc.id ? res.data : d));
      setSelectedDoc(res.data);
    } catch (err) { console.error(err); }
  };

  const handleDeleteDoc = async (docId) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/documents/${docId}`);
      const updatedDocs = documents.filter(d => d.id !== docId);
      setDocuments(updatedDocs);
      if (selectedDoc?.id === docId) {
        setSelectedDoc(updatedDocs.length > 0 ? updatedDocs[0] : null);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to delete document');
    }
  };

  // --- CHAT DISPATCH ---
  const handlePostChatMessage = async (e) => {
    e.preventDefault();
    if (!newMessage || !selectedChannel) return;
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/chat/messages`, {
        channel_id: selectedChannel.id,
        message: newMessage
      });
      setNewMessage('');
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(res.data));
      } else {
        fetchChatMessages(selectedChannel.id);
      }
    } catch (err) { console.error(err); }
  };

  const handleCreateChannel = async (name) => {
    if (!name) return;
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/chat/channels`, {
        workspace_id: selectedWorkspace.id,
        name: name
      });
      setChatChannels([...chatChannels, res.data]);
      setSelectedChannel(res.data);
    } catch (err) { console.error(err); }
  };

  // --- FORMS SUBMISSIONS ---
  const handleCreateForm = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/forms`, {
        list_id: selectedList.id,
        title: newFormTitle
      });
      setForms([...forms, res.data]);
      setSelectedForm(res.data);
      setNewFormTitle('');
      setShowFormModal(false);
    } catch (err) { console.error(err); }
  };

  const handleSubmitFormResult = async (e) => {
    e.preventDefault();
    if (!selectedForm) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/forms/submit/${selectedForm.id}`, formSubmissionData);
      alert('Form Submitted successfully. Task created!');
      setFormSubmissionData({ title: '', description: '', priority: 'Medium' });
      if (selectedList) fetchTasks(selectedList.id);
      fetchDashboardStats(selectedWorkspace.id);
    } catch (err) { console.error(err); }
  };

  // --- AI ASSISTANT SERVICE ---
  const handleCallAIAssistant = async (e) => {
    e.preventDefault();
    setAiLoading(true);
    setAiResponse('');
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/ai/chat`, { prompt: aiPrompt });
      setAiResponse(res.data.response);
    } catch (err) {
      setAiResponse('AI service failed to connect.');
    } finally {
      setAiLoading(false);
    }
  };

  // --- TASK DRAG & DROP HANDLERS (Kanban) ---
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = async (e, targetStatus) => {
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;
    try {
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/tasks/${taskId}`, {
        status: targetStatus
      });
      setTasks(tasks.map(t => t.id === Number(taskId) ? res.data : t));
      fetchDashboardStats(selectedWorkspace.id);
    } catch (err) { console.error(err); }
  };

  const handleDragOver = (e) => { e.preventDefault(); };

  // --- INLINE UPDATERS ---
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/tasks/${taskId}`, { status: newStatus });
      if (selectedList) fetchTasks(selectedList.id);
      else if (selectedProjectId) fetchTasks();
      if (selectedTask && selectedTask.id === taskId) setSelectedTask(res.data);
      fetchDashboardStats(selectedWorkspace.id);
    } catch (err) { console.error(err); }
  };

  const handlePriorityChange = async (taskId, newPriority) => {
    try {
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/tasks/${taskId}`, { priority: newPriority });
      if (selectedList) fetchTasks(selectedList.id);
      else if (selectedProjectId) fetchTasks();
      if (selectedTask && selectedTask.id === taskId) setSelectedTask(res.data);
    } catch (err) { console.error(err); }
  };

  // --- PROPERTIES EDITORS ---
  const handleUpdateTaskDescription = async (desc) => {
    if (!selectedTask) return;
    try {
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/tasks/${selectedTask.id}`, { description: desc });
      if (selectedList) fetchTasks(selectedList.id);
      else if (selectedProjectId) fetchTasks();
      setSelectedTask(res.data);
    } catch (err) { console.error(err); }
  };

  const handleUpdateTaskDates = async (startVal, dueVal) => {
    if (!selectedTask) return;
    try {
      const payload = {};
      if (startVal !== undefined) payload.start_date = startVal || null;
      if (dueVal !== undefined) payload.due_date = dueVal || null;
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/tasks/${selectedTask.id}`, payload);
      if (selectedList) fetchTasks(selectedList.id);
      else if (selectedProjectId) fetchTasks();
      setSelectedTask(res.data);
    } catch (err) { alert(err.response?.data?.detail || 'Failed'); }
  };

  const handleUpdateTaskAssignees = async (userId, isChecked) => {
    if (!selectedTask) return;
    let currentIds = selectedTask.assignees.map(a => a.id);
    if (isChecked) currentIds.push(userId);
    else currentIds = currentIds.filter(id => id !== userId);
    try {
      const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/tasks/${selectedTask.id}`, { assignee_ids: currentIds });
      if (selectedList) fetchTasks(selectedList.id);
      else if (selectedProjectId) fetchTasks();
      setSelectedTask(res.data);
    } catch (err) { console.error(err); }
  };

  const handleCreateSubtask = async (e) => {
    e.preventDefault();
    if (!subtaskTitle || !selectedTask) return;
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/tasks`, {
        list_id: selectedTask.list_id,
        title: subtaskTitle,
        parent_task_id: selectedTask.id
      });
      if (selectedList) fetchTasks(selectedList.id);
      else if (selectedProjectId) fetchTasks();
      setSelectedTask({ ...selectedTask, subtasks: [...(selectedTask.subtasks || []), res.data] });
      setSubtaskTitle('');
    } catch (err) { console.error(err); }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment || !selectedTask) return;
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/comments`, { task_id: selectedTask.id, message: newComment });
      setTaskComments([...taskComments, res.data]);
      setNewComment('');
    } catch (err) { console.error(err); }
  };

  const handleUploadAttachment = async (e) => {
    e.preventDefault();
    if (!attachmentFile || !selectedTask) return;
    const formData = new FormData();
    formData.append('file', attachmentFile);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/attachments?task_id=${selectedTask.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setTaskAttachments([...taskAttachments, res.data]);
      setAttachmentFile(null);
    } catch (err) { console.error(err); }
  };

  // Canvas drawing Board (Whiteboard)
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paintColor, setPaintColor] = useState('#2563eb');

  const startDrawing = ({ nativeEvent }) => {
    if (!canvasRef.current) return;
    const { offsetX, offsetY } = nativeEvent;
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = paintColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing || !canvasRef.current) return;
    const { offsetX, offsetY } = nativeEvent;
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => { setIsDrawing(false); };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  // Status/Priority badges style maps
  const getPriorityStyle = (p) => {
    switch (p) {
      case 'Urgent': return 'destructive';
      case 'High': return 'outline';
      case 'Medium': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (s) => {
    switch ((s || '').toLowerCase()) {
      case 'done': return 'bg-emerald-950 text-emerald-350 border border-emerald-900';
      case 'in progress': return 'bg-blue-950 text-blue-300 border border-blue-900';
      case 'review': return 'bg-purple-950 text-purple-300 border border-purple-900';
      case 'testing': return 'bg-amber-950 text-amber-300 border border-amber-900';
      default: return 'bg-zinc-800 text-zinc-300 border border-zinc-700';
    }
  };

  // --- Google OAuth redirect handler ---
  const handleGoogleLogin = () => {
    let url = `${import.meta.env.VITE_API_URL}/api/auth/google/login`;
    const params = new URLSearchParams();
    if (pendingInviteToken) params.set('invite_token', pendingInviteToken);
    if (pendingInviteEmail) params.set('invite_email', pendingInviteEmail);
    const qs = params.toString();
    if (qs) url += `?${qs}`;
    window.location.href = url;
  };

  // --- REGISTER / LOGIN LAYOUT wrapper ---
  if (!token) {
    const hasInvite = !!pendingInviteToken;

    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
        {/* Subtle grid background */}
        <div className="fixed inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }} />

        <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center relative z-10">
          <img src="/xbp_asia_icon.png" alt="XBP ASIA Logo" className="w-16 h-16 rounded-2xl mb-4 shadow-xl border border-zinc-800" />
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-white">XBP ASIA</h2>
          <p className="mt-2 text-center text-sm text-zinc-500">
            {hasInvite ? 'Sign in to accept your workspace invitation' : 'Complete multi-phase enterprise platform.'}
          </p>
          {hasInvite && pendingInviteEmail && (
            <div className="mt-3 flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span className="text-xs text-zinc-400 font-medium">{pendingInviteEmail}</span>
            </div>
          )}
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <Card className="bg-zinc-900 border-zinc-800 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-center text-lg font-bold">
                {authView === 'login' ? 'Sign In' : 'Create Account'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {authError && (
                <div className="bg-red-950/50 border border-red-900 text-red-200 px-4 py-2.5 rounded-lg text-xs font-semibold">
                  {authError}
                </div>
              )}

              {/* Google OAuth button â€” always shown, prominent on invite flow */}
              <button
                id="google-oauth-btn"
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 hover:border-zinc-600 text-sm font-semibold text-zinc-200 transition-all duration-150 cursor-pointer"
                style={{ outline: 'none' }}
              >
                {/* Google G SVG */}
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.2045c0-.638-.0573-1.252-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7177v2.2581h2.9086c1.7018-1.5668 2.6836-3.874 2.6836-6.6163z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9086-2.2581c-.8059.54-1.8368.859-3.0477.859-2.3441 0-4.3295-1.5832-5.036-3.7105H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71c-.18-.54-.2827-1.1168-.2827-1.71s.1027-1.17.2827-1.71V4.9582H.9574C.3477 6.1732 0 7.5482 0 9s.3477 2.8268.9574 4.0418L3.964 10.71z" fill="#FBBC05"/>
                  <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5813C13.4627.8918 11.4255 0 9 0 5.4818 0 2.4382 2.0168.9574 4.9582L3.964 7.29C4.6705 5.1627 6.6559 3.5795 9 3.5795z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-xs text-zinc-600 font-medium">or continue with email</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>

              {/* Traditional email/password form â€” hidden if invite token present, shown on toggle */}
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authView === 'register' && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Name</label>
                    <Input
                      type="text"
                      required
                      value={authForm.name}
                      onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                      placeholder="Your full name"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Email Address</label>
                  <Input
                    type="email"
                    required
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    placeholder="name@company.com"
                  />
                </div>
                {/* Hide password field during invite flow to encourage Google OAuth */}
                {!hasInvite && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Password</label>
                    <Input
                      type="password"
                      required
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                    />
                  </div>
                )}
                {hasInvite && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Password</label>
                    <Input
                      type="password"
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                    />
                    <p className="text-xs text-zinc-500 mt-1">ðŸ’¡ We recommend using "Continue with Google" above to get started faster.</p>
                  </div>
                )}
                <Button type="submit" className="w-full font-bold">
                  {authView === 'login' ? 'Sign In' : 'Create Account'}
                </Button>
              </form>

              <div className="text-center">
                <Button variant="link" size="sm" onClick={() => setAuthView(authView === 'login' ? 'register' : 'login')}>
                  {authView === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // --- DYNAMIC NAVIGATION ITEMS ---
  const navItems = [
    { to: "/", label: "Overview Dashboard", icon: Home },
    { 
      to: "/tasks", 
      label: "Task Engine List", 
      icon: CheckSquare, 
      workspaceRequired: true, 
      onClickExtra: () => { if (lists.length > 0 && !selectedList) setSelectedList(lists[0]); } 
    },
    { to: "/kanban", label: "Kanban Board", icon: Layers, workspaceRequired: true },
    { to: "/calendar", label: "Calendar Matrix", icon: CalendarIcon, workspaceRequired: true },
    { to: "/gantt", label: "Gantt Timeline", icon: BarChart2, workspaceRequired: true },
    { to: "/whiteboard", label: "Whiteboard Canvas", icon: PenTool, workspaceRequired: true },
    { to: "/reports", label: "Sprint Reports", icon: Sliders, workspaceRequired: true },
  ];

  const collabItems = [
    { to: "/docs", label: "Notion Docs", icon: BookOpen, action: () => handleCreateDoc(), actionLabel: "+ New" },
    { to: "/chat", label: "Channel Chat", icon: MessageSquare, action: () => { const n = prompt('Channel Name:'); handleCreateChannel(n); }, actionLabel: "+ Add" },
    { to: "/forms", label: "Task Forms", icon: ClipboardList, action: () => setShowFormModal(true), actionLabel: "+ Config" },
    { to: "/automation", label: "Automations", icon: Sliders, action: () => setShowAutomationModal(true), actionLabel: "+ Add" },
    { to: "/goals", label: "Targets Goals", icon: Target, action: () => setShowGoalModal(true), actionLabel: "+ Goal" },
  ];

  // --- ENTERPRISE WEB APP SHELL ---
  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-zinc-50 dark:bg-[#121315] text-zinc-800 dark:text-zinc-200 font-sans overflow-hidden">
        
        {/* Top Header Menu Bar */}
        <header className="h-14 w-full bg-white dark:bg-[#1b1c1e] border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between px-6 flex-shrink-0 z-40 select-none">
          {/* Left: Workspace switcher pill, navigation toggle and breadcrumbs */}
          <div className="flex items-center gap-3">
            <img 
              src="/xbp_asia_icon.png" 
              alt="XBP ASIA" 
              className="w-8 h-8 rounded-[6px] border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:scale-105 transition-transform duration-200" 
              onClick={() => navigate('/')} 
            />
            
            {/* Workspace Selector Pill */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 hover:bg-transparent rounded-lg cursor-pointer border border-zinc-200 dark:border-zinc-800 transition duration-150 select-none outline-none">
                  <div className="w-6 h-6 rounded-[5px] bg-[#0f8a5f] text-white flex items-center justify-center font-extrabold text-xs">
                    {selectedWorkspace?.name?.charAt(0) || 'T'}
                  </div>
                  <span className="text-zinc-850 dark:text-zinc-200 font-bold text-xs truncate max-w-[120px]">
                    {selectedWorkspace?.name || 'Workspace'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" side="bottom" align="start">
                <DropdownMenuLabel className="text-xs">Switch Workspace</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {workspaces.map(w => (
                  <DropdownMenuItem 
                    key={w.id} 
                    onClick={() => setSelectedWorkspace(w)} 
                    className={`font-semibold cursor-pointer text-xs flex justify-between items-center ${selectedWorkspace?.id === w.id ? 'bg-zinc-200 dark:bg-zinc-800 font-bold' : ''}`}
                  >
                    <span>ðŸ¢ {w.name}</span>
                    {['admin', 'owner'].includes(currentUserRole) && (
                      <Trash2 
                        className="w-3.5 h-3.5 text-red-500 hover:text-red-700 ml-2" 
                        onClick={(e) => { e.stopPropagation(); setItemToDelete({ type: 'workspace', id: w.id }); }} 
                      />
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowWorkspaceModal(true)} className="text-xs font-bold text-blue-500 cursor-pointer">+ Create Workspace</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sidebar toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
              className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white h-8 w-8 ml-1 border border-zinc-200 dark:border-zinc-800"
            >
              {isPanelCollapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
            </Button>

            {/* Breadcrumbs */}
            <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-zinc-500 pl-2">
              <span className="hover:text-zinc-800 dark:hover:text-white cursor-pointer" onClick={() => navigate('/')}>{selectedWorkspace?.name || 'Workspace'}</span>
              {selectedSpace && (
                <>
                  <span>&gt;</span>
                  <span className="hover:text-zinc-800 dark:hover:text-white cursor-pointer" onClick={() => { setSelectedSpace(selectedSpace); setSelectedProjectId(selectedSpace.id); }}>{selectedSpace.name}</span>
                </>
              )}
              {selectedFolder && (
                <>
                  <span>&gt;</span>
                  <span>{selectedFolder.name}</span>
                </>
              )}
              {selectedList && (
                <>
                  <span>&gt;</span>
                  <span className="text-zinc-850 dark:text-zinc-100 font-bold">{selectedList.name}</span>
                </>
              )}
            </div>
          </div>

          {/* Right: Search, Flat view switchers, notifications popover, mode toggle and profile avatar */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="hidden lg:flex items-center relative w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-zinc-400" />
              <Input 
                className="pl-8 pr-2 text-[11px] h-8 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 text-zinc-800 dark:text-zinc-300 placeholder-zinc-400 rounded-md w-full focus-visible:ring-0"
                placeholder="Search..." 
                type="text"
              />
            </div>

            {/* View selectors */}
            <div className="hidden sm:flex items-center gap-1 h-8 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
              {[
                { label: 'List view', path: '/tasks', active: window.location.pathname === '/tasks' },
                { label: 'Board view', path: '/kanban', active: window.location.pathname === '/kanban' },
                { label: 'Gantt chart', path: '/gantt', active: window.location.pathname === '/gantt' }
              ].map(tab => (
                <button
                  key={tab.label}
                  onClick={() => navigate(tab.path)}
                  className={cn(
                    "px-3 py-1 text-[11px] rounded-md font-medium cursor-pointer transition-all duration-150",
                    tab.active 
                      ? "bg-white dark:bg-[#16181d] text-blue-600 dark:text-blue-400 font-bold shadow-sm" 
                      : "text-zinc-550 hover:text-zinc-800 dark:hover:text-white"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Notifications */}
            <div className="relative">
              <Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-transparent border border-zinc-200 dark:border-zinc-800"
                      >
                        <Bell className="w-4 h-4" />
                        {notifications.filter(n => !n.is_read).length > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 bg-red-650 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                            {notifications.filter(n => !n.is_read).length}
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="font-bold text-xs">Notifications</TooltipContent>
                </Tooltip>
                <PopoverContent side="bottom" align="end" className="w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-4 z-40 max-h-64 overflow-y-auto text-zinc-800 dark:text-zinc-100">
                  <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-3">
                    <span className="font-bold text-xs">Alerts & Notifications</span>
                    <span className="text-[10px] text-zinc-500">({notifications.length})</span>
                  </div>
                  <div className="space-y-2">
                    {notifications.map(notif => (
                      <div key={notif.id} className={`p-2 rounded-lg border text-xs flex justify-between items-start ${notif.is_read ? 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-400' : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 text-zinc-800 dark:text-zinc-200'}`}>
                        <div className="flex-1">
                          <span className="font-bold block">{notif.title}</span>
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">{notif.message}</span>
                        </div>
                        {!notif.is_read && (
                          <button onClick={() => markNotificationRead(notif.id)} className="text-[9px] font-bold text-blue-500 hover:text-blue-400 pl-1 cursor-pointer">Read</button>
                        )}
                      </div>
                    ))}
                    {notifications.length === 0 && <span className="text-xs text-zinc-500 block text-center py-4">No notifications</span>}
                  </div>
                </PopoverContent>
              </Popover>
            </div>


            {/* Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="w-8 h-8 cursor-pointer border border-zinc-200 dark:border-zinc-800 shadow-sm hover:scale-105 transition-transform rounded-full">
                  <AvatarFallback className="bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-white font-extrabold text-xs">
                    {currentUser?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48" side="bottom" align="end">
                <DropdownMenuLabel>
                  <div className="font-bold text-zinc-800 dark:text-zinc-100 truncate text-xs">{currentUser?.name}</div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate font-normal">{currentUser?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" /> Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Body content wrapper holding Sidebar, Tree Context panel, and Main Route pages */}
        <div className="flex flex-1 overflow-hidden p-3 gap-3 bg-zinc-100 dark:bg-[#121315]">
          
          {/* Sidebar Navigation Column */}
          <aside className="app-sidebar flex-shrink-0 z-30 select-none">
            {/* Top Navigation Items */}
            <div className="flex flex-col items-center gap-3 w-full">
              {[
                { id: 'home', icon: Home, label: 'Home' },
                { id: 'calendar', icon: Calendar, label: 'Planner' },
                { id: 'ai', icon: Sparkles, label: 'AI' },
                { id: 'teams', icon: Users, label: 'Teams' },
                { id: 'docs', icon: FileText, label: 'Docs' },
                { id: 'dashboard', icon: BarChart2, label: 'Dashboard' },
                { id: 'timesheet', icon: Clock, label: 'Timesheet' },
                { id: 'more', icon: Grid, label: 'More' }
              ].map(item => {
                const isActive = activeTab === item.id;
                const buttonContent = (
                  <div className="app-sidebar-item">
                    <div className={`app-sidebar-icon-container ${isActive ? 'active' : 'inactive'}`}>
                      <item.icon className="w-5 h-5 stroke-[2]" />
                    </div>
                    <span className="app-sidebar-label">
                      {item.label}
                    </span>
                  </div>
                );

                if (item.id === 'more') {
                  return (
                    <Popover key={item.id}>
                      <PopoverTrigger asChild>
                        <button className="w-full flex justify-center bg-transparent border-none p-0 outline-none">
                          {buttonContent}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="right" align="end" className="w-72 p-4 bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-xl shadow-2xl z-45">
                        <h4 className="font-bold text-xs mb-3 text-zinc-500 uppercase tracking-wider">App Launcher</h4>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div onClick={() => navigate('/whiteboard')} className="flex flex-col items-center justify-center p-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 cursor-pointer border border-zinc-800 transition">
                            <PenTool className="w-5 h-5 text-blue-500 mb-1" />
                            <span className="text-[10px] font-bold text-zinc-350">Whiteboard</span>
                          </div>
                          <div onClick={() => { setShowAutomationModal(true); navigate('/automation'); }} className="flex flex-col items-center justify-center p-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 cursor-pointer border border-zinc-800 transition">
                            <Sliders className="w-5 h-5 text-amber-500 mb-1" />
                            <span className="text-[10px] font-bold text-zinc-350">Automations</span>
                          </div>
                          <div onClick={() => { setShowGoalModal(true); navigate('/goals'); }} className="flex flex-col items-center justify-center p-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 cursor-pointer border border-zinc-800 transition">
                            <Target className="w-5 h-5 text-emerald-500 mb-1" />
                            <span className="text-[10px] font-bold text-zinc-350">Goals</span>
                          </div>
                          <div onClick={() => setShowFormModal(true)} className="flex flex-col items-center justify-center p-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 cursor-pointer border border-zinc-800 transition">
                            <ClipboardList className="w-5 h-5 text-purple-500 mb-1" />
                            <span className="text-[10px] font-bold text-zinc-350">Forms</span>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  );
                }

                return (
                  <button 
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (item.id === 'home') {
                        navigate('/home');
                      } else if (item.id === 'calendar') {
                        navigate('/calendar');
                      } else if (item.id === 'docs') {
                        navigate('/docs');
                      } else if (item.id === 'dashboard') {
                        navigate('/dashboard');
                      } else if (item.id === 'timesheet') {
                        navigate('/timesheet');
                      } else if (item.id === 'teams' && selectedWorkspace) {
                        fetchWorkspaceMembers(selectedWorkspace.id);
                      } else if (item.id === 'ai') {
                        setShowAIConsole(true);
                      }
                    }}
                    className="w-full flex justify-center bg-transparent border-none p-0 outline-none"
                  >
                    {buttonContent}
                  </button>
                );
              })}
            </div>

            {/* Bottom Navigation Actions */}
            <div className="flex flex-col items-center gap-3 w-full">
              {selectedWorkspace && (
                <button 
                  onClick={() => setIsInviteModalOpen(true)}
                  className="app-sidebar-item"
                >
                  <div className="app-sidebar-icon-container inactive">
                    <UserPlus className="w-5 h-5 stroke-[2]" />
                  </div>
                  <span className="app-sidebar-label">Invite</span>
                </button>
              )}

              <button 
                onClick={() => {
                  setShowGoalModal(true);
                  navigate('/goals');
                }}
                className="app-sidebar-item"
              >
                <div className="app-sidebar-icon-container rounded-[10px] bg-gradient-to-b from-purple-400 to-[#7A1C8D] text-white flex items-center justify-center shadow-md border border-white/20 hover:scale-105 transition-transform duration-150">
                  <ArrowUp className="w-5 h-5 stroke-[2.5]" />
                </div>
                <span className="app-sidebar-label">Upgrade</span>
              </button>
            </div>
          </aside>

          {/* Tier 2: The Contextual Workspace Navigation Tree (Middle Sidebar as a clean floating card) */}
          <aside className={cn(
            "h-full bg-white dark:bg-[#1b1c1e] border border-zinc-200 dark:border-zinc-800/80 flex flex-col flex-shrink-0 overflow-y-auto transition-all duration-300 ease-in-out shadow-sm rounded-2xl",
            isPanelCollapsed ? "w-0 opacity-0 border-none overflow-hidden" : "w-56 opacity-100"
          )}>
            {/* Workspace Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-zinc-800 dark:text-zinc-100 select-none">
              <span className="font-bold text-[14px] tracking-tight truncate">
                {selectedWorkspace?.name || 'Workspace'}
              </span>
              <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
            </div>

            <div className="flex-1 p-3 space-y-4 text-xs select-none">
              {activeTab === 'teams' ? (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-extrabold text-zinc-400 dark:text-zinc-550 tracking-wider block pl-1 mb-3">Workspace Team</span>
                  <div className="space-y-1">
                    <button onClick={() => setIsInviteModalOpen(true)} className="flex items-center rounded-lg text-sm font-semibold justify-start gap-2.5 w-full px-3 py-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-transparent cursor-pointer">
                      <UserPlus className="w-4 h-4" /> Invite Member
                    </button>
                  </div>
                </div>
              ) : activeTab === 'docs' ? (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-extrabold text-zinc-400 dark:text-zinc-550 tracking-wider block pl-1 mb-3">Notion Docs</span>
                  <div className="space-y-1">
                    <NavLink to="/docs" className={({ isActive }) => `flex items-center rounded-lg text-sm font-semibold justify-start gap-2.5 w-full px-3 py-2 ${isActive ? 'bg-zinc-900/5 dark:bg-white/10 backdrop-blur-md border border-zinc-900/10 dark:border-white/20 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-transparent'}`}><BookOpen className="w-4 h-4"/> All Docs</NavLink>
                    <button onClick={handleCreateDoc} className="flex items-center rounded-lg text-sm font-semibold justify-start gap-2.5 w-full px-3 py-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-transparent"><Plus className="w-4 h-4"/> New Doc</button>
                  </div>
                </div>
              ) : activeTab === 'calendar' ? (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-extrabold text-zinc-400 dark:text-zinc-550 tracking-wider block pl-1 mb-3">Planner</span>
                  <div className="space-y-1">
                    <NavLink to="/calendar" className={({ isActive }) => `flex items-center rounded-lg text-sm font-semibold justify-start gap-2.5 w-full px-3 py-2 ${isActive ? 'bg-zinc-900/5 dark:bg-white/10 backdrop-blur-md border border-zinc-900/10 dark:border-white/20 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-transparent'}`}><CalendarIcon className="w-4 h-4"/> Matrix</NavLink>
                    <NavLink to="/gantt" className={({ isActive }) => `flex items-center rounded-lg text-sm font-semibold justify-start gap-2.5 w-full px-3 py-2 ${isActive ? 'bg-zinc-900/5 dark:bg-white/10 backdrop-blur-md border border-zinc-900/10 dark:border-white/20 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-transparent'}`}><Layers className="w-4 h-4"/> Gantt</NavLink>
                  </div>
                </div>
              ) : (
                <>
                  {/* Navigation Section */}
                  <div className="space-y-1">
                    <div className="px-2 py-1 text-[10px] font-extrabold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider">Favorites</div>
                    <NavLink to="/" className={({ isActive }) => `flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition ${isActive ? 'bg-zinc-900/5 dark:bg-white/10 backdrop-blur-md border border-zinc-900/10 dark:border-white/20 shadow-sm text-zinc-900 dark:text-white font-semibold' : 'text-zinc-500 dark:text-zinc-450 hover:bg-transparent hover:text-zinc-800 dark:hover:text-white'}`}>
                      <Inbox className="w-4 h-4 shrink-0 text-zinc-450" />
                      <span>Inbox</span>
                    </NavLink>
                    <NavLink to="/tasks" className={({ isActive }) => `flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition ${isActive ? 'bg-zinc-900/5 dark:bg-white/10 backdrop-blur-md border border-zinc-900/10 dark:border-white/20 shadow-sm text-zinc-900 dark:text-white font-semibold' : 'text-zinc-500 dark:text-zinc-450 hover:bg-transparent hover:text-zinc-800 dark:hover:text-white'}`}>
                      <CheckSquare className="w-4 h-4 shrink-0 text-zinc-450" />
                      <span>My Tasks</span>
                    </NavLink>
                  </div>

                  {/* Spaces Collapsible Tree */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-2 py-1 text-[10px] font-extrabold text-zinc-400 dark:text-zinc-550 uppercase tracking-wider">
                      <span>Spaces</span>
                      <button onClick={() => setShowSpaceModal(true)} className="hover:text-zinc-800 dark:hover:text-white cursor-pointer">+</button>
                    </div>

                    <div className="space-y-1">
                      {spaces.map(space => (
                        <div key={space.id} className="space-y-1">
                          <div 
                            onClick={() => {
                              setSelectedSpace(space);
                              setSelectedProjectId(space.id);
                            }} 
                            className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition ${selectedSpace?.id === space.id ? 'bg-zinc-900/5 dark:bg-white/10 backdrop-blur-md border border-zinc-900/10 dark:border-white/20 shadow-sm text-zinc-900 dark:text-white font-bold' : 'text-zinc-500 dark:text-zinc-450 hover:bg-transparent hover:text-zinc-800 dark:hover:text-white'}`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="shrink-0 text-zinc-400">ðŸ“</span>
                              <span className="truncate text-[13px] font-medium tracking-tight">{space.name}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {['admin', 'owner'].includes(currentUserRole) && (
                                <Trash2 
                                  className="w-3.5 h-3.5 text-zinc-450 dark:text-zinc-500 hover:text-red-500 shrink-0" 
                                  onClick={(e) => { e.stopPropagation(); setItemToDelete({ type: 'project', id: space.id }); }} 
                                />
                              )}
                              {selectedSpace?.id === space.id && (
                                <button onClick={(e) => { e.stopPropagation(); setShowFolderModal(true); }} className="text-[10px] text-blue-500 font-bold px-0.5 hover:text-blue-400">+</button>
                              )}
                            </div>
                          </div>

                          {selectedSpace?.id === space.id && (
                            <div className="pl-4 border-l border-zinc-200 dark:border-zinc-850 ml-3.5 space-y-1">
                              {folders.map(folder => (
                                <div key={folder.id} className="space-y-1">
                                  <div 
                                    onClick={() => setSelectedFolder(folder)} 
                                    className={`group flex items-center justify-between px-2 py-1 rounded-md cursor-pointer transition ${selectedFolder?.id === folder.id ? 'bg-zinc-900/5 dark:bg-white/10 backdrop-blur-md border border-zinc-900/10 dark:border-white/20 shadow-sm text-zinc-900 dark:text-white font-semibold' : 'text-zinc-500 dark:text-zinc-450 hover:bg-transparent hover:text-zinc-800 dark:hover:text-white'}`}
                                  >
                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                      <span className="shrink-0 text-zinc-400 dark:text-zinc-550">ðŸ“‚</span>
                                      <span className="truncate text-[13px] font-medium tracking-tight">{folder.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {['admin', 'owner'].includes(currentUserRole) && (
                                        <Trash2 
                                          className="w-3.5 h-3.5 text-zinc-450 dark:text-zinc-500 hover:text-red-500 shrink-0" 
                                          onClick={(e) => { e.stopPropagation(); setItemToDelete({ type: 'folder', id: folder.id }); }} 
                                        />
                                      )}
                                      {selectedFolder?.id === folder.id && (
                                        <button onClick={(e) => { e.stopPropagation(); setShowListModal(true); }} className="text-[10px] text-blue-500 font-bold px-1 hover:text-blue-400">+</button>
                                      )}
                                    </div>
                                  </div>

                                  {selectedFolder?.id === folder.id && (
                                    <div className="pl-4 border-l border-zinc-200 dark:border-zinc-800/60 ml-2.5 space-y-1">
                                      {lists.map(lst => (
                                        <div 
                                          key={lst.id} 
                                          onClick={() => { setSelectedList(lst); navigate('/tasks'); }} 
                                          className={`group flex items-center justify-between px-2 py-1 rounded-md cursor-pointer transition text-[12px] pl-6 ${selectedList?.id === lst.id ? 'bg-zinc-900/5 dark:bg-white/10 backdrop-blur-md border border-zinc-900/10 dark:border-white/20 shadow-sm text-blue-600 dark:text-blue-400 font-bold' : 'text-zinc-500 dark:text-zinc-450 hover:bg-transparent hover:text-zinc-800 dark:hover:text-white'}`}
                                        >
                                          <div className="flex items-center gap-1.5 overflow-hidden">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                            <span className="truncate">{lst.name}</span>
                                          </div>
                                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {['admin', 'owner'].includes(currentUserRole) && (
                                              <Trash2 
                                                className="w-3.5 h-3.5 text-zinc-450 dark:text-zinc-500 hover:text-red-500 shrink-0" 
                                                onClick={(e) => { e.stopPropagation(); setItemToDelete({ type: 'list', id: lst.id }); }} 
                                              />
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </aside>

          {/* Right Section Content Shell (styled inside a clean floating rounded card) */}
          <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#1b1c1e] rounded-2xl border border-zinc-250/80 dark:border-zinc-800/80 shadow-sm overflow-hidden">
            <main className="flex-1 overflow-y-auto p-6 bg-zinc-50/20 dark:bg-[#16181d]">
              {activeTab === 'teams' ? (
                <TeamDirectory members={workspaceMembers} onInviteClick={() => setIsInviteModalOpen(true)} />
              ) : (
                <Outlet context={{
                  token,
                  currentUser,
                  workspaces,
                  selectedWorkspace,
                  setSelectedWorkspace,
                  spaces,
                  selectedSpace,
                  setSelectedSpace,
                  folders,
                  selectedFolder,
                  setSelectedFolder,
                  lists,
                  selectedList,
                  setSelectedList,
                  tasks,
                  setTasks,
                  fetchProjects,
                  selectedProjectId,
                  setSelectedProjectId,
                  workspaceMembers,
                  notifications,
                  markNotificationRead,
                  timeEntries,
                  activeTimer,
                  timerSeconds,
                  handleStartTimer,
                  handleStopTimer,
                  documents,
                  setDocuments,
                  selectedDoc,
                  setSelectedDoc,
                  handleCreateDoc,
                  handleSaveDocContent,
                  handleDeleteDoc,
                  fetchDocuments,
                  currentUserRole,
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
                  getStatusColor,
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
                  setStats,
                  setIsInviteModalOpen,
                  isInviteModalOpen
                }} />
              )}
            </main>
          </div>
        </div>
      </div>
      {/* --- AI CONSOLE ASSISTANT --- */}
      {showAIConsole && (
        <div className="fixed top-16 right-8 w-96 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 flex flex-col max-h-[80vh] text-zinc-100">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <span className="font-extrabold text-xs uppercase tracking-wider text-purple-400">âœ¨ AI Assistant Advisor</span>
            <button onClick={() => setShowAIConsole(false)} className="text-zinc-400 hover:text-white font-bold">âœ•</button>
          </div>
          <div className="p-4 overflow-y-auto flex-1 text-xs space-y-4">
            {aiResponse ? (
              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-zinc-300 leading-relaxed max-w-full overflow-hidden break-words whitespace-pre-line font-medium">
                {aiResponse}
              </div>
            ) : (
              <div className="text-zinc-500 italic text-center py-8">Ask me to summarize progress, generate tasks, or draft meeting notes.</div>
            )}
            {aiLoading && <div className="text-center text-purple-400 font-bold animate-pulse">Running query...</div>}
          </div>
          <form onSubmit={handleCallAIAssistant} className="p-4 border-t border-zinc-800 flex gap-2 bg-zinc-900/50">
            <Input 
              placeholder="Ask: 'Summarize project'..." 
              value={aiPrompt} 
              onChange={(e) => setAiPrompt(e.target.value)} 
              className="flex-grow h-8 text-xs bg-zinc-950"
            />
            <Button type="submit" size="sm" className="font-bold h-8 px-4">Ask</Button>
          </form>
        </div>
      )}

      {/* --- POPUP MODALS (Radix styled) --- */}
      {showWorkspaceModal && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-sm border-zinc-800 bg-zinc-900 shadow-2xl">
            <h3 className="text-base font-bold mb-4 text-zinc-100">Create Workspace</h3>
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <Input required placeholder="Workspace Name" value={newWorkspaceName} onChange={(e) => setNewWorkspaceName(e.target.value)} />
              <div className="flex gap-3 justify-end text-xs">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowWorkspaceModal(false)} className="font-semibold">Cancel</Button>
                <Button type="submit" size="sm" className="font-bold">Create</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {showSpaceModal && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-sm border-zinc-800 bg-zinc-900 shadow-2xl">
            <h3 className="text-base font-bold mb-4 text-zinc-100">Add Workspace Space</h3>
            <form onSubmit={handleCreateSpace} className="space-y-4">
              <Input required placeholder="Space Name" value={newSpaceName} onChange={(e) => setNewSpaceName(e.target.value)} />
              <div className="flex gap-3 justify-end text-xs">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowSpaceModal(false)} className="font-semibold">Cancel</Button>
                <Button type="submit" size="sm" className="font-bold">Add</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {showFolderModal && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-sm border-zinc-800 bg-zinc-900 shadow-2xl">
            <h3 className="text-base font-bold mb-4 text-zinc-100">Add Folder</h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <Input required placeholder="Folder Name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} />
              <div className="flex gap-3 justify-end text-xs">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowFolderModal(false)} className="font-semibold">Cancel</Button>
                <Button type="submit" size="sm" className="font-bold">Add</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {showListModal && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-sm border-zinc-800 bg-zinc-900 shadow-2xl">
            <h3 className="text-base font-bold mb-4 text-zinc-100">Add List</h3>
            <form onSubmit={handleCreateList} className="space-y-4">
              <Input required placeholder="List Name" value={newListName} onChange={(e) => setNewListName(e.target.value)} />
              <div className="flex gap-3 justify-end text-xs">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowListModal(false)} className="font-semibold">Cancel</Button>
                <Button type="submit" size="sm" className="font-bold">Add</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {showFormModal && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-sm border-zinc-800 bg-zinc-900 shadow-2xl">
            <h3 className="text-base font-bold mb-4 text-zinc-100">Configure Task Submission Form</h3>
            <form onSubmit={handleCreateForm} className="space-y-4">
              <Input required placeholder="Form Title" value={newFormTitle} onChange={(e) => setNewFormTitle(e.target.value)} />
              <div className="flex gap-3 justify-end text-xs">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowFormModal(false)} className="font-semibold">Cancel</Button>
                <Button type="submit" size="sm" className="font-bold">Add Form</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {showGoalModal && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-sm border-zinc-800 bg-zinc-900 shadow-2xl">
            <h3 className="text-base font-bold mb-4 text-zinc-100">Add Goal</h3>
            <form onSubmit={handleCreateGoal} className="space-y-4 text-xs font-semibold">
              <Input required placeholder="Goal Title" value={newGoal.title} onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })} />
              <Input required type="number" placeholder="Target Point Value" value={newGoal.target_value} onChange={(e) => setNewGoal({ ...newGoal, target_value: Number(e.target.value) })} />
              <Input type="date" value={newGoal.due_date} onChange={(e) => setNewGoal({ ...newGoal, due_date: e.target.value })} />
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowGoalModal(false)} className="font-semibold">Cancel</Button>
                <Button type="submit" size="sm" className="font-bold">Add</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {showAutomationModal && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-sm border-zinc-800 bg-zinc-900 shadow-2xl">
            <h3 className="text-base font-bold mb-4 text-zinc-100">Create Automation Rule</h3>
            <form onSubmit={handleCreateAutomationRule} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] text-zinc-400 uppercase mb-1">Trigger Event</label>
                <select value={newRule.trigger_type} onChange={(e) => setNewRule({ ...newRule, trigger_type: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 outline-none text-zinc-200">
                  <option value="status_changed">Status Changed</option>
                  <option value="task_created">Task Created</option>
                </select>
              </div>
              {newRule.trigger_type === 'status_changed' && (
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase mb-1">When Status Matches</label>
                  <select value={newRule.condition_value} onChange={(e) => setNewRule({ ...newRule, condition_value: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 outline-none text-zinc-200">
                    <option value="Todo">Todo</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Testing">Testing</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-[10px] text-zinc-400 uppercase mb-1">Action Type</label>
                <select value={newRule.action_type} onChange={(e) => setNewRule({ ...newRule, action_type: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 outline-none text-zinc-200">
                  <option value="notify_user">Notify Author</option>
                  <option value="set_status">Set Status</option>
                </select>
              </div>
              {newRule.action_type === 'set_status' && (
                <div>
                  <label className="block text-[10px] text-zinc-400 uppercase mb-1">Target Status</label>
                  <select value={newRule.action_value} onChange={(e) => setNewRule({ ...newRule, action_value: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 outline-none text-zinc-200">
                    <option value="Todo">Todo</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Testing">Testing</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              )}
              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAutomationModal(false)} className="font-semibold">Cancel</Button>
                <Button type="submit" size="sm" className="font-bold">Add Rule</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      <TaskModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        mode="create"
        onSubmit={handleCreateTaskFromModal}
        tasks={tasks}
        workspaceMembers={workspaceMembers}
      />

      {/* --- TASK DETAILS DIALOG (Overlay Modal) --- */}
      {selectedTask && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center overflow-y-auto z-[999] p-4">
          <Card className="w-full max-w-3xl border-zinc-800 bg-zinc-900 shadow-2xl flex flex-col max-h-[85vh] relative z-[999]">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-start flex-shrink-0 bg-zinc-900 rounded-t-2xl">
              <div>
                <Badge variant="outline">Task ID: #{selectedTask.id}</Badge>
                <h3 className="text-lg font-bold text-zinc-100 mt-2">{selectedTask.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => setItemToDelete({ type: 'task', id: selectedTask.id })} 
                  variant="destructive" 
                  size="sm" 
                  className="h-7 text-[10px] font-bold"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                </Button>
                <Button onClick={() => { setSelectedTask(null); if (selectedList) fetchTasks(selectedList.id); }} variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white">âœ•</Button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left detail specs */}
              <div className="md:col-span-2 space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Description</label>
                  <textarea defaultValue={selectedTask.description || ''} onBlur={(e) => handleUpdateTaskDescription(e.target.value)} placeholder="Write description... (auto-saves)" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400 h-20 text-zinc-200" />
                </div>

                <div className="border-t border-zinc-800 pt-4">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2">Subtasks</label>
                  <div className="space-y-2 mb-3">
                    {selectedTask.subtasks && selectedTask.subtasks.map(sub => (
                      <div key={sub.id} className="flex justify-between items-center bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-lg text-xs">
                        <span className="font-semibold text-zinc-300">{sub.title}</span>
                        <Badge variant="outline" className={getStatusColor(sub.status)}>{sub.status}</Badge>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleCreateSubtask} className="flex gap-2">
                    <Input placeholder="Add subtask..." value={subtaskTitle} onChange={(e) => setSubtaskTitle(e.target.value)} className="h-8 text-xs flex-grow bg-zinc-950" />
                    <Button type="submit" size="sm" className="font-bold h-8">Add</Button>
                  </form>
                </div>

                <div className="border-t border-zinc-800 pt-4 space-y-3">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase">Comments Thread</label>
                  <div className="space-y-3 max-h-40 overflow-y-auto bg-zinc-950 border border-zinc-800 p-3 rounded-xl">
                    {taskComments.map(comment => (
                      <div key={comment.id} className="text-xs space-y-1 bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-blue-400 uppercase">{comment.user.name}</span>
                          <span className="text-[10px] text-zinc-500">{new Date(comment.created_at).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-zinc-200">{comment.message}</p>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handlePostComment} className="flex gap-2">
                    <Input placeholder="Comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} className="h-8 text-xs flex-grow bg-zinc-950" />
                    <Button type="submit" size="sm" className="font-bold h-8">Post</Button>
                  </form>
                </div>
              </div>

              {/* Sidebar metadata specifications */}
              <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800 space-y-4 text-xs">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Start Date</label>
                    <Input type="date" disabled={!!selectedTask.predecessor_id} value={selectedTask.start_date || ''} onChange={(e) => handleUpdateTaskDates(e.target.value, undefined)} className="bg-zinc-900 border-zinc-800 disabled:bg-zinc-950" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Due Date</label>
                    <Input type="date" disabled={!!selectedTask.predecessor_id} value={selectedTask.due_date || ''} onChange={(e) => handleUpdateTaskDates(undefined, e.target.value)} className="bg-zinc-900 border-zinc-800 disabled:bg-zinc-950" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Assigned To (Single)</label>
                  <select
                    value={selectedTask.assigned_to_id || ''}
                    onChange={async (e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      try {
                        const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/tasks/${selectedTask.id}`, {
                          assigned_to_id: val
                        });
                        setSelectedTask(res.data);
                        if (selectedList) fetchTasks(selectedList.id);
                        else if (selectedProjectId) fetchTasks();
                      } catch (err) {
                        console.error("Error updating single assignee:", err);
                      }
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 outline-none text-zinc-200 text-xs font-semibold"
                  >
                    <option value="">Unassigned</option>
                    {workspaceMembers.map(m => (
                      <option key={m.id} value={m.user.id}>{m.user.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1.5">Assignees (M2M)</label>
                  <div className="space-y-1.5 max-h-24 overflow-y-auto bg-zinc-900 border border-zinc-800 p-2 rounded">
                    {workspaceMembers.map(m => {
                      const isAssigned = selectedTask.assignees.some(a => a.id === m.user.id);
                      return (
                        <label key={m.id} className="flex items-center gap-2 cursor-pointer font-semibold text-zinc-300">
                          <input 
                            type="checkbox" 
                            checked={isAssigned} 
                            onChange={(e) => handleUpdateTaskAssignees(m.user.id, e.target.checked)} 
                          />
                          <span>{m.user.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-3 space-y-3">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase">Attachments</label>
                  <div className="space-y-1.5 max-h-20 overflow-y-auto">
                    {taskAttachments.map(att => (
                      <a key={att.id} href={att.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 p-1.5 bg-zinc-900 border border-zinc-800 rounded hover:border-zinc-700 text-blue-400 font-semibold truncate block">
                        ðŸ“Ž <span className="truncate flex-1">{att.file_name}</span>
                      </a>
                    ))}
                  </div>
                  <form onSubmit={handleUploadAttachment} className="flex flex-col gap-2">
                    <input type="file" onChange={(e) => setAttachmentFile(e.target.files[0])} className="w-full text-[11px]" />
                    {attachmentFile && <Button type="submit" size="sm" className="font-bold w-full h-7 text-[10px]">Upload File</Button>}
                  </form>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* --- ALERT DIALOG --- */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => { if (!open) setItemToDelete(null); }}>
        <AlertDialogContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-900 dark:text-zinc-100">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500 dark:text-zinc-400">
              This action cannot be undone. This will permanently delete this {itemToDelete?.type} and all nested data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-transparent dark:border dark:border-zinc-600 dark:hover:bg-zinc-800 dark:text-zinc-200 transition-colors">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (itemToDelete?.type === 'workspace') handleDeleteWorkspace(itemToDelete.id);
                else if (itemToDelete?.type === 'project') handleDeleteProject(itemToDelete.id);
                else if (itemToDelete?.type === 'folder') handleDeleteFolder(itemToDelete.id);
                else if (itemToDelete?.type === 'list') handleDeleteList(itemToDelete.id);
                else if (itemToDelete?.type === 'task') handleDeleteTask(itemToDelete.id);
              }}
              className="bg-red-650 text-white hover:bg-red-700 font-bold"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Floating Timer Widget */}
      {activeTimer && (
        <div className="fixed bottom-6 right-6 bg-blue-600/90 backdrop-blur-sm border border-blue-500 text-white p-3 rounded-2xl shadow-2xl flex items-center gap-4 z-50">
          <div className="flex flex-col">
            <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">Active Timer</span>
            <span className="text-xl font-mono font-bold">{new Date(timerSeconds * 1000).toISOString().substr(11, 8)}</span>
          </div>
          <button onClick={handleStopTimer} className="bg-red-500 hover:bg-red-600 border border-red-400 px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg">
            Stop
          </button>
        </div>
      )}

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        workspace={selectedWorkspace}
      />
    </TooltipProvider>

  );
}
