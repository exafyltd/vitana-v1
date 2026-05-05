import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/context/AuthProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { useContacts } from "@/hooks/useContacts";
import useContactSync from "@/hooks/useContactSync";
import { Upload, Smartphone, Search, X, Check, Share2, Loader2, ChevronDown, Plus } from "lucide-react";
import { notifyError, notifySuccess } from '@/lib/i18n-toast';

interface LocalContact {
  name: string;
  email: string;
  phone: string;
  source?: string;
  selected: boolean;
}

function deduplicateContacts(contacts: LocalContact[]) {
  const seen = new Set<string>();
  return contacts.filter(c => {
    const key = (c.email || c.phone || c.name).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export default function InviteFriends() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addContact, inviteContact } = useContacts();
  const { syncContacts } = useContactSync();

  const [contacts, setContacts] = useState<LocalContact[]>([]);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [importingPhone, setImportingPhone] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualPhone, setManualPhone] = useState("");

  const hasContactPicker = isMobile || (typeof navigator !== "undefined" && "contacts" in navigator);

  const handleImportPhone = useCallback(async () => {
    setImportingPhone(true);
    try {
      const result = await syncContacts(["phonebook"]);
      if (result.totalImported > 0) {
        // Add imported contacts to local list for selection
        const mapped: LocalContact[] = [
          ...result.matches.map(m => ({
            name: m.platformUser.display_name || m.localContact.name,
            email: m.localContact.email || "",
            phone: m.localContact.phone || "",
            source: "phone",
            selected: true,
          })),
          ...result.nonMatches.map(c => ({
            name: c.name,
            email: c.email || "",
            phone: c.phone || "",
            source: "phone",
            selected: true,
          })),
        ];
        setContacts(prev => deduplicateContacts([...prev, ...mapped]));
        toast.success(`${result.totalImported} contacts imported`);
      }
    } catch (e) {
      const msg = (e as Error).message;
      if (msg !== "Contact selection cancelled") {
        toast.error(msg || "Could not access contacts");
      }
    } finally {
      setImportingPhone(false);
    }
  }, [syncContacts]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const text = reader.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      const startIdx = lines[0]?.toLowerCase().includes("name") ? 1 : 0;
      const parsed: LocalContact[] = lines.slice(startIdx).map(line => {
        const parts = line.split(",").map(s => s.trim().replace(/^"|"$/g, ""));
        return {
          name: parts[0] || "Unknown",
          email: parts[1] || "",
          phone: parts[2] || "",
          selected: true,
        };
      }).filter(c => c.name && c.name !== "Unknown");

      // Save each contact to Supabase
      for (const c of parsed) {
        await addContact({
          contact_name: c.name,
          contact_email: c.email || undefined,
          contact_phone: c.phone || undefined,
        });
      }

      setContacts(prev => deduplicateContacts([...prev, ...parsed]));
      toast.success(`${parsed.length} contacts imported from file`);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [addContact]);

  const handleManualAdd = useCallback(async () => {
    if (!manualName.trim()) { notifyError('toasts.invitefriends.nameRequired'); return; }
    if (!manualEmail.trim() && !manualPhone.trim()) { notifyError('toasts.invitefriends.pleaseProvideEmailPhone'); return; }

    await addContact({
      contact_name: manualName.trim(),
      contact_email: manualEmail.trim() || undefined,
      contact_phone: manualPhone.trim() || undefined,
    });

    setContacts(prev => deduplicateContacts([...prev, {
      name: manualName.trim(),
      email: manualEmail.trim(),
      phone: manualPhone.trim(),
      selected: true,
    }]));
    setManualName("");
    setManualEmail("");
    setManualPhone("");
    notifySuccess('toasts.invitefriends.contactAdded');
  }, [manualName, manualEmail, manualPhone, addContact]);

  const toggleSelect = (idx: number) => {
    setContacts(prev => prev.map((c, i) => i === idx ? { ...c, selected: !c.selected } : c));
  };

  const removeContact = (idx: number) => {
    setContacts(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleAll = () => {
    const allSelected = contacts.every(c => c.selected);
    setContacts(prev => prev.map(c => ({ ...c, selected: !allSelected })));
  };

  const selectedCount = contacts.filter(c => c.selected).length;

  const filtered = contacts.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q);
  });

  const handleSend = async () => {
    if (!user?.id) return;
    setSending(true);
    try {
      const selected = contacts.filter(c => c.selected);
      let sentCount = 0;
      
      for (const c of selected) {
        // Save contact if not already saved, then mark as invited
        const result = await addContact({
          contact_name: c.name,
          contact_email: c.email || undefined,
          contact_phone: c.phone || undefined,
        });
        if (result?.id) {
          const channel = c.email ? 'email' : 'sms';
          await inviteContact(result.id, channel);
          sentCount++;
        }
      }
      
      if (sentCount > 0) {
        toast.success(`${sentCount} invites sent!`);
        setContacts([]);
      } else {
        notifyError('toasts.invitefriends.failedSendInvites');
      }
    } catch {
      notifyError('toasts.invitefriends.failedSendInvites');
    } finally {
      setSending(false);
    }
  };

  return (
    <AppLayout>
      <SEO title="Invite Friends" />
      <div className={`min-h-screen bg-gradient-subtle ${isMobile ? "p-4 pb-24" : "p-6"}`}>
        <div className={isMobile ? "" : "max-w-3xl mx-auto"}>
          <StandardHeader
            title="Invite Friends"
            description="Import your contacts and invite them to Vitana"
            emoji="🎯"
          />

          {/* Import Methods */}
          <div className={`grid gap-3 mb-6 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
            {/* Phone Contacts */}
            {hasContactPicker && (
              <Card>
                <CardHeader className="pb-2 p-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Smartphone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">Phone Contacts</CardTitle>
                      <CardDescription className="text-xs">Import from your phone</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {"contacts" in navigator ? (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={handleImportPhone}
                      disabled={importingPhone}
                    >
                      {importingPhone ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Smartphone className="w-4 h-4 mr-1" />}
                      Import Contacts
                    </Button>
                  ) : (
                    <Button size="sm" className="w-full" disabled>
                      Not available in this browser
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Upload CSV */}
            <Card>
              <CardHeader className="pb-2 p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Upload CSV</CardTitle>
                    <CardDescription className="text-xs">Upload a contacts file</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.vcf"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Choose File
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Contact List */}
          {contacts.length > 0 && (
            <Card className="mb-6">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{contacts.length} contacts</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {selectedCount} selected
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={toggleAll}>
                    {contacts.every(c => c.selected) ? (
                      <><X className="w-3 h-3 mr-1" /> Deselect All</>
                    ) : (
                      <><Check className="w-3 h-3 mr-1" /> Select All</>
                    )}
                  </Button>
                </div>
                <div className="relative mt-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search contacts..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className={isMobile ? "h-[40vh]" : "h-[50vh]"}>
                  <div className="divide-y divide-border">
                    {filtered.map((c, i) => {
                      const realIdx = contacts.indexOf(c);
                      return (
                        <div key={realIdx} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors">
                          <Checkbox
                            checked={c.selected}
                            onCheckedChange={() => toggleSelect(realIdx)}
                          />
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {getInitials(c.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {[c.email, c.phone].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          {c.source && (
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {c.source}
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 shrink-0"
                            onClick={() => removeContact(realIdx)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                    {filtered.length === 0 && search && (
                      <p className="text-sm text-muted-foreground text-center py-8">No contacts match "{search}"</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {contacts.length === 0 && (
            <Card className="mb-6">
              <CardContent className="py-12 text-center">
                <Share2 className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Import contacts using the methods above to get started
                </p>
              </CardContent>
            </Card>
          )}

          {/* Manual Add (collapsed) */}
          <Collapsible open={manualOpen} onOpenChange={setManualOpen} className="mb-6">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Or add manually
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${manualOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-2">
                <CardContent className="p-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="manual-name">Name *</Label>
                    <Input id="manual-name" placeholder="Contact name" value={manualName} onChange={e => setManualName(e.target.value)} />
                  </div>
                  <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
                    <div className="space-y-1.5">
                      <Label htmlFor="manual-email">Email</Label>
                      <Input id="manual-email" type="email" placeholder="email@example.com" value={manualEmail} onChange={e => setManualEmail(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="manual-phone">Phone</Label>
                      <Input id="manual-phone" type="tel" placeholder="+1 234 567 890" value={manualPhone} onChange={e => setManualPhone(e.target.value)} />
                    </div>
                  </div>
                  <Button onClick={handleManualAdd} size="sm">
                    <Plus className="w-4 h-4 mr-1" /> Add Contact
                  </Button>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Send Button - Desktop */}
          {!isMobile && (
            <Button
              className="w-full"
              disabled={selectedCount === 0 || sending}
              onClick={handleSend}
            >
              {sending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              <Share2 className="w-4 h-4 mr-2" />
              Send Invites ({selectedCount})
            </Button>
          )}
        </div>
      </div>

      {/* Send Button - Mobile sticky */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-40">
          <Button
            className="w-full"
            disabled={selectedCount === 0 || sending}
            onClick={handleSend}
          >
            {sending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            <Share2 className="w-4 h-4 mr-2" />
            Send Invites ({selectedCount})
          </Button>
        </div>
      )}
    </AppLayout>
  );
}