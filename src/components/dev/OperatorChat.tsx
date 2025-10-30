import { useEffect, useRef, useState } from "react";
import { useCommandHub } from "@/state/commandHubStore";
import { fetchThread, postChat } from "@/lib/commandHubApi";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function OperatorChat() {
  const { activeVTID, threads, upsertThread, appendChat, setActiveVTID } = useCommandHub();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load thread when VTID changes
  useEffect(() => {
    if (!activeVTID) return;
    
    if (!threads[activeVTID]) {
      fetchThread(activeVTID)
        .then(upsertThread)
        .catch(err => {
          if (err.message?.includes("404")) {
            console.log("No thread history for", activeVTID);
          } else if (err.message?.includes("401")) {
            toast({ title: "Session expired", description: "Please sign in." });
          }
        });
    }

    setTimeout(() => {
      const el = boxRef.current;
      if (el) el.scrollTop = el.scrollHeight;
      inputRef.current?.focus();
    }, 100);
  }, [activeVTID]);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [threads, activeVTID]);

  async function send() {
    const msg = input.trim();
    if (!msg || isLoading) return;
    
    setInput("");
    setIsLoading(true);

    let finalMsg = msg;
    let parsedVTID = activeVTID;
    
    if (msg.startsWith("/task ")) {
      finalMsg = msg.slice(6);
    } else if (msg.startsWith("/status ")) {
      const parts = msg.slice(8).split(" ");
      if (parts[0].startsWith("VTID-")) {
        parsedVTID = parts[0];
        finalMsg = parts.slice(1).join(" ") || "What's the status?";
      }
    }

    try {
      if (parsedVTID) {
        appendChat(parsedVTID, { role: "user", ts: new Date().toISOString(), text: msg });
      }

      const res = await postChat({ message: finalMsg, vtid: parsedVTID || undefined });
      const useVTID = parsedVTID ?? res.vtid;

      if (!parsedVTID && res.vtid) {
        setActiveVTID(res.vtid);
      }

      appendChat(useVTID, { role: "operator", ts: new Date().toISOString(), text: res.reply, links: res.links });
    } catch (err) {
      console.error("Chat error:", err);
      toast({ title: "Failed to send message", description: String(err), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  const items = activeVTID ? (threads[activeVTID]?.items ?? []) : [];
  const chatEnabled = import.meta.env.VITE_COMMAND_HUB_CHAT_ENABLED !== "false";

  if (!chatEnabled) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Chat is currently disabled</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <span className="font-semibold">OASIS Operator</span>
          <Badge variant="outline" className="text-xs">AI</Badge>
        </div>
        {activeVTID ? (
          <Badge variant="secondary" className="text-xs font-mono">{activeVTID}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">No VTID selected</span>
        )}
      </div>

      <div ref={boxRef} className="flex-1 overflow-auto p-3 space-y-3" aria-live="polite">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-sm">
                {activeVTID ? "No thread history yet" : "Select an event or start a conversation"}
              </p>
              <p className="text-xs opacity-70">Try: /task [description] or /status [VTID]</p>
            </div>
          </div>
        ) : (
          items.map((m, i) => (
            <div key={i} className={`max-w-[85%] ${m.role==="user"?"ml-auto":"mr-auto"}`}>
              <div className={`rounded-2xl px-4 py-2 shadow-sm ${
                m.role==="user"?"bg-primary text-primary-foreground":"bg-card border"
              }`}>
                <div className="text-sm whitespace-pre-wrap">{m.text}</div>
                <div className="text-[10px] mt-1 opacity-70">
                  {new Date(m.ts).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e)=>setInput(e.target.value)}
            onKeyDown={(e)=>{ if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); send(); }}}
            placeholder="Type a message or /task, /status..."
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isLoading}
          />
          <Button onClick={send} disabled={isLoading || !input.trim()}>
            {isLoading ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
