import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
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

    // Parse request body
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' }, 
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' }, 
        { status: 400 }
      );
    }

    // Send invite via database function
    const { data: result, error: inviteError } = await supabase
      .rpc('send_user_invite', {
        inviter_id_param: user.id,
        email_param: email.toLowerCase().trim()
      });

    if (inviteError) {
      console.error('Database error sending invite:', inviteError);
      return NextResponse.json(
        { error: 'Failed to send invite' }, 
        { status: 500 }
      );
    }

    const inviteResult = result?.[0];
    
    if (!inviteResult?.success) {
      return NextResponse.json(
        { error: inviteResult?.message || 'Failed to send invite' }, 
        { status: 400 }
      );
    }

    // Get user profile for email template
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('name, email, username')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error getting user profile:', profileError);
      // Continue - invite was created successfully, just email might not send
    }

    // Send email notification (non-blocking)
    if (userProfile) {
      try {
        const emailResponse = await fetch(`${request.nextUrl.origin}/api/invites/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.toLowerCase().trim(),
            inviterName: userProfile.name,
            inviterUsername: userProfile.username
          }),
        });

        if (!emailResponse.ok) {
          console.error('Email sending failed, but invite was created');
          // Don't fail the request - invite was created successfully
        }
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Don't fail the request - invite was created successfully
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Invite sent successfully',
      inviteId: inviteResult.invite_id
    });

  } catch (error) {
    console.error('Send invite API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 