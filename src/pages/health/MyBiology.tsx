import React, { useState, useEffect } from 'react';
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { BiomarkersMasterActionPopup } from "@/components/BiomarkersMasterActionPopup";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { format } from 'date-fns';
import { healthNavigation } from '@/config/navigation';
import { useUserSupplements, UserSupplement } from '@/hooks/useUserSupplements';
import { useHealthLogger } from '@/hooks/useHealthLogger';
import { AddSupplementDialog } from '@/components/supplements/AddSupplementDialog';
import { SupplementCard } from '@/components/supplements/SupplementCard';
import { getAllCategories } from '@/components/supplements/supplementCategories';
import { HealthReportUploadSheet } from '@/components/health/mobile/HealthReportUploadSheet';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TestResult {
  id: string;
  order_id: string;
  biomarker_data: any;
  ai_insights: string | null;
  completed_at: string;
  lab_test: {
    name: string;
    category: string;
    provider_name: string;
  };
}

interface BiomarkerItem {
  name: string;
  value: number;
  unit: string;
  referenceMin: number;
  referenceMax: number;
  status: 'normal' | 'high' | 'low' | 'critical';
}

interface OmicsResult {
  id: string;
  name: string;
  category: string;
  provider: string;
  date: string;
  description: string;
}

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
  const [results, setResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [biomarkerActionsOpen, setBiomarkerActionsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("medical");
  const [supplementDialogOpen, setSupplementDialogOpen] = useState(false);
  const [editingSupplement, setEditingSupplement] = useState<UserSupplement | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [uploadDefaultCategory, setUploadDefaultCategory] = useState<string>('blood_panel');
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { 
    supplements, 
    isLoading: supplementsLoading,
    createSupplement, 
    updateSupplement, 
    deleteSupplement 
  } = useUserSupplements();

  const { 
    logBiomarkerView, 
    logBiomarkerUpload, 
    logBiomarkerOrderTest,
    logDeviceConnect,
    logOmicsUpload,
    logOmicsView,
    logOmicsConnectAPI
  } = useHealthLogger();

  // Fetch lab_reports (real data from DB)
  const { data: labReports = [], isLoading: reportsLoading, refetch: refetchReports } = useQuery({
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
        return [];
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
      toast({ title: "No file available", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.storage
      .from('health-reports')
      .createSignedUrl(filePath, 3600);
    
    if (error || !data?.signedUrl) {
      toast({ title: "Could not load file", description: error?.message, variant: "destructive" });
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
          ? format(new Date(report.report_date), 'MMM dd, yyyy')
          : format(new Date(report.created_at), 'MMM dd, yyyy'),
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

    <AppLayout>
      <SEO 
        title="My Biology | Health" 
        description="Your medical biomarkers, omics data, and supplement tracking hub" 
        canonical={window.location.href} 
      />
      <SubNavigation items={healthNavigation} />
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title="Your Biology Central Hub"
            description="Track medical biomarkers, omics data, and supplements in one place."
            emoji="🧬"
          />

          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search biomarkers, tests, or supplements..." />
            <UniversalCalendarButton />
            <Button
              variant="default"
              size="sm"
              onClick={() => setBiomarkerActionsOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Data
            </Button>
          </UtilityActionButton>

          <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
            <SplitBarList>
              <SplitBarTrigger value="medical">
                🧪 My Medical
              </SplitBarTrigger>
              <SplitBarTrigger value="omics">
                🧬 My Omics
              </SplitBarTrigger>
              <SplitBarTrigger value="supplements">
                💊 My Supplements
              </SplitBarTrigger>
            </SplitBarList>

            {/* My Medical Tab */}
            <SplitBarContent value="medical">
              <div className="space-y-4">
                <Card className="bg-card/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TestTube className="w-5 h-5" />
                      Medical Biomarkers
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Clinical lab results from blood tests, devices, and wearables
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openUploadSheet('blood_panel')}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload PDF
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => logDeviceConnect('Wearable Device')}
                      >
                        <Activity className="w-4 h-4 mr-2" />
                        Connect Device
                      </Button>
                    </div>

                    <HorizontalCardList
                      items={transformedMedicalCards}
                      variant="standard"
                      screenId="my-biology-medical"
                      groupBy="none"
                      gap="md"
                      emptyState={
                        <div className="text-center py-12 text-muted-foreground">
                          <Droplets className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p className="font-medium mb-1">No medical reports yet</p>
                          <p className="text-sm">Upload your first blood panel to start building your health profile.</p>
                          <Button variant="outline" size="sm" className="mt-4" onClick={() => openUploadSheet('blood_panel')}>
                            <Upload className="w-4 h-4 mr-2" /> Upload Blood Panel
                          </Button>
                        </div>
                      }
                    />
                  </CardContent>
                </Card>
              </div>
            </SplitBarContent>

            {/* My Omics Tab */}
            <SplitBarContent value="omics">
              <div className="space-y-4">
                <Card className="bg-card/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Dna className="w-5 h-5" />
                      Omics Biomarkers
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Genomics, Epigenomics, Metabolomics, Microbiome, Proteomics, and more
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openUploadSheet('genomics')}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Upload Results
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => logOmicsConnectAPI('API Provider')}
                      >
                        <Activity className="w-4 h-4 mr-2" />
                        Connect API
                      </Button>
                    </div>

                    <HorizontalCardList
                      items={transformedOmicsCards}
                      variant="standard"
                      screenId="my-biology-omics"
                      groupBy="none"
                      gap="md"
                    />
                  </CardContent>
                </Card>
              </div>
            </SplitBarContent>

            {/* My Supplements Tab */}
            <SplitBarContent value="supplements">
              <div className="space-y-4">
                <Card className="bg-card/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Pill className="w-5 h-5" />
                      My Supplements
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Track your supplement regimen across 40+ categories
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3 mb-4">
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => {
                          setEditingSupplement(null);
                          setSupplementDialogOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Supplement
                      </Button>
                      
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[200px]">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="Filter by category" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          <SelectItem value="all">
                            All Categories ({supplements.length})
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
                          <p>Loading supplements...</p>
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
                        <h4 className="font-semibold mb-3">Your Active Categories</h4>
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
                  </CardContent>
                </Card>
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
