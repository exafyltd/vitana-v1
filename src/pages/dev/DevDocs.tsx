import { useState } from "react";
import { useLocation } from "react-router-dom";
import { DevStandardHeader } from "@/components/dev/DevStandardHeader";
import { DevEmptyState } from "@/components/dev/DevEmptyState";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import SubNavigation from "@/components/SubNavigation";
import SEO from "@/components/SEO";
import { Plus, FileText, BookOpen, Layout, Users } from "lucide-react";
import { devDocsNavigation } from "@/config/dev-navigation";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { DocsOverviewView } from "@/components/dev/DocsOverviewView";
import { DocsCatalogsView } from "@/components/dev/DocsCatalogsView";
import { DocsScreenListsView } from "@/components/dev/DocsScreenListsView";
import { DocsFrontpagesView } from "@/components/dev/DocsFrontpagesView";
import { DocsRoleViewsView } from "@/components/dev/DocsRoleViewsView";
import { UploadDocumentModal } from "@/components/dev/modals/UploadDocumentModal";
import { NewCatalogEntryModal } from "@/components/dev/modals/NewCatalogEntryModal";
import { ImportScreenListModal } from "@/components/dev/modals/ImportScreenListModal";
import { UploadFrontpageModal } from "@/components/dev/modals/UploadFrontpageModal";
import { AddRoleViewModal } from "@/components/dev/modals/AddRoleViewModal";

export default function DevDocs() {
  const location = useLocation();
  const activeTab = location.pathname === "/dev/docs" 
    ? "overview" 
    : location.pathname.split("/").pop() || "overview";
  
  const [uploadDocOpen, setUploadDocOpen] = useState(false);
  const [newCatalogOpen, setNewCatalogOpen] = useState(false);
  const [importScreenOpen, setImportScreenOpen] = useState(false);
  const [uploadFrontpageOpen, setUploadFrontpageOpen] = useState(false);
  const [addRoleViewOpen, setAddRoleViewOpen] = useState(false);

  const getButtonLabel = () => {
    switch (activeTab) {
      case "overview": return "Upload Document";
      case "catalogs": return "New Catalog Entry";
      case "screen-lists": return "Import Screen List";
      case "frontpages": return "Upload Frontpage";
      case "role-views": return "Add Role View";
      default: return "Action";
    }
  };

  const handleActionClick = () => {
    switch (activeTab) {
      case "overview":
        setUploadDocOpen(true);
        break;
      case "catalogs":
        setNewCatalogOpen(true);
        break;
      case "screen-lists":
        setImportScreenOpen(true);
        break;
      case "frontpages":
        setUploadFrontpageOpen(true);
        break;
      case "role-views":
        setAddRoleViewOpen(true);
        break;
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case "catalogs": return "Browse and Manage System Catalogs";
      case "screen-lists": return "View All Screen Definitions";
      case "frontpages": return "Manage Portal Frontpage Documents";
      case "role-views": return "Configure Role-Based View Documentation";
      default: return "Vitana Documentation Center";
    }
  };

  const getDescription = () => {
    switch (activeTab) {
      case "catalogs": return "Access comprehensive catalogs of components, patterns, and system references.";
      case "screen-lists": return "Complete registry of all screens, routes, and navigation structures across Vitana.";
      case "frontpages": return "Central repository for frontpage specifications, wireframes, and design documentation.";
      case "role-views": return "Role-specific view configurations, permissions, and feature access documentation.";
      default: return "Access, browse, and manage all Vitana master documents, schemas, and catalogs.";
    }
  };

  return (
    <>
      <SEO 
        title="Vitana DEV — Docs" 
        description="Documentation hub for Vitana platform"
        canonical={window.location.href}
      />

      {/* Main Navigation */}
      <SubNavigation 
        items={devDocsNavigation}
      />

      <div className="p-6 pb-24 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* 3-Card Header */}
          <DevStandardHeader 
            title={getTitle()}
            description={getDescription()}
            emoji="📚"
          />

          {/* Utility Action Buttons */}
          <UtilityActionButton>
            <ExpandableSearchButton 
              placeholder="Search docs…"
              onSearch={(query) => console.log('Search:', query)}
            />
            <UniversalCalendarButton />
            <Button size="sm" onClick={handleActionClick}>
              <Plus className="w-4 h-4 mr-2" />
              {getButtonLabel()}
            </Button>
          </UtilityActionButton>

          {/* Content based on active tab */}
          {activeTab === "overview" && <DocsOverviewView />}
          {activeTab === "catalogs" && <DocsCatalogsView />}
          {activeTab === "screen-lists" && <DocsScreenListsView />}
          {activeTab === "frontpages" && <DocsFrontpagesView />}
          {activeTab === "role-views" && <DocsRoleViewsView />}
        </div>
      </div>

      {/* Modals */}
      <UploadDocumentModal 
        open={uploadDocOpen} 
        onOpenChange={setUploadDocOpen}
      />
      <NewCatalogEntryModal 
        open={newCatalogOpen} 
        onOpenChange={setNewCatalogOpen}
      />
      <ImportScreenListModal 
        open={importScreenOpen} 
        onOpenChange={setImportScreenOpen}
      />
      <UploadFrontpageModal 
        open={uploadFrontpageOpen} 
        onOpenChange={setUploadFrontpageOpen}
      />
      <AddRoleViewModal 
        open={addRoleViewOpen} 
        onOpenChange={setAddRoleViewOpen}
      />
    </>
  );
}
