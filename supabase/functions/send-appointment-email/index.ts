import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";
import React from "https://esm.sh/react@18.3.1";
import { renderAsync } from "https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1";
import { ConfirmationEmail } from "./_templates/confirmation.tsx";
import { CancellationEmail } from "./_templates/cancellation.tsx";
import { RescheduleEmail } from "./_templates/reschedule.tsx";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    // Fetch appointment details
    const { data: appointment, error: appointmentError } = await supabase
      .from("provider_appointments")
      .select("*, profiles!provider_appointments_user_id_fkey(email, display_name, full_name)")
      .eq("id", appointmentId)
      .eq("user_id", user.id)
      .single();

    if (appointmentError || !appointment) {
      throw new Error("Appointment not found or access denied");
    }

    // Check user notification settings
    const { data: settings } = await supabase
      .from("notification_settings")
      .select("email_appointments")
      .eq("user_id", user.id)
      .single();

    if (settings && settings.email_appointments === false) {
      console.log("User has email appointments disabled");
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

    // Render appropriate email template
    let html: string;
    let subject: string;

    switch (emailType) {
      case "confirmation":
        html = await renderAsync(
          React.createElement(ConfirmationEmail, {
            patientName,
            providerName: appointment.provider_name,
            providerSpecialty: appointment.provider_specialty,
            providerImageUrl: appointment.provider_image_url,
            appointmentType: appointment.appointment_type || "Consultation",
            startTime: appointment.start_time,
            location: appointment.location,
            duration: appointment.duration_minutes,
            patientNotes: appointment.patient_notes,
            appointmentId: appointment.id,
          })
        );
        subject = `Appointment Confirmed with ${appointment.provider_name}`;
        break;

      case "cancellation":
        html = await renderAsync(
          React.createElement(CancellationEmail, {
            patientName,
            providerName: appointment.provider_name,
            appointmentType: appointment.appointment_type || "Consultation",
            startTime: appointment.start_time,
            reason: additionalData?.reason,
          })
        );
        subject = `Appointment Cancelled - ${appointment.provider_name}`;
        break;

      case "reschedule":
        html = await renderAsync(
          React.createElement(RescheduleEmail, {
            patientName,
            providerName: appointment.provider_name,
            providerSpecialty: appointment.provider_specialty,
            oldStartTime: additionalData?.oldStartTime,
            newStartTime: appointment.start_time,
            location: appointment.location,
            appointmentId: appointment.id,
          })
        );
        subject = `Appointment Rescheduled - ${appointment.provider_name}`;
        break;

      default:
        throw new Error(`Unknown email type: ${emailType}`);
    }

    // Send email via Resend
    const { error: emailError } = await resend.emails.send({
      from: "Healthcare Appointments <appointments@resend.dev>",
      to: [userEmail],
      subject,
      html,
    });

    if (emailError) {
      throw emailError;
    }

    // Log notification
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
