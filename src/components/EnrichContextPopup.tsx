import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { MapPin, Smile, Heart, Users, Target, Activity, Brain, Clock } from "lucide-react";

interface EnrichContextPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mood options with emoji
const moodOptions = [
  { value: "sad", emoji: "😟", label: "Sad" },
  { value: "neutral", emoji: "😐", label: "Neutral" },
  { value: "happy", emoji: "🙂", label: "Happy" },
  { value: "excited", emoji: "😃", label: "Excited" },
  { value: "euphoric", emoji: "🤩", label: "Euphoric" }
];

// Wellness tags
const wellnessTags = ["Tired", "Focused", "Motivated", "Stressed", "Calm"];

// Intent buttons for goals
const intentOptions = [
  { id: "focus", label: "Focus", icon: Brain },
  { id: "relax", label: "Relax", icon: Heart },
  { id: "exercise", label: "Exercise", icon: Activity },
  { id: "socialize", label: "Socialize", icon: Users }
];

export default function EnrichContextPopup({ open, onOpenChange }: EnrichContextPopupProps) {
  const [activeTab, setActiveTab] = useState("add-signal");
  
  // Add New Signal state
  const [location, setLocation] = useState("");
  const [locationDetail, setLocationDetail] = useState("");
  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState([70]);
  const [selectedWellnessTags, setSelectedWellnessTags] = useState<string[]>([]);
  const [socialInput, setSocialInput] = useState("");
  
  // Adjust Current Snapshot state
  const [overrideMood, setOverrideMood] = useState("");
  const [overrideEnergy, setOverrideEnergy] = useState([70]);
  const [stepCount, setStepCount] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [sleepQuality, setSleepQuality] = useState([3]);
  const [selectedIntent, setSelectedIntent] = useState("");

  const handleWellnessTagToggle = (tag: string) => {
    setSelectedWellnessTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSaveSignal = () => {
    console.log("Saving signal:", { location, locationDetail, mood, energy, selectedWellnessTags, socialInput });
    onOpenChange(false);
  };

  const handleUpdateSnapshot = () => {
    console.log("Updating snapshot:", { overrideMood, overrideEnergy, stepCount, heartRate, sleepQuality, selectedIntent });
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Enrich My Context
          </DialogTitle>
          <DialogDescription>
            Add or refine signals to improve the accuracy of your Context Snapshot. This helps Autopilot make better decisions.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="add-signal">Add New Signal</TabsTrigger>
            <TabsTrigger value="adjust-snapshot">Adjust Current Snapshot</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] pr-4">
            <TabsContent value="add-signal" className="space-y-6 mt-6">
              {/* Location & Environment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location & Environment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="location">Current Location</Label>
                    <Select value={location} onValueChange={setLocation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="home">At Home</SelectItem>
                        <SelectItem value="work">At Work</SelectItem>
                        <SelectItem value="traveling">Traveling</SelectItem>
                        <SelectItem value="outdoors">Outdoors</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="location-detail">Add detail (optional)</Label>
                    <Input
                      id="location-detail"
                      placeholder="e.g., kitchen, coffee shop, park..."
                      value={locationDetail}
                      onChange={(e) => setLocationDetail(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Mood & Energy */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smile className="w-4 h-4" />
                    Mood & Energy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Current Mood</Label>
                    <div className="flex gap-2 mt-2">
                      {moodOptions.map((option) => (
                        <Button
                          key={option.value}
                          variant={mood === option.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setMood(option.value)}
                          className="flex items-center gap-2"
                        >
                          <span className="text-lg">{option.emoji}</span>
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Energy Level: {energy[0]}%</Label>
                    <Slider
                      value={energy}
                      onValueChange={setEnergy}
                      max={100}
                      step={10}
                      className="mt-2"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Wellness Input */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Wellness Input
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Label>How are you feeling?</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {wellnessTags.map((tag) => (
                      <Button
                        key={tag}
                        variant={selectedWellnessTags.includes(tag) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleWellnessTagToggle(tag)}
                      >
                        {tag}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Social Input */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Social Input
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Label htmlFor="social-input">Tag a friend, group, or event</Label>
                  <Input
                    id="social-input"
                    placeholder="Type to search people, groups, events..."
                    value={socialInput}
                    onChange={(e) => setSocialInput(e.target.value)}
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSaveSignal} className="bg-gradient-to-r from-primary to-primary-glow">
                  Save Signal
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="adjust-snapshot" className="space-y-6 mt-6">
              {/* Current Vibe Override */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smile className="w-4 h-4" />
                    Current Vibe Override
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Override Mood</Label>
                    <div className="flex gap-2 mt-2">
                      {moodOptions.map((option) => (
                        <Button
                          key={option.value}
                          variant={overrideMood === option.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setOverrideMood(option.value)}
                          className="flex items-center gap-2"
                        >
                          <span className="text-lg">{option.emoji}</span>
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Energy Level: {overrideEnergy[0]}%</Label>
                    <Slider
                      value={overrideEnergy}
                      onValueChange={setOverrideEnergy}
                      max={100}
                      step={10}
                      className="mt-2"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Biometric Snapshot Adjustment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Biometric Snapshot Adjustment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="step-count">Step Count</Label>
                      <Input
                        id="step-count"
                        type="number"
                        placeholder="e.g., 8500"
                        value={stepCount}
                        onChange={(e) => setStepCount(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="heart-rate">Heart Rate (BPM)</Label>
                      <Input
                        id="heart-rate"
                        type="number"
                        placeholder="e.g., 72"
                        value={heartRate}
                        onChange={(e) => setHeartRate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Sleep Quality: {sleepQuality[0]}/5</Label>
                    <Slider
                      value={sleepQuality}
                      onValueChange={setSleepQuality}
                      max={5}
                      min={1}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Short-Term Goal */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Short-Term Goal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Label>What's your current intent?</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {intentOptions.map((intent) => (
                      <Button
                        key={intent.id}
                        variant={selectedIntent === intent.id ? "default" : "outline"}
                        onClick={() => setSelectedIntent(intent.id)}
                        className="flex items-center gap-2"
                      >
                        <intent.icon className="w-4 h-4" />
                        {intent.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleUpdateSnapshot} className="bg-gradient-to-r from-primary to-primary-glow">
                  Update Snapshot
                </Button>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={activeTab === "add-signal" ? handleSaveSignal : handleUpdateSnapshot}>
            Save & Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}