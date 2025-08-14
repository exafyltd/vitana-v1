import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope, Users, Target, Shield } from "lucide-react";

const healthSubItems = [
  { id: "overview", name: "Overview", path: "/health" },
  { id: "pillars", name: "Pillars of Health", path: "/health/pillars" },
  { id: "services", name: "Wellness Services", path: "/health/services" },
  { id: "conditions", name: "Conditions & Risks", path: "/health/conditions" },
  { id: "education", name: "Education & Resources", path: "/health/education" },
];

const services = [
  {
    title: "Doctors & Specialists Booking",
    description: "Schedule appointments with healthcare professionals",
    icon: Stethoscope,
    color: "from-blue-500/20 to-cyan-500/20",
  },
  {
    title: "Coaching & Personal Training",
    description: "Book sessions with wellness coaches and trainers",
    icon: Target,
    color: "from-green-500/20 to-emerald-500/20",
  },
  {
    title: "Group Programs & Challenges",
    description: "Join community wellness programs and challenges",
    icon: Users,
    color: "from-purple-500/20 to-violet-500/20",
  },
  {
    title: "Preventive Screenings",
    description: "Schedule health screenings and preventive checkups",
    icon: Shield,
    color: "from-orange-500/20 to-amber-500/20",
  },
];

export default function WellnessServices() {
  return (
    <AppLayout>
      <SEO title="Wellness Services | Health" description="Book wellness services and healthcare appointments" canonical={window.location.href} />
      <SubNavigation items={healthSubItems} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20 mb-8">
            <h1 className="text-2xl font-semibold mb-4">Wellness Services</h1>
            <p className="text-muted-foreground">Book appointments, coaching sessions, and join wellness programs to support your health journey.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map((service) => (
              <Card key={service.title} className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-white/80 backdrop-blur-sm border-white/20 hover:scale-105">
                <CardHeader className="pb-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${service.color} flex items-center justify-center mb-4`}>
                    <service.icon className="w-6 h-6 text-foreground" />
                  </div>
                  <CardTitle className="text-lg">{service.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {service.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}