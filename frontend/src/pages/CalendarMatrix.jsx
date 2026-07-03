import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  addMonths, 
  subMonths, 
  isSameMonth, 
  isSameDay, 
  isToday 
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';

// Import shadcn UI Components
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

export default function CalendarMatrix() {
  const { selectedWorkspace, selectedProjectId } = useOutletContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all tasks for the project on mount or when workspace/project changes
  useEffect(() => {
    if (selectedWorkspace && selectedProjectId) {
      fetchTasks();
    }
  }, [selectedWorkspace, selectedProjectId]);

  const fetchTasks = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await axios.get(`http://127.0.0.1:8000/api/tasks?project_id=${selectedProjectId}`);
      setTasks(res.data);
    } catch (err) {
      console.error('Error fetching tasks for calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  // Timezone-safe local date parser
  const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Check if a task falls on a specific calendar day (inclusive range)
  const isTaskOnDay = (task, day) => {
    const taskStart = parseLocalDate(task.start_date);
    const taskEnd = parseLocalDate(task.end_date);
    
    // Normalize date to midnight local time for precise comparison
    const cellTime = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();

    if (taskStart && taskEnd) {
      return cellTime >= taskStart.getTime() && cellTime <= taskEnd.getTime();
    }
    if (taskStart) {
      return cellTime === taskStart.getTime();
    }
    if (taskEnd) {
      return cellTime === taskEnd.getTime();
    }
    return false;
  };

  // Paginate months
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // Calendar Math: Generate all day grids for the current month view
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  // Get color styles strictly based on task status
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Done':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent';
      case 'In Progress':
        return 'bg-blue-600 hover:bg-blue-700 text-white border-transparent';
      case 'To Do':
      default:
        return 'bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border-transparent';
    }
  };

  if (!selectedWorkspace) {
    return (
      <div className="max-w-6xl mx-auto mt-12 text-center">
        <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-zinc-900 dark:text-white">No Workspace Selected</CardTitle>
          </CardHeader>
          <CardContent className="text-zinc-600 dark:text-zinc-400 text-sm">
            Please switch to or create a workspace to load the Calendar Matrix.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedProjectId) {
    return (
      <div className="max-w-6xl mx-auto mt-12 text-center">
        <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-zinc-900 dark:text-white">No Project Selected</CardTitle>
          </CardHeader>
          <CardContent className="text-zinc-600 dark:text-zinc-400 text-sm">
            No Project Selected. Please select a project from the dropdown above to load your tasks.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Calendar Header Switcher */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-6 h-6 text-blue-500" />
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Calendar Matrix</h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-0.5">
              Task timelines mapped across monthly slots.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handlePrevMonth}
            className="w-8 h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-200 min-w-36 text-center select-none">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleNextMonth}
            className="w-8 h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-zinc-500 dark:text-zinc-400 font-medium animate-pulse">
          Loading tasks to calendar...
        </div>
      ) : (
        <Card className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-4 shadow-xl">
          {/* Days of Week Row */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-3 select-none">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dName) => (
              <div key={dName} className="py-1">
                {dName}
              </div>
            ))}
          </div>

          {/* Grid Layout of Calendar cells */}
          <div className="grid grid-cols-7 gap-2 bg-zinc-100 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
            {calendarDays.map((day, idx) => {
              const dayTasks = tasks.filter((t) => isTaskOnDay(t, day));
              const currentMonth = isSameMonth(day, currentDate);
              const cellToday = isToday(day);

              return (
                <div
                  key={idx}
                  className={`min-h-[120px] p-2 rounded-lg border flex flex-col justify-between transition-colors ${
                    currentMonth 
                      ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800' 
                      : 'bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-100 dark:border-zinc-800/50 opacity-40'
                  } ${cellToday ? 'ring-1 ring-blue-500 border-blue-500' : ''}`}
                >
                  {/* Day Date Label */}
                  <div className="flex justify-between items-center mb-1">
                    <span 
                      className={`text-xs font-bold ${
                        cellToday 
                          ? 'bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center' 
                          : currentMonth ? 'text-zinc-800 dark:text-zinc-300' : 'text-zinc-400 dark:text-zinc-600'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* Day Tasks Badges container */}
                  <div className="flex-1 overflow-y-auto space-y-1 mt-1 max-h-[85px] scrollbar-thin">
                    {dayTasks.map((t) => (
                      <Badge
                        key={t.id}
                        className={`w-full block truncate font-bold text-[9px] px-2 py-0.5 rounded border leading-tight ${getStatusBadgeStyle(
                          t.status
                        )}`}
                        title={`${t.title} (${t.status})`}
                      >
                        {t.title}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
