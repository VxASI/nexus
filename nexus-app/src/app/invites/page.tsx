'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import Header from '@/components/Header';
import { inviteService, InviteStats, SentInvite } from '@/lib/services/inviteService';

export default function InvitesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [sentInvites, setSentInvites] = useState<SentInvite[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  // Load invite data
  useEffect(() => {
    if (isAuthenticated && user) {
      loadInviteData();
    }
  }, [isAuthenticated, user]);

  const loadInviteData = async () => {
    if (!user) return;
    
    try {
      setIsLoadingData(true);
      setError(null);

      // Use the invite service instead of API calls
      const [statsData, invitesData] = await Promise.all([
        inviteService.getUserInviteStats(user.id),
        inviteService.getSentInvites(user.id)
      ]);

      setStats(statsData);
      setSentInvites(invitesData);

    } catch (error) {
      console.error('Error loading invite data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load invite data');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSendInvite = async (email: string) => {
    if (!user) return;
    
    try {
      setSendingInvite(true);
      setError(null);

      await inviteService.sendInvite(user.id, email);

      // Reload data to get updated stats
      await loadInviteData();
      setShowSendModal(false);

    } catch (error) {
      console.error('Error sending invite:', error);
      setError(error instanceof Error ? error.message : 'Failed to send invite');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!user) return;
    
    try {
      await inviteService.cancelInvite(user.id, inviteId);

      // Reload data to get updated stats
      await loadInviteData();

    } catch (error) {
      console.error('Error cancelling invite:', error);
      setError(error instanceof Error ? error.message : 'Failed to cancel invite');
    }
  };

  const getInviteStatus = (invite: SentInvite) => {
    if (invite.cancelled_at) return 'Cancelled';
    if (invite.invites.used_at) return 'Joined';
    return 'Pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Joined': return 'text-emerald-400 bg-emerald-400/10';
      case 'Pending': return 'text-yellow-400 bg-yellow-400/10';
      case 'Cancelled': return 'text-gray-400 bg-gray-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-emerald-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="liminal-logbook">
      <div className="grid grid-rows-[auto_1fr] h-screen overflow-hidden">
        {/* Header */}
        <Header 
          currentMode="logbook"
          currentView="profile"
          onModeChange={() => {}}
          onViewChange={() => {}}
          currentUser={user}
          onProfileClick={() => {}}
          customTitle="Invite Management"
          customStatus="Manage your NEXUS invitations"
          hideNavigation={true}
        />
        
        {/* Main Content */}
        <div className="overflow-y-auto bg-gradient-to-br from-gray-900 via-gray-800 to-black">
          <div className="max-w-4xl mx-auto p-6">
            
            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className="mb-6 flex items-center gap-2 text-gray-400 hover:text-emerald-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <StatCard 
                  title="Available" 
                  value={stats.invites_available}
                  color="emerald" 
                />
                <StatCard 
                  title="Sent" 
                  value={stats.invites_used}
                  color="blue" 
                />
                <StatCard 
                  title="Pending" 
                  value={Number(stats.pending_invites)}
                  color="yellow" 
                />
                <StatCard 
                  title="Joined" 
                  value={Number(stats.successful_signups)}
                  color="purple" 
                />
              </div>
            )}

            {/* Send Invite Button */}
            <div className="mb-6">
              <button 
                onClick={() => setShowSendModal(true)}
                disabled={!stats || stats.invites_available <= 0 || isLoadingData}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-500 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Send Invite
                {stats && stats.invites_available <= 0 && (
                  <span className="text-xs opacity-75">(No invites available)</span>
                )}
              </button>
            </div>

            {/* Invites List */}
            <div className="bg-black/20 border border-white/10 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h3 className="text-lg font-medium text-white">Sent Invitations</h3>
              </div>
              
              {isLoadingData ? (
                <div className="p-8 text-center text-gray-400">Loading invites...</div>
              ) : sentInvites.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No invites sent yet</div>
              ) : (
                <div className="divide-y divide-white/10">
                  {sentInvites.map((invite) => (
                    <InviteListItem
                      key={invite.id}
                      invite={invite}
                      onCancel={handleCancelInvite}
                      getInviteStatus={getInviteStatus}
                      getStatusColor={getStatusColor}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Send Invite Modal */}
      <SendInviteModal 
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        onSend={handleSendInvite}
        isLoading={sendingInvite}
      />
    </div>
  );
}

// Components
interface StatCardProps {
  title: string;
  value: number;
  color: 'emerald' | 'blue' | 'yellow' | 'purple';
}

function StatCard({ title, value, color }: StatCardProps) {
  const colorMap = {
    emerald: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    yellow: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorMap[color]}`}>
      <div className={`text-2xl font-bold ${colorMap[color].split(' ')[0]}`}>
        {value}
      </div>
      <div className="text-sm text-gray-400">{title}</div>
    </div>
  );
}

interface InviteListItemProps {
  invite: SentInvite;
  onCancel: (inviteId: string) => void;
  getInviteStatus: (invite: SentInvite) => string;
  getStatusColor: (status: string) => string;
}

function InviteListItem({ invite, onCancel, getInviteStatus, getStatusColor }: InviteListItemProps) {
  const status = getInviteStatus(invite);
  const canCancel = status === 'Pending';

  return (
    <div className="p-4 flex items-center justify-between">
      <div className="flex-1">
        <div className="font-medium text-white">{invite.email}</div>
        <div className="text-sm text-gray-400">
          Sent {new Date(invite.created_at).toLocaleDateString()}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
          {status}
        </span>
        
        {canCancel && (
          <button
            onClick={() => onCancel(invite.invites.id)}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

interface SendInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (email: string) => void;
  isLoading: boolean;
}

function SendInviteModal({ isOpen, onClose, onSend, isLoading }: SendInviteModalProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Email is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    onSend(email);
  };

  const handleClose = () => {
    setEmail('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-white/10 rounded-lg w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">Send Invite</h3>
            <button 
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="friend@example.com"
                className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-400"
                disabled={isLoading}
              />
              {error && (
                <p className="mt-2 text-sm text-red-400">{error}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-500 rounded-lg transition-colors"
              >
                {isLoading ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 