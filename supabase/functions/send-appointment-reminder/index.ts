import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function buildEmailHtml(props: {
  patientName: string;
  providerName: string;
  providerSpecialty?: string;
  providerImageUrl?: string;
  appointmentType: string;
  startTime: string;
  location?: string;
  duration?: number;
  patientNotes?: string;
  appointmentId: string;
  hoursUntil: number;
}) {
  const formattedDate = formatDate(props.startTime);
  const formattedTime = formatTime(props.startTime);
  const reminderText = props.hoursUntil === 24
    ? "This is a friendly reminder that your appointment is tomorrow."
    : "Your appointment is coming up soon!";

  const providerImg = props.providerImageUrl
    ? `<img src="${props.providerImageUrl}" alt="${props.providerName}" style="width:80px;height:80px;border-radius:50%;margin:0 auto 16px;display:block;object-fit:cover;" />`
    : "";

  const specialtyHtml = props.providerSpecialty
    ? `<p style="color:#718096;font-size:14px;text-align:center;margin:0 0 24px;">${props.providerSpecialty}</p>`
    : "";

  const durationHtml = props.duration
    ? `<p style="color:#718096;font-size:13px;font-weight:600;text-transform:uppercase;margin:12px 0 4px;">⏱️ Duration</p><p style="color:#2d3748;font-size:16px;margin:0 0 16px;">${props.duration} minutes</p>`
    : "";

  const locationHtml = props.location
    ? `<p style="color:#718096;font-size:13px;font-weight:600;text-transform:uppercase;margin:12px 0 4px;">📍 Location</p><p style="color:#2d3748;font-size:16px;margin:0 0 16px;">${props.location}</p>`
    : "";

  const notesHtml = props.patientNotes
    ? `<hr style="border-color:#e2e8f0;margin:24px 0;" /><p style="color:#718096;font-size:13px;font-weight:600;text-transform:uppercase;margin:16px 0 8px;">📝 Your Notes:</p><p style="color:#2d3748;font-size:15px;line-height:24px;background:#fff;padding:12px;border-radius:6px;border:1px solid #e2e8f0;margin:0;">${props.patientNotes}</p>`
    : "";

  const baseUrl = Deno.env.get("SUPABASE_URL") || "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="background-color:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif;">
<div style="background-color:#ffffff;margin:0 auto;padding:20px 0 48px;margin-bottom:64px;max-width:600px;">
  <h1 style="color:#1a202c;font-size:28px;font-weight:700;margin:40px 0;padding:0 40px;line-height:1.3;">Appointment Reminder</h1>
  <p style="color:#4a5568;font-size:16px;line-height:26px;padding:0 40px;">Hi ${props.patientName},</p>
  <p style="color:#2b6cb0;font-size:18px;font-weight:600;line-height:28px;padding:0 40px;margin:24px 0;">${reminderText}</p>
  <div style="background-color:#f7fafc;border:2px solid #e2e8f0;border-radius:12px;margin:32px 40px;padding:32px;">
    ${providerImg}
    <h2 style="color:#2d3748;font-size:24px;font-weight:600;margin:0 0 8px;text-align:center;">${props.providerName}</h2>
    ${specialtyHtml}
    <hr style="border-color:#e2e8f0;margin:24px 0;" />
    <div style="margin:16px 0;">
      <p style="color:#718096;font-size:13px;font-weight:600;text-transform:uppercase;margin:12px 0 4px;">📅 Date</p>
      <p style="color:#2d3748;font-size:16px;margin:0 0 16px;">${formattedDate}</p>
      <p style="color:#718096;font-size:13px;font-weight:600;text-transform:uppercase;margin:12px 0 4px;">🕐 Time</p>
      <p style="color:#2d3748;font-size:16px;margin:0 0 16px;">${formattedTime}</p>
      <p style="color:#718096;font-size:13px;font-weight:600;text-transform:uppercase;margin:12px 0 4px;">📋 Type</p>
      <p style="color:#2d3748;font-size:16px;margin:0 0 16px;">${props.appointmentType}</p>
      ${durationHtml}
      ${locationHtml}
    </div>
    ${notesHtml}
  </div>
  <div style="text-align:center;margin:32px 40px;">
    <p style="color:#4a5568;font-size:16px;line-height:26px;">Need to make changes?</p>
    <a href="${baseUrl}/appointments" style="background-color:#3182ce;border-radius:8px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;text-align:center;display:inline-block;padding:14px 32px;margin-top:16px;">View Appointment Details</a>
  </div>
  <hr style="border-color:#e2e8f0;margin:32px 40px;" />
  <p style="color:#a0aec0;font-size:13px;line-height:20px;padding:0 40px;margin:8px 0;">If you need to cancel or reschedule, please contact us at least 24 hours in advance.</p>
  <p style="color:#a0aec0;font-size:13px;line-height:20px;padding:0 40px;margin:8px 0;">This is an automated reminder. Please do not reply to this email.</p>
</div>
</body>
</html>`;
}

serve(async (req) => {
  try {
    console.log("🔔 Appointment reminder cron job started");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
    const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const { data: appointments24h, error: error24h } = await supabase
      .from("provider_appointments")
      .select("*, profiles!provider_appointments_user_id_fkey(email, display_name, full_name)")
      .gte("start_time", in24Hours.toISOString())
      .lt("start_time", in25Hours.toISOString())
      .in("status", ["pending", "confirmed"]);

    const { data: appointments1h, error: error1h } = await supabase
      .from("provider_appointments")
      .select("*, profiles!provider_appointments_user_id_fkey(email, display_name, full_name)")
      .gte("start_time", in1Hour.toISOString())
      .lt("start_time", in2Hours.toISOString())
      .in("status", ["pending", "confirmed"]);

    if (error24h || error1h) {
      console.error("Error querying appointments:", error24h || error1h);
      throw error24h || error1h;
    }

    const allAppointments = [...(appointments24h || []), ...(appointments1h || [])];
    console.log(`Found ${allAppointments.length} appointments needing reminders`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const appointment of allAppointments) {
      const hoursUntil = Math.round(
        (new Date(appointment.start_time).getTime() - now.getTime()) / (1000 * 60 * 60)
      );
      
      const dedupKey = `appointment_reminder_${appointment.id}_${hoursUntil}h`;

      const { data: existingLog } = await supabase
        .from("notification_logs")
        .select("id")
        .eq("user_id", appointment.user_id)
        .eq("message_id", appointment.id)
        .eq("action", dedupKey)
        .single();

      if (existingLog) {
        console.log(`⏭️  Skipping duplicate reminder for appointment ${appointment.id}`);
        skipCount++;
        continue;
      }

      const { data: settings } = await supabase
        .from("notification_settings")
        .select("email_appointments")
        .eq("user_id", appointment.user_id)
        .single();

      if (settings && settings.email_appointments === false) {
        console.log(`🔇 User ${appointment.user_id} has email appointments disabled`);
        skipCount++;
        continue;
      }

      const userEmail = appointment.profiles?.email;
      if (!userEmail) {
        console.log(`⚠️  No email found for user ${appointment.user_id}`);
        skipCount++;
        continue;
      }

      try {
        const html = buildEmailHtml({
          patientName: appointment.profiles?.display_name || appointment.profiles?.full_name || "Patient",
          providerName: appointment.provider_name,
          providerSpecialty: appointment.provider_specialty,
          providerImageUrl: appointment.provider_image_url,
          appointmentType: appointment.appointment_type || "Consultation",
          startTime: appointment.start_time,
          location: appointment.location,
          duration: appointment.duration_minutes,
          patientNotes: appointment.patient_notes,
          appointmentId: appointment.id,
          hoursUntil,
        });

        const { error: emailError } = await resend.emails.send({
          from: "Healthcare Appointments <appointments@resend.dev>",
          to: [userEmail],
          subject: `Reminder: Appointment with ${appointment.provider_name} in ${hoursUntil} hour${hoursUntil === 1 ? '' : 's'}`,
          html,
        });

        if (emailError) {
          throw emailError;
        }

        await supabase.from("notification_logs").insert({
          user_id: appointment.user_id,
          thread_id: appointment.id,
          message_id: appointment.id,
          action: dedupKey,
          reason: `${hoursUntil}h reminder sent`,
        });

        console.log(`✅ Sent ${hoursUntil}h reminder to ${userEmail} for appointment ${appointment.id}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to send reminder for appointment ${appointment.id}:`, error);
        errorCount++;
        
        await supabase.from("notification_logs").insert({
          user_id: appointment.user_id,
          thread_id: appointment.id,
          message_id: appointment.id,
          action: `${dedupKey}_failed`,
          reason: error.message || "Unknown error",
        });
      }
    }

    console.log(`📊 Reminder job complete: ${successCount} sent, ${skipCount} skipped, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        skipped: skipCount,
        errors: errorCount,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Cron job failed:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
