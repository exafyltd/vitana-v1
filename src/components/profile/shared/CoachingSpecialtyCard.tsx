import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CoachingSpecialty } from "@/types/profile";
import { Star, Users, Trophy, Award } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface CoachingSpecialtyCardProps {
  specialty: CoachingSpecialty;
}

const specialtyIcons = {
  fitness: Trophy,
  mental: Award,
  nutrition: Users,
  wellness: Star,
  other: Award
};

const specialtyColors = {
  fitness: "from-orange-500/20 to-red-500/20 border-orange-300/30",
  mental: "from-purple-500/20 to-blue-500/20 border-purple-300/30", 
  nutrition: "from-green-500/20 to-emerald-500/20 border-green-300/30",
  wellness: "from-blue-500/20 to-cyan-500/20 border-blue-300/30",
  other: "from-gray-500/20 to-slate-500/20 border-gray-300/30"
};

export function CoachingSpecialtyCard({ specialty }: CoachingSpecialtyCardProps) {
  const Icon = specialtyIcons[specialty.type];
  const colorClasses = specialtyColors[specialty.type];

  return (
    <Card className={`bg-gradient-to-br ${colorClasses} hover:shadow-md transition-all duration-200`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-full bg-white/80">
            <Icon className="h-4 w-4 text-foreground" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm">{specialty.title}</h4>
            <div className="flex items-center gap-1 mt-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-medium">{specialty.rating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({specialty.totalRatings})</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">{specialty.sessionsHeld}</div>
            <div className="text-xs text-muted-foreground">{t('screens.profile.sessions')}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">{specialty.participantsHelped}</div>
            <div className="text-xs text-muted-foreground">{t('screens.profile.participants')}</div>
          </div>
        </div>

        <div className="text-center mb-3">
          <div className="text-sm font-semibold text-foreground">{specialty.subscribers}</div>
          <div className="text-xs text-muted-foreground">{t('screens.profile.subscribers')}</div>
        </div>

        {specialty.certifications.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center">
            {specialty.certifications.slice(0, 2).map((cert) => (
              <Badge 
                key={cert.id} 
                variant={cert.verified ? "default" : "secondary"}
                className="text-xs px-2 py-1"
              >
                {cert.title}
              </Badge>
            ))}
            {specialty.certifications.length > 2 && (
              <Badge variant="outline" className="text-xs px-2 py-1">
                +{specialty.certifications.length - 2}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}