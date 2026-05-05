import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import { t } from '@/lib/i18n-toast';

export function DocsCatalogsView() {
  const catalogs = [
    { name: "UI Components", entries: 87, category: "Design", updated: "Today" },
    { name: "Design Patterns", entries: 34, category: "Design", updated: "Yesterday" },
    { name: "API Endpoints", entries: 156, category: "Backend", updated: "2 days ago" },
    { name: "Data Schemas", entries: 63, category: "Backend", updated: "3 days ago" },
    { name: "Icons & Assets", entries: 243, category: "Design", updated: "1 week ago" },
    { name: "Utility Functions", entries: 92, category: "Code", updated: "1 week ago" }
  ];

  return (
    <div className="grid grid-cols-12 gap-6">
      {catalogs.map((catalog) => (
        <div key={catalog.name} className="col-span-12 md:col-span-6 lg:col-span-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between">
                <BookOpen className="w-8 h-8 text-primary" />
                <Badge variant="secondary">{catalog.category}</Badge>
              </div>
              <CardTitle className="mt-4">{catalog.name}</CardTitle>
              <CardDescription>{t('screens.dev.entriesEntries', { entries: catalog.entries })}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t('screens.dev.updatedUpdated', { updated: catalog.updated })}</p>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
