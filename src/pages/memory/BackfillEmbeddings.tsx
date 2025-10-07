import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Zap } from "lucide-react";
import AppLayout from "@/components/AppLayout";

export default function BackfillEmbeddings() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{ processed: number; failed: number; total: number } | null>(null);
  const { toast } = useToast();

  const runBackfill = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('backfill-memory-embeddings');

      if (error) throw error;

      setResult(data);
      toast({
        title: "Backfill Complete",
        description: `Processed ${data.processed} memories, ${data.failed} failed out of ${data.total} total.`,
      });
    } catch (error) {
      toast({
        title: "Backfill Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <AppLayout>
      <div className="container max-w-2xl py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Backfill Memory Embeddings
            </CardTitle>
            <CardDescription>
              Generate embeddings for existing memories that don't have them yet.
              This enables semantic search and AI-powered insights.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={runBackfill} 
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Run Backfill
                </>
              )}
            </Button>

            {result && (
              <div className="p-4 rounded-lg bg-muted">
                <h3 className="font-semibold mb-2">Results:</h3>
                <ul className="space-y-1 text-sm">
                  <li>Total memories: {result.total}</li>
                  <li className="text-green-600">Successfully processed: {result.processed}</li>
                  {result.failed > 0 && (
                    <li className="text-destructive">Failed: {result.failed}</li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
