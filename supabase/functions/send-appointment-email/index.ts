import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// --- Email HTML generators ---

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return { date, time };
}

function emailWrapper(headerBg: string, headerText: string, previewText: string, bodyContent: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0"><div style="background:#fff;margin:0 auto;padding:20px 0 48px;max-width:600px"><div style="background:${headerBg};padding:20px 40px;text-align:center"><h1 style="color:#fff;font-size:28px;font-weight:700;margin:0">${headerText}</h1></div>${bodyContent}</div></body></html>`;
}

function buildConfirmationHtml(opts: {
  patientName: string; providerName: string; providerSpecialty?: string;
  providerImageUrl?: string; appointmentType: string; startTime: string;
  location?: string; duration?: number; patientNotes?: string;
}) {
  const { date, time } = formatDate(opts.startTime);
  const providerImg = opts.providerImageUrl ? `<img src="${opts.providerImageUrl}" alt="${opts.providerName}" style="width:80px;height:80px;border-radius:50%;margin:0 auto 16px;display:block;object-fit:cover">` : "";
  const specialty = opts.providerSpecialty ? `<p style="color:#718096;font-size:14px;text-align:center;margin:0 0 24px">${opts.providerSpecialty}</p>` : "";
  const duration = opts.duration ? `<p style="color:#718096;font-size:13px;font-weight:600;text-transform:uppercase;margin:12px 0 4px">⏱️ Duration</p><p style="color:#2d3748;font-size:16px;margin:0 0 16px">${opts.duration} minutes</p>` : "";
  const location = opts.location ? `<p style="color:#718096;font-size:13px;font-weight:600;text-transform:uppercase;margin:12px 0 4px">📍 Location</p><p style="color:#2d3748;font-size:16px;margin:0 0 16px">${opts.location}</p>` : "";
  const notes = opts.patientNotes ? `<hr style="border-color:#e2e8f0;margin:24px 0"><p style="color:#718096;font-size:13px;font-weight:600;text-transform:uppercase;margin:16px 0 8px">📝 Your Notes:</p><p style="color:#2d3748;font-size:15px;line-height:24px;background:#fff;padding:12px;border-radius:6px;border:1px solid #e2e8f0;margin:0">${opts.patientNotes}</p>` : "";

  const body = `
    <p style="color:#4a5568;font-size:16px;line-height:26px;padding:0 40px;margin:24px 0">Hi ${opts.patientName},</p>
    <p style="color:#38a169;font-size:18px;font-weight:600;line-height:28px;padding:0 40px;margin:16px 0 32px">Great news! Your appointment has been successfully booked.</p>
    <div style="background:#f7fafc;border:2px solid #38a169;border-radius:12px;margin:32px 40px;padding:32px">
      ${providerImg}
      <h2 style="color:#2d3748;font-size:24px;font-weight:600;margin:0 0 8px;text-align:center">${opts.providerName}</h2>
      ${specialty}
      <hr style="border-color:#e2e8f0;margin:24px 0">
      <p style="color:#718096;font-size:13px;font-weight:600;text-transform:uppercase;margin:12px 0 4px">📅 Date</p>
      <p style="color:#2d3748;font-size:16px;margin:0 0 16px">${date}</p>
      <p style="color:#718096;font-size:13px;font-weight:600;text-transform:uppercase;margin:12px 0 4px">🕐 Time</p>
      <p style="color:#2d3748;font-size:16px;margin:0 0 16px">${time}</p>
      <p style="color:#718096;font-size:13px;font-weight:600;text-transform:uppercase;margin:12px 0 4px">📋 Type</p>
      <p style="color:#2d3748;font-size:16px;margin:0 0 16px">${opts.appointmentType}</p>
      ${duration}${location}${notes}
    </div>
    <div style="background:#edf2f7;border-radius:8px;padding:24px;margin:32px 40px">
      <p style="color:#2d3748;font-size:16px;font-weight:600;margin:0 0 12px">📬 What's Next?</p>
      <p style="color:#4a5568;font-size:14px;line-height:24px;margin:4px 0">• You'll receive a reminder 24 hours before your appointment</p>
      <p style="color:#4a5568;font-size:14px;line-height:24px;margin:4px 0">• Another reminder will be sent 1 hour before</p>
      <p style="color:#4a5568;font-size:14px;line-height:24px;margin:4px 0">• Please arrive 10 minutes early</p>
    </div>
    <hr style="border-color:#e2e8f0;margin:32px 40px">
    <p style="color:#a0aec0;font-size:13px;line-height:20px;padding:0 40px;margin:8px 0">Need to cancel or reschedule? Please contact us at least 24 hours in advance.</p>`;

  return emailWrapper("#38a169", "✅ Appointment Confirmed", `Your appointment with ${opts.providerName} has been confirmed`, body);
}

function buildCancellationHtml(opts: {
  patientName: string; providerName: string; appointmentType: string;
  startTime: string; reason?: string;
}) {
  const { date, time } = formatDate(opts.startTime);
  const reason = opts.reason ? `<p style="color:#718096;font-size:13px;font-weight:600;text-transform:uppercase;margin:12px 0 4px">📝 Reason</p><p style="color:#2d3748;font-size:16px;margin:0 0 16px">${opts.reason}</p>` : "";

  const body = `
    <p style="color:#4a5568;font-size:16px;line-height:26px;padding:0 40px;margin:24px 0">Hi ${opts.patientName},</p>
    <p style="color:#e53e3e;font-size:18px;font-weight:600;line-height:28px;padding:0 40px;margin:16px 0 32px">Your appointment has been cancelled as requested.</p>
    <div style="background:#fff5f5;border:2px solid #feb2b2;border-radius:12px;margin:32px 40px;padding:32px">
      <h2 style="color:#2d3748;font-size:24px;font-weight:600;margin:0 0 8px;text-align:center">${opts.providerName}</h2>
      <hr style="border-color:#feb2b2;margin:24px 0">
      <p style="color:#718096;font-size:13px;font-weight:600;text-transform:uppercase;margin:12px 0 4px">📅 Date</p>
      <p style="color:#2d3748;font-size:16px;margin:0 0 16px">${date}</p>
      <p style="color:#718096;font-size:13px;font-weight:600;text-transform:uppercase;margin:12px 0 4px">🕐 Time</p>
      <p style="color:#2d3748;font-size:16px;margin:0 0 16px">${time}</p>
      <p style="color:#718096;font-size:13px;font-weight:600;text-transform:uppercase;margin:12px 0 4px">📋 Type</p>
      <p style="color:#2d3748;font-size:16px;margin:0 0 16px">${opts.appointmentType}</p>
      ${reason}
    </div>
    <div style="background:#edf2f7;border-radius:8px;padding:24px;margin:32px 40px">
      <p style="color:#2d3748;font-size:16px;font-weight:600;margin:0 0 12px">ℹ️ What This Means</p>
      <p style="color:#4a5568;font-size:14px;line-height:24px;margin:4px 0">• No charges have been applied to your account</p>
      <p style="color:#4a5568;font-size:14px;line-height:24px;margin:4px 0">• You can book a new appointment anytime</p>
      <p style="color:#4a5568;font-size:14px;line-height:24px;margin:4px 0">• Your medical records remain secure</p>
    </div>
    <hr style="border-color:#e2e8f0;margin:32px 40px">
    <p style="color:#a0aec0;font-size:13px;line-height:20px;padding:0 40px;margin:8px 0">If you cancelled by mistake or need assistance, please contact our support team.</p>`;

  return emailWrapper("#e53e3e", "❌ Appointment Cancelled", `Your appointment with ${opts.providerName} has been cancelled`, body);
}

function buildRescheduleHtml(opts: {
  patientName: string; providerName: string; providerSpecialty?: string;
  oldStartTime?: string; newStartTime: string; location?: string;
}) {
  const { date: newDate, time: newTime } = formatDate(opts.newStartTime);
  let oldSection = "";
  if (opts.oldStartTime) {
    const { date: oldDate, time: oldTime } = formatDate(opts.oldStartTime);
    oldSection = `<div style="background:#f7fafc;padding:16px;border-radius:8px;margin-bottom:16px"><p style="color:#718096;font-size:13px;font-weight:600;text-transform:uppercase;margin:0 0 8px;text-decoration:line-through">Previous Time:</p><p style="color:#a0aec0;font-size:14px;margin:0">${oldDate} at ${oldTime}</p></div><hr style="border-color:#fbd38d;margin:24px 0">`;
  }
  const specialty = opts.providerSpecialty ? `<p style="color:#718096;font-size:14px;text-align:center;margin:0 0 24px">${opts.providerSpecialty}</p>` : "";
  const location = opts.location ? `<p style="color:#718096;font-size:13px;font-weight:600;text-transform:uppercase;margin:12px 0 4px">📍 Location</p><p style="color:#2d3748;font-size:18px;font-weight:600;margin:0 0 8px">${opts.location}</p>` : "";

  const body = `
    <p style="color:#4a5568;font-size:16px;line-height:26px;padding:0 40px;margin:24px 0">Hi ${opts.patientName},</p>
    <p style="color:#dd6b20;font-size:18px;font-weight:600;line-height:28px;padding:0 40px;margin:16px 0 32px">Your appointment has been successfully rescheduled to a new date and time.</p>
    <div style="background:#fffaf0;border:2px solid #ed8936;border-radius:12px;margin:32px 40px;padding:32px">
      <h2 style="color:#2d3748;font-size:24px;font-weight:600;margin:0 0 8px;text-align:center">${opts.providerName}</h2>
      ${specialty}
      <hr style="border-color:#fbd38d;margin:24px 0">
      ${oldSection}
      <p style="color:#dd6b20;font-size:16px;font-weight:700;margin:0 0 12px">✨ New Time:</p>
      <p style="color:#2d3748;font-size:18px;font-weight:600;margin:0 0 8px">${newDate}</p>
      <p style="color:#2d3748;font-size:18px;font-weight:600;margin:0 0 8px">${newTime}</p>
      ${location}
    </div>
    <div style="background:#edf2f7;border-radius:8px;padding:24px;margin:32px 40px">
      <p style="color:#2d3748;font-size:16px;font-weight:600;margin:0 0 12px">📬 Reminders</p>
      <p style="color:#4a5568;font-size:14px;line-height:24px;margin:4px 0">• You'll receive a reminder 24 hours before</p>
      <p style="color:#4a5568;font-size:14px;line-height:24px;margin:4px 0">• Another reminder will be sent 1 hour before</p>
    </div>
    <hr style="border-color:#e2e8f0;margin:32px 40px">
    <p style="color:#a0aec0;font-size:13px;line-height:20px;padding:0 40px;margin:8px 0">Need to reschedule again? Please contact us at least 24 hours in advance.</p>`;

  return emailWrapper("#ed8936", "📅 Appointment Rescheduled", `Your appointment with ${opts.providerName} has been rescheduled`, body);
}

// --- Main handler ---

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { appointmentId, emailType, additionalData } = await req.json();

    if (!appointmentId || !emailType) {
      throw new Error("Missing required fields: appointmentId and emailType");
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from("provider_appointments")
      .select("*, profiles!provider_appointments_user_id_fkey(email, display_name, full_name)")
      .eq("id", appointmentId)
      .eq("user_id", user.id)
      .single();

    if (appointmentError || !appointment) {
      throw new Error("Appointment not found or access denied");
    }

    const { data: settings } = await supabase
      .from("notification_settings")
      .select("email_appointments")
      .eq("user_id", user.id)
      .single();

    if (settings && settings.email_appointments === false) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "User has email disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userEmail = appointment.profiles?.email;
    if (!userEmail) {
      throw new Error("User email not found");
    }

    const patientName = appointment.profiles?.display_name || appointment.profiles?.full_name || "Patient";

    let html: string;
    let subject: string;

    switch (emailType) {
      case "confirmation":
        html = buildConfirmationHtml({
          patientName,
          providerName: appointment.provider_name,
          providerSpecialty: appointment.provider_specialty,
          providerImageUrl: appointment.provider_image_url,
          appointmentType: appointment.appointment_type || "Consultation",
          startTime: appointment.start_time,
          location: appointment.location,
          duration: appointment.duration_minutes,
          patientNotes: appointment.patient_notes,
        });
        subject = `Appointment Confirmed with ${appointment.provider_name}`;
        break;

      case "cancellation":
        html = buildCancellationHtml({
          patientName,
          providerName: appointment.provider_name,
          appointmentType: appointment.appointment_type || "Consultation",
          startTime: appointment.start_time,
          reason: additionalData?.reason,
        });
        subject = `Appointment Cancelled - ${appointment.provider_name}`;
        break;

      case "reschedule":
        html = buildRescheduleHtml({
          patientName,
          providerName: appointment.provider_name,
          providerSpecialty: appointment.provider_specialty,
          oldStartTime: additionalData?.oldStartTime,
          newStartTime: appointment.start_time,
          location: appointment.location,
        });
        subject = `Appointment Rescheduled - ${appointment.provider_name}`;
        break;

      default:
        throw new Error(`Unknown email type: ${emailType}`);
    }

    const { error: emailError } = await resend.emails.send({
      from: "Healthcare Appointments <appointments@resend.dev>",
      to: [userEmail],
      subject,
      html,
    });

    if (emailError) {
      throw emailError;
    }

    await supabase.from("notification_logs").insert({
      user_id: user.id,
      thread_id: appointmentId,
      message_id: appointmentId,
      action: `email_${emailType}`,
      reason: `${emailType} email sent`,
    });

    console.log(`✅ Sent ${emailType} email to ${userEmail} for appointment ${appointmentId}`);

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Error sending appointment email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
