import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Copy, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface APITesterProps {
  integrationId?: string;
  baseUrl?: string;
  authType?: string;
}

export default function APITester({ integrationId, baseUrl = "", authType = "bearer" }: APITesterProps) {
  const { toast } = useToast();
  const [method, setMethod] = useState<string>("GET");
  const [endpoint, setEndpoint] = useState("");
  const [headers, setHeaders] = useState("{\n  \"Content-Type\": \"application/json\"\n}");
  const [body, setBody] = useState("{}");
  const [queryParams, setQueryParams] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [responseTime, setResponseTime] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    setResponse(null);
    const startTime = performance.now();

    try {
      // Parse headers
      let parsedHeaders = {};
      try {
        parsedHeaders = JSON.parse(headers);
      } catch (e) {
        notifyError('toasts.admin.invalidHeaders', 'toasts.admin.headersMustValidJson');
        setLoading(false);
        return;
      }

      // Build URL
      let url = baseUrl + endpoint;
      if (queryParams) {
        url += `?${queryParams}`;
      }

      // Make request
      const fetchOptions: RequestInit = {
        method,
        headers: parsedHeaders as HeadersInit,
      };

      if (method !== "GET" && body) {
        try {
          fetchOptions.body = JSON.stringify(JSON.parse(body));
        } catch (e) {
          notifyError('toasts.admin.invalidRequestBody', 'toasts.admin.bodyMustValidJson');
          setLoading(false);
          return;
        }
      }

      const res = await fetch(url, fetchOptions);
      const endTime = performance.now();
      setResponseTime(Math.round(endTime - startTime));

      const contentType = res.headers.get("content-type");
      let responseData;

      if (contentType?.includes("application/json")) {
        responseData = await res.json();
      } else {
        responseData = await res.text();
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        data: responseData
      });

      // Log test result if integration ID is provided
      if (integrationId) {
        await supabase.from("api_test_logs").insert({
          integration_id: integrationId,
          status: res.ok ? "success" : "failed",
          response_time_ms: Math.round(endTime - startTime),
          test_type: "manual",
          response_body: { data: responseData },
          metadata: { method, endpoint, url }
        });
      }

      toast({
        title: res.ok ? "Request successful" : "Request failed",
        description: `Status: ${res.status} | Time: ${Math.round(endTime - startTime)}ms`
      });

    } catch (error: any) {
      const endTime = performance.now();
      setResponseTime(Math.round(endTime - startTime));
      
      setResponse({
        error: true,
        message: error.message,
        stack: error.stack
      });

      notifyError('toasts.admin.requestFailed');

      // Log error
      if (integrationId) {
        await supabase.from("api_test_logs").insert({
          integration_id: integrationId,
          status: "failed",
          error_log: error.message,
          test_type: "manual"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const copyResponse = () => {
    navigator.clipboard.writeText(JSON.stringify(response, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    notify('toasts.admin.copied', 'toasts.admin.responseCopiedClipboard');
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "bg-green-500";
    if (status >= 300 && status < 400) return "bg-blue-500";
    if (status >= 400 && status < 500) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlayCircle className="w-5 h-5" />
          {t('screens.admin.apiTester')}
        </CardTitle>
        <CardDescription>
          {t('screens.admin.testApiEndpointsViewResponsesRealtime')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Request Configuration */}
        <div className="space-y-4">
          {/* Method and Endpoint */}
          <div className="flex gap-2">
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">{t('screens.admin.get')}</SelectItem>
                <SelectItem value="POST">{t('screens.admin.post')}</SelectItem>
                <SelectItem value="PUT">{t('screens.admin.put')}</SelectItem>
                <SelectItem value="PATCH">{t('screens.admin.patch')}</SelectItem>
                <SelectItem value="DELETE">{t('screens.admin.delete')}</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder={t('screens.admin.apiendpoint')}
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleTest} disabled={loading}>
              {loading ? "Testing..." : "Send"}
            </Button>
          </div>

          {/* Base URL Display */}
          {baseUrl && (
            <div className="text-sm text-muted-foreground">{t('screens.admin.fullUrl')} <code className="bg-muted px-2 py-1 rounded">{baseUrl}{endpoint}</code>
            </div>
          )}

          {/* Tabs for additional config */}
          <Tabs defaultValue="headers" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="headers">{t('screens.admin.headers')}</TabsTrigger>
              <TabsTrigger value="body">{t('screens.admin.body')}</TabsTrigger>
              <TabsTrigger value="params">{t('screens.admin.queryParams')}</TabsTrigger>
            </TabsList>

            <TabsContent value="headers" className="space-y-2">
              <Label>{t('screens.admin.requestHeadersJson')}</Label>
              <Textarea
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                className="font-mono text-sm"
                rows={6}
              />
            </TabsContent>

            <TabsContent value="body" className="space-y-2">
              <Label>{t('screens.admin.requestBodyJson')}</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="font-mono text-sm"
                rows={6}
                disabled={method === "GET"}
              />
            </TabsContent>

            <TabsContent value="params" className="space-y-2">
              <Label>{t('screens.admin.queryParameters')}</Label>
              <Input
                placeholder={t('screens.admin.keyValueAnotherValue')}
                value={queryParams}
                onChange={(e) => setQueryParams(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t('screens.admin.enterParametersUrlFormatKeyValue')}
              </p>
            </TabsContent>
          </Tabs>
        </div>

        {/* Response Display */}
        {response && (
          <div className="space-y-3 mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t('screens.admin.response')}</span>
                {response.status && (
                  <Badge className={getStatusColor(response.status)}>
                    {response.status} {response.statusText}
                  </Badge>
                )}
                {responseTime > 0 && (
                  <Badge variant="outline">{t('screens.admin.responsetimeMs', { responseTime })}</Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={copyResponse}>
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            {response.error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">{response.message}</p>
                    {response.stack && (
                      <pre className="text-xs text-red-700 mt-2 overflow-x-auto">
                        {response.stack}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-muted rounded-lg p-4 max-h-96 overflow-auto">
                <pre className="text-xs font-mono">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
