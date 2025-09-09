import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Lightbulb, Settings } from "lucide-react";

interface AddToAIFeedPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const routineTags = ["Wellness", "Sleep", "Fitness", "Nutrition", "Mental Health", "Longevity", "Motivation"];
const sourceTypes = ["Autopilot nudges", "Biomarker alerts", "Community actions", "Wellness reminders"];
const impactEmojis = ["⚡", "🔥", "💥"];
const impactLabels = ["Small", "Medium", "Big"];

export function AddToAIFeedPopup({ open, onOpenChange }: AddToAIFeedPopupProps) {
  // New Routine Tab State
  const [routineName, setRoutineName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [goal, setGoal] = useState("");
  const [frequency, setFrequency] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // New Idea Tab State
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaDescription, setIdeaDescription] = useState("");
  const [ideaCategory, setIdeaCategory] = useState("");
  const [impactEstimate, setImpactEstimate] = useState([1]);

  // Adjust Feed Tab State
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [relevanceLevel, setRelevanceLevel] = useState([50]);

  const [isLoading, setIsLoading] = useState(false);

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else if (selectedTags.length < 3) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSourceToggle = (source: string) => {
    if (selectedSources.includes(source)) {
      setSelectedSources(selectedSources.filter(s => s !== source));
    } else {
      setSelectedSources([...selectedSources, source]);
    }
  };

  const handleSaveRoutine = async () => {
    if (!routineName || !trigger || !goal || !frequency) return;
    
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Reset form
    setRoutineName("");
    setTrigger("");
    setGoal("");
    setFrequency("");
    setSelectedTags([]);
    setIsLoading(false);
    onOpenChange(false);
  };

  const handleSubmitIdea = async () => {
    if (!ideaTitle) return;
    
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Reset form
    setIdeaTitle("");
    setIdeaDescription("");
    setIdeaCategory("");
    setImpactEstimate([1]);
    setIsLoading(false);
    onOpenChange(false);
  };

  const handleUpdatePreferences = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add to AI Feed</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Suggest a new routine, share an idea, or adjust what Autopilot tracks for you.
          </p>
        </DialogHeader>

        <Tabs defaultValue="routine" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="routine" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              New Routine
            </TabsTrigger>
            <TabsTrigger value="idea" className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              New Idea
            </TabsTrigger>
            <TabsTrigger value="adjust" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Adjust Feed
            </TabsTrigger>
          </TabsList>

          {/* Tab 1 - New Routine */}
          <TabsContent value="routine" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="routine-name">Routine Name</Label>
                <Input
                  id="routine-name"
                  placeholder="e.g., Morning Yoga, Sleep Wind-down"
                  value={routineName}
                  onChange={(e) => setRoutineName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trigger">Trigger</Label>
                <Select value={trigger} onValueChange={setTrigger}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time-based">Time-based</SelectItem>
                    <SelectItem value="context-based">Context-based</SelectItem>
                    <SelectItem value="event-based">Event-based</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal">Goal</Label>
                <Select value={goal} onValueChange={setGoal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="energy">Energy</SelectItem>
                    <SelectItem value="relaxation">Relaxation</SelectItem>
                    <SelectItem value="focus">Focus</SelectItem>
                    <SelectItem value="recovery">Recovery</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Biweekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tags (choose up to 3)</Label>
                <div className="flex flex-wrap gap-2">
                  {routineTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <Button 
              onClick={handleSaveRoutine} 
              disabled={!routineName || !trigger || !goal || !frequency || isLoading}
              className="w-full"
            >
              {isLoading ? "Saving..." : "Save Routine"}
            </Button>
          </TabsContent>

          {/* Tab 2 - New Idea */}
          <TabsContent value="idea" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="idea-title">Idea Title</Label>
                <Input
                  id="idea-title"
                  placeholder="Brief title for your idea"
                  value={ideaTitle}
                  onChange={(e) => setIdeaTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="idea-description">Description (optional)</Label>
                <Textarea
                  id="idea-description"
                  placeholder="Describe your idea in more detail..."
                  value={ideaDescription}
                  onChange={(e) => setIdeaDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={ideaCategory} onValueChange={setIdeaCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routines">Routines</SelectItem>
                    <SelectItem value="health">Health</SelectItem>
                    <SelectItem value="community">Community</SelectItem>
                    <SelectItem value="productivity">Productivity</SelectItem>
                    <SelectItem value="lifestyle">Lifestyle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Impact Estimate</Label>
                <div className="space-y-3">
                  <Slider
                    value={impactEstimate}
                    onValueChange={setImpactEstimate}
                    max={2}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>⚡ Small</span>
                    <span>🔥 Medium</span>
                    <span>💥 Big</span>
                  </div>
                  <div className="text-center">
                    <span className="text-2xl">{impactEmojis[impactEstimate[0]]}</span>
                    <span className="ml-2 text-sm">{impactLabels[impactEstimate[0]]} Impact</span>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleSubmitIdea} 
              disabled={!ideaTitle || isLoading}
              className="w-full"
            >
              {isLoading ? "Submitting..." : "Submit Idea"}
            </Button>
          </TabsContent>

          {/* Tab 3 - Adjust Feed */}
          <TabsContent value="adjust" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Select Source Types</Label>
                <div className="space-y-2">
                  {sourceTypes.map((source) => (
                    <div key={source} className="flex items-center space-x-2">
                      <Checkbox
                        id={source}
                        checked={selectedSources.includes(source)}
                        onCheckedChange={() => handleSourceToggle(source)}
                      />
                      <Label htmlFor={source} className="text-sm font-normal">
                        {source}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Relevance Slider</Label>
                <div className="space-y-3">
                  <Slider
                    value={relevanceLevel}
                    onValueChange={setRelevanceLevel}
                    max={100}
                    min={0}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Less often</span>
                    <span>More often</span>
                  </div>
                  <div className="text-center text-sm">
                    Current: {relevanceLevel[0]}%
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Mute or Snooze Options</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm">
                    Mute Wellness (7 days)
                  </Button>
                  <Button variant="outline" size="sm">
                    Snooze Nudges (1 day)
                  </Button>
                  <Button variant="outline" size="sm">
                    Mute Biomarkers (3 days)
                  </Button>
                  <Button variant="outline" size="sm">
                    Snooze Community (2 hours)
                  </Button>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleUpdatePreferences} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Updating..." : "Update Preferences"}
            </Button>
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Save & Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}