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

export default function Calendar() {
  return (
    <AppLayout>
      <SEO title="Calendar" description="Manage your schedule, appointments, and events" canonical={window.location.href} />
      <SubNavigation items={calendarSubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
            <h1 className="text-3xl font-bold text-foreground mb-2">Dear Jovana, plan your perfect wellness day! 📅</h1>
            <p className="text-muted-foreground">Organize your wellness schedule, track important appointments, and never miss a wellness opportunity. Navigate using the tabs above to access different calendar views.</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}