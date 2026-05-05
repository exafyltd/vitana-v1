import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { AdminGuard } from "@/routes/guards/AdminGuard";
import { adminCommunityNavigation } from "@/config/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, AlertTriangle, Flag } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifyError, t } from '@/lib/i18n-toast';

interface ContentReport {
  id: string;
  reporter_user_id: string;
  content_type: string;
  content_id: string;
  reason: string;
  description: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  action_taken: string | null;
  admin_notes: string | null;
  created_at: string;
}

const ReportedContent = () => {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    fetchReports();
    
    // Realtime subscription
    const channel = supabase
      .channel('admin-reports-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content_reports' }, () => {
        fetchReports();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('content_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      notifyError('toasts.admin.failedLoadReports');
    } finally {
      setLoading(false);
    }
  };

  const resolveReport = async (reportId: string, action: 'removed' | 'warned' | 'no_action', status: 'resolved' | 'dismissed') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('content_reports')
        .update({
          status,
          action_taken: action,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || null
        })
        .eq('id', reportId);

      if (error) throw error;
      toast.success(`Report ${status}`);
      setAdminNotes("");
      setSelectedReport(null);
      fetchReports();
    } catch (error) {
      console.error('Error resolving report:', error);
      notifyError('toasts.admin.failedResolveReport');
    }
  };

  const filteredReports = reports.filter(report => {
    if (activeTab === 'all') return true;
    return report.status === activeTab;
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: "secondary" as const, label: "Pending", color: "text-yellow-600" },
      reviewing: { variant: "outline" as const, label: "Reviewing", color: "text-blue-600" },
      resolved: { variant: "default" as const, label: "Resolved", color: "text-green-600" },
      dismissed: { variant: "destructive" as const, label: "Dismissed", color: "text-gray-600" }
    };
    const config = variants[status as keyof typeof variants] || variants.pending;
    return <Badge variant={config.variant} className={config.color}>{config.label}</Badge>;
  };

  const getReasonBadge = (reason: string) => {
    const colors = {
      spam: "bg-orange-100 text-orange-700",
      harassment: "bg-red-100 text-red-700",
      inappropriate: "bg-purple-100 text-purple-700",
      violence: "bg-red-200 text-red-800",
      misinformation: "bg-yellow-100 text-yellow-700",
      other: "bg-gray-100 text-gray-700"
    };
    return <Badge className={colors[reason as keyof typeof colors] || colors.other}>{reason}</Badge>;
  };

  return (
    <AdminGuard>
      <AppLayout>
        <SEO title={t('screens.admin.reportedContentAdmin')} description="Review and resolve user reports" />
        
        <SubNavigation items={adminCommunityNavigation} />
        
        <div className="p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
          <div className="max-w-7xl mx-auto space-y-6">
            <AdminHeader
              title={t('screens.admin.reportedContent')}
              description="Review and resolve user reports across community features"
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">{t('screens.admin.allReports')}</TabsTrigger>
                <TabsTrigger value="pending">{t('screens.admin.pending')}</TabsTrigger>
                <TabsTrigger value="reviewing">{t('screens.admin.reviewing')}</TabsTrigger>
                <TabsTrigger value="resolved">{t('screens.admin.resolved')}</TabsTrigger>
                <TabsTrigger value="dismissed">{t('screens.admin.dismissed')}</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-6">
                <Card>
                  {loading ? (
                    <div className="p-12 text-center text-muted-foreground">{t('screens.admin.loadingReports')}</div>
                  ) : filteredReports.length === 0 ? (
                    <div className="p-12 text-center">
                      <Flag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">{t('screens.admin.noReportsFound')}</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('screens.admin.contentType')}</TableHead>
                          <TableHead>{t('screens.admin.reason')}</TableHead>
                          <TableHead>{t('screens.admin.description')}</TableHead>
                          <TableHead>{t('screens.admin.reported')}</TableHead>
                          <TableHead>{t('screens.admin.status')}</TableHead>
                          <TableHead>{t('screens.admin.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReports.map((report) => (
                          <TableRow key={report.id}>
                            <TableCell>
                              <Badge variant="outline">{report.content_type}</Badge>
                            </TableCell>
                            <TableCell>{getReasonBadge(report.reason)}</TableCell>
                            <TableCell>
                              <p className="text-sm truncate max-w-xs">{report.description || 'No description'}</p>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(report.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{getStatusBadge(report.status)}</TableCell>
                            <TableCell>
                              {report.status === 'pending' || report.status === 'reviewing' ? (
                                <div className="flex items-center gap-2">
                                  {selectedReport === report.id ? (
                                    <div className="flex flex-col gap-2 min-w-[200px]">
                                      <Textarea
                                        placeholder={t('screens.admin.adminNotesOptional')}
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        className="text-sm h-20"
                                      />
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() => resolveReport(report.id, 'removed', 'resolved')}
                                        >
                                          Remove
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => resolveReport(report.id, 'no_action', 'dismissed')}
                                        >
                                          Dismiss
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setSelectedReport(null);
                                            setAdminNotes("");
                                          }}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setSelectedReport(report.id)}
                                    >
                                      <AlertTriangle className="h-4 w-4 mr-1" />
                                      {t('screens.admin.review')}
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground">
                                    {report.action_taken || 'N/A'}
                                  </span>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </AppLayout>
    </AdminGuard>
  );
};

export default ReportedContent;