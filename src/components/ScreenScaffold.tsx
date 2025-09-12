import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ReactNode } from "react";

type Props = {
  seoTitle: string;
  seoDesc?: string;
  sectionNav: any;                // e.g., sharingNavigation
  header: { title: string; description: string; emoji?: string };
  actionText: string;             // contextual ("Create Package", "Schedule Test"…)
  onAction: () => void;
  children: ReactNode;            // SplitBar + content grids
};

export default function ScreenScaffold({
  seoTitle, seoDesc,
  sectionNav, header,
  actionText, onAction,
  children
}: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 overflow-x-hidden">
      <SEO title={seoTitle} description={seoDesc || ""} />
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* rhythm owner: one column with consistent gaps */}
          <div className="space-y-6 lg:space-y-8">
            <SubNavigation items={sectionNav} />
            <StandardHeader {...header} />
            <div className="flex items-center gap-3 flex-wrap">
              <ExpandableSearchButton />
              <Button size="sm" onClick={onAction}>
                <Plus className="w-4 h-4 mr-2" />
                {actionText}
              </Button>
            </div>
            {children}
          </div>
        </div>
      </AppLayout>
    </div>
  );
}