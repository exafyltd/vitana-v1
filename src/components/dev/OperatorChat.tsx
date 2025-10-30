import { useEffect, useRef, useState } from "react";
import { useCommandHub } from "@/state/commandHubStore";
import { fetchThread, postChat } from "@/lib/commandHubApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function OperatorChat() {
  const { activeVTID, threads, upsertThread, appendChat, setActiveVTID } = useCommandHub();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load thread when VTID changes
  useEffect(() => {
    if (!activeVTID || threads[activeVTID]) return;
    
    fetchThread(activeVTID)
      .then(upsertThread)
      .catch(() => {
        // Silent if no history - will be created on first message
      });
  }, [activeVTID, threads, upsertThread]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [threads, activeVTID]);

  async function send() {
    const msg = input.trim();
    if (!msg || sending) return;
    
    setInput("");
    setSending(true);
    
    try {
      const vtid = activeVTID;
      
      // Optimistic append user bubble
      if (vtid) {
        appendChat(vtid, { 
          role: "user", 
          ts: new Date().toISOString(), 
          text: msg 
        });
      }
      
      const res = await postChat({ 
        message: msg, 
        vtid: vtid || undefined 
      });
      
      const useVTID = vtid ?? res.vtid;
      
      // If new VTID created, set it globally
      if (!vtid && res.vtid) {
        setActiveVTID(res.vtid);
      }
      
      // Operator reply
      appendChat(useVTID, { 
        role: "operator", 
        ts: new Date().toISOString(), 
        text: res.reply 
      });
      
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send message";
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
      
      // Remove optimistic message on error
      if (activeVTID && threads[activeVTID]) {
        const items = threads[activeVTID].items.slice(0, -1);
        upsertThread({ vtid: activeVTID, items });
      }
    } finally {
      setSending(false);
    }
  }

  const items = activeVTID ? (threads[activeVTID]?.items ?? []) : [];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="font-semibold">OASIS Operator</div>
        <Badge variant={activeVTID ? "default" : "secondary"}>
          {activeVTID ? `VTID: ${activeVTID}` : "No VTID"}
        </Badge>
      </div>
      
      <div 
        ref={boxRef} 
        className="flex-1 overflow-auto p-3 space-y-2" 
        aria-live="polite"
      >
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p>No conversation yet</p>
              <p className="text-sm">
                {activeVTID 
                  ? "Start chatting with the Operator" 
                  : "Send a message to create a new VTID"}
              </p>
            </div>
          </div>
        ) : (
          items.map((m, i) => (
            <div 
              key={i} 
              className={`max-w-[80%] ${m.role === "user" ? "ml-auto text-right" : "mr-auto"}`}
            >
              <div 
                className={`rounded-2xl px-3 py-2 shadow ${
                  m.role === "user" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-card"
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{m.text}</div>
                <div className="text-[10px] opacity-70 mt-1">
                  {new Date(m.ts).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="p-3 border-t flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Type a command… (/task …, /status VTID-…)"
          disabled={sending}
          className="flex-1"
        />
        <Button onClick={send} disabled={sending || !input.trim()}>
          {sending ? "Sending..." : "Send"}
        </Button>
      </div>
    </div>
  );
}
