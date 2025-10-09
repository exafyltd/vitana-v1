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
} from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";

interface AppointmentReminderEmailProps {
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
}

export const AppointmentReminderEmail = ({
  patientName,
  providerName,
  providerSpecialty,
  providerImageUrl,
  appointmentType,
  startTime,
  location,
  duration,
  patientNotes,
  appointmentId,
  hoursUntil,
}: AppointmentReminderEmailProps) => {
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
      <Preview>
        Reminder: Your appointment with {providerName} is in {hoursUntil} hour{hoursUntil === 1 ? '' : 's'}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Appointment Reminder</Heading>
          
          <Text style={text}>
            Hi {patientName},
          </Text>
          
          <Text style={reminderText}>
            {hoursUntil === 24 
              ? "This is a friendly reminder that your appointment is tomorrow."
              : "Your appointment is coming up soon!"}
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

          <Section style={actionsSection}>
            <Text style={text}>
              Need to make changes?
            </Text>
            <Link href={`${Deno.env.get("SUPABASE_URL")}/appointments`} style={button}>
              View Appointment Details
            </Link>
          </Section>

          <Hr style={footerDivider} />

          <Text style={footer}>
            If you need to cancel or reschedule, please contact us at least 24 hours in advance.
          </Text>

          <Text style={footer}>
            This is an automated reminder. Please do not reply to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default AppointmentReminderEmail;

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

const h1 = {
  color: "#1a202c",
  fontSize: "28px",
  fontWeight: "700",
  margin: "40px 0",
  padding: "0 40px",
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
};

const reminderText = {
  color: "#2b6cb0",
  fontSize: "18px",
  fontWeight: "600",
  lineHeight: "28px",
  padding: "0 40px",
  margin: "24px 0",
};

const appointmentCard = {
  backgroundColor: "#f7fafc",
  border: "2px solid #e2e8f0",
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

const actionsSection = {
  textAlign: "center" as const,
  margin: "32px 40px",
};

const button = {
  backgroundColor: "#3182ce",
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
