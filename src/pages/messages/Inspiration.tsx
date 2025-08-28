import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Copy, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { messagesNavigation } from "@/config/navigation";

const inspirationTemplates = [
  {
    category: "Morning Motivation",
    templates: [
      { text: "Good morning! Ready to crush your wellness goals today? 💪", icon: "☀️" },
      { text: "New day, new opportunities to prioritize your health! 🌟", icon: "🌅" },
      { text: "Starting the day with gratitude and positive energy! ✨", icon: "🙏" }
    ]
  },
  {
    category: "Goal Support",
    templates: [
      { text: "You've got this! Every small step counts toward your bigger goals 🎯", icon: "🎯" },
      { text: "Believing in your journey and celebrating your progress! 🌈", icon: "📈" },
      { text: "Your commitment to wellness inspires everyone around you! 💫", icon: "⭐" }
    ]
  },
  {
    category: "Health Check-ins",
    templates: [
      { text: "How are you feeling today? Remember, it's okay to have ups and downs 💙", icon: "💙" },
      { text: "Checking in on your wellness journey - you're doing amazing! 🌸", icon: "🌸" },
      { text: "Hope you're taking time for self-care today. You deserve it! 🌿", icon: "🌿" }
    ]
  },
  {
    category: "Celebrations",
    templates: [
      { text: "Celebrating your wellness wins, big and small! 🎉", icon: "🎉" },
      { text: "So proud of your dedication to your health goals! 👏", icon: "👏" },
      { text: "Your progress is inspiring - keep up the fantastic work! 🌟", icon: "🌟" }
    ]
  }
];

export default function Inspiration() {
  return (
    <AppLayout>
      <SEO 
        title="Communication Inspiration | Messages" 
        description="Get inspired with pre-written messages and templates for your wellness community"
        canonical={window.location.href}
      />
      <SubNavigation items={messagesNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-domain-messages-tint via-background to-domain-messages-tint/50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title="Communication Inspiration"
            description="Pre-written messages and templates to inspire your wellness community"
            emoji="💡"
          />

          <div className="space-y-6 mt-6">
            {inspirationTemplates.map((category, categoryIdx) => (
              <Card key={categoryIdx}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    {category.category}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {category.templates.map((template, templateIdx) => (
                    <div key={templateIdx} className="border rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-xl">{template.icon}</span>
                        <p className="text-sm">{template.text}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigator.clipboard.writeText(template.text)}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => console.log(`Forwarding: ${template.text}`)}
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Send
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}