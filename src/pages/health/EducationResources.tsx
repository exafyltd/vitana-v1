import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Video, Headphones, GraduationCap } from "lucide-react";
import { healthNavigation } from "@/config/navigation";


const resources = [
  {
    title: "Articles",
    description: "In-depth health articles tailored to your interests",
    icon: BookOpen,
    color: "from-blue-500/20 to-cyan-500/20",
  },
  {
    title: "Videos",
    description: "Educational videos on health and wellness topics",
    icon: Video,
    color: "from-green-500/20 to-emerald-500/20",
  },
  {
    title: "Podcasts",
    description: "Health podcasts for your daily commute",
    icon: Headphones,
    color: "from-purple-500/20 to-violet-500/20",
  },
];

export default function EducationResources() {
  return (
    <AppLayout>
      <SEO title="Education & Resources | Health" description="Access health education materials and resources" canonical={window.location.href} />
      <SubNavigation items={healthNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <PageHeader 
            title="Knowledge is your superpower! 📚"
            description="Access curated health education materials linked to your interests and demographic profile."
            icon={GraduationCap}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {resources.map((resource) => (
              <Card key={resource.title} className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-white/80 backdrop-blur-sm border-white/20 hover:scale-105">
                <CardHeader className="pb-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${resource.color} flex items-center justify-center mb-4`}>
                    <resource.icon className="w-6 h-6 text-foreground" />
                  </div>
                  <CardTitle className="text-lg">{resource.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {resource.description}
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