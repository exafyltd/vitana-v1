import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet";
import { CheckCircle, XCircle, Clock, ArrowLeft, Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";

export default function IntegrationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: integration, isLoading: loadingIntegration } = useQuery({
    queryKey: ["api-integration", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_integrations")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: logs, isLoading: loadingLogs } = useQuery({
    queryKey: ["api-test-logs", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_test_logs")
        .select("*")
        .eq("integration_id", id)
        .order("timestamp", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "fail":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "timeout":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500">Success</Badge>;
      case "fail":
        return <Badge variant="destructive">Failed</Badge>;
      case "timeout":
        return <Badge variant="secondary">Timeout</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const adminIntegrationsNavigation = [
    { id: "overview", name: "API Integrations", path: "/admin/integrations" },
    { id: "detail", name: integration?.name || "Loading...", path: `/admin/integrations/${id}` },
  ];

  return (
    <AppLayout>
      <Helmet>
        <title>{integration?.name || "Integration"} | API Integrations | Admin | VITANA</title>
      </Helmet>

      <SubNavigation items={adminIntegrationsNavigation} />

      <div className="container mx-auto p-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/integrations")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Integrations
        </Button>

        {loadingIntegration ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">{integration?.name}</h1>
              <p className="text-muted-foreground">{integration?.notes}</p>
            </div>

            <div className="grid gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Integration Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base URL:</span>
                    <span className="font-mono text-sm">{integration?.base_url}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span>{integration?.integration_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Auth Type:</span>
                    <span>{integration?.auth_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Test Frequency:</span>
                    <span>Every {integration?.test_frequency_minutes} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span>{integration?.is_active ? "Active" : "Inactive"}</span>
                  </div>
                  {integration?.test_runner_function && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Custom Test Runner:</span>
                      <span className="font-mono text-sm">{integration.test_runner_function}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Test History</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingLogs ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : logs && logs.length > 0 ? (
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {getStatusIcon(log.status)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {new Date(log.timestamp).toLocaleString()}
                              </p>
                              {getStatusBadge(log.status)}
                            </div>
                            {log.error_log && (
                              <p className="text-sm text-red-500 mt-1">{log.error_log}</p>
                            )}
                            {log.response_body && typeof log.response_body === 'object' && (
                              <details className="mt-2">
                                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                                  View Response Data
                                </summary>
                                <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-x-auto">
                                  {JSON.stringify(log.response_body, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {log.response_time_ms ? `${log.response_time_ms}ms` : 'N/A'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No test logs available yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
