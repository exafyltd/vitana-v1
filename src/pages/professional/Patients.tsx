import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Search, Plus, Calendar } from "lucide-react";

export default function ProfessionalPatients() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">My Patients</h1>
          <p className="text-muted-foreground">
            Manage your patient roster and care plans
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Patient
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search patients..." className="pl-10" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">John Doe</CardTitle>
                <CardDescription>Age 45 • Male</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Last Visit</span>
                <span className="text-sm">2 weeks ago</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Next Appointment</span>
                <Badge variant="outline">Tomorrow 9:00 AM</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Condition</span>
                <Badge variant="secondary">Hypertension</Badge>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" className="flex-1">View Chart</Button>
                <Button size="sm" variant="outline">
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarFallback>SJ</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">Sarah Johnson</CardTitle>
                <CardDescription>Age 32 • Female</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Last Visit</span>
                <span className="text-sm">1 week ago</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Next Appointment</span>
                <Badge variant="outline">Friday 2:30 PM</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Condition</span>
                <Badge variant="secondary">Follow-up</Badge>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" className="flex-1">View Chart</Button>
                <Button size="sm" variant="outline">
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarFallback>MW</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">Mike Wilson</CardTitle>
                <CardDescription>Age 28 • Male</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Last Visit</span>
                <span className="text-sm">3 days ago</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Next Appointment</span>
                <Badge variant="outline">Next Week</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Condition</span>
                <Badge variant="secondary">Lab Review</Badge>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" className="flex-1">View Chart</Button>
                <Button size="sm" variant="outline">
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}