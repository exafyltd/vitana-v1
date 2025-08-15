import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Bell, 
  Plus, 
  Clock, 
  Calendar as CalendarIcon, 
  AlertCircle, 
  CheckCircle, 
  Edit, 
  Trash2,
  Target,
  Heart,
  Pill,
  Utensils,
  Dumbbell
} from "lucide-react";
import { useState } from "react";

const calendarSubItems = [
  { id: "overview", name: "Overview", path: "/calendar" },
  { id: "month", name: "Month View", path: "/calendar/month" },
  { id: "week", name: "Week View", path: "/calendar/week" },
  { id: "day", name: "Day View", path: "/calendar/day" },
  { id: "appointments", name: "Appointments", path: "/calendar/appointments" },
  { id: "reminders", name: "Reminders", path: "/calendar/reminders" },
  { id: "motivation", name: "Motivation", path: "/calendar/motivation" },
  { id: "progress", name: "Goal Progress", path: "/calendar/progress" },
  { id: "recommendations", name: "Recommendations", path: "/calendar/recommendations" },
];

export default function Reminders() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const reminders = [
    {
      id: 1,
      title: "Take evening supplements",
      description: "Vitamin D, Omega-3, and Magnesium",
      time: "7:00 PM",
      date: "Today",
      category: "health",
      priority: "high",
      recurring: "Daily",
      completed: false
    },
    {
      id: 2,
      title: "Drink water reminder",
      description: "Stay hydrated - aim for 2L today",
      time: "Every 2 hours",
      date: "Today",
      category: "wellness",
      priority: "medium",
      recurring: "Hourly",
      completed: false
    },
    {
      id: 3,
      title: "Meal prep for tomorrow",
      description: "Prepare healthy lunches and snacks",
      time: "8:00 PM",
      date: "Today",
      category: "nutrition",
      priority: "medium",
      recurring: "Weekly",
      completed: false
    },
    {
      id: 4,
      title: "Morning workout",
      description: "30-minute cardio session",
      time: "7:00 AM",
      date: "Tomorrow",
      category: "fitness",
      priority: "high",
      recurring: "Daily",
      completed: false
    },
    {
      id: 5,
      title: "Review sleep goals",
      description: "Check sleep quality and adjust bedtime",
      time: "9:30 PM",
      date: "Today",
      category: "wellness",
      priority: "low",
      recurring: "Weekly",
      completed: true
    }
  ];

  const categoryIcons = {
    health: Pill,
    wellness: Heart,
    nutrition: Utensils,
    fitness: Dumbbell,
    general: Bell
  };

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "health", label: "Health" },
    { value: "wellness", label: "Wellness" },
    { value: "nutrition", label: "Nutrition" },
    { value: "fitness", label: "Fitness" }
  ];

  const filteredReminders = selectedCategory === "all" 
    ? reminders 
    : reminders.filter(reminder => reminder.category === selectedCategory);

  const activeReminders = filteredReminders.filter(r => !r.completed);
  const completedReminders = filteredReminders.filter(r => r.completed);

  return (
    <AppLayout>
      <SEO title="Reminders | Calendar" description="Manage your wellness reminders and notifications" canonical={window.location.href} />
      <SubNavigation items={calendarSubItems} />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-2">Reminders</h1>
              <p className="text-muted-foreground">Stay on track with your wellness goals through smart reminders</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Reminder
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Reminder</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" placeholder="Reminder title" />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" placeholder="Additional details..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="time">Time</Label>
                      <Input id="time" type="time" />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="health">Health</SelectItem>
                          <SelectItem value="wellness">Wellness</SelectItem>
                          <SelectItem value="nutrition">Nutrition</SelectItem>
                          <SelectItem value="fitness">Fitness</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="recurring">Recurring</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="once">Once</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button onClick={() => setIsDialogOpen(false)}>Create Reminder</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">{activeReminders.length}</div>
              <div className="text-sm text-muted-foreground">Active Reminders</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">{completedReminders.length}</div>
              <div className="text-sm text-muted-foreground">Completed Today</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">85%</div>
              <div className="text-sm text-muted-foreground">Completion Rate</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">7</div>
              <div className="text-sm text-muted-foreground">Weekly Streak</div>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <Button
              key={category.value}
              variant={selectedCategory === category.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.value)}
            >
              {category.label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Reminders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Active Reminders ({activeReminders.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeReminders.map((reminder) => {
                const CategoryIcon = categoryIcons[reminder.category] || Bell;
                return (
                  <div key={reminder.id} className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        reminder.category === 'health' ? 'bg-red-100 text-red-600' :
                        reminder.category === 'wellness' ? 'bg-blue-100 text-blue-600' :
                        reminder.category === 'nutrition' ? 'bg-green-100 text-green-600' :
                        reminder.category === 'fitness' ? 'bg-purple-100 text-purple-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        <CategoryIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground">{reminder.title}</h3>
                          <Badge variant={
                            reminder.priority === 'high' ? 'destructive' :
                            reminder.priority === 'medium' ? 'default' : 'secondary'
                          } className="text-xs">
                            {reminder.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{reminder.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {reminder.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            {reminder.date}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {reminder.recurring}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Completed Reminders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Completed Today ({completedReminders.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {completedReminders.map((reminder) => {
                const CategoryIcon = categoryIcons[reminder.category] || Bell;
                return (
                  <div key={reminder.id} className="flex items-center justify-between p-4 rounded-lg border bg-muted/20 opacity-75">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100 text-green-600">
                        <CategoryIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground line-through">{reminder.title}</h3>
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <p className="text-sm text-muted-foreground">{reminder.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {reminder.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}