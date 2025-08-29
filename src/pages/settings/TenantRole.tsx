import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { settingsNavigation } from "@/config/navigation";
import { Users, Building2, UserCheck, Crown, Briefcase } from "lucide-react";

export default function TenantRole() {
  return (
    <AppLayout>
      <SEO title="Tenant & Role Switcher | Settings" description="Switch between roles and tenants" canonical={window.location.href} />
      <SubNavigation items={settingsNavigation} />
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <StandardHeader 
          title="Switch roles & tenants!"
          description="Switch between roles and tenants"
          emoji="🔄"
        />
        
        {/* Current Context */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Current Context
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <Crown className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h4 className="font-medium">Premium Patient</h4>
                  <p className="text-sm text-muted-foreground">Vitana Health Network</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-700">Active</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Role Switcher */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Switch Role
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Available Roles</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="community-member">Community Member</SelectItem>
                  <SelectItem value="professional">Professional (Doctor/Coach)</SelectItem>
                  <SelectItem value="staff">Staff/Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg cursor-pointer hover:bg-muted">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <h4 className="font-medium">Community Member</h4>
                </div>
                <p className="text-sm text-muted-foreground">Access community features and social connections</p>
                <Badge className="mt-2 bg-blue-100 text-blue-700">Available</Badge>
              </div>

              <div className="p-4 border rounded-lg cursor-pointer hover:bg-muted">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <UserCheck className="w-4 h-4 text-green-600" />
                  </div>
                  <h4 className="font-medium">Patient</h4>
                </div>
                <p className="text-sm text-muted-foreground">Full health tracking and medical features</p>
                <Badge className="mt-2 bg-green-100 text-green-700">Current</Badge>
              </div>
            </div>

            <Button className="w-full">Switch Role</Button>
          </CardContent>
        </Card>

        {/* Tenant Switcher */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Switch Tenant/Organization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Available Organizations</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select an organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vitana-health">Vitana Health Network</SelectItem>
                  <SelectItem value="wellness-clinic">City Wellness Clinic</SelectItem>
                  <SelectItem value="fitness-center">Premier Fitness Center</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium">Vitana Health Network</h4>
                    <p className="text-sm text-muted-foreground">Primary healthcare network</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700">Active</Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">City Wellness Clinic</h4>
                    <p className="text-sm text-muted-foreground">Local wellness provider</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Switch</Button>
              </div>
            </div>

            <Button className="w-full">Switch Organization</Button>
          </CardContent>
        </Card>

        {/* Role Permissions */}
        <Card>
          <CardHeader>
            <CardTitle>Role Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Community Access</span>
                <Badge className="bg-green-100 text-green-700">Granted</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Health Data Access</span>
                <Badge className="bg-green-100 text-green-700">Full Access</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Professional Tools</span>
                <Badge className="bg-gray-100 text-gray-700">Not Available</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Admin Features</span>
                <Badge className="bg-gray-100 text-gray-700">Not Available</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}