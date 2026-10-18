import { useUrlTab } from "@/hooks/useUrlTab";
import React, { useState, useEffect } from 'react';
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { BiomarkersMasterActionPopup } from "@/components/BiomarkersMasterActionPopup";
import { Panel, PanelContent, PanelHeader, PanelTitle } from '@/components/layout/spotlight/Panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { HorizontalCardList } from '@/components/ui/horizontal-card-list';
import { StandardHorizontalCardProps } from '@/components/ui/standard-horizontal-card';
import { 
  FileText, 
  Upload, 
  Dna,
  TestTube,
  Pill,
  Activity,
  Filter,
  CheckCircle,
  AlertTriangle,
  TrendingDown,
  Plus,
  Building2,
  ExternalLink,
  Loader2,
  Droplets,
  FlaskConical,
  Bug,
  Heart,
  Scan,
  MoreHorizontal
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { healthNavigation } from '@/config/navigation';
import { useUserSupplements, UserSupplement } from '@/hooks/useUserSupplements';
import { useHealthLogger } from '@/hooks/useHealthLogger';
import { AddSupplementDialog } from '@/components/supplements/AddSupplementDialog';
import { SupplementCard } from '@/components/supplements/SupplementCard';
import { getAllCategories } from '@/components/supplements/supplementCategories';
import { HealthReportUploadSheet } from '@/components/health/mobile/HealthReportUploadSheet';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { notifyError, t } from '@/lib/i18n-toast';

import { formatDate } from '@/lib/locale-format';
import { ScreenFrame } from "@/components/layout/spotlight";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";
import { VCard } from "@/components/ui/vcard";
import {
  IconThumb,
  TIER_B_LIST,
  TierBEmpty,
  TierBError,
  TierBListSkeleton,
  TierBSection,
} from "@/components/spotlight/tier-b/TierBKit";
import { cardButtonProps } from "@/components/spotlight/tier-b/cardButtonProps";
import type { LucideIcon } from 'lucide-react';

// VTID-05111 — Spotlight row thumbnails per report type (labels come from the spotlightTierB shard).
const REPORT_TYPE_ICON: Record<string, LucideIcon> = {
  blood_panel: Droplets,
  genomics: Dna,
  metabolomics: FlaskConical,
  microbiome: Bug,
  allergy: AlertTriangle,
  cancer: Heart,
  hormones: FlaskConical,
  imaging: Scan,
  other: MoreHorizontal,
};
// Report type display config
const REPORT_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; badgeClass: string }> = {
  blood_panel: { label: 'Blood Panel', icon: <Droplets className="w-4 h-4" />, badgeClass: 'bg-red-500/10 text-red-600 border-red-500/20' },
  genomics: { label: 'Genomics', icon: <Dna className="w-4 h-4" />, badgeClass: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  metabolomics: { label: 'Metabolomics', icon: <FlaskConical className="w-4 h-4" />, badgeClass: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
  microbiome: { label: 'Microbiome', icon: <Bug className="w-4 h-4" />, badgeClass: 'bg-green-500/10 text-green-600 border-green-500/20' },
  allergy: { label: 'Allergy', icon: <AlertTriangle className="w-4 h-4" />, badgeClass: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  cancer: { label: 'Cancer', icon: <Heart className="w-4 h-4" />, badgeClass: 'bg-pink-500/10 text-pink-600 border-pink-500/20' },
  hormones: { label: 'Hormones', icon: <FlaskConical className="w-4 h-4" />, badgeClass: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
  imaging: { label: 'Imaging', icon: <Scan className="w-4 h-4" />, badgeClass: 'bg-sky-500/10 text-sky-600 border-sky-500/20' },
  other: { label: 'Other', icon: <MoreHorizontal className="w-4 h-4" />, badgeClass: 'bg-muted text-muted-foreground border-border' },
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'secondary' | 'outline' | 'destructive' | 'default' }> = {
  uploaded: { label: 'Uploaded', variant: 'secondary' },
  processing: { label: 'Processing', variant: 'outline' },
  parsed: { label: 'Analyzed', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },
};

export default function MyBiology() {
  const [biomarkerActionsOpen, setBiomarkerActionsOpen] = useState(false);
  const [activeTab, setActiveTab] = useUrlTab("tab", "medical");
  const [supplementDialogOpen, setSupplementDialogOpen] = useState(false);
  const [editingSupplement, setEditingSupplement] = useState<UserSupplement | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [uploadDefaultCategory, setUploadDefaultCategory] = useState<string>('blood_panel');
  
  const { toast } = useToast();
  const spotlight = useSpotlightEnabled();

  const { 
    supplements, 
    isLoading: supplementsLoading,
    createSupplement, 
    updateSupplement, 
    deleteSupplement 
  } = useUserSupplements();

  const { 
    logDeviceConnect,
    logOmicsConnectAPI
  } = useHealthLogger();

  // Fetch lab_reports (real data from DB)
  const { data: labReports = [], isLoading: reportsLoading, isError: reportsError, refetch: refetchReports } = useQuery({
    queryKey: ['lab-reports'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('lab_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching lab reports:', error);
        throw error;
      }
      return data || [];
    },
  });

  // Separate reports into medical (blood_panel, hormones, cancer, allergy) vs omics (genomics, metabolomics, microbiome)
  const medicalTypes = ['blood_panel', 'hormones', 'cancer', 'allergy', 'imaging', 'other'];
  const omicsTypes = ['genomics', 'metabolomics', 'microbiome'];

  const medicalReports = labReports.filter((r: any) => 
    !r.report_type || medicalTypes.includes(r.report_type)
  );
  const omicsReports = labReports.filter((r: any) => 
    r.report_type && omicsTypes.includes(r.report_type)
  );

  const handleViewReport = async (filePath: string | null) => {
    if (!filePath) {
      notifyError('toasts.health.noFileAvailable');
      return;
    }
    const { data, error } = await supabase.storage
      .from('health-reports')
      .createSignedUrl(filePath, 3600);
    
    if (error || !data?.signedUrl) {
      notifyError('toasts.health.couldNotLoadFile');
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const openUploadSheet = (category: string) => {
    setUploadDefaultCategory(category);
    setUploadSheetOpen(true);
  };

  // Helper to build report cards from lab_reports data
  const buildReportCards = (reports: any[]): StandardHorizontalCardProps[] => {
    return reports.map((report: any) => {
      const typeConfig = REPORT_TYPE_CONFIG[report.report_type || 'other'] || REPORT_TYPE_CONFIG.other;
      const statusConfig = STATUS_CONFIG[report.processing_status || 'uploaded'] || STATUS_CONFIG.uploaded;

      return {
        id: report.id,
        screenId: 'my-biology-reports',
        icon: typeConfig.icon,
        title: report.title || report.raw_file_ref || 'Health Report',
        description: report.provider_name || report.source || 'Unknown provider',
        badges: [
          { label: typeConfig.label, variant: 'outline' as const },
          { label: statusConfig.label, variant: statusConfig.variant },
        ],
        timestamp: report.report_date 
          ? formatDate(new Date(report.report_date), 'MMM dd, yyyy')
          : formatDate(new Date(report.created_at), 'MMM dd, yyyy'),
        onClick: () => {
          if (report.file_path) {
            handleViewReport(report.file_path);
          }
        },
      };
    });
  };

  const transformedMedicalCards = buildReportCards(medicalReports);
  const transformedOmicsCards = buildReportCards(omicsReports);

  const handleSupplementSubmit = async (data: any) => {
    if (editingSupplement) {
      await updateSupplement(editingSupplement.id, data);
      setEditingSupplement(null);
    } else {
      await createSupplement(data);
    }
  };

  const handleEditSupplement = (supplement: UserSupplement) => {
    setEditingSupplement(supplement);
    setSupplementDialogOpen(true);
  };

  const handleDeleteSupplement = async (id: string) => {
    await deleteSupplement(id);
  };

  const allCategories = getAllCategories();
  const filteredSupplements = categoryFilter === "all" 
    ? supplements 
    : supplements.filter(s => s.category === categoryFilter);

  const activeCategoryCount = supplements.reduce((acc, supp) => {
    acc[supp.category] = (acc[supp.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // VTID-05111 — Spotlight Tier B (desktop + flag only; phones and flag-off keep the screen below).
  if (spotlight) {
    const reportRows = (reports: typeof labReports) =>
      reports.map((report) => {
        const typeKey = REPORT_TYPE_CONFIG[report.report_type || 'other'] ? report.report_type || 'other' : 'other';
        const statusKey = STATUS_CONFIG[report.processing_status || 'uploaded'] ? report.processing_status || 'uploaded' : 'uploaded';
        const date = formatDate(new Date(report.report_date || report.created_at), 'PP');
        const open = () => {
          if (report.file_path) handleViewReport(report.file_path);
        };
        return (
          <VCard
            key={report.id}
            size="row"
            {...(report.file_path ? cardButtonProps(open) : {})}
            mediaSlot={<IconThumb icon={REPORT_TYPE_ICON[typeKey] ?? MoreHorizontal} />}
            title={report.title || report.raw_file_ref || t('spotlightTierB.health.reportFallbackTitle')}
            meta={[report.provider_name || report.source || t('health.unknownProvider'), t(`spotlightTierB.health.reportType.${typeKey}`), date].join(' · ')}
            badge={<Badge variant={STATUS_CONFIG[statusKey].variant}>{t(`spotlightTierB.health.reportStatus.${statusKey}`)}</Badge>}
          />
        );
      });

    const reportsPane = (
      reports: typeof labReports,
      empty: { icon: typeof Droplets; titleKey: string; descKey: string; actionKey: string; category: string },
      intro: { icon: typeof Droplets; titleKey: string; descKey: string },
      actions: React.ReactNode,
    ) => (
      <TierBSection
        title={
          <span className="inline-flex items-center gap-2">
            <intro.icon className="h-4 w-4" aria-hidden="true" />
            {t(intro.titleKey)}
          </span>
        }
        action={<div className="flex flex-wrap gap-2">{actions}</div>}
      >
        <p className="text-sm text-muted-foreground">{t(intro.descKey)}</p>
        {reportsLoading ? (
          <TierBListSkeleton />
        ) : reportsError ? (
          <TierBError onRetry={() => refetchReports()} />
        ) : reports.length === 0 ? (
          <TierBEmpty
            Icon={empty.icon}
            titleKey={empty.titleKey}
            descriptionKey={empty.descKey}
            actionKey={empty.actionKey}
            onAction={() => openUploadSheet(empty.category)}
          />
        ) : (
          <div className={TIER_B_LIST}>{reportRows(reports)}</div>
        )}
      </TierBSection>
    );

    return (
      <AppLayout>
        <SEO title={t('screens.health.myBiologyHealth')} description={t('spotlightTierB.health.biologyDescription')} canonical={window.location.href} />
        <ScreenFrame
          archetype="collection"
          subNav={{ items: healthNavigation }}
          header={{ title: t('screens.health.yourBiologyCentralHub'), description: t('spotlightTierB.health.biologyDescription'), emoji: '🧬' }}
          utility={{
            children: (
              <>
                <ExpandableSearchButton placeholder={t('screens.health.searchBiomarkersTestsSupplements')} />
                <UniversalCalendarButton />
                <Button variant="default" size="sm" onClick={() => setBiomarkerActionsOpen(true)}>
                  <Plus className="me-2 h-4 w-4" />
                  {t('screens.health.addData')}
                </Button>
              </>
            ),
          }}
          tabs={{
            value: activeTab,
            onValueChange: setActiveTab,
            items: [
              { value: 'medical', label: t('screens.health.myMedical') },
              { value: 'omics', label: t('screens.health.myOmics') },
              { value: 'supplements', label: t('screens.health.mySupplements') },
            ],
          }}
        >
          <SplitBarContent value="medical">
            {reportsPane(
              medicalReports,
              { icon: Droplets, titleKey: 'screens.health.noMedicalReportsYet', descKey: 'screens.health.uploadYourFirstBloodPanelStart', actionKey: 'screens.health.uploadBloodPanel', category: 'blood_panel' },
              { icon: TestTube, titleKey: 'screens.health.medicalBiomarkers', descKey: 'screens.health.clinicalLabResultsFromBloodTests' },
              <>
                <Button variant="outline" size="sm" onClick={() => openUploadSheet('blood_panel')}>
                  <Upload className="me-2 h-4 w-4" />
                  {t('screens.health.uploadPdf')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => logDeviceConnect('Wearable Device')}>
                  <Activity className="me-2 h-4 w-4" />
                  {t('screens.health.connectDevice')}
                </Button>
              </>,
            )}
          </SplitBarContent>
          <SplitBarContent value="omics">
            {reportsPane(
              omicsReports,
              { icon: Dna, titleKey: 'screens.health.noOmicsDataYet', descKey: 'screens.health.uploadYourGenomicsMetabolomicsResultsUnlock', actionKey: 'screens.health.uploadOmicsReport', category: 'genomics' },
              { icon: Dna, titleKey: 'screens.health.omicsBiomarkers', descKey: 'screens.health.genomicsEpigenomicsMetabolomicsMicrobiomeProteomic' },
              <>
                <Button variant="outline" size="sm" onClick={() => openUploadSheet('genomics')}>
                  <FileText className="me-2 h-4 w-4" />
                  {t('screens.health.uploadResults')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => logOmicsConnectAPI('API Provider')}>
                  <Activity className="me-2 h-4 w-4" />
                  {t('screens.health.connectApi')}
                </Button>
              </>,
            )}
          </SplitBarContent>
          <SplitBarContent value="supplements">
            <TierBSection
              title={
                <span className="inline-flex items-center gap-2">
                  <Pill className="h-4 w-4" aria-hidden="true" />
                  {t('screens.health.mySupplements2')}
                </span>
              }
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      setEditingSupplement(null);
                      setSupplementDialogOpen(true);
                    }}
                  >
                    <Plus className="me-2 h-4 w-4" />
                    {t('screens.health.addSupplement')}
                  </Button>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-56">
                      <Filter className="me-2 h-4 w-4" />
                      <SelectValue placeholder={t('screens.health.filterByCategory')} />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      <SelectItem value="all">{t('screens.health.allCategoriesLength', { length: supplements.length })}</SelectItem>
                      {allCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {t('spotlightTierB.health.categoryCount', { category, count: activeCategoryCount[category] || 0 })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              }
            >
              <p className="text-sm text-muted-foreground">{t('screens.health.trackYourSupplementRegimenAcross40')}</p>
              {supplementsLoading ? (
                <TierBListSkeleton />
              ) : filteredSupplements.length > 0 ? (
                <div className={TIER_B_LIST}>
                  {filteredSupplements.map((supplement) => (
                    <SupplementCard key={supplement.id} supplement={supplement} onEdit={handleEditSupplement} onDelete={handleDeleteSupplement} />
                  ))}
                </div>
              ) : categoryFilter === 'all' ? (
                <TierBEmpty
                  Icon={Pill}
                  titleKey="health.noSupplements"
                  descriptionKey="health.noSupplementsDesc"
                  actionKey="health.addSupplement"
                  onAction={() => {
                    setEditingSupplement(null);
                    setSupplementDialogOpen(true);
                  }}
                />
              ) : (
                <TierBEmpty Icon={Pill} titleKey="spotlightTierB.health.noSupplementsInCategory" />
              )}
            </TierBSection>
          </SplitBarContent>
        </ScreenFrame>

        <BiomarkersMasterActionPopup open={biomarkerActionsOpen} onOpenChange={setBiomarkerActionsOpen} />
        <AddSupplementDialog
          open={supplementDialogOpen}
          onOpenChange={(open) => {
            setSupplementDialogOpen(open);
            if (!open) setEditingSupplement(null);
          }}
          onSubmit={handleSupplementSubmit}
          initialData={
            editingSupplement
              ? {
                  name: editingSupplement.name,
                  category: editingSupplement.category,
                  dosage: editingSupplement.dosage || '',
                  frequency: editingSupplement.frequency || '',
                  notes: editingSupplement.notes || '',
                  start_date: editingSupplement.start_date || '',
                  is_active: editingSupplement.is_active,
                }
              : undefined
          }
          mode={editingSupplement ? 'edit' : 'add'}
        />
        <HealthReportUploadSheet
          open={uploadSheetOpen}
          onOpenChange={setUploadSheetOpen}
          onUploadComplete={() => refetchReports()}
          defaultCategory={uploadDefaultCategory as React.ComponentProps<typeof HealthReportUploadSheet>["defaultCategory"]}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEO
        title={t('screens.health.myBiologyHealth')}
        description="Your medical biomarkers, omics data, and supplement tracking hub" 
        canonical={window.location.href} 
      />
      <SubNavigation items={healthNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-surface-page-from via-surface-page-via to-surface-page-to min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title={t('screens.health.yourBiologyCentralHub')}
            description="Track medical biomarkers, omics data, and supplements in one place."
            emoji="🧬"
          />

          <UtilityActionButton>
            <ExpandableSearchButton placeholder={t('screens.health.searchBiomarkersTestsSupplements')} />
            <UniversalCalendarButton />
            <Button
              variant="default"
              size="sm"
              onClick={() => setBiomarkerActionsOpen(true)}
            >
              <Plus className="w-4 h-4 me-2" />
              {t('screens.health.addData')}
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
            <SplitBarList>
              <SplitBarTrigger value="medical">
                {t('screens.health.myMedical')}
              </SplitBarTrigger>
              <SplitBarTrigger value="omics">
                {t('screens.health.myOmics')}
              </SplitBarTrigger>
              <SplitBarTrigger value="supplements">
                {t('screens.health.mySupplements')}
              </SplitBarTrigger>
            </SplitBarList>

            {/* My Medical Tab */}
            <SplitBarContent value="medical">
              <div className="space-y-4">
                <Panel className="bg-card/80 backdrop-blur-sm">
                  <PanelHeader>
                    <PanelTitle className="flex items-center gap-2">
                      <TestTube className="w-5 h-5" />
                      {t('screens.health.medicalBiomarkers')}
                    </PanelTitle>
                    <p className="text-sm text-muted-foreground">{t('screens.health.clinicalLabResultsFromBloodTests')}
                    </p>
                  </PanelHeader>
                  <PanelContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openUploadSheet('blood_panel')}
                      >
                        <Upload className="w-4 h-4 me-2" />
                        {t('screens.health.uploadPdf')}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => logDeviceConnect('Wearable Device')}
                      >
                        <Activity className="w-4 h-4 me-2" />
                        {t('screens.health.connectDevice')}
                      </Button>
                    </div>

                    {reportsError ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium mb-1">{t('screens.health.reportsLoadFailed')}</p>
                        <p className="text-sm">{t('screens.health.reportsLoadFailedDesc')}</p>
                        <Button variant="outline" size="sm" className="mt-4" onClick={() => refetchReports()}>
                          {t('screens.health.reportsLoadFailedRetry')}
                        </Button>
                      </div>
                    ) : (
                      <HorizontalCardList
                        items={transformedMedicalCards}
                        variant="standard"
                        screenId="my-biology-medical"
                        groupBy="none"
                        gap="md"
                        emptyState={
                          <div className="text-center py-12 text-muted-foreground">
                            <Droplets className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="font-medium mb-1">{t('screens.health.noMedicalReportsYet')}</p>
                            <p className="text-sm">{t('screens.health.uploadYourFirstBloodPanelStart')}</p>
                            <Button variant="outline" size="sm" className="mt-4" onClick={() => openUploadSheet('blood_panel')}>
                              <Upload className="w-4 h-4 me-2" /> {t('screens.health.uploadBloodPanel')}
                            </Button>
                          </div>
                        }
                      />
                    )}
                  </PanelContent>
                </Panel>
              </div>
            </SplitBarContent>

            {/* My Omics Tab */}
            <SplitBarContent value="omics">
              <div className="space-y-4">
                <Panel className="bg-card/80 backdrop-blur-sm">
                  <PanelHeader>
                    <PanelTitle className="flex items-center gap-2">
                      <Dna className="w-5 h-5" />
                      {t('screens.health.omicsBiomarkers')}
                    </PanelTitle>
                    <p className="text-sm text-muted-foreground">
                      {t('screens.health.genomicsEpigenomicsMetabolomicsMicrobiomeProteomic')}
                    </p>
                  </PanelHeader>
                  <PanelContent>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openUploadSheet('genomics')}
                      >
                        <FileText className="w-4 h-4 me-2" />
                        {t('screens.health.uploadResults')}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => logOmicsConnectAPI('API Provider')}
                      >
                        <Activity className="w-4 h-4 me-2" />
                        {t('screens.health.connectApi')}
                      </Button>
                    </div>

                    {reportsError ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium mb-1">{t('screens.health.reportsLoadFailed')}</p>
                        <p className="text-sm">{t('screens.health.reportsLoadFailedDesc')}</p>
                        <Button variant="outline" size="sm" className="mt-4" onClick={() => refetchReports()}>
                          {t('screens.health.reportsLoadFailedRetry')}
                        </Button>
                      </div>
                    ) : (
                      <HorizontalCardList
                        items={transformedOmicsCards}
                        variant="standard"
                        screenId="my-biology-omics"
                        groupBy="none"
                        gap="md"
                        emptyState={
                          <div className="text-center py-12 text-muted-foreground">
                            <Dna className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="font-medium mb-1">{t('screens.health.noOmicsDataYet')}</p>
                            <p className="text-sm">{t('screens.health.uploadYourGenomicsMetabolomicsResultsUnlock')}</p>
                            <Button variant="outline" size="sm" className="mt-4" onClick={() => openUploadSheet('genomics')}>
                              <Upload className="w-4 h-4 me-2" /> {t('screens.health.uploadOmicsReport')}
                            </Button>
                          </div>
                        }
                      />
                    )}
                  </PanelContent>
                </Panel>
              </div>
            </SplitBarContent>

            {/* My Supplements Tab */}
            <SplitBarContent value="supplements">
              <div className="space-y-4">
                <Panel className="bg-card/80 backdrop-blur-sm">
                  <PanelHeader>
                    <PanelTitle className="flex items-center gap-2">
                      <Pill className="w-5 h-5" />
                      {t('screens.health.mySupplements2')}
                    </PanelTitle>
                    <p className="text-sm text-muted-foreground">
                      {t('screens.health.trackYourSupplementRegimenAcross40')}
                    </p>
                  </PanelHeader>
                  <PanelContent>
                    <div className="flex gap-3 mb-4">
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => {
                          setEditingSupplement(null);
                          setSupplementDialogOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4 me-2" />
                        {t('screens.health.addSupplement')}
                      </Button>
                      
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        {/* design-allow-next-line: measured select width */}
                        <SelectTrigger className="w-[200px]">
                          <Filter className="w-4 h-4 me-2" />
                          <SelectValue placeholder={t('screens.health.filterByCategory')} />
                        </SelectTrigger>
                        {/* design-allow-next-line: measured dropdown scroll height */}
                        <SelectContent className="max-h-[300px]">
                          <SelectItem value="all">{t('screens.health.allCategoriesLength', { length: supplements.length })}
                          </SelectItem>
                          {allCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category} ({activeCategoryCount[category] || 0})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      {supplementsLoading ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <p>{t('screens.health.loadingSupplements')}</p>
                        </div>
                      ) : filteredSupplements.length > 0 ? (
                        filteredSupplements.map((supplement) => (
                          <SupplementCard
                            key={supplement.id}
                            supplement={supplement}
                            onEdit={handleEditSupplement}
                            onDelete={handleDeleteSupplement}
                          />
                        ))
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <Pill className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>
                            {categoryFilter === "all" 
                              ? "No supplements added yet. Click 'Add Supplement' to get started."
                              : `No supplements in ${categoryFilter} category.`}
                          </p>
                        </div>
                      )}
                    </div>

                    {supplements.length > 0 && (
                      <div className="mt-6 p-4 bg-muted/20 rounded-lg">
                        <h4 className="font-semibold mb-3">{t('screens.health.yourActiveCategories')}</h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(activeCategoryCount)
                            .sort((a, b) => b[1] - a[1])
                            .map(([category, count]) => (
                              <Badge 
                                key={category} 
                                variant="secondary"
                                className="cursor-pointer hover:bg-secondary/80"
                                onClick={() => setCategoryFilter(category)}
                              >
                                {category} ({count})
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}
                  </PanelContent>
                </Panel>
              </div>
            </SplitBarContent>
          </SplitBar>
        </div>
      </div>

      <BiomarkersMasterActionPopup
        open={biomarkerActionsOpen}
        onOpenChange={setBiomarkerActionsOpen}
      />

      <AddSupplementDialog
        open={supplementDialogOpen}
        onOpenChange={(open) => {
          setSupplementDialogOpen(open);
          if (!open) setEditingSupplement(null);
        }}
        onSubmit={handleSupplementSubmit}
        initialData={editingSupplement ? {
          name: editingSupplement.name,
          category: editingSupplement.category,
          dosage: editingSupplement.dosage || '',
          frequency: editingSupplement.frequency || '',
          notes: editingSupplement.notes || '',
          start_date: editingSupplement.start_date || '',
          is_active: editingSupplement.is_active,
        } : undefined}
        mode={editingSupplement ? 'edit' : 'add'}
      />

      <HealthReportUploadSheet
        open={uploadSheetOpen}
        onOpenChange={setUploadSheetOpen}
        onUploadComplete={() => refetchReports()}
        defaultCategory={uploadDefaultCategory as any}
      />
    </AppLayout>
  );
}
