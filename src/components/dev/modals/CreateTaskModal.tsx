import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { devConfig } from "@/config/dev-config";
import { useAuth } from "@/context/AuthProvider";
import { createTask as apiCreateTask } from "@/lib/taskApi";

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateTaskModal({ open, onOpenChange, onSuccess }: CreateTaskModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title || !priority) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      title,
      priority: priority as "high" | "medium" | "low",
      owner: assignee || undefined,
      created_by: user?.id,
      created_by_name: user?.user_metadata?.full_name || user?.user_metadata?.name,
      created_by_email: user?.email,
      initiated_via: "manual" as const,
    };

    const result = await apiCreateTask(payload);

    if (result) {
      toast.success("Task created successfully");
      onOpenChange(false);
      onSuccess?.();
    } else {
      toast.error("Failed to create task");
    }

    // Reset form
    setTitle("");
    setDescription("");
    setPriority("");
    setAssignee("");
    setDueDate("");
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title *</Label>
            <Input
              id="task-title"
              placeholder="Enter task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Description *</Label>
            <Textarea
              id="task-description"
              placeholder="Describe the task..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-priority">Priority *</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="task-priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-assignee">Assignee</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger id="task-assignee">
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent-1">Agent Alpha</SelectItem>
                <SelectItem value="agent-2">Agent Beta</SelectItem>
                <SelectItem value="agent-3">Agent Gamma</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-due-date">Due Date & Time</Label>
            <Input
              id="task-due-date"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || (devConfig.readonly && true)}
            title={devConfig.readonly ? "Available in Phase 2" : ""}
          >
            {isSubmitting ? "Creating..." : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
