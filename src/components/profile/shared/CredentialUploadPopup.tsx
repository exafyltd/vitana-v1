import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CoachingSpecialty, Certification } from "@/types/profile";
import { useState } from "react";
import { Upload, Plus, X, Trophy, Award, Users, Star, Calendar } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface CredentialUploadPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCredentials?: CoachingSpecialty[];
  onSave?: (credentials: CoachingSpecialty[]) => void;
}

export function CredentialUploadPopup({ 
  open, 
  onOpenChange, 
  existingCredentials = [],
  onSave 
}: CredentialUploadPopupProps) {
  const [specialties, setSpecialties] = useState<CoachingSpecialty[]>(existingCredentials);
  const [editingSpecialty, setEditingSpecialty] = useState<CoachingSpecialty | null>(null);
  
  // New specialty form state
  const [newSpecialtyTitle, setNewSpecialtyTitle] = useState("");
  const [newSpecialtyType, setNewSpecialtyType] = useState<CoachingSpecialty['type']>('fitness');
  const [newSessions, setNewSessions] = useState("");
  const [newParticipants, setNewParticipants] = useState("");
  const [newSubscribers, setNewSubscribers] = useState("");
  const [newRating, setNewRating] = useState("");
  const [newTotalRatings, setNewTotalRatings] = useState("");

  // Certification form state
  const [certTitle, setCertTitle] = useState("");
  const [certIssuer, setCertIssuer] = useState("");
  const [certDate, setCertDate] = useState("");

  const addNewSpecialty = () => {
    if (!newSpecialtyTitle) return;

    const newSpecialty: CoachingSpecialty = {
      id: Date.now().toString(),
      type: newSpecialtyType,
      title: newSpecialtyTitle,
      sessionsHeld: parseInt(newSessions) || 0,
      participantsHelped: parseInt(newParticipants) || 0,
      rating: parseFloat(newRating) || 5.0,
      totalRatings: parseInt(newTotalRatings) || 1,
      subscribers: parseInt(newSubscribers) || 0,
      certifications: [],
      isActive: true
    };

    setSpecialties([...specialties, newSpecialty]);
    
    // Reset form
    setNewSpecialtyTitle("");
    setNewSpecialtyType('fitness');
    setNewSessions("");
    setNewParticipants("");
    setNewSubscribers("");
    setNewRating("");
    setNewTotalRatings("");
  };

  const addCertification = (specialtyId: string) => {
    if (!certTitle || !certIssuer) return;

    const newCert: Certification = {
      id: Date.now().toString(),
      title: certTitle,
      issuer: certIssuer,
      issueDate: certDate,
      verified: false
    };

    setSpecialties(specialties.map(spec => 
      spec.id === specialtyId 
        ? { ...spec, certifications: [...spec.certifications, newCert] }
        : spec
    ));

    setCertTitle("");
    setCertIssuer("");
    setCertDate("");
  };

  const removeSpecialty = (specialtyId: string) => {
    setSpecialties(specialties.filter(spec => spec.id !== specialtyId));
  };

  const removeCertification = (specialtyId: string, certId: string) => {
    setSpecialties(specialties.map(spec => 
      spec.id === specialtyId 
        ? { ...spec, certifications: spec.certifications.filter(cert => cert.id !== certId) }
        : spec
    ));
  };

  const handleSave = () => {
    onSave?.(specialties);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('screens.profile.manageProfessionalCredentials')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Specialty */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {t('screens.profile.addCoachingSpecialty')}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label>{t('screens.profile.specialtyTitle')}</Label>
                    <Input
                      value={newSpecialtyTitle}
                      onChange={(e) => setNewSpecialtyTitle(e.target.value)}
                      placeholder={t('screens.profile.eGFitnessCoachMentalHealth')}
                    />
                  </div>
                  <div>
                    <Label>{t('screens.profile.category')}</Label>
                    <Select value={newSpecialtyType} onValueChange={(value: CoachingSpecialty['type']) => setNewSpecialtyType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fitness">{t('screens.profile.fitness')}</SelectItem>
                        <SelectItem value="mental">{t('screens.profile.mentalHealth')}</SelectItem>
                        <SelectItem value="nutrition">{t('screens.profile.nutrition')}</SelectItem>
                        <SelectItem value="wellness">{t('screens.profile.wellness')}</SelectItem>
                        <SelectItem value="other">{t('screens.profile.other')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>{t('screens.profile.sessionsHeld')}</Label>
                      <Input
                        type="number"
                        value={newSessions}
                        onChange={(e) => setNewSessions(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>{t('screens.profile.participants')}</Label>
                      <Input
                        type="number"
                        value={newParticipants}
                        onChange={(e) => setNewParticipants(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label>{t('screens.profile.rating')}</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={newRating}
                        onChange={(e) => setNewRating(e.target.value)}
                        placeholder="5.0"
                      />
                    </div>
                    <div>
                      <Label>{t('screens.profile.totalRatings')}</Label>
                      <Input
                        type="number"
                        value={newTotalRatings}
                        onChange={(e) => setNewTotalRatings(e.target.value)}
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <Label>{t('screens.profile.subscribers')}</Label>
                      <Input
                        type="number"
                        value={newSubscribers}
                        onChange={(e) => setNewSubscribers(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={addNewSpecialty} className="mt-4" disabled={!newSpecialtyTitle}>
                <Plus className="h-4 w-4 mr-2" />
                {t('screens.profile.addSpecialty')}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Specialties */}
          {specialties.map((specialty) => (
            <Card key={specialty.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      {specialty.title}
                    </h4>
                    <Badge variant="outline" className="mt-1">{specialty.type}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSpecialty(specialty.id)}
                    className="text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <div className="font-semibold">{specialty.sessionsHeld}</div>
                    <div className="text-xs text-muted-foreground">{t('screens.profile.sessions')}</div>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <div className="font-semibold">{specialty.participantsHelped}</div>
                    <div className="text-xs text-muted-foreground">{t('screens.profile.participants')}</div>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <div className="font-semibold">{specialty.rating.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">{t('screens.profile.rating')}</div>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <div className="font-semibold">{specialty.subscribers}</div>
                    <div className="text-xs text-muted-foreground">{t('screens.profile.subscribers')}</div>
                  </div>
                </div>

                {/* Certifications */}
                <div>
                  <h5 className="font-medium mb-2 flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    {t('screens.profile.certifications')}
                  </h5>
                  
                  <div className="space-y-2 mb-3">
                    {specialty.certifications.map((cert) => (
                      <div key={cert.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <div>
                          <div className="font-medium text-sm">{cert.title}</div>
                          <div className="text-xs text-muted-foreground">{cert.issuer}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCertification(specialty.id, cert.id)}
                          className="text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <Input
                      value={certTitle}
                      onChange={(e) => setCertTitle(e.target.value)}
                      placeholder={t('screens.profile.certificationTitle')}
                    />
                    <Input
                      value={certIssuer}
                      onChange={(e) => setCertIssuer(e.target.value)}
                      placeholder={t('screens.profile.issuingOrganization')}
                    />
                    <Input
                      type="date"
                      value={certDate}
                      onChange={(e) => setCertDate(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addCertification(specialty.id)}
                    disabled={!certTitle || !certIssuer}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t('screens.profile.addCertification')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              {t('screens.profile.cancel')}
            </Button>
            <Button className="flex-1" onClick={handleSave}>
              {t('screens.profile.saveCredentials')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
