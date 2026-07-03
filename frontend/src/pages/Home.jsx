import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Users, Inbox, Sparkles, Folder, Check, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import axios from 'axios';

export default function Home() {
  const { setIsInviteModalOpen } = useOutletContext();
  const [activeSubTab, setActiveSubTab] = useState('Primary');
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const eventSource = new EventSource(`${import.meta.env.VITE_API_URL}/api/notifications/stream?token=${token}`);

    eventSource.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);
        setNotifications((prev) => {
          if (prev.some((n) => n.id === parsedData.id)) return prev;
          return [parsedData, ...prev];
        });
      } catch (err) {
        console.error("Error parsing SSE data", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("EventSource failed:", err);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const tabs = ['Primary', 'Other', 'Later', 'Cleared'];

  const filteredNotifications = notifications.filter(
    (n) => n.tab_category.toLowerCase() === activeSubTab.toLowerCase()
  );

  const handleMarkAsRead = async (id) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, is_read: true, tab_category: 'Cleared' } : n
      ));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleSnooze = async (id) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/notifications/${id}/snooze`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, tab_category: 'Later' } : n
      ));
    } catch (err) {
      console.error("Failed to snooze notification:", err);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Sub-Header Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-[#1e2025] -mx-6 -mt-6 px-6 pt-3 flex items-center">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`pb-3 text-xs font-semibold tracking-wide uppercase transition-all relative cursor-pointer ${
                activeSubTab === tab
                  ? 'text-zinc-900 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span>{tab}</span>
              {activeSubTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7b68ee] rounded-full animate-in fade-in duration-200" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 mt-4">
        {filteredNotifications.length > 0 ? (
          <div className="space-y-3">
            {filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 rounded-lg border group relative ${
                  notif.is_read
                    ? 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                    : 'bg-white dark:bg-zinc-800 border-blue-200 dark:border-blue-800 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-1 pr-16">
                  <h3 className={`font-semibold ${notif.is_read ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-900 dark:text-white'}`}>
                    {notif.title}
                  </h3>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap ml-2">
                    {new Date(notif.created_at).toLocaleString()}
                  </span>
                </div>
                <p className={`text-sm pr-16 ${notif.is_read ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                  {notif.message}
                </p>

                {/* Actions overlay */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  {notif.tab_category.toLowerCase() !== 'cleared' && (
                    <button 
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 text-green-600 dark:text-green-500 transition-colors shadow-sm"
                      title="Mark as Read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  {notif.tab_category.toLowerCase() !== 'later' && notif.tab_category.toLowerCase() !== 'cleared' && (
                    <button 
                      onClick={() => handleSnooze(notif.id)}
                      className="p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 text-amber-600 dark:text-amber-500 transition-colors shadow-sm"
                      title="Snooze"
                    >
                      <Clock className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center text-[#7b68ee] animate-pulse">
              <Inbox className="w-8 h-8" />
            </div>
            
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                No notifications here
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                You're all caught up in {activeSubTab}.
              </p>
            </div>
            <Button
              onClick={() => {
                if (setIsInviteModalOpen) setIsInviteModalOpen(true);
              }}
              className="bg-[#7b68ee] hover:bg-[#6c5ce7] text-white font-medium px-6 py-2.5 rounded-lg mt-2 transition-all transform hover:scale-102 hover:shadow-lg shadow-[#7b68ee]/20 active:scale-98"
            >
              Invite people
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
