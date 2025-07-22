import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    let supabase = createRouteHandlerClient({ cookies });

    // ---------------------------------------------------------------------
    // AUTHENTICATION
    // ---------------------------------------------------------------------
    // 1. Attempt cookie-based auth (standard for `@supabase/auth-helpers`)
    let {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // 2. If that failed, fall back to the bearer token passed from the
    //    browser.  This covers the case where the client stores the session
    //    in localStorage and explicitly forwards the access token via the
    //    `Authorization` header.
    if ((!user || authError) && request.headers.has('authorization')) {
      const token = request.headers.get('authorization')!.replace('Bearer ', '');
      // Fall back: create a fresh client that authenticates via the bearer
      // token in the request header.  We can’t call `supabase.auth.setAuth`
      // because that helper was removed in supabase-js v2.
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      });

      const res = await supabase.auth.getUser();
      user = res.data.user;
      authError = res.error;
    }

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
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

    // Get sent invites list - DEBUG VERSION
    console.log('🔍 DEBUG: Fetching invites for user:', user.id);
    
    const { data: invites, error: invitesError } = await supabase
      .from('user_invites')
      .select(`
        id,
        email,
        created_at,
        cancelled_at,
        invite_id,
        invites(
          id,
          used_at,
          used_by_user_id,
          expires_at
        )
      `)
      .eq('inviter_user_id', user.id)
      .order('created_at', { ascending: false });

    console.log('🔍 DEBUG: Raw invites query result:', { invites, invitesError });

    if (invitesError) {
      console.error('Error getting sent invites:', invitesError);
      return NextResponse.json(
        { error: 'Failed to get sent invites' }, 
        { status: 500 }
      );
    }

    // Transform the data to match expected interface - DEBUG VERSION
    console.log('🔍 DEBUG: Transforming invites data...');
    const transformedInvites = (invites || []).map((item: any) => {
      console.log('🔍 DEBUG: Processing invite item:', item);
      return {
        id: item.id,
        email: item.email,
        created_at: item.created_at,
        cancelled_at: item.cancelled_at,
        invites: item.invites || { 
          id: item.invite_id, 
          used_at: null, 
          used_by_user_id: null 
        }
      };
    });

    console.log('🔍 DEBUG: Transformed invites:', transformedInvites);

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