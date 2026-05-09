import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { t } from '@/lib/i18n-toast';

export function DocsFrontpagesView() {
  const frontpages = [
    { portal: "Maxina", version: "2.1.0", status: "Published", date: "2024-01-15" },
    { portal: "Alkalma", version: "1.8.3", status: "Published", date: "2024-01-10" },
    { portal: "Earthlinks", version: "1.5.2", status: "Draft", date: "2024-01-20" },
    { portal: "Community", version: "3.0.1", status: "Published", date: "2024-01-18" },
    { portal: "Dev Hub", version: "1.0.0", status: "Published", date: "2024-01-12" },
    { portal: "Admin", version: "2.5.0", status: "Published", date: "2024-01-08" }
  ];

  return (
    <div className="grid grid-cols-12 gap-6">
      {frontpages.map((frontpage) => (
        <div key={`${frontpage.portal}-${frontpage.version}`} className="col-span-12 md:col-span-6 lg:col-span-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between">
                <FileText className="w-8 h-8 text-primary" />
                <Badge variant={frontpage.status === "Published" ? "default" : "secondary"}>
                  {frontpage.status}
                </Badge>
              </div>
              <CardTitle className="mt-4">{frontpage.portal}</CardTitle>
              <CardDescription>{t('screens.dev.versionVersion', { version: frontpage.version })}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t('screens.dev.lastUpdatedDate', { date: frontpage.date })}</p>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
