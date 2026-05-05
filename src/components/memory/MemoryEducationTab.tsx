import { Lightbulb, TrendingUp, Heart, Zap, Brain, Apple } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { t } from '@/lib/i18n-toast';

const educationalContent = [
  {
    id: 1,
    category: "Sleep",
    icon: Brain,
    title: "How Sleep Quality Impacts Memory Formation",
    content: "Deep sleep (REM stage) is crucial for memory consolidation. During this phase, your brain processes and stores information from the day. Aim for 7-9 hours of quality sleep, maintaining a consistent schedule. Poor sleep can reduce memory retention by up to 40%.",
    impact: "High",
    relatedFactors: ["Exercise timing", "Caffeine intake", "Screen time"],
    color: "bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
  },
  {
    id: 2,
    category: "Nutrition",
    icon: Apple,
    title: "Nutrition's Role in Cognitive Function",
    content: "Omega-3 fatty acids, antioxidants, and B vitamins directly influence brain health. Foods like fatty fish, berries, and leafy greens support neurotransmitter production and reduce inflammation. Consistent nutrition timing also stabilizes blood sugar, preventing energy crashes.",
    impact: "High",
    relatedFactors: ["Meal timing", "Hydration", "Micronutrient balance"],
    color: "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400"
  },
  {
    id: 3,
    category: "Exercise",
    icon: Zap,
    title: "Physical Activity and Mental Clarity",
    content: "Exercise increases BDNF (Brain-Derived Neurotrophic Factor), which promotes neuron growth and cognitive function. Just 30 minutes of moderate activity can improve focus for up to 2 hours. Consistency matters more than intensity for long-term benefits.",
    impact: "Medium",
    relatedFactors: ["Recovery time", "Exercise type", "Intensity"],
    color: "bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400"
  },
  {
    id: 4,
    category: "Stress",
    icon: Heart,
    title: "Understanding Stress Response Patterns",
    content: "Chronic stress elevates cortisol, which impairs memory and decision-making. Your body's stress response is influenced by sleep, nutrition, and social connections. Practicing mindfulness for 10 minutes daily can reduce cortisol by 23%.",
    impact: "High",
    relatedFactors: ["Sleep quality", "Social support", "Breathing patterns"],
    color: "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400"
  },
  {
    id: 5,
    category: "Hydration",
    icon: TrendingUp,
    title: "Hydration and Performance Connection",
    content: "Even mild dehydration (2% body weight) reduces cognitive performance by 10-20%. Water is essential for nutrient transport and waste removal in brain cells. Consistent hydration throughout the day is more effective than large amounts at once.",
    impact: "Medium",
    relatedFactors: ["Activity level", "Climate", "Diet sodium"],
    color: "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
  },
  {
    id: 6,
    category: "Lifestyle",
    icon: Lightbulb,
    title: "Compound Effects of Healthy Habits",
    content: "Individual health factors don't exist in isolation. Sleep quality affects exercise recovery, which influences stress levels, which impacts nutrition choices. Building one positive habit often creates a cascade of improvements across all health domains.",
    impact: "High",
    relatedFactors: ["All categories", "Habit stacking", "Environmental design"],
    color: "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400"
  }
];

export function MemoryEducationTab() {
  return (
    <div className="mt-6 space-y-6">
      <div className="text-sm text-muted-foreground mb-4">
        Learn how lifestyle factors influence your wellness outcomes
      </div>

      {educationalContent.map((item) => {
        const IconComponent = item.icon;
        return (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${item.color} flex items-center justify-center`}>
                  <IconComponent className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{item.category}</Badge>
                    <Badge variant={item.impact === "High" ? "default" : "outline"}>
                      {item.impact} Impact
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {item.content}
              </p>
              
              <div className="pt-4 border-t">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Related Factors:
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.relatedFactors.map((factor) => (
                    <Badge key={factor} variant="outline" className="text-xs">
                      {factor}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-primary">{t('screens.memory.personalizedInsightsComingSoon')}</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            As you track more memories and data, this section will provide AI-generated insights 
            specifically tailored to your patterns and goals from your Life Compass.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
