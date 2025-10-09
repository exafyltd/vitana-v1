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
} from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";

interface CancellationEmailProps {
  patientName: string;
  providerName: string;
  appointmentType: string;
  startTime: string;
  reason?: string;
}

export const CancellationEmail = ({
  patientName,
  providerName,
  appointmentType,
  startTime,
  reason,
}: CancellationEmailProps) => {
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
      <Preview>Your appointment with {providerName} has been cancelled</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>❌ Appointment Cancelled</Heading>
          </Section>

          <Text style={text}>Hi {patientName},</Text>

          <Text style={cancelText}>
            Your appointment has been cancelled as requested.
          </Text>

          <Section style={appointmentCard}>
            <Heading style={h2}>{providerName}</Heading>

            <Hr style={divider} />

            <Section style={detailsSection}>
              <Text style={detailLabel}>📅 Date</Text>
              <Text style={detailValue}>{formattedDate}</Text>

              <Text style={detailLabel}>🕐 Time</Text>
              <Text style={detailValue}>{formattedTime}</Text>

              <Text style={detailLabel}>📋 Type</Text>
              <Text style={detailValue}>{appointmentType}</Text>

              {reason && (
                <>
                  <Text style={detailLabel}>📝 Reason</Text>
                  <Text style={detailValue}>{reason}</Text>
                </>
              )}
            </Section>
          </Section>

          <Section style={infoBox}>
            <Text style={infoTitle}>ℹ️ What This Means</Text>
            <Text style={infoItem}>• No charges have been applied to your account</Text>
            <Text style={infoItem}>• You can book a new appointment anytime</Text>
            <Text style={infoItem}>• Your medical records remain secure</Text>
          </Section>

          <Section style={actionsSection}>
            <Text style={text}>Ready to book a new appointment?</Text>
            <Link href={`${Deno.env.get("SUPABASE_URL")}/appointments/schedule`} style={button}>
              Schedule New Appointment
            </Link>
          </Section>

          <Hr style={footerDivider} />

          <Text style={footer}>
            If you cancelled by mistake or need assistance, please contact our support team.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default CancellationEmail;

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
  backgroundColor: "#e53e3e",
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

const cancelText = {
  color: "#e53e3e",
  fontSize: "18px",
  fontWeight: "600",
  lineHeight: "28px",
  padding: "0 40px",
  margin: "16px 0 32px",
};

const appointmentCard = {
  backgroundColor: "#fff5f5",
  border: "2px solid #feb2b2",
  borderRadius: "12px",
  margin: "32px 40px",
  padding: "32px",
};

const divider = {
  borderColor: "#feb2b2",
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

const infoBox = {
  backgroundColor: "#edf2f7",
  borderRadius: "8px",
  padding: "24px",
  margin: "32px 40px",
};

const infoTitle = {
  color: "#2d3748",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 12px",
};

const infoItem = {
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
