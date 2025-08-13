import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";

const calendarSubItems = [
  { id: "month", name: "Month View", path: "/calendar" },
  { id: "week", name: "Week View", path: "/calendar/week" },
  { id: "day", name: "Day View", path: "/calendar/day" },
  { id: "appointments", name: "Appointments", path: "/calendar/appointments" },
  { id: "events", name: "Events", path: "/calendar/events" },
  { id: "reminders", name: "Reminders", path: "/calendar/reminders" },
];

export default function Reminders() {
  return (
    <AppLayout>
      <SEO title="Reminders | Calendar" description="Manage your reminders" canonical={window.location.href} />
      <SubNavigation items={calendarSubItems} />
      <div className="p-6">
        <div className="rounded-xl border bg-card p-6 text-foreground shadow-sm">
          <h1 className="text-2xl font-semibold mb-4">Reminders</h1>
          <p className="text-muted-foreground">Set and manage your reminders and notifications.</p>
        </div>
      </div>
    </AppLayout>
  );
}