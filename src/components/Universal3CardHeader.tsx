import { Card, CardContent } from "@/components/ui/card";
import { AutoPilotActionCard } from "@/components/crossover/AutoPilotActionCard";
import { VitanaIndexCard } from "@/components/crossover/VitanaIndexCard";
import { Badge } from "@/components/ui/badge";

interface Universal3CardHeaderProps {
  title: string;
  description: string;
  emoji?: string;
  badgeText?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

export function Universal3CardHeader({
  title,
  description,
  emoji,
  badgeText,
  badgeVariant = "outline"
}: Universal3CardHeaderProps) {
  return (
    <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <div className="max-w-7xl mx-auto">
        {/* 3-Card Header Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px_240px] gap-4 mb-6">
          {/* Message Bar Card - flex-1 */}
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                {emoji && (
                  <div className="text-2xl">{emoji}</div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-xl font-semibold text-foreground">{title}</h1>
                    {badgeText && (
                      <Badge variant={badgeVariant}>{badgeText}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Autopilot Card - w-60 */}
          <div className="w-full">
            <AutoPilotActionCard />
          </div>
          
          {/* Vitana Index Card - w-60 */}
          <div className="w-full">
            <VitanaIndexCard />
          </div>
        </div>
      </div>
    </div>
  );
}