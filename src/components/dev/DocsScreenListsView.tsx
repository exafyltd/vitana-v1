import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layout } from "lucide-react";
import { t } from '@/lib/i18n-toast';

export function DocsScreenListsView() {
  const screenLists = [
    { name: "Dev Hub Screens", count: 45, status: "Complete", portal: "Dev" },
    { name: "Patient Portal Screens", count: 32, status: "Complete", portal: "Patient" },
    { name: "Professional Portal Screens", count: 28, status: "In Progress", portal: "Professional" },
    { name: "Admin Portal Screens", count: 67, status: "Complete", portal: "Admin" },
    { name: "Community Screens", count: 41, status: "Complete", portal: "Community" },
    { name: "Health Tracker Screens", count: 23, status: "Complete", portal: "Health" }
  ];

  return (
    <div className="grid grid-cols-12 gap-6">
      {screenLists.map((list) => (
        <div key={list.name} className="col-span-12 md:col-span-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between">
                <Layout className="w-8 h-8 text-primary" />
                <Badge variant={list.status === "Complete" ? "default" : "secondary"}>
                  {list.status}
                </Badge>
              </div>
              <CardTitle className="mt-4">{list.name}</CardTitle>
              <CardDescription>{t('screens.dev.countScreensDefined', { count: list.count })}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t('screens.dev.portalPortal', { portal: list.portal })}</p>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
