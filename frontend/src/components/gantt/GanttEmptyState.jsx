import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function GanttEmptyState() {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 mb-6">Timeline Matrix</h2>
      <div className="bg-white dark:bg-zinc-900 p-12 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center py-16 shadow-sm dark:shadow-xl">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-200 dark:border-blue-900/40">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">No Scheduled Tasks Found</h3>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-6 text-sm">
          Ensure your tasks have start dates and due dates to display them on the Gantt timeline matrix.
        </p>
        <button
          onClick={() => navigate('/tasks')}
          className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-white font-bold px-6 py-2.5 rounded-lg transition cursor-pointer text-xs border border-zinc-200 dark:border-zinc-800"
        >
          Go to Tasks
        </button>
      </div>
    </div>
  );
}
