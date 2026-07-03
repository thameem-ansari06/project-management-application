import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import MainLayout from './components/layout/MainLayout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import GanttChart from './pages/GanttChart';
import TaskEngineList from './pages/TaskEngineList';
import KanbanBoard from './pages/KanbanBoard';
import Planner from './pages/Planner';
import WhiteboardCanvas from './pages/WhiteboardCanvas';
import SprintReports from './pages/SprintReports';
import NotionDocs from './pages/NotionDocs';
import ChannelChat from './pages/ChannelChat';
import TaskForms from './pages/TaskForms';
import AutomationsConfig from './pages/AutomationsConfig';
import TargetsGoals from './pages/TargetsGoals';
import JoinTeam from './pages/JoinTeam';
import Timesheet from './pages/Timesheet';

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark" enableSystem={false}>
      <BrowserRouter>
        <Routes>
          {/* Standalone invitation acceptance page — no sidebar/layout */}
          <Route path="/join-team" element={<JoinTeam />} />

          {/* Main app shell with sidebar layout */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="home" element={<Home />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="tasks" element={<TaskEngineList />} />
            <Route path="kanban" element={<KanbanBoard />} />
            <Route path="calendar" element={<Planner />} />
            <Route path="whiteboard" element={<WhiteboardCanvas />} />
            <Route path="reports" element={<SprintReports />} />
            <Route path="docs" element={<NotionDocs />} />
            <Route path="chat" element={<ChannelChat />} />
            <Route path="forms" element={<TaskForms />} />
            <Route path="automation" element={<AutomationsConfig />} />
            <Route path="goals" element={<TargetsGoals />} />
            <Route path="gantt" element={<GanttChart />} />
            <Route path="timesheet" element={<Timesheet />} />
          </Route>
          <Route path="/register" element={<MainLayout />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}