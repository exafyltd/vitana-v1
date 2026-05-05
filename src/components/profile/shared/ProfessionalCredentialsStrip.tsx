import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfessionalCredentials } from "@/types/profile";
import { CoachingSpecialtyCard } from "./CoachingSpecialtyCard";
import { Trophy, Users, Star, Upload, ChevronRight } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface ProfessionalCredentialsStripProps {
  credentials?: ProfessionalCredentials;
  isOwnProfile?: boolean;
  onUploadCredentials?: () => void;
}

export function ProfessionalCredentialsStrip({ 
  credentials, 
  isOwnProfile = false,
  onUploadCredentials 
}: ProfessionalCredentialsStripProps) {
  // Show empty state if no credentials
  if (!credentials || credentials.coachingSpecialties.length === 0) {
    if (!isOwnProfile) return null;
    
    return (
      <div className="px-6">
        <div className="max-w-6xl mx-auto">
          <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">{t('screens.profile.showcaseYourProfessionalExpertise')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('screens.profile.addYourCoachingSpecialtiesCertificationsCredential')}
              </p>
              <Button onClick={onUploadCredentials}>
                <Upload className="h-4 w-4 mr-2" />
                {t('screens.profile.addCredentials')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-gradient-to-r from-primary/5 via-background to-secondary/5 border-primary/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                {t('screens.profile.professionalCredentialsExpertise')}
              </h3>
              {isOwnProfile && (
                <Button variant="outline" size="sm" onClick={onUploadCredentials}>
                  <Upload className="h-3 w-3 mr-1" />
                  {t('screens.profile.manage')} <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>

            {/* Overall Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-white/50 rounded-lg">
                <div className="flex items-center justify-center mb-1">
                  <Trophy className="h-4 w-4 text-primary mr-1" />
                  <span className="text-lg font-bold">{credentials.totalSessions}</span>
                </div>
                <div className="text-xs text-muted-foreground">{t('screens.profile.totalSessions')}</div>
              </div>
              <div className="text-center p-3 bg-white/50 rounded-lg">
                <div className="flex items-center justify-center mb-1">
                  <Users className="h-4 w-4 text-primary mr-1" />
                  <span className="text-lg font-bold">{credentials.totalParticipants}</span>
                </div>
                <div className="text-xs text-muted-foreground">{t('screens.profile.peopleHelped')}</div>
              </div>
              <div className="text-center p-3 bg-white/50 rounded-lg">
                <div className="flex items-center justify-center mb-1">
                  <Star className="h-4 w-4 text-yellow-500 mr-1 fill-current" />
                  <span className="text-lg font-bold">{credentials.overallRating.toFixed(1)}</span>
                </div>
                <div className="text-xs text-muted-foreground">{t('screens.profile.overallRating')}</div>
              </div>
              <div className="text-center p-3 bg-white/50 rounded-lg">
                <div className="flex items-center justify-center mb-1">
                  <Users className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-lg font-bold">{credentials.totalSubscribers}</span>
                </div>
                <div className="text-xs text-muted-foreground">{t('screens.profile.subscribers')}</div>
              </div>
            </div>

            {/* Coaching Specialties */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {credentials.coachingSpecialties.map((specialty) => (
                <CoachingSpecialtyCard key={specialty.id} specialty={specialty} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}