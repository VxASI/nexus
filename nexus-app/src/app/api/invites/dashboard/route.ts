import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    // Get user invite statistics
    const { data: stats, error: statsError } = await supabase
      .rpc('get_user_invite_stats', { user_id_param: user.id });

    if (statsError) {
      console.error('Error getting invite stats:', statsError);
      return NextResponse.json(
        { error: 'Failed to get invite statistics' }, 
        { status: 500 }
      );
    }

    // Get sent invites list
    const { data: invites, error: invitesError } = await supabase
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
      .eq('inviter_user_id', user.id)
      .order('created_at', { ascending: false });

    if (invitesError) {
      console.error('Error getting sent invites:', invitesError);
      return NextResponse.json(
        { error: 'Failed to get sent invites' }, 
        { status: 500 }
      );
    }

    // Transform the data to match expected interface
    const transformedInvites = (invites || []).map((item: any) => ({
      id: item.id,
      email: item.email,
      created_at: item.created_at,
      cancelled_at: item.cancelled_at,
      invites: Array.isArray(item.invites) ? item.invites[0] : item.invites
    }));

    return NextResponse.json({
      success: true,
      data: {
        stats: stats?.[0] || {
          invite_limit: 0,
          invites_used: 0,
          invites_available: 0,
          pending_invites: 0,
          successful_signups: 0
        },
        invites: transformedInvites
      }
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 