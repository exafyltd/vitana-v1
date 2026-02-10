import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-WELCOME-DISCOUNT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { discount_code_id, user_id, code, discount_percent, expires_at } = await req.json();
    logStep("Payload received", { discount_code_id, user_id, code });

    if (!user_id || !code) {
      throw new Error("Missing required fields: user_id, code");
    }

    // Fetch user email from auth.users
    const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(user_id);
    if (userError || !userData?.user) {
      throw new Error(`Could not fetch user: ${userError?.message || 'not found'}`);
    }

    const userEmail = userData.user.email;
    const userName = userData.user.user_metadata?.full_name || userData.user.user_metadata?.display_name || userEmail?.split('@')[0] || 'there';
    logStep("User found", { email: userEmail, name: userName });

    if (!userEmail) {
      throw new Error("User has no email address");
    }

    const expiresDate = new Date(expires_at);
    const formattedExpiry = expiresDate.toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });

    const resend = new Resend(resendKey);

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fdf2f8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fdf2f8; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(236, 72, 153, 0.12);">
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899, #f43f5e); padding: 40px 40px 30px; text-align: center;">
              <img src="https://vitanaland.com/images/maxina-logo.png" alt="MAXINA" style="height: 48px; margin-bottom: 16px;" />
              <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">
                Welcome to Maxina! ✨
              </h1>
              <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 8px 0 0;">
                Your wellness journey starts now
              </p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Hi ${userName},
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Thank you for joining the Maxina community! As a welcome gift, here's your personal <strong>${discount_percent}% discount code</strong> for all VITANA events and meetups:
              </p>
              
              <!-- Discount Code Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
                <tr>
                  <td style="background: linear-gradient(135deg, #fdf2f8, #fce7f3); border: 2px dashed #ec4899; border-radius: 12px; padding: 24px; text-align: center;">
                    <p style="color: #9d174d; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">
                      Your Discount Code
                    </p>
                    <p style="color: #be185d; font-size: 32px; font-weight: 800; letter-spacing: 3px; margin: 0 0 8px; font-family: monospace;">
                      ${code}
                    </p>
                    <p style="color: #9d174d; font-size: 14px; margin: 0;">
                      ${discount_percent}% off · Valid until ${formattedExpiry}
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 32px;">
                Use this code at checkout when purchasing tickets for any VITANA event or meetup. Valid for 90 days on your first purchase.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://vitanaland.com/comm/events-meetups" 
                       style="display: inline-block; background: linear-gradient(135deg, #ec4899, #f43f5e); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; letter-spacing: 0.3px;">
                      Browse Events & Meetups →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fdf2f8; padding: 24px 40px; text-align: center; border-top: 1px solid #fce7f3;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Empowering women through wellness, community, and longevity experiences.
              </p>
              <p style="color: #d1d5db; font-size: 11px; margin: 8px 0 0;">
                © ${new Date().getFullYear()} VITANA · Maxina Portal
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const emailResponse = await resend.emails.send({
      from: "Maxina by VITANA <noreply@vitanaland.com>",
      to: [userEmail],
      subject: `🎉 Your ${discount_percent}% Welcome Discount — ${code}`,
      html: emailHtml,
    });

    logStep("Email sent successfully", { emailId: emailResponse.data?.id });

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
