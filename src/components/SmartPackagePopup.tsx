import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Brain, Target, Wand2, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { t } from '@/lib/i18n-toast';

interface SmartPackagePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const aiSuggestions = {
  forCardiologist: {
    title: "Cardiology Consultation Package",
    reason: "Based on your recent heart rate variability data and scheduled cardiology appointment",
    dataTypes: ["ECG Data", "Blood Pressure Trends", "Cholesterol Levels", "Exercise Performance", "Sleep Quality"],
    dateRange: "Last 6 months",
    confidence: 95
  },
  forResearch: {
    title: "Diabetes Prevention Study Package",
    reason: "Matches criteria for ongoing diabetes prevention research at Stanford",
    dataTypes: ["Glucose Monitoring", "Diet Tracking", "Physical Activity", "Weight Trends", "Family History"],
    dateRange: "Last 3 months",
    confidence: 88
  },
  forPrimaryCare: {
    title: "Annual Physical Exam Package",
    reason: "Your annual check-up is approaching in 2 weeks",
    dataTypes: ["Recent Lab Results", "Vital Signs", "Medication List", "Symptom Log", "Preventive Care History"],
    dateRange: "Last 12 months",
    confidence: 92
  }
};

const availableDataTypes = [
  { id: "lab-results", label: "Lab Results", category: "Medical", available: true },
  { id: "vital-signs", label: "Vital Signs", category: "Health Metrics", available: true },
  { id: "activity-data", label: "Activity Data", category: "Lifestyle", available: true },
  { id: "sleep-patterns", label: "Sleep Patterns", category: "Lifestyle", available: true },
  { id: "nutrition", label: "Nutrition Tracking", category: "Lifestyle", available: true },
  { id: "medications", label: "Medication History", category: "Medical", available: true },
  { id: "symptoms", label: "Symptom Log", category: "Medical", available: false },
  { id: "imaging", label: "Medical Imaging", category: "Medical", available: false },
  { id: "genetic", label: "Genetic Information", category: "Advanced", available: true },
  { id: "mental-health", label: "Mental Health Assessments", category: "Wellness", available: true }
];

export function SmartPackagePopup({ isOpen, onClose }: SmartPackagePopupProps) {
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([]);
  const [packageName, setPackageName] = useState("");
  const [purpose, setPurpose] = useState("");

  const handleDataTypeToggle = (dataTypeId: string) => {
    setSelectedDataTypes(prev => 
      prev.includes(dataTypeId) 
        ? prev.filter(id => id !== dataTypeId)
        : [...prev, dataTypeId]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Smart Package Creator
          </DialogTitle>
          <DialogDescription>
            Create an intelligent health data package with AI-powered recommendations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* AI Suggestions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-600" />
              <h3 className="text-lg font-semibold">{t('screens.common.aiRecommendations')}</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {Object.entries(aiSuggestions).map(([key, suggestion]) => (
                <Card key={key} className="border-purple-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Brain className="h-4 w-4" />
                          {suggestion.title}
                        </CardTitle>
                        <CardDescription className="text-xs">{suggestion.reason}</CardDescription>
                      </div>
                      <Badge variant="outline" className="text-purple-700 border-purple-300 text-xs">
                        {suggestion.confidence}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">{t('screens.common.suggestedDataTypes')}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {suggestion.dataTypes.slice(0, 3).map((type, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">{type}</Badge>
                        ))}
                        {suggestion.dataTypes.length > 3 && (
                          <Badge variant="secondary" className="text-xs">+{suggestion.dataTypes.length - 3} more</Badge>
                        )}
                      </div>
                    </div>
                    
                    <Button size="sm" className="w-full">
                      <Target className="h-3 w-3 mr-1" />
                      Use This Package
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Custom Package Builder */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-blue-600" />
              <h3 className="text-lg font-semibold">{t('screens.common.createCustomPackage')}</h3>
            </div>
            
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="packageName">{t('screens.common.packageName2')}</Label>
                    <Input 
                      id="packageName"
                      value={packageName}
                      onChange={(e) => setPackageName(e.target.value)}
                      placeholder="e.g., Cardiology Consultation Package"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="purpose">{t('screens.common.purposerecipient')}</Label>
                    <Input 
                      id="purpose"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="e.g., Dr. Smith at Mayo Clinic"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">{t('screens.common.descriptionOptional2')}</Label>
                  <Textarea 
                    id="description"
                    placeholder={t('screens.common.describeSpecificUseCaseAnySpecial')}
                    rows={3}
                  />
                </div>
                
                <Button className="w-full" size="sm">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate AI Recommendations
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Manual Data Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <h3 className="text-lg font-semibold">{t('screens.common.manualDataSelection')}</h3>
            </div>
            
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableDataTypes.map((dataType) => (
                    <div key={dataType.id} className="flex items-start space-x-2">
                      <Checkbox
                        id={dataType.id}
                        checked={selectedDataTypes.includes(dataType.id)}
                        onCheckedChange={() => handleDataTypeToggle(dataType.id)}
                        disabled={!dataType.available}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor={dataType.id}
                          className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                            !dataType.available ? 'text-muted-foreground' : ''
                          }`}
                        >
                          {dataType.label}
                          {!dataType.available && (
                            <AlertCircle className="h-3 w-3 inline ml-1" />
                          )}
                        </label>
                        <Badge variant="outline" className="text-xs w-fit">
                          {dataType.category}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                
                {selectedDataTypes.length > 0 && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <div className="text-sm font-medium">Selected Data Types ({selectedDataTypes.length})</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedDataTypes.map((typeId) => {
                        const dataType = availableDataTypes.find(dt => dt.id === typeId);
                        return dataType ? (
                          <Badge key={typeId} variant="secondary" className="text-xs">
                            {dataType.label}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button disabled={selectedDataTypes.length === 0 && !packageName} size="sm">
              <Wand2 className="h-4 w-4 mr-2" />
              Create Smart Package
            </Button>
            <Button variant="outline" size="sm">
              <Target className="h-4 w-4 mr-2" />
              Preview Package
            </Button>
            <Button variant="outline" size="sm">{t('screens.common.saveAsDraft')}</Button>
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}