import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import axios from 'axios';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  Search, 
  Users, 
  User, 
  Calendar as CalendarIcon, 
  Plus, 
  Sparkles,
  Inbox,
  Clock
} from 'lucide-react';

// Import shadcn UI Components
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';

export default function Planner() {
  const { 
    selectedWorkspace, 
    selectedProjectId, 
    workspaceMembers, 
    currentUser,
    setSelectedTask,
    setIsInviteModalOpen
  } = useOutletContext();

  const calendarRef = useRef(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTitle, setCurrentTitle] = useState('');
  
  // Sidebar Filters / Search States
  const [filterHighPriority, setFilterHighPriority] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]); // overlay tasks from specific members

  // Fetch tasks for workspace/project
  useEffect(() => {
    if (selectedWorkspace) {
      fetchTasks();
    }
  }, [selectedWorkspace, selectedProjectId]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      let url = `http://127.0.0.1:8000/api/tasks?workspace_id=${selectedWorkspace.id}`;
      if (selectedProjectId) {
        url = `http://127.0.0.1:8000/api/tasks?project_id=${selectedProjectId}`;
      }
      const res = await axios.get(url);
      setTasks(res.data);
    } catch (err) {
      console.error('Error fetching tasks for Planner:', err);
    } finally {
      setLoading(false);
    }
  };

  // Set the initial month title once calendar mounts
  useEffect(() => {
    if (calendarRef.current) {
      setCurrentTitle(calendarRef.current.getApi().view.title);
    }
  }, [loading]);

  // Calendar Controls
  const handlePrev = () => {
    const api = calendarRef.current.getApi();
    api.prev();
    setCurrentTitle(api.view.title);
  };

  const handleNext = () => {
    const api = calendarRef.current.getApi();
    api.next();
    setCurrentTitle(api.view.title);
  };

  const handleToday = () => {
    const api = calendarRef.current.getApi();
    api.today();
    setCurrentTitle(api.view.title);
  };

  // Toggle member overlay filter
  const toggleMemberFilter = (userId) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== userId));
    } else {
      setSelectedMembers([...selectedMembers, userId]);
    }
  };

  // Filter tasks based on settings
  const filteredTasks = tasks.filter(task => {
    // 1. High priority filter
    if (filterHighPriority) {
      const isHigh = task.priority === 'High' || task.priority === 'Urgent';
      if (!isHigh) return false;
    }

    // 2. Member overlay filter (if members are selected, show if assigned to any of them)
    if (selectedMembers.length > 0) {
      if (!task.assigned_to_id || !selectedMembers.includes(task.assigned_to_id)) {
        return false;
      }
    }

    return true;
  });

  // Split tasks into Undated/Backlog & Dated Calendar events
  const datedTasks = filteredTasks.filter(t => t.due_date || t.end_date);
  const backlogTasks = tasks.filter(t => !t.due_date && !t.end_date);
  const myTasks = tasks.filter(t => t.assigned_to_id === currentUser?.id);

  // Map to FullCalendar events format
  const calendarEvents = datedTasks.map(task => {
    let color = '#7b68ee'; // ClickUp Theme Purple
    if (task.priority === 'Urgent') color = '#ef4444'; // Red
    else if (task.priority === 'High') color = '#f97316'; // Orange
    else if (task.priority === 'Medium') color = '#3b82f6'; // Blue
    else if (task.priority === 'Low') color = '#a1a1aa'; // Zinc

    return {
      id: String(task.id),
      title: task.title,
      start: task.due_date || task.end_date || task.start_date,
      backgroundColor: color,
      borderColor: 'transparent',
      textColor: '#ffffff',
      extendedProps: { rawTask: task }
    };
  });

  const handleEventClick = (info) => {
    const rawTask = info.event.extendedProps.rawTask;
    if (rawTask) {
      setSelectedTask(rawTask);
    }
  };

  // Filtered members for Search bar
  const searchedMembers = (workspaceMembers || []).filter(m => 
    m.user.name.toLowerCase().includes(peopleSearch.toLowerCase()) ||
    m.user.email.toLowerCase().includes(peopleSearch.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-80px)] -m-6 text-zinc-200 overflow-hidden font-sans">
      {/* Self-contained CSS overrides for FullCalendar theme matching ClickUp Clone */}
      <style>{`
        .fc {
          --fc-border-color: #27272a !important;
          --fc-page-bg-color: transparent !important;
          font-family: inherit;
        }
        .fc-theme-standard td, .fc-theme-standard th {
          border-color: #27272a !important;
        }
        .fc-col-header-cell {
          background-color: #1b1c1e !important;
          padding: 8px 0 !important;
          border-bottom: 2px solid #27272a !important;
        }
        .fc-col-header-cell-cushion {
          font-size: 10px !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.1em !important;
          color: #a1a1aa !important;
          text-decoration: none !important;
        }
        .fc-daygrid-day-top {
          flex-direction: row !important;
          padding: 6px 8px 0 8px !important;
        }
        .fc-daygrid-day-number {
          font-size: 11px !important;
          font-weight: 700 !important;
          color: #d4d4d8 !important;
          text-decoration: none !important;
          padding: 0 !important;
        }
        .fc-day-today {
          background-color: rgba(123, 104, 238, 0.04) !important;
        }
        .fc-day-today .fc-daygrid-day-number {
          background-color: #7b68ee !important;
          color: white !important;
          border-radius: 50% !important;
          width: 20px;
          height: 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: -2px;
        }
        .fc-daygrid-event {
          border-radius: 4px !important;
          padding: 2px 6px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          margin: 2px 4px !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3) !important;
          transition: transform 0.15s ease, filter 0.15s ease;
        }
        .fc-daygrid-event:hover {
          transform: translateY(-1px);
          filter: brightness(1.1);
        }
        .fc-daygrid-day-frame {
          min-height: 100px !important;
        }
        .fc-scroller {
          overflow: hidden !important;
        }
      `}</style>

      {/* Left Sub-Sidebar Panel */}
      <aside className="w-64 bg-[#1b1c1e] border-r border-zinc-800 flex flex-col flex-shrink-0 select-none overflow-y-auto p-4 space-y-5">
        
        {/* Priorities Filtering Widget */}
        <Card className="bg-[#141517] border-zinc-800 text-zinc-100 shadow-md">
          <CardContent className="p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flag className={`w-4 h-4 ${filterHighPriority ? 'text-red-500 fill-red-500' : 'text-zinc-500'}`} />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Priorities</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setFilterHighPriority(!filterHighPriority)}
                className={`h-7 px-2.5 text-[10px] font-bold uppercase rounded-md transition ${
                  filterHighPriority ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-zinc-500 hover:text-white'
                }`}
              >
                {filterHighPriority ? 'Filtered' : '+ Add priority'}
              </Button>
            </div>
            <p className="text-[11px] text-zinc-500 leading-normal font-medium">
              Toggle to filter calendar and display only high-importance task items.
            </p>
          </CardContent>
        </Card>

        {/* Meet with search bar overlay */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider block pl-1">Meet with</span>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
            <Input 
              placeholder="Search for people..." 
              value={peopleSearch}
              onChange={(e) => setPeopleSearch(e.target.value)}
              className="pl-8 text-xs bg-zinc-950 border-zinc-800 placeholder-zinc-650 h-9 rounded-md text-zinc-200"
            />
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto scrollbar-thin mt-2 pr-1">
            {searchedMembers.map(member => (
              <div 
                key={member.id} 
                onClick={() => toggleMemberFilter(member.user.id)}
                className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer transition ${
                  selectedMembers.includes(member.user.id) 
                    ? 'bg-zinc-800 text-white font-bold' 
                    : 'hover:bg-zinc-850 text-zinc-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Avatar className="w-5 h-5 rounded-full shrink-0 border border-zinc-800">
                    <AvatarFallback className="bg-zinc-700 text-[9px] font-extrabold text-white">
                      {member.user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-xs font-semibold">{member.user.name}</span>
                </div>
                <div className={`w-2 h-2 rounded-full ${selectedMembers.includes(member.user.id) ? 'bg-[#7b68ee]' : 'bg-transparent'}`} />
              </div>
            ))}
            {searchedMembers.length === 0 && (
              <span className="text-[10px] text-zinc-600 italic block text-center py-2">No collaborators found</span>
            )}
          </div>
        </div>

        {/* Assigned to me */}
        <div className="space-y-2 flex-grow-0">
          <div className="flex justify-between items-center pl-1">
            <span className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">Assigned to me</span>
            <Badge variant="secondary" className="text-[9px] bg-zinc-800 text-zinc-300 font-bold px-1.5 py-0.5 rounded-full shrink-0">
              {myTasks.length}
            </Badge>
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-thin pr-1">
            {myTasks.map(task => (
              <div 
                key={task.id} 
                onClick={() => setSelectedTask(task)}
                className="p-2 bg-[#141517] hover:bg-zinc-800 border border-zinc-850 rounded-lg cursor-pointer transition text-left group"
              >
                <span className="text-xs font-bold text-zinc-300 group-hover:text-white truncate block">{task.title}</span>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[9px] text-zinc-500 font-semibold uppercase">{task.status}</span>
                  {task.due_date && <span className="text-[9px] text-zinc-650 font-bold">{task.due_date}</span>}
                </div>
              </div>
            ))}
            {myTasks.length === 0 && (
              <span className="text-[10px] text-zinc-600 italic block text-center py-2">No tasks assigned to you</span>
            )}
          </div>
        </div>

        {/* Backlog / Today & Overdue */}
        <div className="space-y-2 flex-grow-0 pt-2 border-t border-zinc-800/80">
          <div className="flex justify-between items-center pl-1">
            <span className="text-[10px] uppercase font-extrabold text-zinc-500 tracking-wider">Backlog / Undated</span>
            <Badge variant="secondary" className="text-[9px] bg-[#7b68ee]/25 text-[#7b68ee] font-bold px-1.5 py-0.5 rounded-full shrink-0">
              {backlogTasks.length}
            </Badge>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin pr-1">
            {backlogTasks.map(task => (
              <div 
                key={task.id} 
                onClick={() => setSelectedTask(task)}
                className="p-2 bg-[#141517] hover:bg-zinc-800 border border-zinc-850 rounded-lg cursor-pointer transition text-left group"
              >
                <span className="text-xs font-bold text-zinc-300 group-hover:text-white truncate block">{task.title}</span>
                <span className="text-[9px] text-[#7b68ee] font-bold uppercase tracking-wider block mt-0.5">Needs scheduling</span>
              </div>
            ))}
            {backlogTasks.length === 0 && (
              <span className="text-[10px] text-zinc-600 italic block text-center py-2">No backlog tasks</span>
            )}
          </div>
        </div>

      </aside>

      {/* Right Content Column: Header Controls + FullCalendar Grid */}
      <div className="flex-1 flex flex-col bg-[#16181d] overflow-hidden p-6 space-y-5">
        
        {/* Custom Header Controls */}
        <div className="flex items-center justify-between bg-[#1b1c1e] p-3 rounded-xl border border-zinc-800 shadow-md">
          
          {/* Left Controls: Snapping & Month Navigation */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handlePrev}
                className="w-8 h-8 text-zinc-400 hover:text-white hover:bg-zinc-850 rounded-md border border-zinc-800 shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              {/* Month Display Title */}
              <span className="text-sm font-bold text-zinc-100 min-w-36 text-center select-none tracking-tight">
                {currentTitle}
              </span>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleNext}
                className="w-8 h-8 text-zinc-400 hover:text-white hover:bg-zinc-850 rounded-md border border-zinc-800 shrink-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Today Snapping Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleToday}
              className="h-8 text-[11px] font-bold uppercase tracking-wider bg-zinc-950 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-850 rounded-md"
            >
              Today
            </Button>
          </div>

          {/* Right Controls: View Switcher Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase text-zinc-550 tracking-widest mr-1">View</span>
            <select 
              defaultValue="Month" 
              disabled 
              className="bg-zinc-950 border border-zinc-800 text-zinc-350 font-bold text-xs rounded-md px-3 py-1.5 outline-none cursor-default select-none h-8"
            >
              <option value="Month">Month</option>
            </select>
          </div>

        </div>

        {/* FullCalendar Component Area */}
        <div className="flex-1 bg-[#1b1c1e] border border-zinc-800 rounded-xl shadow-2xl p-4 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full text-zinc-500 font-semibold animate-pulse text-sm">
              Loading calendar grid...
            </div>
          ) : (
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              events={calendarEvents}
              eventClick={handleEventClick}
              headerToolbar={false}
              height="100%"
              dayMaxEventRows={3}
            />
          )}
        </div>

      </div>
    </div>
  );
}
