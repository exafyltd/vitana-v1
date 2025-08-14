import { useState } from "react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { 
  Target, 
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Filter
} from "lucide-react";

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

const goals = [
  {
    id: 1,
    title: "Daily Exercise Routine",
    category: "fitness",
    progress: 75,
    target: 30,
    current: 22,
    unit: "days",
    deadline: "2024-12-31",
    milestones: [
      { name: "Week 1 Complete", date: "2024-01-07", completed: true },
      { name: "10 Days Streak", date: "2024-01-15", completed: true },
      { name: "3 Week Milestone", date: "2024-01-28", completed: false },
      { name: "30 Day Goal", date: "2024-02-15", completed: false }
    ],
    relatedEvents: [
      { name: "Morning Yoga", date: "Today", type: "scheduled" },
      { name: "Gym Session", date: "Tomorrow", type: "scheduled" },
      { name: "Running Club", date: "Friday", type: "suggested" }
    ]
  },
  {
    id: 2,
    title: "Healthy Meal Prep",
    category: "nutrition",
    progress: 60,
    target: 4,
    current: 2.4,
    unit: "meals/week",
    deadline: "2024-12-31",
    milestones: [
      { name: "First Week Success", date: "2024-01-07", completed: true },
      { name: "Recipe Collection", date: "2024-01-14", completed: true },
      { name: "Batch Cooking Mastery", date: "2024-01-28", completed: false },
      { name: "Sustainable Routine", date: "2024-02-15", completed: false }
    ],
    relatedEvents: [
      { name: "Grocery Shopping", date: "Sunday", type: "scheduled" },
      { name: "Meal Prep Session", date: "Sunday", type: "scheduled" },
      { name: "Nutrition Workshop", date: "Next Week", type: "suggested" }
    ]
  },
  {
    id: 3,
    title: "Mindfulness Practice",
    category: "mental health",
    progress: 90,
    target: 21,
    current: 19,
    unit: "sessions",
    deadline: "2024-12-31",
    milestones: [
      { name: "Daily Habit Formed", date: "2024-01-14", completed: true },
      { name: "10 Minute Sessions", date: "2024-01-21", completed: true },
      { name: "Advanced Techniques", date: "2024-02-01", completed: false },
      { name: "Mindfulness Mastery", date: "2024-02-28", completed: false }
    ],
    relatedEvents: [
      { name: "Morning Meditation", date: "Daily", type: "scheduled" },
      { name: "Mindfulness Group", date: "Wednesday", type: "scheduled" },
      { name: "Retreat Weekend", date: "Next Month", type: "suggested" }
    ]
  }
];

export default function Progress() {
  const [selectedGoal, setSelectedGoal] = useState<number | null>(null);
  const [timeframe, setTimeframe] = useState<"week" | "month" | "quarter">("month");

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "bg-green-500";
    if (progress >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      fitness: "from-blue-100 to-blue-200",
      nutrition: "from-green-100 to-green-200",
      "mental health": "from-purple-100 to-purple-200"
    };
    return colors[category as keyof typeof colors] || "from-gray-100 to-gray-200";
  };

  const calculateCalendarAlignment = () => {
    // Mock calculation - in real app, analyze calendar events vs goals
    const totalEvents = 45;
    const goalAlignedEvents = 32;
    return Math.round((goalAlignedEvents / totalEvents) * 100);
  };

  const calendarAlignment = calculateCalendarAlignment();

  return (
    <AppLayout>
      <SEO 
        title="Goal Progress | Calendar" 
        description="Track milestones and see how your calendar activities align with your wellness goals" 
        canonical={window.location.href} 
      />
      <SubNavigation items={calendarSubItems} />
      
      <div className="p-6 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Goal Progress Tracker 🎯
                </h1>
                <p className="text-muted-foreground">
                  Monitor milestones and track how your calendar aligns with your wellness goals
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Filter
                </Button>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Goal
                </Button>
              </div>
            </div>

            {/* Timeframe Selector */}
            <div className="flex gap-2">
              {(["week", "month", "quarter"] as const).map((period) => (
                <Button
                  key={period}
                  variant={timeframe === period ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeframe(period)}
                  className="capitalize"
                >
                  {period}
                </Button>
              ))}
            </div>
          </div>

          {/* Calendar Alignment Meter */}
          <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Calendar Goal Alignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Overall Alignment</span>
                    <span className="text-sm font-bold">{calendarAlignment}%</span>
                  </div>
                  <ProgressBar value={calendarAlignment} className="h-3" />
                  <p className="text-sm text-muted-foreground mt-2">
                    {calendarAlignment}% of your calendar activities contribute to your active goals
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{calendarAlignment}%</div>
                  <div className="text-sm text-muted-foreground">Goal Aligned</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Goals Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
            {goals.map((goal) => (
              <Card 
                key={goal.id}
                className={`
                  cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 
                  bg-gradient-to-br ${getCategoryColor(goal.category)} border border-white/20
                  ${selectedGoal === goal.id ? 'ring-2 ring-primary' : ''}
                `}
                onClick={() => setSelectedGoal(selectedGoal === goal.id ? null : goal.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg mb-2">{goal.title}</CardTitle>
                      <Badge variant="secondary" className="capitalize">
                        {goal.category}
                      </Badge>
                    </div>
                    <Target className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Progress</span>
                        <span className="text-sm font-bold">{goal.progress}%</span>
                      </div>
                      <ProgressBar value={goal.progress} className="h-2" />
                    </div>

                    {/* Current Stats */}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current</span>
                      <span className="font-medium">{goal.current} / {goal.target} {goal.unit}</span>
                    </div>

                    {/* Deadline */}
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Due: {goal.deadline}</span>
                    </div>

                    {/* Next Milestone */}
                    <div className="border-t pt-3">
                      <div className="text-sm font-medium mb-1">Next Milestone</div>
                      {goal.milestones.find(m => !m.completed) && (
                        <div className="flex items-center gap-2 text-sm">
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                          <span>{goal.milestones.find(m => !m.completed)?.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Goal View */}
          {selectedGoal && (
            <Card className="bg-white/90 backdrop-blur-sm border border-white/20">
              <CardContent className="p-6">
                {(() => {
                  const goal = goals.find(g => g.id === selectedGoal)!;
                  return (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold">{goal.title}</h3>
                        <Button variant="outline" className="gap-2">
                          <Calendar className="w-4 h-4" />
                          View Related Events
                        </Button>
                      </div>

                      {/* Milestone Timeline */}
                      <div>
                        <h4 className="font-medium mb-4">Milestone Timeline</h4>
                        <div className="space-y-3">
                          {goal.milestones.map((milestone, index) => (
                            <div key={index} className="flex items-center gap-3">
                              {milestone.completed ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
                              )}
                              <div className="flex-1">
                                <div className="font-medium">{milestone.name}</div>
                                <div className="text-sm text-muted-foreground">{milestone.date}</div>
                              </div>
                              {milestone.completed && (
                                <Badge variant="default">Completed</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Related Events */}
                      <div>
                        <h4 className="font-medium mb-4">Related Calendar Events</h4>
                        <div className="space-y-2">
                          {goal.relatedEvents.map((event, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">{event.name}</div>
                                  <div className="text-sm text-muted-foreground">{event.date}</div>
                                </div>
                              </div>
                              <Badge variant={event.type === "scheduled" ? "default" : "outline"}>
                                {event.type}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* AI Suggestions */}
                      <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          🤖 AI Suggestions
                        </h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Based on your progress, here are some recommendations to close gaps:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">Schedule 2 more workouts this week</Badge>
                          <Badge variant="outline">Book nutrition consultation</Badge>
                          <Badge variant="outline">Join mindfulness group session</Badge>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}