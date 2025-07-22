import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

interface RouteContext {
  params: {
    inviteId: string;
  };
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    let supabase = createRouteHandlerClient({ cookies });

    // ---------------------------------------------------------------------
    // AUTHENTICATION
    // ---------------------------------------------------------------------
    let {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if ((!user || authError) && request.headers.has('authorization')) {
      const token = request.headers.get('authorization')!.replace('Bearer ', '');

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

    const { inviteId } = params;
    
    if (!inviteId) {
      return NextResponse.json(
        { error: 'Invite ID is required' }, 
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(inviteId)) {
      return NextResponse.json(
        { error: 'Invalid invite ID format' }, 
        { status: 400 }
      );
    }

    // Cancel invite via database function
    const { data: result, error: cancelError } = await supabase
      .rpc('cancel_user_invite', {
        inviter_id_param: user.id,
        invite_id_param: inviteId
      });

    if (cancelError) {
      console.error('Database error cancelling invite:', cancelError);
      return NextResponse.json(
        { error: 'Failed to cancel invite' }, 
        { status: 500 }
      );
    }

    const cancelResult = result?.[0];
    
    if (!cancelResult?.success) {
      return NextResponse.json(
        { error: cancelResult?.message || 'Failed to cancel invite' }, 
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: cancelResult.message
    });

  } catch (error) {
    console.error('Cancel invite API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 