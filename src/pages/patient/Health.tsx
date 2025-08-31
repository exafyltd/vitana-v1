import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Activity, TrendingUp, Calendar } from "lucide-react";

export default function PatientHealth() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">My Health</h1>
        <p className="text-muted-foreground">
          Track and manage your health metrics and wellness journey
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Vital Signs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Blood Pressure</span>
                <Badge variant="outline">120/80</Badge>
              </div>
              <div className="flex justify-between">
                <span>Heart Rate</span>
                <Badge variant="outline">72 bpm</Badge>
              </div>
              <div className="flex justify-between">
                <span>Weight</span>
                <Badge variant="outline">165 lbs</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Steps Today</span>
                <Badge variant="outline">8,247</Badge>
              </div>
              <div className="flex justify-between">
                <span>Active Minutes</span>
                <Badge variant="outline">45 min</Badge>
              </div>
              <div className="flex justify-between">
                <span>Calories Burned</span>
                <Badge variant="outline">342</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Weekly Goals</span>
                <Badge variant="outline">7/10</Badge>
              </div>
              <div className="flex justify-between">
                <span>Health Score</span>
                <Badge variant="outline">85/100</Badge>
              </div>
              <div className="flex justify-between">
                <span>Trend</span>
                <Badge variant="default">↗ Improving</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Health Timeline</CardTitle>
          <CardDescription>Recent health events and milestones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Blood pressure recorded</p>
                <p className="text-xs text-muted-foreground">Today at 8:30 AM - Normal range</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Completed workout</p>
                <p className="text-xs text-muted-foreground">Yesterday - 45 min cardio session</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Medication taken</p>
                <p className="text-xs text-muted-foreground">2 days ago - Daily vitamins</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}