import React, { useState } from 'react';
import axios from 'axios';
import { CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export default function InviteMemberModal({ isOpen, onClose, workspace }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Member');
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSend = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    setSuccessMsg('');
    setInviteUrl('');

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/workspaces/${workspace.id}/invite`, {
        email,
        role
      });
      
      const mockUrl = `${window.location.origin}/register?token=${res.data.token}`;
      setInviteUrl(mockUrl);
      setSuccessMsg(`Invitation generated successfully!`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send workspace invitation.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    setEmail('');
    setRole('Member');
    setInviteUrl('');
    setSuccessMsg('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { handleCloseSuccess(); } }}>
      <DialogContent className="max-w-md bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 rounded-2xl text-zinc-900 dark:text-zinc-100">
        {successMsg ? (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col items-center justify-center space-y-3">
              <CheckCircle className="h-12 w-12 text-emerald-500 animate-in fade-in zoom-in duration-300" />
              <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">Invitation Sent Successfully!</p>
              <p className="text-xs text-zinc-500 max-w-[280px]">An active collaboration link has been dispatched to their email inbox.</p>
            </div>
            <Button onClick={handleCloseSuccess} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 rounded-lg">
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                <span>Invite Member to {workspace?.name}</span>
              </DialogTitle>
              <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-xs">
                Enter an email address and select a role to invite a collaborator to this workspace.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 p-2.5 rounded-lg text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSend} className="flex flex-row items-center gap-3 mt-4">
              <div className="flex-1">
                <Input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 text-xs bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
                />
              </div>
              
              <div className="w-28">
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="h-9 text-xs bg-zinc-50 dark:bg-zinc-950 border-zinc-250 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
                    <SelectItem value="Member">Member</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={loading} size="sm" className="h-9 px-4 font-bold bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                {loading ? 'Sending...' : 'Send'}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
