import React, { useState, useEffect } from 'react';
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { BiomarkersMasterActionPopup } from "@/components/BiomarkersMasterActionPopup";
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { SplitBar as SplitScreen, SplitBarContent as SplitScreenContent, SplitBarList as SplitScreenList, SplitBarTrigger as SplitScreenTrigger } from "@/components/ui/split-bar";
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
  Search,
  TestTube,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { healthNavigation } from '@/config/navigation';
import { useHealthLogger } from '@/hooks/useHealthLogger';
import { t } from '@/lib/i18n-toast';


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

export default function BiomarkerResults() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [biomarkerActionsOpen, setBiomarkerActionsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("new");
  const { logBiomarkerView, logBiomarkerDownload, logBiomarkerShare } = useHealthLogger();

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Show mock data when not authenticated for demonstration
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

      // If no real results, show mock data for demonstration
      if (formattedResults.length === 0) {
        setResults(getMockResults());
      } else {
        setResults(formattedResults);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      // Show mock data on error for demonstration
      setResults(getMockResults());
    } finally {
      setIsLoading(false);
    }
  };

  // Mock test results for demonstration
  const getMockResults = (): TestResult[] => [
    {
      id: '1',
      order_id: 'order-1',
      biomarker_data: {},
      ai_insights: null,
      completed_at: '2025-01-15T10:30:00Z',
      lab_test: {
        name: 'Blood Markers Panel',
        category: 'metabolomics',
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
        name: 'Microbiome Analysis',
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
      // Log biomarker view when expanding
      const result = results.find(r => r.id === resultId);
      if (result) {
        const biomarkers = getMockBiomarkers(result.lab_test.name);
        logBiomarkerView(result.lab_test.name, biomarkers.length);
      }
    }
    setExpandedRows(newExpanded);
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

  // Mock biomarker data for demonstration
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
        { name: 'COMT Val158Met', value: 1, unit: 'variants', referenceMin: 0, referenceMax: 2, status: 'normal' as const },
      ];
    }

    if (testName.toLowerCase().includes('microbiome')) {
      return [
        { name: 'Lactobacillus', value: 8.2, unit: '% abundance', referenceMin: 5, referenceMax: 15, status: 'normal' as const },
        { name: 'Bifidobacterium', value: 3.1, unit: '% abundance', referenceMin: 3, referenceMax: 10, status: 'normal' as const },
        { name: 'Diversity Index', value: 4.2, unit: 'Shannon', referenceMin: 3.5, referenceMax: 5.0, status: 'normal' as const },
      ];
    }

    return baseMarkers;
  };

  if (isLoading) {
    return (
      <AppLayout>
        <SEO title={t('screens.health.biomarkerResultsHealth')} description="View your lab test results and biomarker analysis" canonical={window.location.href} />
        <SubNavigation items={healthNavigation} />
        
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title={t('screens.health.loadingLabResults')}
            description="Please wait while we fetch your biomarker analysis."
            emoji="⏳"
          />
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-muted rounded w-1/3 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (results.length === 0) {
    return (
      <AppLayout>
        <SEO title={t('screens.health.biomarkerResultsHealth')} description="View your lab test results and biomarker analysis" canonical={window.location.href} />
        <SubNavigation items={healthNavigation} />
        
        
        <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
          <div className="max-w-7xl mx-auto">
            <StandardHeader
              title={t('screens.health.noLabResultsYet2')}
              description="Order your first lab test to get started."
              emoji="🧪"
            />
            <Card className="text-center py-12">
              <CardContent>
                <div className="text-6xl mb-4">🧪</div>
                <h3 className="text-xl font-semibold mb-2">{t('screens.health.noLabResultsYet')}</h3>
                <p className="text-muted-foreground mb-6">
                  Your lab test results will appear here once they're ready.
                </p>
                <Button onClick={() => { window.history.pushState({}, '', '/discover'); window.dispatchEvent(new PopStateEvent('popstate')); }}>
                  Order Lab Tests
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEO title={t('screens.health.biomarkerResultsHealth')} description="View your lab test results and biomarker analysis" canonical={window.location.href} />
      <SubNavigation items={healthNavigation} />
      
      
      <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <StandardHeader
            title={t('screens.health.yourLabResults')}
            description="View your biomarker analysis and lab test results."
            emoji="🧪"
          />

          <UtilityActionButton>
            <ExpandableSearchButton placeholder={t('screens.health.searchLabResultsBiomarkersTestTypes')} />
            <UniversalCalendarButton />
            <Button
              variant="default"
              size="sm"
              onClick={() => setBiomarkerActionsOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Biomarker Actions
            </Button>
          </UtilityActionButton>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground bg-card/50 px-3 py-1 rounded-md">
              {results.length} test{results.length !== 1 ? 's' : ''} available
            </div>
          </div>

          <SplitScreen value={activeSection} onValueChange={setActiveSection} className="w-full">
            <SplitScreenList>
              <SplitScreenTrigger value="new">{t('screens.health.newResults')}</SplitScreenTrigger>
              <SplitScreenTrigger value="history">{t('screens.health.history')}</SplitScreenTrigger>
            </SplitScreenList>

            <SplitScreenContent value="new">
              <div className="space-y-3">
                {results.filter((_, index) => index < 2).map((result) => {
                  const mockBiomarkers = getMockBiomarkers(result.lab_test.name);
                  const overallStatus = getOverallStatus(mockBiomarkers);
                  const isExpanded = expandedRows.has(result.id);

                  return (
                    <Card key={result.id} className="overflow-hidden bg-card/80 backdrop-blur-sm border-border/50">
                      {/* ... keep existing card content ... */}
                      <CardContent className="p-0">
                        <div className="flex items-center gap-4 p-6 hover:bg-muted/30 transition-colors">
                          {/* Lab Test Name */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg text-foreground truncate">
                              {result.lab_test.name}
                            </h3>
                            <p className="text-sm text-muted-foreground capitalize">
                              {result.lab_test.category.replace('_', ' ')}
                            </p>
                          </div>

                          {/* Date */}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[120px]">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(result.completed_at), 'MMM dd, yyyy')}</span>
                          </div>

                          {/* Provider */}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[150px]">
                            <Building2 className="h-4 w-4" />
                            <span className="truncate">{result.lab_test.provider_name}</span>
                          </div>

                          {/* Status Badge */}
                          <Badge className={`${overallStatus.color} min-w-[120px] justify-center`}>
                            {overallStatus.status}
                          </Badge>

                          {/* View More Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpandRow(result.id)}
                            className="flex items-center gap-2 min-w-[100px]"
                          >
                            {isExpanded ? (
                              <>
                                Hide <ChevronUp className="h-4 w-4" />
                              </>
                            ) : (
                              <>
                                View More <ChevronDown className="h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <>
                            <Separator />
                            <div className="p-6 bg-muted/20">
                              {/* Biomarker Table */}
                              <div className="mb-6">
                                <h4 className="font-semibold mb-4 text-foreground">{t('screens.health.biomarkerDetails')}</h4>
                                <div className="grid gap-3">
                                  {mockBiomarkers.map((biomarker) => (
                                    <div
                                      key={biomarker.name}
                                      className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border/30"
                                    >
                                      <div className="flex items-center gap-3">
                                        {getStatusIcon(biomarker.status)}
                                        <div>
                                          <div className="font-medium text-foreground">{biomarker.name}</div>
                                          <div className="text-sm text-muted-foreground">
                                            {biomarker.referenceMin} - {biomarker.referenceMax} {biomarker.unit}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-semibold text-foreground">
                                          {biomarker.value} {biomarker.unit}
                                        </div>
                                        <div className="text-sm text-muted-foreground capitalize">
                                          {biomarker.status === 'normal' ? '✓ Normal' : 
                                           biomarker.status === 'high' ? '⚠ High' :
                                           biomarker.status === 'low' ? '⬇ Low' : '🚨 Critical'}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-3">
                                <Button 
                                  variant="outline" 
                                  className="flex items-center gap-2"
                                  onClick={() => logBiomarkerDownload(result.lab_test.name)}
                                >
                                  <Download className="h-4 w-4" />
                                  Download PDF
                                </Button>
                                <Button 
                                  variant="outline" 
                                  className="flex items-center gap-2"
                                  onClick={() => logBiomarkerShare(result.lab_test.name, 'Doctor')}
                                >
                                  <Share2 className="h-4 w-4" />
                                  Share with Doctor
                                </Button>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
                                  <Clock className="h-4 w-4" />
                                  <span>Processed {format(new Date(result.completed_at), 'MMM dd, HH:mm')}</span>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </SplitScreenContent>

            <SplitScreenContent value="history">
              <div className="space-y-3">
                {results.filter((_, index) => index >= 2).map((result) => {
                  const mockBiomarkers = getMockBiomarkers(result.lab_test.name);
                  const overallStatus = getOverallStatus(mockBiomarkers);
                  const isExpanded = expandedRows.has(result.id);

                  return (
                    <Card key={result.id} className="overflow-hidden bg-card/80 backdrop-blur-sm border-border/50">
                      {/* ... keep existing card content ... */}
                      <CardContent className="p-0">
                        <div className="flex items-center gap-4 p-6 hover:bg-muted/30 transition-colors">
                          {/* Lab Test Name */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg text-foreground truncate">
                              {result.lab_test.name}
                            </h3>
                            <p className="text-sm text-muted-foreground capitalize">
                              {result.lab_test.category.replace('_', ' ')}
                            </p>
                          </div>

                          {/* Date */}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[120px]">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(result.completed_at), 'MMM dd, yyyy')}</span>
                          </div>

                          {/* Provider */}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[150px]">
                            <Building2 className="h-4 w-4" />
                            <span className="truncate">{result.lab_test.provider_name}</span>
                          </div>

                          {/* Status Badge */}
                          <Badge className={`${overallStatus.color} min-w-[120px] justify-center`}>
                            {overallStatus.status}
                          </Badge>

                          {/* View More Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpandRow(result.id)}
                            className="flex items-center gap-2 min-w-[100px]"
                          >
                            {isExpanded ? (
                              <>
                                Hide <ChevronUp className="h-4 w-4" />
                              </>
                            ) : (
                              <>
                                View More <ChevronDown className="h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <>
                            <Separator />
                            <div className="p-6 bg-muted/20">
                              {/* Biomarker Table */}
                              <div className="mb-6">
                                <h4 className="font-semibold mb-4 text-foreground">{t('screens.health.biomarkerDetails')}</h4>
                                <div className="grid gap-3">
                                  {mockBiomarkers.map((biomarker) => (
                                    <div
                                      key={biomarker.name}
                                      className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border/30"
                                    >
                                      <div className="flex items-center gap-3">
                                        {getStatusIcon(biomarker.status)}
                                        <div>
                                          <div className="font-medium text-foreground">{biomarker.name}</div>
                                          <div className="text-sm text-muted-foreground">
                                            {biomarker.referenceMin} - {biomarker.referenceMax} {biomarker.unit}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-semibold text-foreground">
                                          {biomarker.value} {biomarker.unit}
                                        </div>
                                        <div className="text-sm text-muted-foreground capitalize">
                                          {biomarker.status === 'normal' ? '✓ Normal' : 
                                           biomarker.status === 'high' ? '⚠ High' :
                                           biomarker.status === 'low' ? '⬇ Low' : '🚨 Critical'}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-3">
                                <Button variant="outline" className="flex items-center gap-2">
                                  <Download className="h-4 w-4" />
                                  Download PDF
                                </Button>
                                <Button variant="outline" className="flex items-center gap-2">
                                  <Share2 className="h-4 w-4" />
                                  Share with Doctor
                                </Button>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
                                  <Clock className="h-4 w-4" />
                                  <span>Processed {format(new Date(result.completed_at), 'MMM dd, HH:mm')}</span>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </SplitScreenContent>
          </SplitScreen>
        </div>
      </div>
      
      <BiomarkersMasterActionPopup
        open={biomarkerActionsOpen}
        onOpenChange={setBiomarkerActionsOpen}
      />
    </AppLayout>
  );
}