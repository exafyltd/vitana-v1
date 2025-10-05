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
import { Separator } from '@/components/ui/separator';
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Share2, 
  Calendar,
  Building2,
  CheckCircle,
  AlertTriangle,
  TrendingDown,
  Clock,
  Plus,
  Dna,
  TestTube,
  Pill,
  Upload,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { healthNavigation } from '@/config/navigation';

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

interface Supplement {
  id: string;
  name: string;
  category: string;
  dosage: string;
  frequency: string;
  isActive: boolean;
}

export default function MyBiology() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [biomarkerActionsOpen, setBiomarkerActionsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("medical");
  const [supplements, setSupplements] = useState<Supplement[]>([]);

  useEffect(() => {
    fetchResults();
    fetchSupplements();
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

  const fetchSupplements = async () => {
    // Mock supplements for now
    setSupplements([
      { id: '1', name: 'Vitamin D3', category: 'Immunity', dosage: '5000 IU', frequency: 'Daily', isActive: true },
      { id: '2', name: 'Omega-3', category: 'Cholesterol & Heart', dosage: '1000mg', frequency: 'Daily', isActive: true },
      { id: '3', name: 'Magnesium', category: 'Sleep', dosage: '400mg', frequency: 'Evening', isActive: true },
    ]);
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

  const toggleExpandRow = (resultId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(resultId)) {
      newExpanded.delete(resultId);
    } else {
      newExpanded.add(resultId);
    }
    setExpandedRows(newExpanded);
  };

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

  const medicalResults = results.filter(r => r.lab_test.category === 'medical');
  const omicsResults = results.filter(r => ['genomics', 'metabolomics', 'microbiome', 'proteomics'].includes(r.lab_test.category));

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
                <TestTube className="w-4 h-4 mr-2" />
                My Medical
              </SplitBarTrigger>
              <SplitBarTrigger value="omics">
                <Dna className="w-4 h-4 mr-2" />
                My Omics
              </SplitBarTrigger>
              <SplitBarTrigger value="supplements">
                <Pill className="w-4 h-4 mr-2" />
                My Supplements
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
                      <Button variant="outline" size="sm">
                        <Upload className="w-4 h-4 mr-2" />
                        Manual Entry
                      </Button>
                      <Button variant="outline" size="sm">
                        <FileText className="w-4 h-4 mr-2" />
                        Upload PDF
                      </Button>
                      <Button variant="outline" size="sm">
                        <Activity className="w-4 h-4 mr-2" />
                        Connect Device
                      </Button>
                      <Button variant="outline" size="sm">
                        <TestTube className="w-4 h-4 mr-2" />
                        Order Test
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {medicalResults.length > 0 ? (
                        medicalResults.map((result) => {
                          const mockBiomarkers = getMockBiomarkers(result.lab_test.name);
                          const overallStatus = getOverallStatus(mockBiomarkers);
                          const isExpanded = expandedRows.has(result.id);

                          return (
                            <Card key={result.id} className="overflow-hidden">
                              <CardContent className="p-0">
                                <div className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                                  <div className="flex-1">
                                    <h3 className="font-semibold">{result.lab_test.name}</h3>
                                    <p className="text-sm text-muted-foreground">{result.lab_test.provider_name}</p>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {format(new Date(result.completed_at), 'MMM dd, yyyy')}
                                  </div>
                                  <Badge className={overallStatus.color}>{overallStatus.status}</Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleExpandRow(result.id)}
                                  >
                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </Button>
                                </div>

                                {isExpanded && (
                                  <>
                                    <Separator />
                                    <div className="p-4 bg-muted/20">
                                      <div className="grid gap-2">
                                        {mockBiomarkers.map((biomarker) => (
                                          <div key={biomarker.name} className="flex items-center justify-between p-3 bg-background rounded-lg">
                                            <div className="flex items-center gap-2">
                                              {getStatusIcon(biomarker.status)}
                                              <div>
                                                <div className="font-medium">{biomarker.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                  {biomarker.referenceMin} - {biomarker.referenceMax} {biomarker.unit}
                                                </div>
                                              </div>
                                            </div>
                                            <div className="text-right">
                                              <div className="font-semibold">{biomarker.value} {biomarker.unit}</div>
                                              <div className="text-xs capitalize">{biomarker.status}</div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <TestTube className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No medical biomarker data yet. Add your first results above.</p>
                        </div>
                      )}
                    </div>
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
                      Genomics, Epigenomics, Microbiome, Metabolomics, Proteomics
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <Button variant="outline" size="sm">
                        <FileText className="w-4 h-4 mr-2" />
                        Upload PDF Report
                      </Button>
                      <Button variant="outline" size="sm">
                        <Activity className="w-4 h-4 mr-2" />
                        Connect Partner API
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {omicsResults.length > 0 ? (
                        omicsResults.map((result) => (
                          <Card key={result.id}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold">{result.lab_test.name}</h3>
                                    <Badge variant="outline" className="capitalize">
                                      {result.lab_test.category}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{result.lab_test.provider_name}</p>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {format(new Date(result.completed_at), 'MMM dd, yyyy')}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <Dna className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No omics data yet. Upload your first report above.</p>
                        </div>
                      )}
                    </div>
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
                      Track your supplement regimen and categories
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" size="sm" className="mb-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Supplement
                    </Button>

                    <div className="space-y-2">
                      {supplements.map((supplement) => (
                        <Card key={supplement.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold">{supplement.name}</h3>
                                <p className="text-sm text-muted-foreground">{supplement.category}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium">{supplement.dosage}</div>
                                <div className="text-xs text-muted-foreground">{supplement.frequency}</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="mt-6 p-4 bg-muted/20 rounded-lg">
                      <h4 className="font-semibold mb-2">Supplement Categories</h4>
                      <div className="flex flex-wrap gap-2">
                        {['Immunity', 'Anti-aging', 'Sleep', 'Cholesterol & Heart', 'Digestion', 'Memory & Concentration', 'Stress', 'Vitality'].map(cat => (
                          <Badge key={cat} variant="secondary">{cat}</Badge>
                        ))}
                      </div>
                    </div>
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
    </AppLayout>
  );
}
