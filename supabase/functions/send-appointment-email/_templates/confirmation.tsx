import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from "https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1";
import * as React from "https://esm.sh/react@18.3.1";

interface ConfirmationEmailProps {
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
}

export const ConfirmationEmail = ({
  patientName,
  providerName,
  providerSpecialty,
  providerImageUrl,
  appointmentType,
  startTime,
  location,
  duration,
  patientNotes,
}: ConfirmationEmailProps) => {
  const appointmentDate = new Date(startTime);
  const formattedDate = appointmentDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = appointmentDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <Html>
      <Head />
      <Preview>Your appointment with {providerName} has been confirmed</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>✅ Appointment Confirmed</Heading>
          </Section>

          <Text style={text}>Hi {patientName},</Text>

          <Text style={confirmText}>
            Great news! Your appointment has been successfully booked.
          </Text>

          <Section style={appointmentCard}>
            {providerImageUrl && (
              <Img
                src={providerImageUrl}
                alt={providerName}
                style={providerImage}
              />
            )}

            <Heading style={h2}>{providerName}</Heading>
            {providerSpecialty && (
              <Text style={specialtyText}>{providerSpecialty}</Text>
            )}

            <Hr style={divider} />

            <Section style={detailsSection}>
              <Text style={detailLabel}>📅 Date</Text>
              <Text style={detailValue}>{formattedDate}</Text>

              <Text style={detailLabel}>🕐 Time</Text>
              <Text style={detailValue}>{formattedTime}</Text>

              <Text style={detailLabel}>📋 Type</Text>
              <Text style={detailValue}>{appointmentType}</Text>

              {duration && (
                <>
                  <Text style={detailLabel}>⏱️ Duration</Text>
                  <Text style={detailValue}>{duration} minutes</Text>
                </>
              )}

              {location && (
                <>
                  <Text style={detailLabel}>📍 Location</Text>
                  <Text style={detailValue}>{location}</Text>
                </>
              )}
            </Section>

            {patientNotes && (
              <>
                <Hr style={divider} />
                <Text style={notesLabel}>📝 Your Notes:</Text>
                <Text style={notesText}>{patientNotes}</Text>
              </>
            )}
          </Section>

          <Section style={reminderBox}>
            <Text style={reminderTitle}>📬 What's Next?</Text>
            <Text style={reminderItem}>• You'll receive a reminder 24 hours before your appointment</Text>
            <Text style={reminderItem}>• Another reminder will be sent 1 hour before</Text>
            <Text style={reminderItem}>• Please arrive 10 minutes early</Text>
          </Section>

          <Section style={actionsSection}>
            <Link href={`${Deno.env.get("SUPABASE_URL")}/appointments`} style={button}>
              View My Appointments
            </Link>
          </Section>

          <Hr style={footerDivider} />

          <Text style={footer}>
            Need to cancel or reschedule? Please contact us at least 24 hours in advance.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default ConfirmationEmail;

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const header = {
  backgroundColor: "#38a169",
  padding: "20px 40px",
  textAlign: "center" as const,
};

const h1 = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "700",
  margin: "0",
  lineHeight: "1.3",
};

const h2 = {
  color: "#2d3748",
  fontSize: "24px",
  fontWeight: "600",
  margin: "0 0 8px",
  textAlign: "center" as const,
};

const text = {
  color: "#4a5568",
  fontSize: "16px",
  lineHeight: "26px",
  padding: "0 40px",
  margin: "24px 0",
};

const confirmText = {
  color: "#38a169",
  fontSize: "18px",
  fontWeight: "600",
  lineHeight: "28px",
  padding: "0 40px",
  margin: "16px 0 32px",
};

const appointmentCard = {
  backgroundColor: "#f7fafc",
  border: "2px solid #38a169",
  borderRadius: "12px",
  margin: "32px 40px",
  padding: "32px",
};

const providerImage = {
  width: "80px",
  height: "80px",
  borderRadius: "50%",
  margin: "0 auto 16px",
  display: "block",
  objectFit: "cover" as const,
};

const specialtyText = {
  color: "#718096",
  fontSize: "14px",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const divider = {
  borderColor: "#e2e8f0",
  margin: "24px 0",
};

const detailsSection = {
  margin: "16px 0",
};

const detailLabel = {
  color: "#718096",
  fontSize: "13px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  margin: "12px 0 4px",
};

const detailValue = {
  color: "#2d3748",
  fontSize: "16px",
  margin: "0 0 16px",
};

const notesLabel = {
  color: "#718096",
  fontSize: "13px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  margin: "16px 0 8px",
};

const notesText = {
  color: "#2d3748",
  fontSize: "15px",
  lineHeight: "24px",
  backgroundColor: "#fff",
  padding: "12px",
  borderRadius: "6px",
  border: "1px solid #e2e8f0",
  margin: "0",
};

const reminderBox = {
  backgroundColor: "#edf2f7",
  borderRadius: "8px",
  padding: "24px",
  margin: "32px 40px",
};

const reminderTitle = {
  color: "#2d3748",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 12px",
};

const reminderItem = {
  color: "#4a5568",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "4px 0",
};

const actionsSection = {
  textAlign: "center" as const,
  margin: "32px 40px",
};

const button = {
  backgroundColor: "#38a169",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 32px",
  marginTop: "16px",
};

const footerDivider = {
  borderColor: "#e2e8f0",
  margin: "32px 40px",
};

const footer = {
  color: "#a0aec0",
  fontSize: "13px",
  lineHeight: "20px",
  padding: "0 40px",
  margin: "8px 0",
};
