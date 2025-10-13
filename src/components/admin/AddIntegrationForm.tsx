import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export const AddIntegrationForm = () => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    base_url: "",
    integration_type: "rest_api",
    auth_type: "none",
    auth_token: "",
    test_runner_function: "",
    test_frequency_minutes: 15,
    notes: "",
  });

  const queryClient = useQueryClient();

  const createIntegration = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: integration, error } = await supabase
        .from("api_integrations")
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return integration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-integrations"] });
      toast.success("Integration created successfully");
      setOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to create integration: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      base_url: "",
      integration_type: "rest_api",
      auth_type: "none",
      auth_token: "",
      test_runner_function: "",
      test_frequency_minutes: 15,
      notes: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createIntegration.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Integration
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New API Integration</DialogTitle>
          <DialogDescription>
            Configure a new API integration for automated testing
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Integration Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Shopify Store API"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="base_url">Base URL *</Label>
            <Input
              id="base_url"
              value={formData.base_url}
              onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
              placeholder="https://api.example.com"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="integration_type">Integration Type</Label>
              <Select
                value={formData.integration_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, integration_type: value })
                }
              >
                <SelectTrigger id="integration_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rest_api">REST API</SelectItem>
                  <SelectItem value="graphql">GraphQL</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                  <SelectItem value="soap">SOAP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="auth_type">Authentication Type</Label>
              <Select
                value={formData.auth_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, auth_type: value })
                }
              >
                <SelectTrigger id="auth_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="bearer">Bearer Token</SelectItem>
                  <SelectItem value="api_key">API Key</SelectItem>
                  <SelectItem value="oauth">OAuth</SelectItem>
                  <SelectItem value="basic">Basic Auth</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.auth_type !== "none" && (
            <div className="space-y-2">
              <Label htmlFor="auth_token">Authentication Token</Label>
              <Input
                id="auth_token"
                type="password"
                value={formData.auth_token}
                onChange={(e) =>
                  setFormData({ ...formData, auth_token: e.target.value })
                }
                placeholder="Enter your API token or key"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="test_runner_function">Custom Test Function (Optional)</Label>
              <Input
                id="test_runner_function"
                value={formData.test_runner_function}
                onChange={(e) =>
                  setFormData({ ...formData, test_runner_function: e.target.value })
                }
                placeholder="e.g., test-shopify-api"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use default test runner
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="test_frequency_minutes">Test Frequency (minutes)</Label>
              <Input
                id="test_frequency_minutes"
                type="number"
                min="5"
                value={formData.test_frequency_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    test_frequency_minutes: parseInt(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this integration..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createIntegration.isPending}>
              {createIntegration.isPending ? "Creating..." : "Create Integration"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
