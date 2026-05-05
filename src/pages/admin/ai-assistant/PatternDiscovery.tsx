import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { adminAIAssistantNavigation } from "@/config/navigation";
import { usePatternDiscovery } from "@/hooks/usePatternDiscovery";
import PatternCard from "@/components/admin/patterns/PatternCard";
import PatternDetails from "@/components/admin/patterns/PatternDetails";
import { t } from '@/lib/i18n-toast';

export default function PatternDiscovery() {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPattern, setSelectedPattern] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const {
    patterns,
    isLoading,
    runAnalysis,
    reviewPattern,
    implementPattern,
    dismissPattern,
  } = usePatternDiscovery({
    type: typeFilter === "all" ? undefined : typeFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const handleViewDetails = (pattern: any) => {
    setSelectedPattern(pattern);
    setDetailsOpen(true);
  };

  const handleReview = async (patternId: string) => {
    await reviewPattern.mutateAsync({ id: patternId });
  };

  const handleCreateAutomation = (pattern: any) => {
    navigate(`/admin/ai-assistant/builder?patternId=${pattern.id}`);
  };

  const handleDismiss = async (patternId: string) => {
    await dismissPattern.mutateAsync({ id: patternId, reason: "Not relevant" });
  };

  return (
    <AppLayout>
      <SEO 
        title={t('screens.admin.patternDiscoveryAiAssistantAdmin')} 
        description="AI-discovered behavioral patterns and opportunities" 
        canonical={window.location.href} 
      />
      <SubNavigation items={adminAIAssistantNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <AdminHeader
            title={t('screens.admin.patternDiscovery')}
            description="AI-discovered behavioral patterns and automation opportunities"
            emoji="📊"
          />

          {/* Analysis Controls */}
          <Card>
            <CardHeader>
              <CardTitle>{t('screens.admin.discoverNewPatterns')}</CardTitle>
              <CardDescription>
                {t('screens.admin.analyzeSystemDataAutomaticallyDiscoverRecurring')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => runAnalysis.mutate()}
                disabled={runAnalysis.isPending}
                size="lg"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                {runAnalysis.isPending ? "Analyzing..." : "Analyze for Patterns"}
              </Button>
              {patterns && patterns.length > 0 && (
                <p className="text-sm text-muted-foreground mt-4">
                  Last analysis discovered {patterns.length} patterns
                </p>
              )}
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('screens.admin.discoveredPatterns')}</CardTitle>
                  <CardDescription>
                    {patterns?.length || 0} patterns discovered
                  </CardDescription>
                </div>
                <Filter className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('screens.admin.filterByType')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('screens.admin.allTypes')}</SelectItem>
                      <SelectItem value="user_behavior">{t('screens.admin.userBehavior')}</SelectItem>
                      <SelectItem value="temporal">{t('screens.admin.temporal')}</SelectItem>
                      <SelectItem value="communication">{t('screens.admin.communication')}</SelectItem>
                      <SelectItem value="workflow">{t('screens.admin.workflow')}</SelectItem>
                      <SelectItem value="health_metric">{t('screens.admin.healthMetric')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('screens.admin.filterByStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('screens.admin.allStatuses')}</SelectItem>
                      <SelectItem value="discovered">{t('screens.admin.discovered')}</SelectItem>
                      <SelectItem value="reviewed">{t('screens.admin.reviewed')}</SelectItem>
                      <SelectItem value="implemented">{t('screens.admin.implemented')}</SelectItem>
                      <SelectItem value="dismissed">{t('screens.admin.dismissed')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pattern List */}
          {isLoading ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  {t('screens.admin.loadingPatterns')}
                </div>
              </CardContent>
            </Card>
          ) : patterns && patterns.length > 0 ? (
            <div className="grid gap-6">
              {patterns.map((pattern) => (
                <PatternCard
                  key={pattern.id}
                  pattern={pattern}
                  onViewDetails={() => handleViewDetails(pattern)}
                  onReview={() => handleReview(pattern.id)}
                  onCreateAutomation={() => handleCreateAutomation(pattern)}
                  onDismiss={() => handleDismiss(pattern.id)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <Sparkles className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium">{t('screens.admin.noPatternsDiscoveredYet')}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {t('screens.admin.clickAnalyzeForPatternsStartDiscovering')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Pattern Details Dialog */}
      <PatternDetails
        pattern={selectedPattern}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </AppLayout>
  );
}
