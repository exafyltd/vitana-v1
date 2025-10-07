import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Download,
  BarChart3,
  Search,
  CheckSquare,
  Archive,
  FolderOpen,
  Shield,
  Clock,
  Trash2
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ViewStatisticsDialog } from "./ViewStatisticsDialog";
import { AdvancedSearchDialog } from "./AdvancedSearchDialog";
import { BulkActionsDialog } from "./BulkActionsDialog";
import { ArchiveSettingsDialog } from "./ArchiveSettingsDialog";
import { ManageCategoriesDialog } from "./ManageCategoriesDialog";
import { PrivacyControlsDialog } from "./PrivacyControlsDialog";

interface HistoryMasterActionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnableBulkMode?: () => void;
}

export function HistoryMasterActionPopup({ open, onOpenChange, onEnableBulkMode }: HistoryMasterActionPopupProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [categoriesDialogOpen, setCategoriesDialogOpen] = useState(false);
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);

  const handleExportHistory = async () => {
    setLoading("export");
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({
        title: "Export Complete",
        description: "Your history has been exported successfully.",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting your history.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleViewStatistics = () => {
    setStatsDialogOpen(true);
  };

  const handleAdvancedSearch = () => {
    setSearchDialogOpen(true);
  };

  const handleBulkActions = () => {
    setBulkDialogOpen(true);
  };

  const handleArchiveSettings = () => {
    setArchiveDialogOpen(true);
  };

  const handleManageCategories = () => {
    setCategoriesDialogOpen(true);
  };

  const handlePrivacyControls = () => {
    setPrivacyDialogOpen(true);
  };

  const handleClearOldHistory = async () => {
    if (!confirm("Are you sure you want to clear history older than 90 days?")) {
      return;
    }
    
    setLoading("clear-old");
    try {
      // Simulate clearing process
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "History Cleared",
        description: "Old history items have been removed.",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Clear Failed",
        description: "There was an error clearing old history.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteAllHistory = async () => {
    if (!confirm("⚠️ WARNING: This will permanently delete ALL your history. This action cannot be undone. Are you absolutely sure?")) {
      return;
    }
    
    setLoading("delete-all");
    try {
      // Simulate deletion process
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({
        title: "All History Deleted",
        description: "Your entire history has been permanently removed.",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "There was an error deleting your history.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              History Management
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Section 1: View & Analyze */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground px-2">
                View & Analyze
              </h3>
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-auto py-3"
                  onClick={handleExportHistory}
                  disabled={loading === "export"}
                >
                  <Download className="w-5 h-5 text-primary" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">Export History</div>
                    <div className="text-xs text-muted-foreground">
                      Download your activity data (CSV/JSON)
                    </div>
                  </div>
                  {loading === "export" && (
                    <span className="text-xs text-muted-foreground">Exporting...</span>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-auto py-3"
                  onClick={handleViewStatistics}
                >
                  <BarChart3 className="w-5 h-5 text-accent" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">View Statistics</div>
                    <div className="text-xs text-muted-foreground">
                      See insights, trends, and usage patterns
                    </div>
                  </div>
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-auto py-3"
                  onClick={handleAdvancedSearch}
                >
                  <Search className="w-5 h-5 text-secondary" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">Advanced Search</div>
                    <div className="text-xs text-muted-foreground">
                      Filter by date range, category, keywords
                    </div>
                  </div>
                </Button>
              </div>
            </div>

            <Separator />

            {/* Section 2: Organize & Manage */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground px-2">
                Organize & Manage
              </h3>
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-auto py-3"
                  onClick={handleBulkActions}
                >
                  <CheckSquare className="w-5 h-5 text-primary" />
                  <div className="flex-1 text-left">
                    <div className="font-medium flex items-center gap-2">
                      Bulk Actions
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                        Beta
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Select and manage multiple items at once
                    </div>
                  </div>
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-auto py-3"
                  onClick={handleArchiveSettings}
                >
                  <Archive className="w-5 h-5 text-accent" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">Archive Settings</div>
                    <div className="text-xs text-muted-foreground">
                      Configure auto-archiving for old items
                    </div>
                  </div>
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-auto py-3"
                  onClick={handleManageCategories}
                >
                  <FolderOpen className="w-5 h-5 text-secondary" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">Manage Categories</div>
                    <div className="text-xs text-muted-foreground">
                      Customize category labels and filters
                    </div>
                  </div>
                </Button>
              </div>
            </div>

            <Separator />

            {/* Section 3: Privacy & Data */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground px-2">
                Privacy & Data
              </h3>
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-auto py-3"
                  onClick={handlePrivacyControls}
                >
                  <Shield className="w-5 h-5 text-primary" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">Privacy Controls</div>
                    <div className="text-xs text-muted-foreground">
                      Manage what activities are tracked
                    </div>
                  </div>
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-auto py-3"
                  onClick={handleClearOldHistory}
                  disabled={loading === "clear-old"}
                >
                  <Clock className="w-5 h-5 text-accent" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">Clear Old History</div>
                    <div className="text-xs text-muted-foreground">
                      Remove items older than 90 days
                    </div>
                  </div>
                  {loading === "clear-old" && (
                    <span className="text-xs text-muted-foreground">Clearing...</span>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-auto py-3"
                  onClick={handleDeleteAllHistory}
                  disabled={loading === "delete-all"}
                >
                  <Trash2 className="w-5 h-5 text-destructive" />
                  <div className="flex-1 text-left">
                    <div className="font-medium flex items-center gap-2">
                      Delete All History
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">
                        Danger
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Permanently remove all stored activity data
                    </div>
                  </div>
                  {loading === "delete-all" && (
                    <span className="text-xs text-muted-foreground">Deleting...</span>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feature Dialogs */}
      <ViewStatisticsDialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen} />
      <AdvancedSearchDialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen} />
      <BulkActionsDialog 
        open={bulkDialogOpen} 
        onOpenChange={setBulkDialogOpen}
        onEnableBulkMode={() => {
          onEnableBulkMode?.();
          onOpenChange(false);
        }}
      />
      <ArchiveSettingsDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen} />
      <ManageCategoriesDialog open={categoriesDialogOpen} onOpenChange={setCategoriesDialogOpen} />
      <PrivacyControlsDialog open={privacyDialogOpen} onOpenChange={setPrivacyDialogOpen} />
    </>
  );
}
