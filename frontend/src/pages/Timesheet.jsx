import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '../components/ui/table';

export default function Timesheet() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/time-tracking/user`);
      setEntries(res.data);
    } catch (err) {
      console.error("Failed to fetch timesheet entries:", err);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0h 0m 0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Timesheet</h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
          Review your logged time entries across all tasks and projects.
        </p>
      </div>

      <Card className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-xl w-full text-zinc-900 dark:text-zinc-100">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Logged Time</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-zinc-200 dark:border-zinc-800">
                <TableHead className="py-3.5 px-6 text-zinc-500 dark:text-zinc-400">Date</TableHead>
                <TableHead className="py-3.5 px-4 text-zinc-500 dark:text-zinc-400">Task ID</TableHead>
                <TableHead className="py-3.5 px-4 text-zinc-500 dark:text-zinc-400">Start Time</TableHead>
                <TableHead className="py-3.5 px-4 text-zinc-500 dark:text-zinc-400">End Time</TableHead>
                <TableHead className="py-3.5 px-6 text-right text-zinc-500 dark:text-zinc-400">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {entries.map(entry => (
                <TableRow key={entry.id} className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100/40 dark:hover:bg-zinc-900/40 transition">
                  <TableCell className="py-4 px-6 font-semibold">
                    {new Date(entry.start_time).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="py-4 px-4 font-mono text-xs text-blue-500 dark:text-blue-400">
                    #{entry.task_id}
                  </TableCell>
                  <TableCell className="py-4 px-4 text-zinc-600 dark:text-zinc-400 text-sm font-semibold">
                    {new Date(entry.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell className="py-4 px-4 text-zinc-600 dark:text-zinc-400 text-sm font-semibold">
                    {entry.end_time ? new Date(entry.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span className="text-emerald-500 font-bold animate-pulse">Running</span>}
                  </TableCell>
                  <TableCell className="py-4 px-6 text-right font-mono font-bold text-sm text-zinc-800 dark:text-zinc-200">
                    {formatDuration(entry.duration)}
                  </TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan="5" className="py-12 text-center text-zinc-500 text-sm font-semibold">
                    No time entries found. Start a timer from your tasks to log time.
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
