import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, User, AlertCircle, CheckCircle } from "lucide-react";

export default function StaffQueue() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Patient Queue</h1>
        <p className="text-muted-foreground">
          Manage patient check-ins and waiting list
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waiting</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              Patients in queue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <User className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">
              Being seen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              Priority cases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              Today's total
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Current Queue</h2>
        
        <Card className="border-l-4 border-l-red-500">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarFallback className="bg-red-100 text-red-800">JD</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">John Doe</CardTitle>
                  <CardDescription>Walk-in • Chest pain</CardDescription>
                </div>
              </div>
              <Badge variant="destructive">URGENT</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Arrived: 10:15 AM</span>
                <span>Wait time: 45 min</span>
                <span>Room: Triage</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm">Call Patient</Button>
                <Button size="sm" variant="outline">Assign Room</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarFallback className="bg-orange-100 text-orange-800">SJ</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">Sarah Johnson</CardTitle>
                  <CardDescription>Appointment • Follow-up</CardDescription>
                </div>
              </div>
              <Badge variant="outline">WAITING</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Arrived: 10:30 AM</span>
                <span>Wait time: 30 min</span>
                <span>Room: Waiting area</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm">Call Patient</Button>
                <Button size="sm" variant="outline">Assign Room</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarFallback className="bg-blue-100 text-blue-800">MW</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">Mike Wilson</CardTitle>
                  <CardDescription>Appointment • Lab results</CardDescription>
                </div>
              </div>
              <Badge variant="secondary">IN PROGRESS</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Started: 10:45 AM</span>
                <span>Duration: 15 min</span>
                <span>Room: 205 - Dr. Miller</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">View Progress</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}