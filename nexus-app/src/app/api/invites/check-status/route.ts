import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    
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

    // Check if email has valid invite
    const { data: hasValidInvite, error: checkError } = await supabase
      .rpc('has_valid_invite', { email_param: email.toLowerCase().trim() });

    if (checkError) {
      console.error('Error checking invite status:', checkError);
      return NextResponse.json(
        { error: 'Failed to check invite status' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      hasValidInvite: Boolean(hasValidInvite),
      email: email.toLowerCase().trim()
    });

  } catch (error) {
    console.error('Check invite status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// GET method for query string parameters (optional alternative)
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    
    // Parse email from query string
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' }, 
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

    // Check if email has valid invite
    const { data: hasValidInvite, error: checkError } = await supabase
      .rpc('has_valid_invite', { email_param: email.toLowerCase().trim() });

    if (checkError) {
      console.error('Error checking invite status:', checkError);
      return NextResponse.json(
        { error: 'Failed to check invite status' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      hasValidInvite: Boolean(hasValidInvite),
      email: email.toLowerCase().trim()
    });

  } catch (error) {
    console.error('Check invite status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 