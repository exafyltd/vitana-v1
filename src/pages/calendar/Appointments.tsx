import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";

const calendarSubItems = [
  { id: "overview", name: "Overview", path: "/calendar" },
  { id: "week", name: "Week View", path: "/calendar/week" },
  { id: "day", name: "Day View", path: "/calendar/day" },
  { id: "appointments", name: "Appointments", path: "/calendar/appointments" },
  { id: "events", name: "Events", path: "/calendar/events" },
  { id: "reminders", name: "Reminders", path: "/calendar/reminders" },
];

export default function Appointments() {
  return (
    <AppLayout>
      <SEO title="Appointments | Calendar" description="Manage your appointments" canonical={window.location.href} />
      <SubNavigation items={calendarSubItems} />
      <div className="p-6">
        <div className="rounded-xl border bg-card p-6 text-foreground shadow-sm">
          <h1 className="text-2xl font-semibold mb-4">Appointments</h1>
          <p className="text-muted-foreground">Manage and schedule your appointments and meetings.</p>
        </div>
      </div>
    </AppLayout>
  );
}