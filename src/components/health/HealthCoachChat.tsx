import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Mic, Video, Phone, Brain } from "lucide-react";
import { useState } from "react";
import { withCardId } from "@/lib/withCardId";
import { useAIConsent } from "@/hooks/useAIConsent";
import { AIDataConsentDialog } from "@/components/ai/AIDataConsentDialog";

interface HealthCoachChatProps {
  context?: string;
  variant?: "card" | "embedded" | "floating";
  onSendMessage?: (message: string) => void;
  onStartVoiceCall?: () => void;
  onStartVideoCall?: () => void;
}

function HealthCoachChatBase({ 
  context = "general", 
  variant = "card",
  onSendMessage,
  onStartVoiceCall,
  onStartVideoCall
}: HealthCoachChatProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const { hasConsent, dialogOpen: consentDialogOpen, setDialogOpen: setConsentDialogOpen, grantConsent } = useAIConsent();

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    if (!hasConsent) {
      setConsentDialogOpen(true);
      return;
    }

    const userMessage = message.trim();
    onSendMessage?.(userMessage);
    setMessage("");
    setIsTyping(true);

    try {
      // Call the real AI backend
      const { aiVoiceService } = await import("@/services/aiVoiceService");
      await aiVoiceService.sendTextMessage(userMessage, 'en-US');
      setIsTyping(false);
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsTyping(false);
    }
  };

  const quickActions = [
    "Log my symptoms",
    "Update my mood",
    "Schedule check-in",
    "Review my goals"
  ];

  const contextSuggestions = {
    hydration: ["How much water should I drink?", "Track my hydration"],
    nutrition: ["Suggest meal plans", "Log my food"],
    exercise: ["Create workout plan", "Track my activity"],
    sleep: ["Improve sleep quality", "Log sleep patterns"],
    mental: ["Mood tracking", "Stress management tips"]
  };

  const consentDialog = (
    <AIDataConsentDialog
      open={consentDialogOpen}
      onOpenChange={setConsentDialogOpen}
      onConsent={grantConsent}
    />
  );

  if (variant === "floating") {
    return (
      <>
        {consentDialog}
        <div className="fixed bottom-6 right-6 w-80 z-50">
          <Card className="shadow-xl border-calendar-primary/20 bg-card/95 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-calendar-primary to-calendar-secondary flex items-center justify-center">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">AI Health Coach</CardTitle>
                    <Badge variant="secondary" className="text-xs">Online</Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={onStartVoiceCall}>
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onStartVideoCall}>
                    <Video className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {contextSuggestions[context as keyof typeof contextSuggestions]?.map((suggestion, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant="outline"
                    className="w-full justify-start text-xs"
                    onClick={() => setMessage(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Ask your health coach..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="text-sm"
                />
                <Button size="sm" onClick={handleSendMessage}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (variant === "embedded") {
    return (
      <>
      {consentDialog}
      <div className="p-4 rounded-lg bg-gradient-to-r from-calendar-primary/5 to-calendar-secondary/5 border border-calendar-primary/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-calendar-primary to-calendar-secondary flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Ask AI Coach</h3>
            <p className="text-sm text-muted-foreground">Get personalized health guidance</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="How can I help with your health today?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <Button onClick={handleSendMessage}>
            <MessageCircle className="w-4 h-4" />
          </Button>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
    {consentDialog}
    <Card className="bg-gradient-to-br from-calendar-primary/5 to-calendar-secondary/5 border-calendar-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-calendar-primary to-calendar-secondary flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Health Coach</CardTitle>
              <Badge variant="secondary" className="text-xs">Available 24/7</Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={onStartVoiceCall}>
              <Mic className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onStartVideoCall}>
              <Video className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Quick actions:</p>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action, index) => (
              <Button 
                key={index}
                size="sm" 
                variant="outline" 
                className="justify-start text-xs"
                onClick={() => setMessage(action)}
              >
                {action}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Ask about your health, symptoms, or goals..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button onClick={handleSendMessage}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          {isTyping && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-calendar-primary animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-calendar-primary animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 rounded-full bg-calendar-primary animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              AI Coach is typing...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </>
  );
}

const HealthCoachChat = withCardId(HealthCoachChatBase, "CT-HS-002", "C-003");
export default HealthCoachChat;