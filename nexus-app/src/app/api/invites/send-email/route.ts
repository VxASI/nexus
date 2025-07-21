import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email, inviterName, inviterUsername } = await request.json();
    
    if (!email || !inviterName || !inviterUsername) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await sendInviteEmail(email, inviterName, inviterUsername);

    return NextResponse.json({ 
      success: true,
      message: 'Email sent successfully'
    });

  } catch (error) {
    console.error('Send email API error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}

async function sendInviteEmail(email: string, inviterName: string, inviterUsername: string) {
  const signupUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}?email=${encodeURIComponent(email)}`;
  
  await resend.emails.send({
    from: 'NEXUS <noreply@yourdomain.com>', // Update with your domain
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
            <strong style="color: #10b981;">${inviterName}</strong> (@${inviterUsername}) has invited you to join the NEXUS collective intelligence network.
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
            This invitation was sent by ${inviterName}. If you don't know this person, you can safely ignore this email.
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
} 