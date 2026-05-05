import { useState } from "react";
import { Shield, UserCog, Users, Key } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminUsersNavigation } from "@/config/navigation";
import { t } from '@/lib/i18n-toast';

// Placeholder dev-access users (would come from /api/v1/dev-access/users in production)
const DEV_ACCESS_USERS = [
  { email: "admin@vitana.io", granted_at: "2026-01-15", status: "active" },
  { email: "dev@exafy.com", granted_at: "2026-02-01", status: "active" },
];

// Placeholder role distribution
const ROLE_DISTRIBUTION = [
  { role: "community", count: 142, color: "bg-violet-500" },
  { role: "patient", count: 87, color: "bg-blue-500" },
  { role: "professional", count: 34, color: "bg-emerald-500" },
  { role: "staff", count: 12, color: "bg-amber-500" },
  { role: "admin", count: 5, color: "bg-red-500" },
];

export default function RolesAccess() {
  const [grantEmail, setGrantEmail] = useState("");
  const [granting, setGranting] = useState(false);

  const totalUsers = ROLE_DISTRIBUTION.reduce((sum, r) => sum + r.count, 0);

  const handleGrantAccess = async () => {
    if (!grantEmail.trim()) return;
    setGranting(true);
    // In production, this would call POST /api/v1/dev-access/grant
    // For now, just simulate a delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setGranting(false);
    setGrantEmail("");
  };

  return (
    <AppLayout>
      <SubNavigation items={adminUsersNavigation} />
      <div className="p-6 bg-gradient-to-br from-purple-50 via-white to-blue-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title={t('screens.admin.rolesAccess')}
            description="Manage role assignments and developer access control."
            emoji="🔐"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dev Access Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-amber-600" />
                  <div>
                    <CardTitle>{t('screens.admin.devAccess')}</CardTitle>
                    <CardDescription>
                      Users with <code className="text-xs bg-muted px-1 py-0.5 rounded">{t('screens.admin.exafy_adminTrue')}</code>.
                      Data sourced from <code className="text-xs bg-muted px-1 py-0.5 rounded">{t('screens.admin.apiv1devaccessusers')}</code>.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Dev users table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Granted</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {DEV_ACCESS_USERS.map((user) => (
                        <TableRow key={user.email}>
                          <TableCell className="font-medium text-sm">
                            {user.email}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(user.granted_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="success" className="capitalize">
                              {user.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Grant access form */}
                <div className="flex gap-2">
                  <Input
                    placeholder={t('screens.admin.userExampleCom')}
                    value={grantEmail}
                    onChange={(e) => setGrantEmail(e.target.value)}
                    type="email"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleGrantAccess}
                    disabled={!grantEmail.trim() || granting}
                  >
                    {granting ? "Granting..." : "Grant Access"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Role Distribution Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-violet-600" />
                  <div>
                    <CardTitle>{t('screens.admin.roleDistribution')}</CardTitle>
                    <CardDescription>
                      Breakdown of user roles across the platform ({totalUsers} total users).
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {ROLE_DISTRIBUTION.map((item) => {
                  const percentage = totalUsers > 0
                    ? ((item.count / totalUsers) * 100).toFixed(1)
                    : "0";
                  return (
                    <div key={item.role} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block h-3 w-3 rounded-sm ${item.color}`} />
                          <span className="capitalize font-medium">{item.role}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {item.count} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${item.color} transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Summary counts */}
                <div className="pt-4 border-t grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('screens.admin.total')}</span>
                    <span className="font-semibold">{totalUsers}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <UserCog className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('screens.admin.roles')}</span>
                    <span className="font-semibold">{ROLE_DISTRIBUTION.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
