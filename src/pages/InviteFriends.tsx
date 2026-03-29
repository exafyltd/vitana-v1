import { useState } from "react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { communityFetch } from "@/lib/community-gateway";
import { X, Loader2 } from "lucide-react";

interface Contact {
  name: string;
  email: string;
  phone: string;
}

export default function InviteFriends() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);

  const handleAdd = () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!email.trim() && !phone.trim()) {
      toast.error("Please provide email or phone");
      return;
    }
    setContacts((prev) => [...prev, { name: name.trim(), email: email.trim(), phone: phone.trim() }]);
    setName("");
    setEmail("");
    setPhone("");
  };

  const handleRemove = (idx: number) => {
    setContacts((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await communityFetch("/api/v1/automations/execute/AP-1303", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: user?.user_metadata?.tenant_id || "",
          event_payload: {
            user_id: user?.id,
            contacts,
          },
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Invites sent!");
      setContacts([]);
    } catch {
      toast.error("Failed to send invites");
    } finally {
      setSending(false);
    }
  };

  return (
    <AppLayout>
      <SEO title="Invite Friends" />
      <div className="p-6 min-h-screen bg-gradient-subtle">
        <div className={isMobile ? "" : "max-w-2xl mx-auto"}>
          <StandardHeader
            title="Invite Friends"
            description="Invite your contacts to join Vitana"
            emoji="🎯"
          />

          {/* Add contact form */}
          <Card className="mb-6">
            <CardContent className={isMobile ? "p-4 space-y-3" : "p-5 space-y-3"}>
              <div className="space-y-1.5">
                <Label htmlFor="invite-name">Name *</Label>
                <Input
                  id="invite-name"
                  placeholder="Contact name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-phone">Phone</Label>
                  <Input
                    id="invite-phone"
                    type="tel"
                    placeholder="+1 234 567 890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleAdd} className="w-full sm:w-auto">
                Add Contact
              </Button>
            </CardContent>
          </Card>

          {/* Contact list */}
          {contacts.length > 0 && (
            <div className="space-y-2 mb-6">
              {contacts.map((c, i) => (
                <Card key={i}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{c.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {[c.email, c.phone].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleRemove(i)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Button
            className="w-full"
            disabled={contacts.length === 0 || sending}
            onClick={handleSend}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Send Invites ({contacts.length})
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
