import React from 'react';
import { getAvatarColor } from './ganttUtils';

export default function GanttAssigneePicker({
  assigneePicker,
  closePicker,
  pickerSearch,
  setPickerSearch,
  workspaceMembers,
  handleAssign,
}) {
  if (!assigneePicker.taskId) return null;

  return (
    <>
      {/* Transparent backdrop — click-outside closes picker, no useEffect needed */}
      <div
        className="fixed inset-0 z-[99]"
        onClick={closePicker}
      />

      {/* Floating picker panel */}
      <div
        className="fixed z-[100] w-60 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
        style={{
          top:  assigneePicker.y,
          left: assigneePicker.x,
          // Keep inside viewport
          maxHeight: '320px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">Assign Member</p>
          <input
            autoFocus
            value={pickerSearch}
            onChange={(e) => setPickerSearch(e.target.value)}
            placeholder="Search members..."
            className="w-full text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md px-2.5 py-1.5 outline-none text-zinc-800 dark:text-zinc-200 placeholder-zinc-400"
          />
        </div>

        {/* Member list */}
        <div className="overflow-y-auto" style={{ maxHeight: '220px' }}>
          {workspaceMembers
            .filter(m => {
              const q = pickerSearch.toLowerCase();
              return !q ||
                m.user.name.toLowerCase().includes(q) ||
                m.user.email.toLowerCase().includes(q);
            })
            .map(member => (
              <button
                key={member.user.id}
                onClick={() => handleAssign(member)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer"
              >
                {/* Avatar */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white font-extrabold text-[11px] flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: getAvatarColor(member.user.name) }}
                >
                  {member.user.name.charAt(0).toUpperCase()}
                </div>
                {/* Name + email */}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 truncate">{member.user.name}</p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">{member.user.email}</p>
                </div>
              </button>
            ))
          }
          {workspaceMembers.filter(m => {
            const q = pickerSearch.toLowerCase();
            return !q || m.user.name.toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q);
          }).length === 0 && (
            <p className="text-center text-xs text-zinc-400 py-6">No members found</p>
          )}
        </div>
      </div>
    </>
  );
}
