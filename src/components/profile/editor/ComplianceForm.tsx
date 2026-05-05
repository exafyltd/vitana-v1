import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, X, Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { useProfile } from "@/context/ProfileProvider";
import { t } from '@/lib/i18n-toast';

export function ComplianceForm() {
  const { profile } = useProfile();
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [licenseFiles, setLicenseFiles] = useState<string[]>([]);
  const [licenseVerified, setLicenseVerified] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState("");

  const isProfessional = profile.role === "professional";

  const addSpecialty = () => {
    if (newSpecialty.trim() && !specialties.includes(newSpecialty.trim())) {
      setSpecialties([...specialties, newSpecialty.trim()]);
      setNewSpecialty("");
    }
  };

  const removeSpecialty = (specialty: string) => {
    setSpecialties(specialties.filter(s => s !== specialty));
  };

  const handleLicenseUpload = () => {
    // TODO: Implement file upload
    console.log("License upload");
  };

  const removeLicenseFile = (file: string) => {
    setLicenseFiles(licenseFiles.filter(f => f !== file));
  };

  if (!isProfessional) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">{t('screens.profile.professionalCompliance')}</h3>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('screens.profile.thisSectionOnlyAvailableForUsers')} 
              <Button variant="link" className="h-auto p-0 ml-1">
                {t('screens.profile.switchProfessionalRole')}
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">{t('screens.profile.professionalCompliance')}</h3>
        <p className="text-sm text-muted-foreground mb-6">
          {t('screens.profile.manageYourProfessionalCredentialsSpecialtiesLicens')}
        </p>
      </div>

      {/* License Verification */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">{t('screens.profile.licenseVerification')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('screens.profile.uploadYourProfessionalLicensesForVerification')}
              </p>
            </div>
            <Badge variant={licenseVerified ? "default" : "secondary"} className="gap-1">
              {licenseVerified ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  Verified
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3" />
                  {t('screens.profile.pending')}
                </>
              )}
            </Badge>
          </div>

          {!licenseVerified && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('screens.profile.licenseVerificationRequiredBeforeYouCan')}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>{t('screens.profile.licenseFiles')}</Label>
            <div className="space-y-2">
              {licenseFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="flex-1 text-sm">{file}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeLicenseFile(file)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={handleLicenseUpload}>
              <Upload className="w-4 h-4 mr-2" />
              {t('screens.profile.uploadLicense')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Specialties */}
      <div className="space-y-4">
        <Label className="text-base font-medium">{t('screens.profile.specialties')}</Label>
        
        <div className="flex flex-wrap gap-2">
          {specialties.map((specialty) => (
            <Badge key={specialty} variant="secondary" className="gap-1">
              {specialty}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1"
                onClick={() => removeSpecialty(specialty)}
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder={t('screens.profile.addSpecialty')}
            value={newSpecialty}
            onChange={(e) => setNewSpecialty(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addSpecialty()}
          />
          <Button variant="outline" onClick={addSpecialty}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          {t('screens.profile.commonSpecialtiesNutritionMentalHealthFitness')}
        </div>
      </div>

      <div className="pt-4 border-t">
        <Button className="w-full">{t('screens.profile.saveChanges')}</Button>
      </div>
    </div>
  );
}