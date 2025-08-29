import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { sharingNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Sparkles, Brain, Target, Wand2, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";

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

function SmartPackage() {
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
    <AppLayout>
      <SEO 
        title="Smart Package Creator - Vitana Sharing" 
        description="Use AI-powered recommendations to create intelligent health data packages optimized for your specific needs."
      />
      <SubNavigation items={sharingNavigation} />
      
      <div className="px-6 py-8 space-y-8">
        <StandardHeader 
          title="Smart Package Creator"
          description="AI-powered data package creation with intelligent recommendations based on your health profile"
        />

        {/* AI Suggestions */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h2 className="text-xl font-semibold">AI Recommendations</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {Object.entries(aiSuggestions).map(([key, suggestion]) => (
              <Card key={key} className="border-purple-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        {suggestion.title}
                      </CardTitle>
                      <CardDescription>{suggestion.reason}</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-purple-700 border-purple-300">
                      {suggestion.confidence}% match
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Suggested Data Types</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {suggestion.dataTypes.map((type, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">{type}</Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    <span className="font-medium text-muted-foreground">Date Range:</span> {suggestion.dateRange}
                  </div>
                  
                  <Button className="w-full">
                    <Target className="h-4 w-4 mr-2" />
                    Use This Package
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Custom Package Builder */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Create Custom Smart Package</h2>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Package Configuration</CardTitle>
              <CardDescription>
                Describe your needs and let AI suggest the optimal data package
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="packageName">Package Name</Label>
                  <Input 
                    id="packageName"
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                    placeholder="e.g., Cardiology Consultation Package"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose/Recipient</Label>
                  <Input 
                    id="purpose"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="e.g., Dr. Smith at Mayo Clinic"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea 
                  id="description"
                  placeholder="Describe the specific use case or any special requirements..."
                  rows={3}
                />
              </div>
              
              <Button className="w-full">
                <Sparkles className="h-4 w-4 mr-2" />
                Generate AI Recommendations
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Manual Data Selection */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-semibold">Manual Data Selection</h2>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Available Data Types</CardTitle>
              <CardDescription>
                Select specific data types to include in your package
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                <div className="mt-6 p-4 bg-muted rounded-lg">
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
        <div className="flex flex-wrap gap-4">
          <Button disabled={selectedDataTypes.length === 0 && !packageName}>
            <Wand2 className="h-4 w-4 mr-2" />
            Create Smart Package
          </Button>
          <Button variant="outline">
            <Target className="h-4 w-4 mr-2" />
            Preview Package
          </Button>
          <Button variant="outline">Save as Draft</Button>
        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(SmartPackage, SCREEN_IDS.SHARING_SMART_PACKAGE);