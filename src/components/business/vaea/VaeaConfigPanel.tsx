import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useVaeaConfig, type AutonomyMode, type VaeaConfig } from "@/hooks/useVaea";

export function VaeaConfigPanel() {
  const { config, loading, error, update } = useVaeaConfig();
  const [saving, setSaving] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-destructive/10 border-destructive/20">
        <CardContent className="py-4">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const c = config;

  const setField = async <K extends keyof VaeaConfig>(key: K, value: VaeaConfig[K]) => {
    setSaving(key as string);
    try {
      await update({ [key]: value } as Partial<VaeaConfig>);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Your three switches</CardTitle>
          <CardDescription>
            These decide what VAEA can do on your behalf. Flip any of them any time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SwitchRow
            title="Receive recommendations"
            description="VAEA can query peers when you ask questions."
            checked={c?.receive_recommendations ?? true}
            onChange={(v) => setField("receive_recommendations", v)}
            saving={saving === "receive_recommendations"}
          />
          <SwitchRow
            title="Give recommendations (earn)"
            description="Your VAEA may offer your catalog to other members. Off by default — opt in when you're ready."
            checked={c?.give_recommendations ?? false}
            onChange={(v) => setField("give_recommendations", v)}
            saving={saving === "give_recommendations"}
          />
          <SwitchRow
            title="Goal: make money"
            description="Promotes earn from propose-and-approve to autonomous. Only flip this when you trust your catalog and disclosure."
            checked={c?.make_money_goal ?? false}
            onChange={(v) => setField("make_money_goal", v)}
            saving={saving === "make_money_goal"}
            disabled={!c?.give_recommendations}
            disabledHint="Turn on 'Give recommendations' first."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Autonomy & voice</CardTitle>
          <CardDescription>How VAEA phrases replies when it does draft one.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default autonomy</Label>
            <Select
              value={c?.autonomy_default ?? "draft_to_user"}
              onValueChange={(v) => setField("autonomy_default", v as AutonomyMode)}
              disabled={saving === "autonomy_default"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="silent">Silent — log only</SelectItem>
                <SelectItem value="draft_to_user">Draft to me (default)</SelectItem>
                <SelectItem value="one_tap_approve">One-tap approve</SelectItem>
                <SelectItem value="auto_post">Auto-post</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Each listener channel can override this. One-tap and auto-post aren't active yet — coming in a later phase.
            </p>
          </div>

          <DisclosureField
            value={c?.disclosure_text ?? ""}
            saving={saving === "disclosure_text"}
            onSave={(v) => setField("disclosure_text", v)}
          />

          <ExpertiseField
            zones={c?.expertise_zones ?? []}
            saving={saving === "expertise_zones"}
            onSave={(v) => setField("expertise_zones", v)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function SwitchRow({
  title, description, checked, onChange, saving, disabled, disabledHint,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  saving?: boolean;
  disabled?: boolean;
  disabledHint?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-1">
      <div className="flex-1">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {disabled ? disabledHint || description : description}
        </div>
      </div>
      <div className="flex items-center gap-2 pt-0.5">
        {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <Switch checked={checked} onCheckedChange={onChange} disabled={disabled || saving} />
      </div>
    </div>
  );
}

function DisclosureField({ value, onSave, saving }: { value: string; onSave: (v: string) => void; saving?: boolean }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  const dirty = draft !== value;
  return (
    <div className="space-y-2">
      <Label>Disclosure text</Label>
      <Input className="h-11" value={draft} onChange={(e) => setDraft(e.target.value)} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">Appended to every draft with an affiliate link.</p>
        {dirty && (
          <Button
            type="button"
            size="sm"
            className="h-10 w-full sm:w-auto"
            disabled={saving}
            onClick={() => onSave(draft)}
          >
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Save
          </Button>
        )}
      </div>
    </div>
  );
}

function ExpertiseField({ zones, onSave, saving }: { zones: string[]; onSave: (v: string[]) => void; saving?: boolean }) {
  const [draft, setDraft] = useState(zones.join(", "));
  useEffect(() => { setDraft(zones.join(", ")); }, [zones]);
  const current = zones.join(", ");
  const dirty = draft !== current;
  return (
    <div className="space-y-2">
      <Label>Expertise zones</Label>
      <Input
        className="h-11"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="e.g. longevity, sleep, supplements"
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">Comma-separated. Messages outside these topics get lower match scores.</p>
        {dirty && (
          <Button
            type="button"
            size="sm"
            className="h-10 w-full sm:w-auto"
            disabled={saving}
            onClick={() => onSave(draft.split(",").map((s) => s.trim()).filter(Boolean))}
          >
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Save
          </Button>
        )}
      </div>
    </div>
  );
}
