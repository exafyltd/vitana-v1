import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Server, PlayCircle, Code, FileJson, AlertCircle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { notify, notifyError } from '@/lib/i18n-toast';

interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  outputSchema?: {
    type: string;
    properties: Record<string, any>;
  };
}

interface MCPToolPanelProps {
  serverUrl: string;
  tools: MCPTool[];
  onExecuteTool?: (toolName: string, parameters: Record<string, any>) => Promise<any>;
}

export default function MCPToolPanel({ serverUrl, tools, onExecuteTool }: MCPToolPanelProps) {
  const { toast } = useToast();
  const [executing, setExecuting] = useState<string | null>(null);
  const [toolParameters, setToolParameters] = useState<Record<string, Record<string, any>>>({});
  const [toolResults, setToolResults] = useState<Record<string, any>>({});

  const handleParameterChange = (toolName: string, paramName: string, value: any) => {
    setToolParameters(prev => ({
      ...prev,
      [toolName]: {
        ...prev[toolName],
        [paramName]: value
      }
    }));
  };

  const handleExecuteTool = async (tool: MCPTool) => {
    setExecuting(tool.name);
    
    try {
      const parameters = toolParameters[tool.name] || {};
      
      // Validate required parameters
      if (tool.inputSchema.required) {
        const missing = tool.inputSchema.required.filter(
          param => !parameters[param] || parameters[param] === ""
        );
        
        if (missing.length > 0) {
          notifyError('toasts.admin.missingRequiredParameters');
          setExecuting(null);
          return;
        }
      }

      let result;
      if (onExecuteTool) {
        result = await onExecuteTool(tool.name, parameters);
      } else {
        // Default execution (can be customized)
        result = { message: "Tool execution not implemented" };
      }

      setToolResults(prev => ({
        ...prev,
        [tool.name]: result
      }));

      notify('toasts.admin.toolExecutedSuccessfully');

    } catch (error: any) {
      notifyError('toasts.admin.toolExecutionFailed');
      
      setToolResults(prev => ({
        ...prev,
        [tool.name]: { error: error.message }
      }));
    } finally {
      setExecuting(null);
    }
  };

  const renderInputField = (toolName: string, paramName: string, paramSchema: any, required: boolean) => {
    const value = toolParameters[toolName]?.[paramName] || "";
    
    return (
      <div key={paramName} className="space-y-2">
        <Label className="text-sm">
          {paramName}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {paramSchema.description && (
          <p className="text-xs text-muted-foreground">{paramSchema.description}</p>
        )}
        <Input
          type={paramSchema.type === "number" ? "number" : "text"}
          value={value}
          onChange={(e) => handleParameterChange(toolName, paramName, e.target.value)}
          placeholder={paramSchema.example || `Enter ${paramName}`}
        />
      </div>
    );
  };

  if (tools.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            MCP Tools
          </CardTitle>
          <CardDescription>No tools available for this MCP server</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Connect to an MCP server to discover available tools
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              MCP Tools
            </CardTitle>
            <CardDescription>
              {tools.length} tool{tools.length !== 1 ? 's' : ''} available on {serverUrl}
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Connected
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {tools.map((tool, index) => (
            <AccordionItem key={tool.name} value={`tool-${index}`}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <Code className="w-4 h-4 text-purple-500" />
                  <div>
                    <p className="font-medium">{tool.name}</p>
                    <p className="text-sm text-muted-foreground">{tool.description}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-4">
                  {/* Input Schema */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <FileJson className="w-4 h-4" />
                      Input Parameters
                    </h4>
                    {Object.entries(tool.inputSchema.properties).map(([paramName, paramSchema]: [string, any]) => 
                      renderInputField(
                        tool.name, 
                        paramName, 
                        paramSchema, 
                        tool.inputSchema.required?.includes(paramName) || false
                      )
                    )}
                  </div>

                  {/* Execute Button */}
                  <Button
                    onClick={() => handleExecuteTool(tool)}
                    disabled={executing === tool.name}
                    className="w-full"
                  >
                    {executing === tool.name ? (
                      "Executing..."
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Execute Tool
                      </>
                    )}
                  </Button>

                  {/* Output Schema */}
                  {tool.outputSchema && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Expected Output</h4>
                      <div className="bg-muted rounded-lg p-3">
                        <pre className="text-xs font-mono overflow-x-auto">
                          {JSON.stringify(tool.outputSchema, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Results */}
                  {toolResults[tool.name] && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Result</h4>
                      <div className={`rounded-lg p-3 ${toolResults[tool.name].error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                        <pre className="text-xs font-mono overflow-x-auto">
                          {JSON.stringify(toolResults[tool.name], null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
