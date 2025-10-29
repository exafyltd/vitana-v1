import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, AlertCircle, TrendingUp } from "lucide-react";

interface StatCard {
  title: string;
  value: string;
  change: string;
  icon: typeof CheckCircle;
  color: string;
}

const stats: StatCard[] = [
  {
    title: "Success Rate",
    value: "94.2%",
    change: "+2.1% from last week",
    icon: CheckCircle,
    color: "text-green-600 dark:text-green-400"
  },
  {
    title: "Average Duration",
    value: "3m 24s",
    change: "-18s from last week",
    icon: Clock,
    color: "text-blue-600 dark:text-blue-400"
  },
  {
    title: "Failures This Week",
    value: "12",
    change: "-3 from last week",
    icon: AlertCircle,
    color: "text-red-600 dark:text-red-400"
  },
  {
    title: "Most Used Template",
    value: "Resource Health Check",
    change: "234 runs this month",
    icon: TrendingUp,
    color: "text-purple-600 dark:text-purple-400"
  },
];

export function AnalyticsView() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const IconComponent = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <IconComponent className={`w-5 h-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
