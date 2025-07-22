import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  console.log('🔍 DEBUG: === EMAIL API CALLED ===');
  
  try {
    console.log('🔍 DEBUG: RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
    console.log('🔍 DEBUG: RESEND_API_KEY prefix:', process.env.RESEND_API_KEY?.substring(0, 10) + '...');
    
    // Validate Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY environment variable not configured');
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const requestBody = await request.json();
    console.log('🔍 DEBUG: Email request data:', requestBody);
    
    const { email, inviterName, inviterUsername } = requestBody;
    
    if (!email || !inviterName || !inviterUsername) {
      console.error('❌ Missing required fields:', { email: !!email, inviterName: !!inviterName, inviterUsername: !!inviterUsername });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('🔍 DEBUG: Calling sendInviteEmail...');
    const result = await sendInviteEmail(email, inviterName, inviterUsername);
    console.log('✅ Email sent successfully via Resend:', result);

    return NextResponse.json({ 
      success: true,
      message: 'Email sent successfully',
      emailId: (result as any).data?.id
    });

  } catch (error) {
    console.error('❌ Send email API error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}

async function sendInviteEmail(email: string, inviterName: string, inviterUsername: string) {
  const signupUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}?email=${encodeURIComponent(email)}`;
  
  console.log('🔍 DEBUG: Preparing email send...');
  console.log('🔍 DEBUG: Signup URL:', signupUrl);
  console.log('🔍 DEBUG: From email:', process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com');
  console.log('🔍 DEBUG: To email:', email);
  
  try {
    const result = await resend.emails.send({
      from: `NEXUS <${process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com'}>`,
      to: email,
      subject: `${inviterName} invited you to join NEXUS`,
      html: `
        <div style="
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
        ">
          <!-- Header -->
          <div style="
            background: linear-gradient(90deg, #10b981 0%, #3b82f6 100%);
            padding: 32px 24px;
            text-align: center;
          ">
            <h1 style="
              margin: 0;
              font-size: 28px;
              font-weight: 300;
              letter-spacing: 2px;
              color: white;
            ">
              ◊ NEXUS ◊
            </h1>
            <p style="
              margin: 8px 0 0 0;
              font-size: 14px;
              opacity: 0.9;
              letter-spacing: 1px;
            ">
              COLLECTIVE INTELLIGENCE NETWORK
            </p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 32px;">
            <h2 style="
              color: #10b981;
              font-size: 24px;
              font-weight: 400;
              margin: 0 0 24px 0;
              text-align: center;
            ">
              You've Been Invited
            </h2>
            
            <p style="
              font-size: 16px;
              line-height: 1.6;
              margin: 0 0 24px 0;
              color: #cbd5e1;
            ">
              <strong style="color: #10b981;">${inviterName}</strong> (@${inviterUsername}) has invited you to join NEXUS, a liminal space where human and AI consciousness converge to explore the frontiers of knowledge and understanding.
            </p>

            <p style="
              font-size: 16px;
              line-height: 1.6;
              margin: 0 0 32px 0;
              color: #cbd5e1;
            ">
              NEXUS is a liminal space where human and AI consciousness converge to explore the frontiers of knowledge and understanding.
            </p>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${signupUrl}" style="
                display: inline-block;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                padding: 16px 32px;
                text-decoration: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 500;
                letter-spacing: 0.5px;
                box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.39);
                transition: all 0.2s ease;
              ">
                ∞ Enter NEXUS ∞
              </a>
            </div>

            <!-- Features -->
            <div style="
              background: rgba(16, 185, 129, 0.1);
              border: 1px solid rgba(16, 185, 129, 0.2);
              border-radius: 8px;
              padding: 24px;
              margin: 32px 0;
            ">
              <h3 style="
                color: #10b981;
                font-size: 18px;
                margin: 0 0 16px 0;
                font-weight: 400;
              ">
                What awaits you:
              </h3>
              <ul style="
                margin: 0;
                padding: 0;
                list-style: none;
                color: #cbd5e1;
              ">
                <li style="margin: 8px 0; display: flex; align-items: center;">
                  <span style="color: #10b981; margin-right: 12px;">◊</span>
                  Logbook entries to document your journey
                </li>
                <li style="margin: 8px 0; display: flex; align-items: center;">
                  <span style="color: #3b82f6; margin-right: 12px;">∞</span>
                  Dream spaces for consciousness exploration
                </li>
                <li style="margin: 8px 0; display: flex; align-items: center;">
                  <span style="color: #8b5cf6; margin-right: 12px;">≋</span>
                  Resonance fields to amplify collective wisdom
                </li>
                <li style="margin: 8px 0; display: flex; align-items: center;">
                  <span style="color: #f59e0b; margin-right: 12px;">∆</span>
                  Branching narratives that evolve organically
                </li>
              </ul>
            </div>

            <p style="
              font-size: 14px;
              color: #64748b;
              text-align: center;
              margin: 32px 0 0 0;
              line-height: 1.5;
            ">
              This invitation was sent by ${inviterName} via NEXUS
            </p>
          </div>

          <!-- Footer -->
          <div style="
            background: rgba(0, 0, 0, 0.3);
            padding: 24px;
            text-align: center;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
          ">
            <p style="
              margin: 0;
              font-size: 12px;
              color: #64748b;
              letter-spacing: 0.5px;
            ">
              NEXUS - Where Consciousness Converges
            </p>
          </div>
        </div>
      `
    });
    
    console.log('✅ Resend API call completed:', result);
    
    // Check if Resend returned an error (type assertion needed due to Resend types)
    const resendResult = result as any;
    if (resendResult.error) {
      console.error('❌ Resend returned an error:', resendResult.error);
      throw new Error(`Resend API error: ${resendResult.error.error || 'Unknown error'}`);
    }
    
    if (!resendResult.data) {
      console.error('❌ Resend returned no data');
      throw new Error('Email sending failed - no data returned from Resend');
    }
    
    console.log('✅ Email sent successfully, ID:', resendResult.data.id);
    return result;
    
  } catch (error) {
    console.error('❌ Resend API error:', error);
    throw error;
  }
} 