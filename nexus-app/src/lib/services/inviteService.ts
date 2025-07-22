// Removed supabase import - now using API routes instead of direct DB calls

export interface InviteStats {
  invite_limit: number;
  invites_used: number;
  invites_available: number;
  pending_invites: number;
  successful_signups: number;
}

export interface SentInvite {
  id: string;
  email: string;
  created_at: string;
  cancelled_at?: string;
  invites: {
    id: string;
    used_at?: string;
    used_by_user_id?: string;
  };
}

export class InviteService {
  
  async checkInviteStatus(email: string): Promise<{ hasValidInvite: boolean; email: string }> {
    const response = await fetch('/api/invites/check-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error checking invite status:', errorData);
      throw new Error(errorData.error || 'Failed to check invite status');
    }

    const result = await response.json();
    
    return {
      hasValidInvite: result.hasValidInvite || false,
      email: result.email || email
    };
  }

  async getUserInviteStats(userId: string): Promise<InviteStats> {
    const response = await fetch('/api/invites/dashboard', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error getting invite stats:', errorData);
      throw new Error(errorData.error || 'Failed to get invite stats');
    }

    const result = await response.json();
    
    return result.data?.stats || {
      invite_limit: 0,
      invites_used: 0,
      invites_available: 0,
      pending_invites: 0,
      successful_signups: 0
    };
  }

  async getSentInvites(userId: string): Promise<SentInvite[]> {
    const response = await fetch('/api/invites/dashboard', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error getting sent invites:', errorData);
      throw new Error(errorData.error || 'Failed to get sent invites');
    }

    const result = await response.json();
    
    return result.data?.invites || [];
  }

  async sendInvite(userId: string, email: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch('/api/invites/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error sending invite:', errorData);
      throw new Error(errorData.error || 'Failed to send invite');
    }

    const result = await response.json();
    
    return {
      success: result.success || false,
      message: result.message || 'Invite sent successfully'
    };
  }

  async cancelInvite(userId: string, inviteId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`/api/invites/cancel/${inviteId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error cancelling invite:', errorData);
      throw new Error(errorData.error || 'Failed to cancel invite');
    }

    const result = await response.json();
    
    return {
      success: result.success || false,
      message: result.message || 'Invite cancelled successfully'
    };
  }
}

export const inviteService = new InviteService(); 