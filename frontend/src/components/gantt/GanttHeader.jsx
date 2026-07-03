import React, { useState, useRef } from 'react';
import axios from 'axios';
import { 
  Download, Upload, FileDown, FileText, X, Loader2, 
  Maximize, Calendar, CalendarDays, AlignJustify, 
  Search, Target 
} from 'lucide-react';
import { getSampleTaskTemplate, validateSampleTaskTemplate } from '../../utils/sampleTaskTemplate';

export default function GanttHeader({
  earliestDate,
  latestDate,
  viewMode,
  setViewMode,
  showCritical,
  setShowCritical,
  selectedSpace,
}) {
  const projectId = selectedSpace?.id;
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemoveJson = async () => {
    if (!selectedSpace?.id) return;
    try {
      setIsRemoving(true);
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/api/projects/${selectedSpace.id}/remove-json`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      window.location.reload();
    } catch (err) {
      console.error('Failed to remove JSON file', err);
      setIsRemoving(false);
    }
  };

  return (
    <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-1 mb-2 text-xs">
      <div className="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300">
        <FileText size={14} className="text-blue-500" />
        {selectedSpace?.name || 'Project Schedule'}
      </div>
      
      {earliestDate && latestDate && (
        <div className="text-zinc-500 dark:text-zinc-400">
          {earliestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {latestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      )}

      {selectedSpace?.imported_json_name && (
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[10px] uppercase font-bold text-indigo-500">Source:</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-medium">{selectedSpace.imported_json_name}</span>
          <button
            onClick={handleRemoveJson}
            disabled={isRemoving}
            className="ml-2 text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
            title="Remove JSON File"
          >
            {isRemoving ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
          </button>
        </div>
      )}
    </div>
  );
}

export function GanttControls({
  viewMode,
  setViewMode,
  showCritical,
  setShowCritical,
  projectId,
  onScrollToToday,
  isTodayInRange,
  searchQuery,
  setSearchQuery,
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleExport = async () => {
    if (!projectId) return;
    setIsExporting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/export-json`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'schedule.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to export JSON", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e) => {
    if (!projectId) return;
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/import-json`, formData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      window.location.reload();
    } catch (err) {
      console.error("Failed to import JSON", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadSampleTemplate = () => {
    const template = getSampleTaskTemplate();
    const validationErrors = validateSampleTaskTemplate(template);
    if (validationErrors.length > 0) {
      alert(`Sample template validation failed:\n${validationErrors.join('\n')}`);
      return;
    }

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_project_tasks.json');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const zoomOptions = [
    { key: 'fit',   icon: Maximize, label: 'Fit' },
    { key: 'day',   icon: AlignJustify, label: 'Day' },
    { key: 'week',  icon: CalendarDays, label: 'Week' },
    { key: 'month', icon: Calendar, label: 'Month' },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-2 bg-white dark:bg-zinc-900 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm text-xs">
      
      {/* LEFT: Search & Legend */}
      <div className="flex items-center gap-3">
        <div className="relative w-48">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" size={12} />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-6 pr-2 py-1 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded text-xs outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-400 dark:text-zinc-100"
          />
        </div>
        
        {/* Compact Legend */}
        <div className="hidden md:flex items-center gap-2 px-2 border-l border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white border border-zinc-400" /> <span className="text-zinc-500">Todo</span></div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> <span className="text-zinc-500">Progress</span></div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> <span className="text-zinc-500">Review</span></div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> <span className="text-zinc-500">Done</span></div>
        </div>
      </div>

      {/* RIGHT: Toggles & Actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={isTodayInRange ? onScrollToToday : undefined}
          disabled={!isTodayInRange}
          className="px-2 py-1 flex items-center gap-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
          title="Scroll to today"
        >
          <Target size={12} /> <span className="font-medium hidden sm:inline">Today</span>
        </button>

        {/* Zoom Icons */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded p-0.5">
          {zoomOptions.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              title={label}
              className={`p-1 rounded transition-colors ${
                viewMode === key 
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />

        {/* Critical Path */}
        <button
          onClick={() => setShowCritical(prev => !prev)}
          title="Toggle Critical Path"
          className={`px-2 py-1 text-[11px] font-bold tracking-wide rounded border transition-colors ${
            showCritical
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 text-red-600'
              : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 text-zinc-500 hover:bg-zinc-100'
          }`}
        >
          CRITICAL
        </button>

        {/* Import/Export */}
        {projectId && (
          <>
            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />
            <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} title="Import JSON" className="p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-50">
              <Upload size={14} />
            </button>
            <button
              onClick={handleDownloadSampleTemplate}
              title="Download a sample JSON template for importing tasks."
              className="p-1 flex items-center gap-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-50"
            >
              <FileDown size={14} />
              <span className="hidden lg:inline font-medium">Sample</span>
            </button>
            <button onClick={handleExport} disabled={isExporting} title="Export JSON" className="p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-50">
              <Download size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
