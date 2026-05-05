import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { useProfile } from "@/context/ProfileProvider";
import { AccountInfo } from "@/types/profile";
import { cn } from "@/lib/utils";
import { AvatarUploadField } from "@/components/profile/editor/AvatarUploadField";
import { notify, notifyError } from '@/lib/i18n-toast';

interface AccountEditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FormState = {
  // Public profile
  handle: string;
  longevityArchetype: string;
  avatarUrl: string;
  avatarOffsetX: number;
  avatarOffsetY: number;
  // Basic personal info
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  // Contact
  email: string;
  phone: string;
  address: string;
  country: string;
  city: string;
};

const EMPTY_FORM: FormState = {
  handle: "",
  longevityArchetype: "",
  avatarUrl: "",
  avatarOffsetX: 50,
  avatarOffsetY: 50,
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
      handle: a?.handle ?? profile.handle ?? "",
      longevityArchetype: a?.longevityArchetype ?? profile.longevityArchetype ?? "",
      avatarUrl: a?.avatarUrl ?? profile.avatar ?? "",
      avatarOffsetX: a?.avatarOffsetX ?? profile.avatarOffsetX ?? 50,
      avatarOffsetY: a?.avatarOffsetY ?? profile.avatarOffsetY ?? 50,
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
        // Public profile — moved from Identity drawer
        handle: form.handle.trim() || undefined,
        longevityArchetype: form.longevityArchetype.trim() || undefined,
        avatarUrl: form.avatarUrl.trim() || undefined,
        avatarOffsetX: form.avatarOffsetX,
        avatarOffsetY: form.avatarOffsetY,
        // Basic personal info
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        maritalStatus: form.maritalStatus || undefined,
        // Contact
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        country: form.country.trim() || undefined,
        city: form.city.trim() || undefined,
      };
      await updateAccount(patch);
      notify('toasts.profile.accountUpdated', 'toasts.profile.yourPersonalDetailsHaveSaved');
      onOpenChange(false);
    } catch (error: any) {
      notifyError('toasts.profile.couldNotSave');
    } finally {
      setSaving(false);
    }
  };

  const initials =
    [form.firstName, form.lastName]
      .filter(Boolean)
      .map((n) => n[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "U";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit account details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Section title="Public profile">
            <Field label="Profile picture">
              <AvatarUploadField
                value={{
                  url: form.avatarUrl,
                  offsetX: form.avatarOffsetX,
                  offsetY: form.avatarOffsetY,
                }}
                onChange={(next) =>
                  setForm((prev) => ({
                    ...prev,
                    avatarUrl: next.url,
                    avatarOffsetX: next.offsetX,
                    avatarOffsetY: next.offsetY,
                  }))
                }
                fallbackInitials={initials}
              />
            </Field>
            <Field label="Handle">
              <div className="flex items-center">
                <span className="text-muted-foreground mr-2">@</span>
                <Input
                  value={form.handle}
                  onChange={(e) =>
                    set(
                      "handle",
                      e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                    )
                  }
                  placeholder="your_handle"
                  className="flex-1"
                />
              </div>
              {form.handle && (
                <p className="text-xs text-muted-foreground mt-1">
                  Public URL: /u/{form.handle}
                </p>
              )}
            </Field>
            <Field label="Longevity archetype">
              <Input
                value={form.longevityArchetype}
                onChange={(e) => set("longevityArchetype", e.target.value)}
                placeholder="e.g. The Mindful Mover"
              />
            </Field>
          </Section>

          <Section title="Basic Personal Information">
            <Field label="First name">
              <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
            </Field>
            <Field label="Last name">
              <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
            </Field>
            <Field label="Date of birth">
              <DateOfBirthPicker
                value={form.dateOfBirth}
                onChange={(v) => set("dateOfBirth", v)}
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

// DOB-specific picker: react-day-picker with year + month dropdowns so users
// born decades ago don't have to tap the month-back arrow 400 times.
function DateOfBirthPicker({
  value,
  onChange,
}: {
  value: string;          // ISO yyyy-mm-dd, may be ""
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const parsed = useMemo(() => {
    if (!value) return undefined;
    try {
      const d = parseISO(value);
      return isNaN(d.getTime()) ? undefined : d;
    } catch {
      return undefined;
    }
  }, [value]);

  const today = new Date();
  const currentYear = today.getFullYear();
  // Default the calendar view to a sensible era for adults (~35 years ago)
  // so the year dropdown lands somewhere useful on first open.
  const defaultMonth = parsed ?? new Date(currentYear - 35, 0, 1);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !parsed && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {parsed ? format(parsed, "PPP") : "Select birth date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={parsed}
          onSelect={(d) => {
            if (d) {
              onChange(format(d, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
          defaultMonth={defaultMonth}
          captionLayout="dropdown-buttons"
          fromYear={1900}
          toYear={currentYear}
          disabled={{ after: today }}
          initialFocus
          classNames={{
            caption: "flex justify-center pt-1 relative items-center gap-2",
            caption_label: "hidden",
            caption_dropdowns: "flex gap-1",
            dropdown:
              "text-sm bg-background border rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-ring",
            vhidden: "sr-only",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
