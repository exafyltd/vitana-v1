// Confirmation email templates for accepted MAXINA Test User applicants.
//
// Four variants: device (ios | android) × locale (de | en). Each variant
// is a single inline-styled HTML string — same shape as
// send-appointment-email so it renders consistently across mail clients.

export type Device = "ios" | "android";
export type Locale = "de" | "en";

const ANDROID_PRIVATE_TESTING_URL =
  "https://play.google.com/store/apps/details?id=com.vitanaland.app";

const SUBJECTS: Record<Locale, string> = {
  en: "🎉 You're in — welcome to MAXINA",
  de: "🎉 Du bist dabei — willkommen bei MAXINA",
};

export function subjectFor(locale: Locale): string {
  return SUBJECTS[locale] ?? SUBJECTS.de;
}

const WAITLIST_SUBJECTS: Record<Locale, string> = {
  en: "MAXINA Test User Group — all places filled",
  de: "MAXINA Test User Group — alle Plätze belegt",
};

export function subjectForWaitlist(locale: Locale): string {
  return WAITLIST_SUBJECTS[locale] ?? WAITLIST_SUBJECTS.de;
}

interface RenderArgs {
  device: Device;
  locale: Locale;
  fullName: string;
}

interface Copy {
  greeting: (name: string) => string;
  headline: string;
  intro: string;
  nextStepsHeading: string;
  steps: string[];
  privateTestingLabel?: string;
  privateTestingButton?: string;
  reminder?: string;
  ticket: string;
  thanks: string;
  signoff1: string;
  signoff2: string;
}

const COPY: Record<Locale, Record<Device, Copy>> = {
  en: {
    android: {
      greeting: (name) => `Hi ${name},`,
      headline: "Congratulations — you're in! 🎉",
      intro:
        "You have been accepted as an official MAXINA App Test User and are now part of the MAXINA Community!",
      nextStepsHeading: "Your next steps",
      steps: [
        "Click the link below",
        "Join the closed test on Google Play",
        "Download and install the app",
        "Use the app at least once per day",
        "Report any bugs, irregularities, or unusual behavior through the Vitana AI Assistant inside the app",
      ],
      privateTestingLabel: "Private testing link:",
      privateTestingButton: "Join the closed test",
      reminder:
        "To remain an active test user, please keep the app installed and continue using it during the testing period.",
      ticket:
        "As a verified active test user, you will receive 1 free ticket worth 99 EUR for the MAXINA Experience.",
      thanks:
        "Thank you for being part of the energy, the movement, and the beginning of something special.",
      signoff1: "MAXINA EXPERIENCE",
      signoff2: "…and Everybody is Dancing!!",
    },
    ios: {
      greeting: (name) => `Hi ${name},`,
      headline: "Congratulations — you're in! 🎉",
      intro:
        "You have been accepted as an official MAXINA App Test User and are now part of the first wave of the MAXINA Experience.",
      nextStepsHeading: "Your next steps",
      steps: [
        "Download the MAXINA app from the App Store",
        "Register and start exploring the app",
        "Use the app at least once per day",
        "Report any bugs, irregularities, or unusual behavior through the Vitana AI Assistant inside the app",
      ],
      ticket:
        "As a verified active test user, you will receive 1 free ticket worth 99 EUR for the MAXINA Experience.",
      thanks:
        "Thank you for being part of the energy, the movement, and the beginning of something special.",
      signoff1: "MAXINA EXPERIENCE",
      signoff2: "…and Everybody is Dancing!!",
    },
  },
  de: {
    android: {
      greeting: (name) => `Hi ${name},`,
      headline: "Glückwunsch — du bist dabei! 🎉",
      intro:
        "Du bist als offizielle:r MAXINA App Test User angenommen und damit Teil der MAXINA Community!",
      nextStepsHeading: "Deine nächsten Schritte",
      steps: [
        "Klicke auf den Link unten",
        "Tritt dem geschlossenen Test im Google Play Store bei",
        "Lade die App herunter und installiere sie",
        "Nutze die App mindestens einmal pro Tag",
        "Melde Bugs oder Auffälligkeiten über den Vitana AI Assistant in der App",
      ],
      privateTestingLabel: "Privater Testing-Link:",
      privateTestingButton: "Dem geschlossenen Test beitreten",
      reminder:
        "Damit du aktive:r Test User bleibst, halte die App während des Testzeitraums installiert und nutze sie weiterhin.",
      ticket:
        "Als verifizierte:r aktive:r Test User erhältst du 1 Freiticket im Wert von 99 EUR für die MAXINA Experience.",
      thanks:
        "Danke, dass du Teil der Energie, der Bewegung und des Anfangs von etwas Besonderem bist.",
      signoff1: "MAXINA EXPERIENCE",
      signoff2: "…and Everybody is Dancing!!",
    },
    ios: {
      greeting: (name) => `Hi ${name},`,
      headline: "Glückwunsch — du bist dabei! 🎉",
      intro:
        "Du bist als offizielle:r MAXINA App Test User angenommen und damit Teil der ersten Welle der MAXINA Experience.",
      nextStepsHeading: "Deine nächsten Schritte",
      steps: [
        "Lade die MAXINA App aus dem App Store",
        "Registriere dich und entdecke die App",
        "Nutze die App mindestens einmal pro Tag",
        "Melde Bugs oder Auffälligkeiten über den Vitana AI Assistant in der App",
      ],
      ticket:
        "Als verifizierte:r aktive:r Test User erhältst du 1 Freiticket im Wert von 99 EUR für die MAXINA Experience.",
      thanks:
        "Danke, dass du Teil der Energie, der Bewegung und des Anfangs von etwas Besonderem bist.",
      signoff1: "MAXINA EXPERIENCE",
      signoff2: "…and Everybody is Dancing!!",
    },
  },
};

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0];
}

export function renderEmail({ device, locale, fullName }: RenderArgs): string {
  const copy = COPY[locale][device];
  const name = escapeHtml(firstName(fullName));

  const stepsList = copy.steps
    .map(
      (s) =>
        `<li style="margin:0 0 8px;color:#2d3748;font-size:15px;line-height:24px">${escapeHtml(s)}</li>`,
    )
    .join("");

  const privateTestingBlock =
    device === "android" && copy.privateTestingLabel && copy.privateTestingButton
      ? `
        <p style="color:#718096;font-size:13px;font-weight:600;text-transform:uppercase;margin:24px 0 8px">
          ${escapeHtml(copy.privateTestingLabel)}
        </p>
        <p style="margin:0 0 8px">
          <a href="${ANDROID_PRIVATE_TESTING_URL}"
             style="display:inline-block;background:#c026d3;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px;font-size:15px">
            ${escapeHtml(copy.privateTestingButton)}
          </a>
        </p>
        <p style="color:#4a5568;font-size:13px;line-height:20px;margin:8px 0 0;word-break:break-all">
          <a href="${ANDROID_PRIVATE_TESTING_URL}" style="color:#9333ea;text-decoration:underline">
            ${ANDROID_PRIVATE_TESTING_URL}
          </a>
        </p>
      `
      : "";

  const reminderBlock =
    device === "android" && copy.reminder
      ? `
        <p style="color:#4a5568;font-size:15px;line-height:24px;margin:24px 0 0">
          ${escapeHtml(copy.reminder)}
        </p>
      `
      : "";

  const body = `
    <p style="color:#4a5568;font-size:16px;line-height:26px;padding:0 40px;margin:24px 0 8px">
      ${escapeHtml(copy.greeting(name))}
    </p>
    <p style="color:#4a5568;font-size:16px;line-height:26px;padding:0 40px;margin:8px 0 24px">
      ${escapeHtml(copy.intro)}
    </p>

    <div style="background:#fdf4ff;border:2px solid #c026d3;border-radius:12px;margin:24px 40px;padding:28px">
      <p style="color:#9333ea;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px">
        ${escapeHtml(copy.nextStepsHeading)}
      </p>
      <ol style="padding-left:20px;margin:0">
        ${stepsList}
      </ol>
      ${privateTestingBlock}
      ${reminderBlock}
    </div>

    <div style="background:#fffaf0;border-left:4px solid #f59e0b;border-radius:8px;padding:18px 22px;margin:24px 40px">
      <p style="color:#2d3748;font-size:15px;font-weight:600;line-height:24px;margin:0">
        🎟️ ${escapeHtml(copy.ticket)}
      </p>
    </div>

    <p style="color:#4a5568;font-size:15px;line-height:24px;padding:0 40px;margin:24px 0">
      ${escapeHtml(copy.thanks)}
    </p>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 40px">
    <p style="color:#9333ea;font-size:14px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;padding:0 40px;margin:8px 0 4px">
      ${escapeHtml(copy.signoff1)}
    </p>
    <p style="color:#a855f7;font-size:15px;font-style:italic;padding:0 40px;margin:0 0 24px">
      ${escapeHtml(copy.signoff2)}
    </p>
  `;

  const previewText =
    locale === "de"
      ? "Du bist als MAXINA App Test User angenommen."
      : "You're accepted as a MAXINA App Test User.";

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(SUBJECTS[locale])}</title>
  </head>
  <body style="background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(previewText)}</span>
    <div style="background:#fff;margin:0 auto;padding:0 0 48px;max-width:600px">
      <div style="background:linear-gradient(135deg,#c026d3 0%,#f97316 100%);padding:28px 40px;text-align:center">
        <h1 style="color:#fff;font-size:26px;font-weight:700;margin:0">
          ${escapeHtml(copy.headline)}
        </h1>
      </div>
      ${body}
    </div>
  </body>
</html>`;
}

interface WaitlistArgs {
  locale: Locale;
  fullName: string;
}

interface WaitlistCopy {
  greeting: (name: string) => string;
  headline: string;
  thanksOpening: string;
  capacity: string;
  launchInvite: string;
  closing: string;
  signoff1: string;
  signoff2: string;
  previewText: string;
}

const WAITLIST_COPY: Record<Locale, WaitlistCopy> = {
  en: {
    greeting: (name) => `Hi ${name},`,
    headline: "Thank you for your interest 💫",
    thanksOpening:
      "Thank you for your interest in joining the MAXINA Test User Group.",
    capacity:
      "At the moment, this group is limited to a maximum of 100 participants, and all available places have now been filled.",
    launchInvite:
      "If you would like to join the community from day one, the official launch of the MAXINA app is expected on 18 June. You'll receive an invitation link and become one of the first members to secure your place for future events and meetups.",
    closing: "Thank you again and have a great day!",
    signoff1: "MAXINA EXPERIENCE",
    signoff2: "…and Everybody is Dancing!!",
    previewText: "Test User Group is full — but you're on the launch list.",
  },
  de: {
    greeting: (name) => `Hi ${name},`,
    headline: "Vielen Dank für dein Interesse 💫",
    thanksOpening:
      "Vielen Dank für dein Interesse, der MAXINA Test User Group beizutreten.",
    capacity:
      "Diese Gruppe ist aktuell auf maximal 100 Teilnehmer:innen begrenzt, und alle verfügbaren Plätze sind nun belegt.",
    launchInvite:
      "Wenn du ab Tag eins Teil der Community sein möchtest: Der offizielle Launch der MAXINA App ist für den 18. Juni geplant. Du erhältst einen Einladungslink und wirst eines der ersten Mitglieder, das sich seinen Platz für zukünftige Events und Meetups sichert.",
    closing: "Nochmals vielen Dank und einen schönen Tag!",
    signoff1: "MAXINA EXPERIENCE",
    signoff2: "…and Everybody is Dancing!!",
    previewText:
      "Die Test User Group ist voll — aber du bist auf der Launch-Liste.",
  },
};

export function renderWaitlistEmail({ locale, fullName }: WaitlistArgs): string {
  const copy = WAITLIST_COPY[locale] ?? WAITLIST_COPY.de;
  const name = escapeHtml(firstName(fullName));

  const body = `
    <p style="color:#4a5568;font-size:16px;line-height:26px;padding:0 40px;margin:24px 0 8px">
      ${escapeHtml(copy.greeting(name))}
    </p>
    <p style="color:#4a5568;font-size:16px;line-height:26px;padding:0 40px;margin:8px 0 16px">
      ${escapeHtml(copy.thanksOpening)}
    </p>
    <p style="color:#4a5568;font-size:16px;line-height:26px;padding:0 40px;margin:8px 0 16px">
      ${escapeHtml(copy.capacity)}
    </p>

    <div style="background:#fdf4ff;border:2px solid #c026d3;border-radius:12px;margin:24px 40px;padding:24px">
      <p style="color:#2d3748;font-size:15px;line-height:24px;margin:0">
        ${escapeHtml(copy.launchInvite)}
      </p>
    </div>

    <p style="color:#4a5568;font-size:15px;line-height:24px;padding:0 40px;margin:24px 0">
      ${escapeHtml(copy.closing)}
    </p>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 40px">
    <p style="color:#9333ea;font-size:14px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;padding:0 40px;margin:8px 0 4px">
      ${escapeHtml(copy.signoff1)}
    </p>
    <p style="color:#a855f7;font-size:15px;font-style:italic;padding:0 40px;margin:0 0 24px">
      ${escapeHtml(copy.signoff2)}
    </p>
  `;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(WAITLIST_SUBJECTS[locale])}</title>
  </head>
  <body style="background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(copy.previewText)}</span>
    <div style="background:#fff;margin:0 auto;padding:0 0 48px;max-width:600px">
      <div style="background:linear-gradient(135deg,#c026d3 0%,#f97316 100%);padding:28px 40px;text-align:center">
        <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0">
          ${escapeHtml(copy.headline)}
        </h1>
      </div>
      ${body}
    </div>
  </body>
</html>`;
}
