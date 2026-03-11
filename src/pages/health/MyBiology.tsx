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

export default function MyBiology() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [biomarkerActionsOpen, setBiomarkerActionsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("medical");
  const [supplementDialogOpen, setSupplementDialogOpen] = useState(false);
  const [editingSupplement, setEditingSupplement] = useState<UserSupplement | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [mockOmicsResults, setMockOmicsResults] = useState<OmicsResult[]>([]);
  
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

  const getMockOmicsResults = (): OmicsResult[] => {
    return [
      {
        id: '1',
        name: 'Whole Genome Sequencing',
        category: 'Genomics',
        provider: '23andMe',
        date: '2024-01-15',
        description: 'Complete DNA analysis with ancestry and health insights',
      },
      {
        id: '2',
        name: 'Metabolic Panel',
        category: 'Metabolomics',
        provider: 'Viome',
        date: '2024-02-10',
        description: 'Comprehensive metabolite analysis',
      },
      {
        id: '3',
        name: 'Gut Microbiome Analysis',
        category: 'Microbiome',
        provider: 'Thorne',
        date: '2024-01-28',
        description: 'Bacterial diversity and gut health assessment',
      },
      {
        id: '4',
        name: 'Proteomics Analysis',
        category: 'Proteomics',
        provider: 'SomaLogic',
        date: '2023-12-15',
        description: 'Protein biomarker profiling',
      },
      {
        id: '5',
        name: 'DNA Methylation Test',
        category: 'Epigenomics',
        provider: 'TruDiagnostic',
        date: '2024-01-05',
        description: 'Biological age and epigenetic markers',
      },
      {
        id: '6',
        name: 'Skin Microbiome Analysis',
        category: 'Skin Microbiome',
        provider: 'uBiome',
        date: '2023-11-20',
        description: 'Skin bacteria and fungi diversity assessment',
      },
      {
        id: '7',
        name: 'Environmental Microbiome',
        category: 'Environmental Microbiome',
        provider: 'BiomeSense',
        date: '2023-10-15',
        description: 'Home and workplace microbial environment analysis',
      },
    ];
  };

  useEffect(() => {
    fetchResults();
    setMockOmicsResults(getMockOmicsResults());
  }, []);

  const fetchResults = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setResults(getMockResults());
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('lab_test_results')
        .select(`
          *,
          lab_test_orders!inner(
            lab_tests(name, category, provider_name)
          )
        `)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      const formattedResults = data.map(result => ({
        ...result,
        lab_test: result.lab_test_orders.lab_tests
      })) as TestResult[];

      if (formattedResults.length === 0) {
        setResults(getMockResults());
      } else {
        setResults(formattedResults);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      setResults(getMockResults());
    } finally {
      setIsLoading(false);
    }
  };


  const getMockResults = (): TestResult[] => [
    {
      id: '1',
      order_id: 'order-1',
      biomarker_data: {},
      ai_insights: null,
      completed_at: '2025-01-15T10:30:00Z',
      lab_test: {
        name: 'Complete Blood Count',
        category: 'medical',
        provider_name: 'Wellness Lab Inc.'
      }
    },
    {
      id: '2',
      order_id: 'order-2',
      biomarker_data: {},
      ai_insights: null,
      completed_at: '2025-01-08T14:20:00Z',
      lab_test: {
        name: 'Genomics Analysis',
        category: 'genomics',
        provider_name: 'DNA Health Labs'
      }
    },
    {
      id: '3',
      order_id: 'order-3',
      biomarker_data: {},
      ai_insights: null,
      completed_at: '2024-12-28T09:15:00Z',
      lab_test: {
        name: 'Gut Microbiome Analysis',
        category: 'microbiome',
        provider_name: 'Gut Health Solutions'
      }
    }
  ];

  const getMockBiomarkers = (testName: string): BiomarkerItem[] => {
    const baseMarkers = [
      { name: 'Cholesterol', value: 190, unit: 'mg/dL', referenceMin: 125, referenceMax: 200, status: 'normal' as const },
      { name: 'Glucose', value: 95, unit: 'mg/dL', referenceMin: 70, referenceMax: 100, status: 'normal' as const },
      { name: 'Hemoglobin', value: 14.2, unit: 'g/dL', referenceMin: 12, referenceMax: 16, status: 'normal' as const },
      { name: 'Vitamin D', value: 25, unit: 'ng/mL', referenceMin: 30, referenceMax: 100, status: 'low' as const },
    ];

    if (testName.toLowerCase().includes('genomics')) {
      return [
        { name: 'APOE4 Variant', value: 1, unit: 'copies', referenceMin: 0, referenceMax: 2, status: 'normal' as const },
        { name: 'MTHFR C677T', value: 0, unit: 'mutations', referenceMin: 0, referenceMax: 0, status: 'normal' as const },
      ];
    }

    if (testName.toLowerCase().includes('microbiome')) {
      return [
        { name: 'Lactobacillus', value: 8.2, unit: '% abundance', referenceMin: 5, referenceMax: 15, status: 'normal' as const },
        { name: 'Diversity Index', value: 4.2, unit: 'Shannon', referenceMin: 3.5, referenceMax: 5.0, status: 'normal' as const },
      ];
    }

    return baseMarkers;
  };

  const getOverallStatus = (biomarkers: BiomarkerItem[]) => {
    const hasCritical = biomarkers.some(b => b.status === 'critical');
    const hasHigh = biomarkers.some(b => b.status === 'high');
    const hasLow = biomarkers.some(b => b.status === 'low');
    
    if (hasCritical) return { status: 'Critical', color: 'bg-destructive text-destructive-foreground' };
    if (hasHigh || hasLow) return { status: 'Needs Attention', color: 'bg-warning text-warning-foreground' };
    return { status: 'Normal', color: 'bg-success text-success-foreground' };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'low': return <TrendingDown className="h-4 w-4 text-warning" />;
      case 'critical': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default: return <CheckCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

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

  const medicalResults = results.filter(r => r.lab_test.category === 'medical');

  // Transform medical results to StandardHorizontalCard format
  const transformedMedicalCards: StandardHorizontalCardProps[] = medicalResults.map((result) => {
    const mockBiomarkers = getMockBiomarkers(result.lab_test.name);
    const overallStatus = getOverallStatus(mockBiomarkers);
    
    return {
      id: result.id,
      screenId: 'my-biology-medical',
      icon: <TestTube className="w-5 h-5" />,
      title: result.lab_test.name,
      description: result.lab_test.provider_name,
      badges: [
        {
          label: overallStatus.status,
          variant: overallStatus.status === 'Critical' ? 'destructive' : 
                   overallStatus.status === 'Needs Attention' ? 'outline' : 'secondary' as const,
        }
      ],
      timestamp: format(new Date(result.completed_at), 'MMM dd, yyyy'),
      expandedContent: (
        <div className="grid gap-2 py-2">
          {mockBiomarkers.map((biomarker) => (
            <div key={biomarker.name} className="flex items-center justify-between p-3 bg-background rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon(biomarker.status)}
                <div>
                  <div className="font-medium text-sm">{biomarker.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {biomarker.referenceMin} - {biomarker.referenceMax} {biomarker.unit}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-sm">{biomarker.value} {biomarker.unit}</div>
                <div className="text-xs capitalize text-muted-foreground">{biomarker.status}</div>
              </div>
            </div>
          ))}
        </div>
      ),
    };
  });

  // Transform omics results to StandardHorizontalCard format
  const transformedOmicsCards: StandardHorizontalCardProps[] = mockOmicsResults.map((result) => ({
    id: result.id,
    screenId: 'my-biology-omics',
    icon: <Dna className="w-5 h-5" />,
    title: result.name,
    description: result.description,
    badges: [
      {
        label: result.category,
        variant: 'outline' as const,
      }
    ],
    metadata: [
      {
        icon: <Building2 className="w-3.5 h-3.5" />,
        text: result.provider,
      }
    ],
    timestamp: format(new Date(result.date), 'MMM dd, yyyy'),
    onClick: () => logOmicsView(result.category, result.name),
  }));

  return (
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
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => logBiomarkerUpload('manual', 'Manual Entry')}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Manual Entry
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => logBiomarkerUpload('pdf', 'PDF Upload')}
                      >
                        <FileText className="w-4 h-4 mr-2" />
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
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => logBiomarkerOrderTest('Lab Test')}
                      >
                        <TestTube className="w-4 h-4 mr-2" />
                        Order Test
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
                          <TestTube className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No medical biomarker data yet. Add your first results above.</p>
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
                        onClick={() => logOmicsUpload('Omics Data', 'Provider')}
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
    </AppLayout>
  );
}
