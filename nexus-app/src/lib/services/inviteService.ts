import { supabase } from '@/lib/supabase';

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
  
  async getUserInviteStats(userId: string): Promise<InviteStats> {
    const { data, error } = await supabase
      .rpc('get_user_invite_stats', { user_id_param: userId });

    if (error) {
      console.error('Error getting invite stats:', error);
      throw new Error('Failed to get invite stats');
    }

    return data?.[0] || {
      invite_limit: 0,
      invites_used: 0,
      invites_available: 0,
      pending_invites: 0,
      successful_signups: 0
    };
  }

  async getSentInvites(userId: string): Promise<SentInvite[]> {
    const { data, error } = await supabase
      .from('user_invites')
      .select(`
        id,
        email,
        created_at,
        cancelled_at,
        invites!inner(
          id,
          used_at,
          used_by_user_id
        )
      `)
      .eq('inviter_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting sent invites:', error);
      throw new Error('Failed to get sent invites');
    }

    // Transform the data to match our interface (take first invite from the array)
    const transformedData: SentInvite[] = (data || []).map((item: any) => ({
      id: item.id,
      email: item.email,
      created_at: item.created_at,
      cancelled_at: item.cancelled_at,
      invites: Array.isArray(item.invites) ? item.invites[0] : item.invites
    }));

    return transformedData;
  }

  async sendInvite(userId: string, email: string): Promise<{ success: boolean; message: string }> {
    // First, get user profile for email template
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('name, email, username')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error getting user profile:', profileError);
      throw new Error('Failed to get user profile');
    }

    // Send invite via database function
    const { data: result, error: inviteError } = await supabase
      .rpc('send_user_invite', {
        inviter_id_param: userId,
        email_param: email
      });

    if (inviteError) {
      console.error('Error sending invite:', inviteError);
      throw new Error('Database error');
    }

    const inviteResult = result?.[0];
    
    if (!inviteResult?.success) {
      throw new Error(inviteResult?.message || 'Failed to send invite');
    }

    // Send email notification
    try {
      const emailResponse = await fetch('/api/invites/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          inviterName: userProfile.name,
          inviterUsername: userProfile.username
        }),
      });

      if (!emailResponse.ok) {
        console.error('Email sending failed, but invite was created');
        // Don't throw - invite was already created successfully
      }
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't throw - invite was already created successfully
    }
    
    return {
      success: true,
      message: 'Invite sent successfully'
    };
  }

  async cancelInvite(userId: string, inviteId: string): Promise<{ success: boolean; message: string }> {
    // Cancel invite via database function
    const { data: result, error: cancelError } = await supabase
      .rpc('cancel_user_invite', {
        inviter_id_param: userId,
        invite_id_param: inviteId
      });

    if (cancelError) {
      console.error('Error cancelling invite:', cancelError);
      throw new Error('Database error');
    }

    const cancelResult = result?.[0];
    
    if (!cancelResult?.success) {
      throw new Error(cancelResult?.message || 'Failed to cancel invite');
    }

    return {
      success: true,
      message: cancelResult.message
    };
  }
}

export const inviteService = new InviteService(); 