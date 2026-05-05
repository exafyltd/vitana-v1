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
import { t } from '@/lib/i18n-toast';

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
            {t('screens.common.enrichMyContext')}
          </DialogTitle>
          <DialogDescription>
            {t('screens.common.addRefineSignalsImproveAccuracyYour')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="add-signal">{t('screens.common.addNewSignal')}</TabsTrigger>
            <TabsTrigger value="adjust-snapshot">{t('screens.common.adjustCurrentSnapshot')}</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] pr-4">
            <TabsContent value="add-signal" className="space-y-6 mt-6">
              {/* Location & Environment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {t('screens.common.locationEnvironment')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="location">{t('screens.common.currentLocation')}</Label>
                    <Select value={location} onValueChange={setLocation}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('screens.common.selectLocation')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="home">{t('screens.common.atHome')}</SelectItem>
                        <SelectItem value="work">{t('screens.common.atWork')}</SelectItem>
                        <SelectItem value="traveling">{t('screens.common.traveling')}</SelectItem>
                        <SelectItem value="outdoors">{t('screens.common.outdoors')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="location-detail">{t('screens.common.addDetailOptional')}</Label>
                    <Input
                      id="location-detail"
                      placeholder={t('screens.common.eGKitchenCoffeeShopPark')}
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
                    {t('screens.common.moodEnergy')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>{t('screens.common.currentMood')}</Label>
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
                    <Label>{t('screens.common.energyLevelValue0', { value0: energy[0] })}</Label>
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
                    {t('screens.common.wellnessInput')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Label>{t('screens.common.howYouFeeling')}</Label>
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
                    {t('screens.common.socialInput')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Label htmlFor="social-input">{t('screens.common.tagFriendGroupEvent')}</Label>
                  <Input
                    id="social-input"
                    placeholder={t('screens.common.typeSearchPeopleGroupsEvents')}
                    value={socialInput}
                    onChange={(e) => setSocialInput(e.target.value)}
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSaveSignal} className="bg-gradient-to-r from-primary to-primary-glow">
                  {t('screens.common.saveSignal')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="adjust-snapshot" className="space-y-6 mt-6">
              {/* Current Vibe Override */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smile className="w-4 h-4" />
                    {t('screens.common.currentVibeOverride')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>{t('screens.common.overrideMood')}</Label>
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
                    <Label>{t('screens.common.energyLevelValue0', { value0: overrideEnergy[0] })}</Label>
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
                    {t('screens.common.biometricSnapshotAdjustment')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="step-count">{t('screens.common.stepCount')}</Label>
                      <Input
                        id="step-count"
                        type="number"
                        placeholder="e.g., 8500"
                        value={stepCount}
                        onChange={(e) => setStepCount(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="heart-rate">{t('screens.common.heartRateBpm')}</Label>
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
                    <Label>{t('screens.common.sleepQualityValue05', { value0: sleepQuality[0] })}</Label>
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
                    {t('screens.common.shorttermGoal')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Label>{t('screens.common.whatSYourCurrentIntent')}</Label>
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
                  {t('screens.common.updateSnapshot')}
                </Button>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t('screens.common.cancel')}
          </Button>
          <Button onClick={activeTab === "add-signal" ? handleSaveSignal : handleUpdateSnapshot}>
            {t('screens.common.saveClose')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}