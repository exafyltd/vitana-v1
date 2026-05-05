import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TestTube, Heart, Activity, Brain, Droplets, Package, Share2, Shield, Clock, Users, CheckCircle } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface BiomarkerCategory {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  markers: BiomarkerItem[];
}

interface BiomarkerItem {
  id: string;
  name: string;
  description: string;
  category: string;
  sensitivity: "low" | "medium" | "high";
}

interface ConsentPackagePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const biomarkerCategories: BiomarkerCategory[] = [
  {
    id: "metabolic",
    name: "Metabolic Health",
    description: "Glucose, insulin, lipid panels",
    icon: Heart,
    color: "text-red-500",
    markers: [
      { id: "glucose", name: "Blood Glucose", description: "Fasting blood sugar levels", category: "metabolic", sensitivity: "medium" },
      { id: "insulin", name: "Insulin Levels", description: "Insulin resistance markers", category: "metabolic", sensitivity: "high" },
      { id: "cholesterol", name: "Cholesterol Panel", description: "Total, HDL, LDL cholesterol", category: "metabolic", sensitivity: "low" },
      { id: "triglycerides", name: "Triglycerides", description: "Blood fat levels", category: "metabolic", sensitivity: "low" }
    ]
  },
  {
    id: "cardiovascular",
    name: "Cardiovascular",
    description: "Heart health and circulation markers",
    icon: Activity,
    color: "text-pink-500",
    markers: [
      { id: "crp", name: "C-Reactive Protein", description: "Inflammation marker", category: "cardiovascular", sensitivity: "medium" },
      { id: "homocysteine", name: "Homocysteine", description: "Cardiovascular risk factor", category: "cardiovascular", sensitivity: "medium" },
      { id: "bnp", name: "BNP", description: "Heart function marker", category: "cardiovascular", sensitivity: "high" }
    ]
  },
  {
    id: "hormonal",
    name: "Hormonal Balance",
    description: "Thyroid, sex hormones, stress markers",
    icon: Brain,
    color: "text-purple-500",
    markers: [
      { id: "tsh", name: "TSH", description: "Thyroid stimulating hormone", category: "hormonal", sensitivity: "medium" },
      { id: "cortisol", name: "Cortisol", description: "Stress hormone levels", category: "hormonal", sensitivity: "high" },
      { id: "testosterone", name: "Testosterone", description: "Sex hormone levels", category: "hormonal", sensitivity: "high" }
    ]
  },
  {
    id: "nutritional",
    name: "Nutritional Status",
    description: "Vitamins, minerals, deficiencies",
    icon: Droplets,
    color: "text-blue-500",
    markers: [
      { id: "vitd", name: "Vitamin D", description: "Vitamin D levels", category: "nutritional", sensitivity: "low" },
      { id: "b12", name: "Vitamin B12", description: "B12 deficiency screening", category: "nutritional", sensitivity: "low" },
      { id: "iron", name: "Iron Panel", description: "Iron, ferritin, TIBC", category: "nutritional", sensitivity: "medium" }
    ]
  }
];

export default function ConsentPackagePopup({ open, onOpenChange }: ConsentPackagePopupProps) {
  const [step, setStep] = useState<"selection" | "review" | "sharing" | "confirmation">("selection");
  const [selectedMarkers, setSelectedMarkers] = useState<string[]>([]);
  const [packageName, setPackageName] = useState("");
  const [shareSettings, setShareSettings] = useState({
    allowAggregated: true,
    allowResearch: false,
    expiryDays: 365
  });

  const handleMarkerToggle = (markerId: string) => {
    setSelectedMarkers(prev => 
      prev.includes(markerId) 
        ? prev.filter(id => id !== markerId)
        : [...prev, markerId]
    );
  };

  const handleCategoryToggle = (category: BiomarkerCategory) => {
    const categoryMarkerIds = category.markers.map(m => m.id);
    const allSelected = categoryMarkerIds.every(id => selectedMarkers.includes(id));
    
    if (allSelected) {
      setSelectedMarkers(prev => prev.filter(id => !categoryMarkerIds.includes(id)));
    } else {
      setSelectedMarkers(prev => [...new Set([...prev, ...categoryMarkerIds])]);
    }
  };

  const getSelectedMarkersDetails = () => {
    return biomarkerCategories.flatMap(cat => 
      cat.markers.filter(marker => selectedMarkers.includes(marker.id))
    );
  };

  const getSensitivityColor = (sensitivity: string) => {
    switch (sensitivity) {
      case "low": return "bg-green-100 text-green-700";
      case "medium": return "bg-yellow-100 text-yellow-700";
      case "high": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const renderSelectionStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">{t('screens.common.selectBiomarkersShare')}</h3>
        <p className="text-sm text-muted-foreground">{t('screens.common.chooseWhichHealthDataYouD')}</p>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-4">
          {biomarkerCategories.map((category) => {
            const categoryMarkerIds = category.markers.map(m => m.id);
            const selectedCount = categoryMarkerIds.filter(id => selectedMarkers.includes(id)).length;
            const allSelected = selectedCount === categoryMarkerIds.length;
            
            return (
              <Card key={category.id} className="border-l-4 border-l-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={() => handleCategoryToggle(category)}
                      />
                      <category.icon className={`w-5 h-5 ${category.color}`} />
                      <div>
                        <CardTitle className="text-base">{category.name}</CardTitle>
                        <CardDescription className="text-sm">{category.description}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline">{selectedCount}/{categoryMarkerIds.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {category.markers.map((marker) => (
                      <div key={marker.id} className="flex items-center justify-between p-2 rounded-lg border bg-card/50">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={selectedMarkers.includes(marker.id)}
                            onCheckedChange={() => handleMarkerToggle(marker.id)}
                          />
                          <div>
                            <div className="font-medium text-sm">{marker.name}</div>
                            <div className="text-xs text-muted-foreground">{marker.description}</div>
                          </div>
                        </div>
                        <Badge className={getSensitivityColor(marker.sensitivity)}>
                          {marker.sensitivity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );

  const renderReviewStep = () => {
    const selectedDetails = getSelectedMarkersDetails();
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">{t('screens.common.reviewConsentPackage')}</h3>
          <p className="text-sm text-muted-foreground">{t('screens.common.reviewYourSelectedBiomarkersSharingPreferences')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Package Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">Selected Biomarkers ({selectedDetails.length})</div>
              <div className="grid grid-cols-2 gap-2">
                {selectedDetails.map((marker) => (
                  <div key={marker.id} className="text-xs p-2 bg-secondary/20 rounded flex justify-between">
                    <span>{marker.name}</span>
                    <Badge className={getSensitivityColor(marker.sensitivity)}>
                      {marker.sensitivity}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <h4 className="font-medium">{t('screens.common.sharingPreferences')}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>{t('screens.common.allowAggregatedDataSharing')}</span>
                  <Checkbox 
                    checked={shareSettings.allowAggregated}
                    onCheckedChange={(checked) => setShareSettings(prev => ({...prev, allowAggregated: !!checked}))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>{t('screens.common.allowResearchParticipation')}</span>
                  <Checkbox 
                    checked={shareSettings.allowResearch}
                    onCheckedChange={(checked) => setShareSettings(prev => ({...prev, allowResearch: !!checked}))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>{t('screens.common.packageExpires')}</span>
                  <select 
                    value={shareSettings.expiryDays}
                    onChange={(e) => setShareSettings(prev => ({...prev, expiryDays: parseInt(e.target.value)}))}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    <option value={90}>{t('screens.common.text3Months')}</option>
                    <option value={180}>{t('screens.common.text6Months')}</option>
                    <option value={365}>{t('screens.common.text1Year')}</option>
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderSharingStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">{t('screens.common.shareConsentPackage')}</h3>
        <p className="text-sm text-muted-foreground">{t('screens.common.chooseHowShareYourConsentPackage')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Share2 className="w-5 h-5 text-blue-500" />
              Generate Share Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{t('screens.common.createSecureLinkThatYouCan')}</p>
            <Button size="sm" className="w-full">{t('screens.common.generateLink')}</Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-green-500" />
              Send to Provider
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{t('screens.common.sendDirectlyHealthcareProviderResearchTeam')}</p>
            <Button size="sm" variant="outline" className="w-full">{t('screens.common.selectProvider')}</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            Data Protection & Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>{t('screens.common.allDataEncryptedTransitAtRest')}</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>{t('screens.common.youCanRevokeAccessAtAny')}</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>{t('screens.common.recipientsCannotShareYourDataWithout')}</span>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <span>Package expires automatically after {shareSettings.expiryDays} days</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderConfirmationStep = () => (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">{t('screens.common.consentPackageCreatedSuccessfully')}</h3>
        <p className="text-sm text-muted-foreground">{t('screens.common.yourBiomarkerConsentPackageHasCreated')}</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">{t('screens.common.packageId')}</span>
              <span className="font-mono text-xs">CP-{Date.now().toString().slice(-8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">{t('screens.common.biomarkersIncluded')}</span>
              <span>{selectedMarkers.length} markers</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">{t('screens.common.expires')}</span>
              <span>{new Date(Date.now() + shareSettings.expiryDays * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button className="w-full">{t('screens.common.viewConsentDashboard')}</Button>
        <Button variant="outline" className="w-full">{t('screens.common.createAnotherPackage')}</Button>
      </div>
    </div>
  );

  const handleNext = () => {
    if (step === "selection" && selectedMarkers.length === 0) return;
    
    switch (step) {
      case "selection":
        setStep("review");
        break;
      case "review":
        setStep("sharing");
        break;
      case "sharing":
        setStep("confirmation");
        break;
    }
  };

  const handleBack = () => {
    switch (step) {
      case "review":
        setStep("selection");
        break;
      case "sharing":
        setStep("review");
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t('screens.common.createConsentPackage')}</DialogTitle>
          <DialogDescription>
            Create a secure package of your biomarker data to share with healthcare providers or researchers.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === "selection" && renderSelectionStep()}
          {step === "review" && renderReviewStep()}
          {step === "sharing" && renderSharingStep()}
          {step === "confirmation" && renderConfirmationStep()}
        </div>

        {step !== "confirmation" && (
          <DialogFooter className="flex justify-between">
            <div>
              {step !== "selection" && (
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {step !== "sharing" ? (
                <Button 
                  onClick={handleNext}
                  disabled={step === "selection" && selectedMarkers.length === 0}
                >
                  {step === "selection" ? "Review Selection" : 
                   step === "review" ? "Continue to Sharing" : "Create Package"}
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  Create Package
                </Button>
              )}
            </div>
          </DialogFooter>
        )}

        {step === "confirmation" && (
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}