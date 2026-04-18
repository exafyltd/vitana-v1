import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Radio } from "lucide-react";
import { useVaeaSummary } from "@/hooks/useVaea";

export function VaeaDetectionsCard() {
  const { data, loading, error } = useVaeaSummary();

  return (
    <Card className="bg-white/70 backdrop-blur-sm border border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Radio className="w-5 h-5" />
          VAEA detections (7d)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : error ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : data ? (
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Questions scanned" value={data.counts.questions_last_7d} />
            <Stat label="Open drafts" value={data.counts.open_drafts} />
            <Stat label="Catalog items" value={data.counts.active_catalog_items} />
            <Stat label="Active channels" value={data.counts.active_channels} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
