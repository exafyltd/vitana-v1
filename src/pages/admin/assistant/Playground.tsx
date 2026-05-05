/**
 * Assistant > Playground tab
 *
 * Simple chat interface to test the assistant with the tenant's live config.
 * Sends messages to the gateway conversation endpoint.
 */

import { useState, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import AdminTabs from "@/components/admin/AdminTabs";
import AdminHeader from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { adminFetch } from "@/lib/admin-api";
import { t } from '@/lib/i18n-toast';

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AssistantPlayground() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await adminFetch("/api/v1/conversation", {
        method: "POST",
        body: JSON.stringify({ message: text }),
      });
      const reply = res.response || res.message || res.text || JSON.stringify(res);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err: any) {
      toast.error(err.message || "Failed to get response");
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
    }
  }

  return (
    <AppLayout>
      <AdminTabs sectionKey="assistant" />
      <div className="p-6 space-y-4">
        <AdminHeader
          emoji="🧪"
          title={t('screens.admin.playground')}
          description="Test your assistant with the live tenant configuration. Messages use the same pipeline as production."
        />

        <Card>
          <CardContent className="pt-6">
            <div
              ref={scrollRef}
              className="h-80 overflow-y-auto border rounded-lg p-4 mb-4 space-y-3 bg-muted/30"
            >
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-12">{t('screens.admin.sendMessageStartTesting')}
                </p>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-card border rounded-lg px-3 py-2 text-sm text-muted-foreground">
                    {t('screens.admin.thinking')}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder={t('screens.admin.typeMessage')}
                disabled={loading}
              />
              <Button onClick={send} disabled={loading || !input.trim()}>
                {t('screens.admin.send')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">{t('screens.admin.messagesSentGatewayConversationEndpointWith')}
        </p>
      </div>
    </AppLayout>
  );
}
