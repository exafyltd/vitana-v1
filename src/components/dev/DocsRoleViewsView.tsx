import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { t } from '@/lib/i18n-toast';

export function DocsRoleViewsView() {
  const roleViews = [
    { role: "Patient", views: 12, permissions: "Read, Limited Write", status: "Active" },
    { role: "Professional", views: 18, permissions: "Read, Write, Manage Patients", status: "Active" },
    { role: "Staff", views: 15, permissions: "Read, Write, Queue Management", status: "Active" },
    { role: "Admin", views: 24, permissions: "Full Access", status: "Active" },
    { role: "Guest", views: 5, permissions: "Read Only", status: "Active" },
    { role: "Support", views: 9, permissions: "Read, Assist", status: "Active" }
  ];

  return (
    <div className="grid grid-cols-12 gap-6">
      {roleViews.map((roleView) => (
        <div key={roleView.role} className="col-span-12 md:col-span-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between">
                <Users className="w-8 h-8 text-primary" />
                <Badge variant="default">{roleView.status}</Badge>
              </div>
              <CardTitle className="mt-4">{roleView.role}</CardTitle>
              <CardDescription>{roleView.views} configured views</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t('screens.dev.permissions')}</span> {roleView.permissions}
              </p>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
