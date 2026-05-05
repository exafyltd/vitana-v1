import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, DollarSign, Calendar, Star, Edit3 } from "lucide-react";
import { UserProfile, ServiceOffering } from "@/types/profile";
import { Scope } from "@/lib/profileScope";
import { t } from '@/lib/i18n-toast';

interface ProfileServicesTabProps {
  profile: UserProfile;
  scope: Scope;
  editMode?: boolean;
  onEditServices?: () => void;
  onEditCompliance?: () => void;
}

export function ProfileServicesTab({ profile, scope, editMode, onEditServices, onEditCompliance }: ProfileServicesTabProps) {
  const publishedOfferings = profile.offerings?.filter(offering => offering.status === 'published') || [];

  const formatPrice = (priceCents?: number, currency = 'USD') => {
    if (!priceCents || priceCents === 0) return 'Free';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(priceCents / 100);
  };

  if (publishedOfferings.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('screens.profile.noServicesAvailable')}</h3>
          <p className="text-muted-foreground">
            This user doesn't have any published services yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">{t('screens.profile.professionalServices')}</h2>
        <p className="text-muted-foreground">
          Book a session with {profile.name} to get personalized guidance
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {publishedOfferings.map((offering) => (
          <Card key={offering.id} className="relative overflow-hidden">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl mb-2">{offering.title}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {offering.durationMin} minutes
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {formatPrice(offering.priceCents, offering.currency)}
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Featured
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Next Available Times */}
              {offering.nextTimes && offering.nextTimes.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">{t('screens.profile.nextAvailable')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {offering.nextTimes.slice(0, 3).map((time, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {new Date(time).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        {editMode && onEditServices && (
          <Button variant="outline" onClick={onEditServices}>
            <Edit3 className="h-4 w-4 mr-2" />
            Manage Services
          </Button>
        )}
        {!editMode && (
          <>
            <Button className="flex-1">
              <Calendar className="h-4 w-4 mr-2" />
              Book Session
            </Button>
            <Button variant="outline">
              Learn More
            </Button>
          </>
        )}
      </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Professional Info */}
      {profile.compliance?.isProfessional && (
        <Card className="bg-blue-50/50 border-blue-200/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Star className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">{t('screens.profile.verifiedProfessional')}</h3>
                  {profile.compliance.licenseVerified && (
                    <p className="text-sm text-muted-foreground">
                      Licensed and verified healthcare provider
                    </p>
                  )}
                </div>
              </div>
              {editMode && onEditCompliance && (
                <Button variant="outline" size="sm" onClick={onEditCompliance}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Manage Credentials
                </Button>
              )}
            </div>
            
            {profile.compliance.specialties && profile.compliance.specialties.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Specialties</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.compliance.specialties.map((specialty, index) => (
                    <Badge key={index} variant="secondary">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}