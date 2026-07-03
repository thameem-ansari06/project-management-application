import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { useTheme } from 'next-themes';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as ChartTooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';

import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { BarChart3, PieChartIcon, Hourglass, CheckCircle2, ListTodo } from 'lucide-react';

// --- PREMIUM CUSTOM TOOLTIPS ---
const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 rounded-xl shadow-2xl text-xs font-semibold text-zinc-800 dark:text-zinc-200">
        <span className="font-extrabold uppercase tracking-wide block mb-0.5 text-zinc-500 dark:text-zinc-400 text-[10px]">
          {payload[0].name}
        </span>
        <span className="text-zinc-900 dark:text-zinc-100 text-sm font-extrabold">
          {payload[0].value} {payload[0].value === 1 ? 'Task' : 'Tasks'}
        </span>
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3.5 py-2.5 rounded-xl shadow-2xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 max-w-xs">
        <span className="font-extrabold block text-zinc-900 dark:text-zinc-100 truncate mb-1">
          {payload[0].payload.fullName}
        </span>
        <span className="text-zinc-500 dark:text-zinc-400 block text-[10px]">
          Estimated Workload: <strong className="text-amber-600 dark:text-amber-400 font-extrabold">{payload[0].value} Days</strong>
        </span>
      </div>
    );
  }
  return null;
};

export default function SprintReports() {
  const { selectedWorkspace, selectedProjectId, spaces } = useOutletContext();
  const [tasks, setTasks] = useState([]);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [loading, setLoading] = useState(false);

  const activeProject = spaces.find(p => p.id === selectedProjectId);

  // --- RECURSIVE TASK FLATTENER ---
  const flattenTasks = (taskList) => {
    const flat = [];
    const recurse = (items) => {
      items.forEach(item => {
        flat.push(item);
        if (item.children && item.children.length > 0) {
          recurse(item.children);
        }
        if (item.subtasks && item.subtasks.length > 0) {
          recurse(item.subtasks);
        }
      });
    };
    recurse(taskList);
    return flat;
  };

  // --- FETCH PROJECT TASKS ---
  useEffect(() => {
    if (selectedWorkspace && selectedProjectId) {
      const fetchProjectTasks = async () => {
        setLoading(true);
        try {
          const res = await axios.get(`http://127.0.0.1:8000/api/tasks?project_id=${selectedProjectId}`);
          setTasks(res.data);
        } catch (err) {
          console.error("Error loading task data for reports:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchProjectTasks();
    }
  }, [selectedWorkspace, selectedProjectId]);

  // Render workspace level empty states
  if (!selectedWorkspace) {
    return (
      <div className="max-w-6xl mx-auto mt-12 text-center">
        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 p-8 shadow-sm dark:shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-100">No Workspace Selected</CardTitle>
          </CardHeader>
          <CardContent className="text-zinc-500 dark:text-zinc-400 text-sm">
            Please switch to or create a workspace to view Sprint Reports.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render project level empty states
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

  // --- DATA AGGREGATION MATH ---
  const allTasks = flattenTasks(tasks);
  const totalTasks = allTasks.length;

  const todoCount = allTasks.filter(t => t.status === 'To Do').length;
  const inProgressCount = allTasks.filter(t => t.status === 'In Progress').length;
  const doneCount = allTasks.filter(t => t.status === 'Done').length;

  const completionRate = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;
  const totalEstimatedDays = allTasks.reduce((sum, t) => sum + (t.duration_days || 0), 0);

  // Status pie chart data
  const statusData = [
    { name: 'To Do', value: todoCount, color: '#64748b' }, // Slate 500
    { name: 'In Progress', value: inProgressCount, color: '#3b82f6' }, // Blue 500
    { name: 'Done', value: doneCount, color: '#10b981' } // Emerald 500
  ].filter(item => item.value > 0); // Only render active status segments

  // Duration workload bar chart data (Top 12 longest tasks to avoid layout overlap)
  const durationData = allTasks
    .filter(t => t.duration_days && t.duration_days > 0)
    .map(t => ({
      fullName: t.title,
      name: t.title.length > 14 ? t.title.substring(0, 14) + '...' : t.title,
      duration: t.duration_days
    }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 12);

  return (
    <div className="max-w-7xl mx-auto space-y-8 flex flex-col">
      {/* Page Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          📊 Sprint Analytics & Reports
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">
          Visual metrics and workload size reviews for project "{activeProject?.name || 'Selected Project'}".
        </p>
      </div>

      {loading ? (
        <div className="text-center py-24 text-zinc-500 dark:text-zinc-400 font-bold animate-pulse">
          Analyzing project metadata & distributions...
        </div>
      ) : (
        <>
          {/* Top Row: KPI Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-xl pb-2 relative overflow-hidden group">
              <div className="absolute top-3 right-3 text-zinc-200 dark:text-zinc-800 group-hover:text-zinc-300 dark:group-hover:text-zinc-700 transition">
                <ListTodo className="w-8 h-8" />
              </div>
              <CardHeader className="pb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Total Work Items</span>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-zinc-900 dark:text-white">{totalTasks}</p>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 block">Includes phase tasks & subtasks</span>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-xl pb-2 relative overflow-hidden group">
              <div className="absolute top-3 right-3 text-zinc-200 dark:text-zinc-800 group-hover:text-zinc-300 dark:group-hover:text-zinc-700 transition">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <CardHeader className="pb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Completion Percentage</span>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-emerald-500">{completionRate}%</p>
                  <span className="text-xs text-zinc-500">({doneCount} done)</span>
                </div>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 block">Of all sprint items completed</span>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-xl pb-2 relative overflow-hidden group">
              <div className="absolute top-3 right-3 text-zinc-200 dark:text-zinc-800 group-hover:text-zinc-300 dark:group-hover:text-zinc-700 transition">
                <Hourglass className="w-8 h-8" />
              </div>
              <CardHeader className="pb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Workload Size</span>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-500">{totalEstimatedDays} Days</p>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 block">Sum of task duration metrics</span>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-xl pb-2 relative overflow-hidden group">
              <div className="absolute top-3 right-3 text-zinc-200 dark:text-zinc-800 group-hover:text-zinc-300 dark:group-hover:text-zinc-700 transition">
                <BarChart3 className="w-8 h-8" />
              </div>
              <CardHeader className="pb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">In Progress Load</span>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-amber-500">{inProgressCount}</p>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 block">Active tickets being resolved</span>
              </CardContent>
            </Card>
          </div>

          {/* Middle Row: Recharts Widgets Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Chart 1: Status Distribution (PieChart) */}
            <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-xl">
              <CardHeader className="pb-2 flex flex-row items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-emerald-500" />
                <CardTitle className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-80 flex items-center justify-center">
                {statusData.length === 0 ? (
                  <span className="text-xs text-zinc-500">No tasks status logs found.</span>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<CustomPieTooltip />} />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ 
                          fontSize: '11px', 
                          fontWeight: 'bold', 
                          color: isDark ? '#a1a1aa' : '#52525b' 
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Chart 2: Duration work sizing load (BarChart) */}
            <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-xl">
              <CardHeader className="pb-2 flex flex-row items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                <CardTitle className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Workload by Task (Duration Days)</CardTitle>
              </CardHeader>
              <CardContent className="h-80 flex items-center justify-center">
                {durationData.length === 0 ? (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Create tasks with duration estimates to populate graph.</span>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={durationData}
                      margin={{ top: 20, right: 10, left: -25, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#27272a" : "#e4e4e7"} vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke={isDark ? "#a1a1aa" : "#71717a"} 
                        fontSize={10} 
                        fontWeight="bold"
                        tickLine={false} 
                      />
                      <YAxis 
                        stroke={isDark ? "#a1a1aa" : "#71717a"} 
                        fontSize={10} 
                        fontWeight="bold"
                        tickLine={false} 
                        allowDecimals={false}
                      />
                      <ChartTooltip content={<CustomBarTooltip />} />
                      <Bar 
                        dataKey="duration" 
                        fill="#4f46e5" // Indigo 600
                        radius={[6, 6, 0, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

          </div>
        </>
      )}
    </div>
  );
}
