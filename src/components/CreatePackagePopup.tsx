import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Package, Calendar as CalendarIcon, Users, Shield, FileText } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { notify } from '@/lib/i18n-toast';

interface CreatePackagePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const dataTypes = [
  { id: "lab-results", label: "Lab Results", description: "Blood work, biomarkers, diagnostic tests" },
  { id: "vital-signs", label: "Vital Signs", description: "Blood pressure, heart rate, temperature" },
  { id: "activity-data", label: "Activity Data", description: "Steps, exercise, movement patterns" },
  { id: "sleep-patterns", label: "Sleep Patterns", description: "Sleep quality, duration, cycles" },
  { id: "nutrition", label: "Nutrition", description: "Diet tracking, calorie intake, nutrients" },
  { id: "medications", label: "Medications", description: "Current prescriptions, dosages, adherence" },
  { id: "symptoms", label: "Symptoms", description: "Symptom logs, pain levels, mood tracking" },
  { id: "imaging", label: "Medical Imaging", description: "X-rays, MRIs, ultrasounds, scans" },
  { id: "genetic", label: "Genetic Information", description: "DNA analysis, genetic predispositions" }
];

const templates = [
  { id: "basic", name: "Basic Health Summary", types: ["lab-results", "vital-signs", "medications"] },
  { id: "research", name: "Research Package", types: ["lab-results", "activity-data", "sleep-patterns", "nutrition", "genetic"] },
  { id: "specialist", name: "Specialist Consultation", types: ["lab-results", "imaging", "symptoms", "medications"] }
];

export function CreatePackagePopup({ isOpen, onClose }: CreatePackagePopupProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("details");
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    recipient: "",
    privacy: "healthcare-provider"
  });

  const handleDataTypeToggle = (typeId: string) => {
    setSelectedDataTypes(prev => 
      prev.includes(typeId) ? prev.filter(t => t !== typeId) : [...prev, typeId]
    );
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedDataTypes(template.types);
      setFormData(prev => ({ ...prev, name: template.name }));
    }
  };

  const handleSubmit = () => {
    notify('toasts.common.packageCreated');
    onClose();
    // Reset form
    setFormData({ name: "", description: "", recipient: "", privacy: "healthcare-provider" });
    setSelectedDataTypes([]);
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-purple-600" />
            Create Health Data Package
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Data Types
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="sharing" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Sharing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Package Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Package Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Comprehensive Health Profile"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Describe the purpose and contents of this package..."
                    className="mt-1 min-h-[100px]"
                  />
                </div>

                <div>
                  <Label className="text-base font-medium">Quick Start Templates</Label>
                  <div className="grid gap-3 mt-2">
                    {templates.map((template) => (
                      <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{template.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Includes: {template.types.map(t => dataTypes.find(dt => dt.id === t)?.label).join(", ")}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleTemplateSelect(template.id)}>
                          Use Template
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Data Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {dataTypes.map((dataType) => (
                    <div key={dataType.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={dataType.id}
                        checked={selectedDataTypes.includes(dataType.id)}
                        onCheckedChange={() => handleDataTypeToggle(dataType.id)}
                      />
                      <div className="flex-1">
                        <Label htmlFor={dataType.id} className="font-medium cursor-pointer">
                          {dataType.label}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">{dataType.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Date Range</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>From Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-1",
                            !dateFrom && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, "PPP") : "Select start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>To Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-1",
                            !dateTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, "PPP") : "Select end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium">Quick Date Ranges</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[
                      { label: "Last 30 days", days: 30 },
                      { label: "Last 3 months", days: 90 },
                      { label: "Last 6 months", days: 180 },
                      { label: "Last year", days: 365 }
                    ].map((range) => (
                      <Button
                        key={range.label}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const to = new Date();
                          const from = new Date();
                          from.setDate(from.getDate() - range.days);
                          setDateFrom(from);
                          setDateTo(to);
                        }}
                      >
                        {range.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sharing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sharing Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="recipient">Recipient</Label>
                  <Input
                    id="recipient"
                    value={formData.recipient}
                    onChange={(e) => setFormData({...formData, recipient: e.target.value})}
                    placeholder="Healthcare provider, researcher, or organization name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="privacy">Privacy Level</Label>
                  <Select value={formData.privacy} onValueChange={(value) => setFormData({...formData, privacy: value})}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="healthcare-provider">Healthcare Provider Only</SelectItem>
                      <SelectItem value="research">Research Institution</SelectItem>
                      <SelectItem value="anonymized">Anonymized Research</SelectItem>
                      <SelectItem value="personal">Personal Use</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Privacy Notice</h4>
                  <p className="text-sm text-blue-800">
                    Your health data will be encrypted and shared only with the specified recipient. 
                    You can revoke access at any time through your sharing dashboard.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="flex-1" disabled={!formData.name || selectedDataTypes.length === 0}>
            Create Package
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}