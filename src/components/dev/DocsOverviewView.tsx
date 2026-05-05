import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, BookOpen, Layout, Users, Database } from "lucide-react";
import { t } from '@/lib/i18n-toast';

export function DocsOverviewView() {
  const categories = [
    {
      title: "Master Documents",
      description: "Core system documentation and specifications",
      icon: FileText,
      count: 47,
      color: "text-blue-500"
    },
    {
      title: "Component Catalogs",
      description: "UI components, patterns, and design system",
      icon: BookOpen,
      count: 156,
      color: "text-purple-500"
    },
    {
      title: "Screen Lists",
      description: "Complete screen inventory and navigation maps",
      icon: Layout,
      count: 89,
      color: "text-green-500"
    },
    {
      title: "Role Views",
      description: "Role-based access and view configurations",
      icon: Users,
      count: 24,
      color: "text-orange-500"
    },
    {
      title: "Data Schemas",
      description: "Database models and API specifications",
      icon: Database,
      count: 63,
      color: "text-pink-500"
    }
  ];

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12">
        <h3 className="text-lg font-semibold mb-4">{t('screens.dev.documentationCategories')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Card key={category.title} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Icon className={`w-8 h-8 ${category.color}`} />
                    <span className="text-2xl font-bold text-muted-foreground">{category.count}</span>
                  </div>
                  <CardTitle className="mt-4">{category.title}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="col-span-12 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('screens.dev.recentUpdates')}</CardTitle>
            <CardDescription>{t('screens.dev.latestDocumentationChangesAdditions')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { doc: "API Authentication Schema v2.1", date: "2 hours ago", type: "Updated" },
                { doc: "Command Hub Screen List", date: "5 hours ago", type: "Created" },
                { doc: "Patient Dashboard Role View", date: "1 day ago", type: "Updated" },
                { doc: "Design System Catalog", date: "2 days ago", type: "Updated" }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{item.doc}</p>
                    <p className="text-sm text-muted-foreground">{item.date}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    item.type === "Created" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {item.type}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
