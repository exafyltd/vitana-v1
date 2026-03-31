import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@4.0.0";
import React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.31";
import { AppointmentReminderEmail } from "./_templates/appointment-reminder.tsx";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    console.log("🔔 Appointment reminder cron job started");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Calculate time windows for reminders
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
    const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Query appointments needing 24-hour reminders
    const { data: appointments24h, error: error24h } = await supabase
      .from("provider_appointments")
      .select("*, profiles!provider_appointments_user_id_fkey(email, display_name, full_name)")
      .gte("start_time", in24Hours.toISOString())
      .lt("start_time", in25Hours.toISOString())
      .in("status", ["pending", "confirmed"]);

    // Query appointments needing 1-hour reminders
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
      
      // Create deduplication key
      const dedupKey = `appointment_reminder_${appointment.id}_${hoursUntil}h`;

      // Check if already sent
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

      // Check user notification settings
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
        // Render email template
        const html = await renderAsync(
          React.createElement(AppointmentReminderEmail, {
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
          })
        );

        // Send email via Resend
        const { error: emailError } = await resend.emails.send({
          from: "Healthcare Appointments <appointments@resend.dev>",
          to: [userEmail],
          subject: `Reminder: Appointment with ${appointment.provider_name} in ${hoursUntil} hour${hoursUntil === 1 ? '' : 's'}`,
          html,
        });

        if (emailError) {
          throw emailError;
        }

        // Log successful notification
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
        
        // Log failed attempt
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
