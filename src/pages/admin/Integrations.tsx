import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
import { Play, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import SubNavigation from "@/components/SubNavigation";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";

const adminIntegrationsNavigation = [
  { id: "overview", name: "API Integrations", path: "/admin/integrations" },
];

export default function Integrations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testingId, setTestingId] = useState<string | null>(null);

  const { data: integrations, isLoading } = useQuery({
    queryKey: ["api-integrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_integrations")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  const runTestMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("run-api-tests");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Tests Complete",
        description: "All API integration tests have been executed.",
      });
      queryClient.invalidateQueries({ queryKey: ["api-integrations"] });
    },
    onError: (error) => {
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Failed to run tests",
        variant: "destructive",
      });
    },
  });

  const runSingleTestMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      setTestingId(integrationId);
      const { data, error } = await supabase.functions.invoke("run-api-tests");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Test Complete",
        description: "Integration test has been executed.",
      });
      queryClient.invalidateQueries({ queryKey: ["api-integrations"] });
      setTestingId(null);
    },
    onError: (error) => {
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Failed to run test",
        variant: "destructive",
      });
      setTestingId(null);
    },
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "success":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            OK
          </Badge>
        );
      case "fail":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
      case "timeout":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Timeout
          </Badge>
        );
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  return (
    <AppLayout>
      <Helmet>
        <title>API Integrations | Admin | VITANA</title>
      </Helmet>

      <SubNavigation items={adminIntegrationsNavigation} />

      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">API Integrations</h1>
            <p className="text-muted-foreground">
              Monitor and test all API integrations
            </p>
          </div>
          <Button 
            onClick={() => runTestMutation.mutate()}
            disabled={runTestMutation.isPending}
          >
            {runTestMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing All...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run All Tests
              </>
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : integrations && integrations.length > 0 ? (
          <div className="grid gap-4">
            {integrations.map((integration) => (
              <Card key={integration.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{integration.name}</CardTitle>
                      <CardDescription>{integration.base_url}</CardDescription>
                    </div>
                    {getStatusBadge(integration.last_test_status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Type: <span className="font-medium">{integration.integration_type}</span></p>
                      <p>Last tested: <span className="font-medium">{formatDate(integration.last_test_timestamp)}</span></p>
                      <p>Test frequency: Every {integration.test_frequency_minutes} minutes</p>
                      {integration.test_runner_function && (
                        <p>Custom runner: <span className="font-mono text-xs">{integration.test_runner_function}</span></p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => runSingleTestMutation.mutate(integration.id)}
                        disabled={testingId === integration.id || runSingleTestMutation.isPending}
                      >
                        {testingId === integration.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Run Test Now
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/admin/integrations/${integration.id}`)}
                      >
                        View Logs
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No integrations configured yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
