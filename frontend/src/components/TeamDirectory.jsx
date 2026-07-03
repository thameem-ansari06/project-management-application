import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Input } from './ui/input';
import { Users, Mail, Shield, User } from 'lucide-react';

export default function TeamDirectory({ members = [], onInviteClick }) {
  const [searchQuery, setSearchQuery] = useState('');

  const getAvatarColor = (name) => {
    if (!name) return '#2563eb';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
      '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6'
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const filteredMembers = members.filter(member => {
    const name = member.user?.name?.toLowerCase() || '';
    const email = member.user?.email?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            <span>Team Directory</span>
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">
            Monitor and view all active members who have accepted invitations to this workspace.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 h-9 text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
          />
          {onInviteClick && (
            <button
              onClick={onInviteClick}
              className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm hover:shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>+ Invite</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => {
          const role = member.role ? member.role.toLowerCase() : 'member';
          const isManager = role === 'admin' || role === 'owner';
          const name = member.user?.name || 'Unknown User';
          const email = member.user?.email || '';
          const avatarColor = getAvatarColor(name);
          const initials = getInitials(name);

          return (
            <Card key={member.id} className="bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800/80 shadow-sm hover:shadow-md transition duration-200">
              <CardContent className="p-5 flex items-start gap-4">
                <Avatar className="w-12 h-12 border border-zinc-200 dark:border-zinc-800 flex-shrink-0">
                  <AvatarFallback
                    className="text-white font-bold text-sm flex items-center justify-center"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate block">
                      {name}
                    </span>
                    <Badge
                      variant={isManager ? 'default' : 'secondary'}
                      className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 tracking-wider shrink-0 ${
                        isManager
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      {isManager ? 'MANAGER' : 'MEMBER'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs truncate block font-medium">
                      {email}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 text-[10px] font-semibold uppercase tracking-wider pt-1">
                    {isManager ? (
                      <Shield className="w-3 h-3 text-blue-500" />
                    ) : (
                      <User className="w-3 h-3 text-zinc-400" />
                    )}
                    <span>{member.role || 'Member'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredMembers.length === 0 && (
          <div className="col-span-full py-16 text-center bg-zinc-50 dark:bg-zinc-900/20 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
            <Users className="w-8 h-8 text-zinc-400 dark:text-zinc-600 mx-auto mb-2" />
            <span className="text-sm text-zinc-500 dark:text-zinc-400 block font-medium">No members found</span>
            <span className="text-xs text-zinc-400 dark:text-zinc-550">Try broadening your search criteria.</span>
          </div>
        )}
      </div>
    </div>
  );
}
