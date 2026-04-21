import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/context/ProfileProvider";
import { AccountInfo } from "@/types/profile";

interface AccountEditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormState = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  city: string;
};

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  maritalStatus: "",
  email: "",
  phone: "",
  address: "",
  country: "",
  city: "",
};

const GENDER_OPTIONS = ["Female", "Male", "Non-binary", "Prefer not to say"];
const MARITAL_OPTIONS = [
  "Single",
  "In a relationship",
  "Married",
  "Partnered",
  "Separated",
  "Divorced",
  "Widowed",
  "Prefer not to say",
];

export function AccountEditDrawer({ open, onOpenChange }: AccountEditDrawerProps) {
  const { profile, updateAccount } = useProfile();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const a = profile.account;
    setForm({
      firstName: a?.firstName ?? "",
      lastName: a?.lastName ?? "",
      dateOfBirth: a?.dateOfBirth ?? "",
      gender: a?.gender ?? "",
      maritalStatus: a?.maritalStatus ?? "",
      email: a?.email ?? profile.email ?? "",
      phone: a?.phone ?? profile.phone ?? "",
      address: a?.address ?? "",
      country: a?.country ?? "",
      city: a?.city ?? "",
    });
  }, [open, profile]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    try {
      setSaving(true);
      const patch: Partial<AccountInfo> = {
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        maritalStatus: form.maritalStatus || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        country: form.country.trim() || undefined,
        city: form.city.trim() || undefined,
      };
      await updateAccount(patch);
      toast({
        title: "Account updated",
        description: "Your personal details have been saved.",
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Could not save",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit account details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Section title="Basic Personal Information">
            <Field label="First name">
              <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
            </Field>
            <Field label="Last name">
              <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
            </Field>
            <Field label="Date of birth">
              <Input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => set("dateOfBirth", e.target.value)}
              />
            </Field>
            <Field label="Gender">
              <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Marital status">
              <Select value={form.maritalStatus} onValueChange={(v) => set("maritalStatus", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {MARITAL_OPTIONS.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </Section>

          <Section title="Contact Information">
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Address">
              <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <Field label="Country">
              <Input value={form.country} onChange={(e) => set("country", e.target.value)} />
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
          </Section>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-3">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
