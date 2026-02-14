import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from "https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1";
import * as React from "https://esm.sh/react@18.3.1";

interface RescheduleEmailProps {
  patientName: string;
  providerName: string;
  providerSpecialty?: string;
  oldStartTime?: string;
  newStartTime: string;
  location?: string;
  appointmentId: string;
}

export const RescheduleEmail = ({
  patientName,
  providerName,
  providerSpecialty,
  oldStartTime,
  newStartTime,
  location,
}: RescheduleEmailProps) => {
  const newDate = new Date(newStartTime);
  const formattedNewDate = newDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedNewTime = newDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  let formattedOldDate = "";
  let formattedOldTime = "";
  if (oldStartTime) {
    const oldDate = new Date(oldStartTime);
    formattedOldDate = oldDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    formattedOldTime = oldDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return (
    <Html>
      <Head />
      <Preview>Your appointment with {providerName} has been rescheduled</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>📅 Appointment Rescheduled</Heading>
          </Section>

          <Text style={text}>Hi {patientName},</Text>

          <Text style={rescheduleText}>
            Your appointment has been successfully rescheduled to a new date and time.
          </Text>

          <Section style={appointmentCard}>
            <Heading style={h2}>{providerName}</Heading>
            {providerSpecialty && (
              <Text style={specialtyText}>{providerSpecialty}</Text>
            )}

            <Hr style={divider} />

            {oldStartTime && (
              <>
                <Section style={oldTimeSection}>
                  <Text style={oldTimeLabel}>Previous Time:</Text>
                  <Text style={oldTimeValue}>
                    {formattedOldDate} at {formattedOldTime}
                  </Text>
                </Section>
                <Hr style={divider} />
              </>
            )}

            <Section style={newTimeSection}>
              <Text style={newTimeLabel}>✨ New Time:</Text>
              <Text style={detailValue}>{formattedNewDate}</Text>
              <Text style={detailValue}>{formattedNewTime}</Text>

              {location && (
                <>
                  <Text style={detailLabel}>📍 Location</Text>
                  <Text style={detailValue}>{location}</Text>
                </>
              )}
            </Section>
          </Section>

          <Section style={reminderBox}>
            <Text style={reminderTitle}>📬 Reminders</Text>
            <Text style={reminderItem}>• You'll receive a reminder 24 hours before</Text>
            <Text style={reminderItem}>• Another reminder will be sent 1 hour before</Text>
          </Section>

          <Section style={actionsSection}>
            <Link href={`${Deno.env.get("SUPABASE_URL")}/appointments`} style={button}>
              View Appointment Details
            </Link>
          </Section>

          <Hr style={footerDivider} />

          <Text style={footer}>
            Need to reschedule again? Please contact us at least 24 hours in advance.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default RescheduleEmail;

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
  backgroundColor: "#ed8936",
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

const rescheduleText = {
  color: "#dd6b20",
  fontSize: "18px",
  fontWeight: "600",
  lineHeight: "28px",
  padding: "0 40px",
  margin: "16px 0 32px",
};

const appointmentCard = {
  backgroundColor: "#fffaf0",
  border: "2px solid #ed8936",
  borderRadius: "12px",
  margin: "32px 40px",
  padding: "32px",
};

const specialtyText = {
  color: "#718096",
  fontSize: "14px",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const divider = {
  borderColor: "#fbd38d",
  margin: "24px 0",
};

const oldTimeSection = {
  backgroundColor: "#f7fafc",
  padding: "16px",
  borderRadius: "8px",
  marginBottom: "16px",
};

const oldTimeLabel = {
  color: "#718096",
  fontSize: "13px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  margin: "0 0 8px",
  textDecoration: "line-through",
};

const oldTimeValue = {
  color: "#a0aec0",
  fontSize: "14px",
  margin: "0",
};

const newTimeSection = {
  margin: "16px 0",
};

const newTimeLabel = {
  color: "#dd6b20",
  fontSize: "16px",
  fontWeight: "700",
  margin: "0 0 12px",
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
  fontSize: "18px",
  fontWeight: "600",
  margin: "0 0 8px",
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
  backgroundColor: "#ed8936",
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
