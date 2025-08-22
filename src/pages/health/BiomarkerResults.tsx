import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Download, Calendar, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

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

export default function BiomarkerResults() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

      setResults(formattedResults);
      if (formattedResults.length > 0) {
        setSelectedResult(formattedResults[0]);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-green-600 bg-green-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'high': return <TrendingUp className="h-4 w-4" />;
      case 'low': return <TrendingDown className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      default: return <Minus className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-6xl mb-4">🧪</div>
            <CardTitle className="mb-2">No Lab Results Yet</CardTitle>
            <CardDescription className="mb-4">
              Your lab test results will appear here once they're ready.
            </CardDescription>
            <Button onClick={() => window.location.href = '/discover'}>
              Order Lab Tests
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Biomarker Results</h1>
          <p className="text-muted-foreground">View and track your lab test results over time</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Results
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Test History Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-2">
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => setSelectedResult(result)}
                    className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${
                      selectedResult?.id === result.id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="font-medium text-sm">{result.lab_test.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(result.completed_at), 'MMM dd, yyyy')}
                    </div>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {result.lab_test.provider_name}
                    </Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Results View */}
        <div className="lg:col-span-3">
          {selectedResult && (
            <div className="space-y-6">
              {/* Test Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedResult.lab_test.name}</CardTitle>
                      <CardDescription>
                        Completed on {format(new Date(selectedResult.completed_at), 'MMMM dd, yyyy')}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {selectedResult.lab_test.provider_name}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>

              <Tabs defaultValue="overview" className="w-full">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="detailed">Detailed Results</TabsTrigger>
                  <TabsTrigger value="trends">Trends</TabsTrigger>
                  <TabsTrigger value="insights">AI Insights</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Mock biomarker data for demonstration */}
                    {[
                      { name: 'Cholesterol', value: 190, unit: 'mg/dL', status: 'normal', min: 125, max: 200 },
                      { name: 'Glucose', value: 95, unit: 'mg/dL', status: 'normal', min: 70, max: 100 },
                      { name: 'Hemoglobin', value: 14.2, unit: 'g/dL', status: 'normal', min: 12, max: 16 },
                      { name: 'Vitamin D', value: 25, unit: 'ng/mL', status: 'low', min: 30, max: 100 },
                    ].map((biomarker) => (
                      <Card key={biomarker.name}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{biomarker.name}</CardTitle>
                            <Badge className={getStatusColor(biomarker.status)}>
                              {getStatusIcon(biomarker.status)}
                              {biomarker.status.toUpperCase()}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold mb-2">
                            {biomarker.value} {biomarker.unit}
                          </div>
                          <div className="text-sm text-muted-foreground mb-3">
                            Normal: {biomarker.min} - {biomarker.max} {biomarker.unit}
                          </div>
                          <Progress 
                            value={
                              Math.min(100, Math.max(0, 
                                ((biomarker.value - biomarker.min) / 
                                (biomarker.max - biomarker.min)) * 100
                              ))
                            }
                            className="h-2"
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="detailed" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Detailed Biomarker Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {[
                          { name: 'Cholesterol', value: 190, unit: 'mg/dL', status: 'normal', min: 125, max: 200 },
                          { name: 'Glucose', value: 95, unit: 'mg/dL', status: 'normal', min: 70, max: 100 },
                          { name: 'Hemoglobin', value: 14.2, unit: 'g/dL', status: 'normal', min: 12, max: 16 },
                          { name: 'Vitamin D', value: 25, unit: 'ng/mL', status: 'low', min: 30, max: 100 },
                        ].map((biomarker) => (
                          <div key={biomarker.name} className="border-b pb-4 last:border-b-0">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold">{biomarker.name}</h4>
                              <Badge className={getStatusColor(biomarker.status)}>
                                {biomarker.status.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground">Your Result</div>
                                <div className="font-semibold">{biomarker.value} {biomarker.unit}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Reference Range</div>
                                <div>{biomarker.min} - {biomarker.max} {biomarker.unit}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Status</div>
                                <div className="flex items-center gap-1">
                                  {getStatusIcon(biomarker.status)}
                                  {biomarker.status === 'normal' ? 'Within normal range' : 
                                   biomarker.status === 'high' ? 'Above normal range' :
                                   biomarker.status === 'low' ? 'Below normal range' : 'Critical - consult doctor'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="trends">
                  <Card>
                    <CardHeader>
                      <CardTitle>Biomarker Trends</CardTitle>
                      <CardDescription>Track changes in your biomarkers over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={[
                            { date: '2024-01', cholesterol: 180, glucose: 95 },
                            { date: '2024-02', cholesterol: 175, glucose: 92 },
                            { date: '2024-03', cholesterol: 170, glucose: 88 },
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="cholesterol" stroke="#8884d8" strokeWidth={2} />
                            <Line type="monotone" dataKey="glucose" stroke="#82ca9d" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="insights">
                  <Card>
                    <CardHeader>
                      <CardTitle>AI-Powered Health Insights</CardTitle>
                      <CardDescription>Personalized recommendations based on your results</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="prose max-w-none">
                        <p className="text-sm leading-relaxed">
                          {selectedResult.ai_insights || 
                            "AI insights are being generated for your results. This analysis will provide personalized recommendations based on your biomarker values, lifestyle factors, and health goals."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}