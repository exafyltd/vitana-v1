import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, CheckCircle, XCircle } from "lucide-react";
import { ActiveVTIDChip } from "./ActiveVTIDChip";
import { useActiveVTID } from "@/context/ActiveVTIDContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CommandMessage } from "@/types/command-hub";

interface CommandChatProps {
  isFocused?: boolean;
  hasUnread?: boolean;
}

export function CommandChat({ isFocused = true, hasUnread = false }: CommandChatProps) {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<CommandMessage[]>([
    {
      id: '1',
      type: 'system',
      content: 'Welcome to Command Hub. Select a VTID to begin.',
      timestamp: new Date(),
    },
  ]);
  const { activeVTID } = useActiveVTID();
  const { toast } = useToast();

  const handleSend = () => {
    if (!inputValue.trim()) return;

    if (!activeVTID) {
      toast({
        title: "No VTID Selected",
        description: "Please select a VTID before sending commands",
        variant: "destructive",
      });
      return;
    }

    const newMessage: CommandMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      vtid: activeVTID.id,
    };

    setMessages([...messages, newMessage]);
    setInputValue("");

    // Simulate system response
    setTimeout(() => {
      const response: CommandMessage = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: `Command received: "${inputValue}". This will be processed in Phase 2.`,
        timestamp: new Date(),
        actions: [
          {
            id: 'approve',
            label: 'Approve',
            type: 'approve',
            onClick: () => handleAction('approve'),
          },
          {
            id: 'deny',
            label: 'Deny',
            type: 'deny',
            onClick: () => handleAction('deny'),
          },
        ],
      };
      setMessages(prev => [...prev, response]);
    }, 1000);
  };

  const handleAction = (action: string) => {
    toast({
      title: `Action: ${action}`,
      description: "Command actions will be functional in Phase 2",
    });
  };

  return (
    <div className={cn(
      "h-full flex flex-col transition-all",
      isFocused ? "border-primary/50" : "opacity-70"
    )}>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Command Chat</CardTitle>
          {hasUnread && !isFocused && (
            <span className="h-2 w-2 bg-destructive rounded-full animate-pulse" />
          )}
        </div>
        <div className="mt-2">
          <ActiveVTIDChip />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col p-4">
        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "p-3 rounded-lg",
                message.type === 'user' && "bg-primary/10 ml-auto max-w-[80%]",
                message.type === 'system' && "bg-muted",
                message.type === 'assistant' && "bg-accent"
              )}
            >
              <p className="text-sm">{message.content}</p>
              {message.actions && message.actions.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {message.actions.map((action) => (
                    <Button
                      key={action.id}
                      size="sm"
                      variant={action.type === 'approve' ? 'default' : 'outline'}
                      onClick={action.onClick}
                    >
                      {action.type === 'approve' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {action.type === 'deny' && <XCircle className="h-3 w-3 mr-1" />}
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a command..."
            className="flex-1"
          />
          <Button size="icon" onClick={handleSend}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </div>
  );
}
