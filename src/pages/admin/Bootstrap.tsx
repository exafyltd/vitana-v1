import { useState } from "react";
import { Plus, Trash2, Shield, Users, AlertCircle, CheckCircle, Clock, X } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import AdminHeader from "@/components/admin/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { adminSystemNavigation } from "@/config/navigation";
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface BootstrapResult {
  email: string;
  status: 'elevated' | 'already_admin' | 'user_not_found' | 'elevation_failed';
  user_id?: string;
  error?: string;
}

interface AdminUser {
  id: string;
  email: string;
  full_name?: string;
  is_admin: boolean;
}

export default function Bootstrap() {
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [emailInput, setEmailInput] = useState("");
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [bootstrapResults, setBootstrapResults] = useState<BootstrapResult[]>([]);
  const [currentAdmins, setCurrentAdmins] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  // Security check - only Exafy admins can access
  if (!hasPermission("exafy.admin")) {
    return (
      <AppLayout>
        <SEO title={t('screens.admin.adminBootstrapAccessDenied')} />
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="flex flex-col items-center space-y-4 p-6">
              <AlertCircle className="h-16 w-16 text-destructive" />
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">{t('screens.admin.accessRestricted')}</h2>
                <p className="text-muted-foreground">
                  {t('screens.admin.youMustExafyAdministratorAccessBootstrap')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const loadCurrentAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const { data, error } = await supabase.functions.invoke('list_super_admins');
      if (error) throw error;

      setCurrentAdmins(data.admins || []);
      notify('toasts.admin.adminsLoaded');
    } catch (error) {
      console.error('Error loading admins:', error);
      notifyError('toasts.admin.errorLoadingAdmins', 'toasts.admin.failedLoadCurrentAdministrators');
    } finally {
      setLoadingAdmins(false);
    }
  };

  const removeAdmin = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('remove_super_admin', {
        body: { user_id: userId }
      });

      if (error) throw error;

      notify('toasts.admin.adminRemoved');

      // Reload the admin list
      await loadCurrentAdmins();
    } catch (error) {
      console.error('Error removing admin:', error);
      notifyError('toasts.admin.errorRemovingAdmin');
    }
  };

  const addEmail = () => {
    if (!emailInput.trim()) return;
    
    const email = emailInput.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      notifyError('toasts.admin.invalidEmail', 'toasts.admin.pleaseEnterValidEmailAddress');
      return;
    }

    if (adminEmails.includes(email)) {
      notifyError('toasts.admin.emailAlreadyAdded', 'toasts.admin.thisEmailAlreadyList');
      return;
    }

    setAdminEmails([...adminEmails, email]);
    setEmailInput("");
  };

  const removeEmail = (emailToRemove: string) => {
    setAdminEmails(adminEmails.filter(email => email !== emailToRemove));
  };

  const runBootstrap = async () => {
    if (adminEmails.length === 0) {
      notifyError('toasts.admin.noEmailsProcess', 'toasts.admin.pleaseAddAtLeastOneEmail');
      return;
    }

    setIsLoading(true);
    setBootstrapResults([]);

    try {
      const { data, error } = await supabase.functions.invoke('bootstrap_admin', {
        body: { emails: adminEmails }
      });

      if (error) throw error;

      setBootstrapResults(data.results || []);
      
      // Show success notification
      const successful = data.results?.filter((r: BootstrapResult) => r.status === 'elevated').length || 0;
      if (successful > 0) {
        notify('toasts.admin.bootstrapCompleted');
      }

      // Reload current admins
      await loadCurrentAdmins();
      
      // Clear email list after successful bootstrap
      setAdminEmails([]);
      
    } catch (error) {
      console.error('Bootstrap error:', error);
      notifyError('toasts.admin.bootstrapFailed');
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'elevated':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'already_admin':
        return <Shield className="h-4 w-4 text-primary" />;
      case 'user_not_found':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'elevation_failed':
        return <X className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'elevated':
        return 'default';
      case 'already_admin':
        return 'secondary';
      case 'user_not_found':
      case 'elevation_failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <AppLayout>
      <SEO title={t('screens.admin.adminBootstrap')} description="Manage super administrator accounts" />
      <SubNavigation items={adminSystemNavigation} />
      
      <div className="p-6 space-y-6">
        <AdminHeader
          title={t('screens.admin.adminBootstrap')}
          description="Elevate users to Exafy super administrators and manage admin accounts"
          emoji="🛡️"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Email Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                {t('screens.admin.addAdminEmails')}
              </CardTitle>
              <CardDescription>
                {t('screens.admin.addEmailAddressesElevateSuperAdministrator')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder={t('screens.admin.adminExampleCom')}
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addEmail()}
                />
                <Button onClick={addEmail}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {adminEmails.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">{t('screens.admin.emailsProcessLength', { length: adminEmails.length })}</h4>
                  <div className="space-y-1">
                    {adminEmails.map((email) => (
                      <div key={email} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{email}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEmail(email)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {adminEmails.length > 0 && (
                <Button 
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? "Processing..." : `Bootstrap ${adminEmails.length} Admin(s)`}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Current Admins */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('screens.admin.currentSuperAdmins')}
              </CardTitle>
              <CardDescription>
                {t('screens.admin.listCurrentExafySuperAdministrators')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  onClick={loadCurrentAdmins} 
                  disabled={loadingAdmins}
                  variant="outline"
                  className="w-full"
                >
                  {loadingAdmins ? "Loading..." : "Refresh Admin List"}
                </Button>
                
                {currentAdmins.length > 0 ? (
                  <div className="space-y-2">
                    {currentAdmins.map((admin) => (
                      <div key={admin.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div>
                          <div className="text-sm font-medium">{admin.email}</div>
                          {admin.full_name && (
                            <div className="text-xs text-muted-foreground">{admin.full_name}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            <Shield className="h-3 w-3 mr-1" />
                            {t('screens.admin.admin')}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAdmin(admin.id, admin.email)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    {t('screens.admin.noAdministratorsLoadedClickRefreshLoad')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bootstrap Results */}
        {bootstrapResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('screens.admin.bootstrapResults')}</CardTitle>
              <CardDescription>{t('screens.admin.resultsFromLastBootstrapOperation')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {bootstrapResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.status)}
                      <div>
                        <div className="font-medium">{result.email}</div>
                        {result.error && (
                          <div className="text-sm text-destructive">{result.error}</div>
                        )}
                      </div>
                    </div>
                    <Badge variant={getStatusVariant(result.status)}>
                      {result.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Notice */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{t('screens.admin.securityNotice')}</strong>{t('screens.admin.superAdministratorsHaveFullAccessAll')}
          </AlertDescription>
        </Alert>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('screens.admin.confirmAdminBootstrap')}</DialogTitle>
            <DialogDescription>{t('screens.admin.youAboutElevateLengthUserS', { length: adminEmails.length })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('screens.admin.emailsProcessed')}</p>
            <div className="bg-muted p-2 rounded text-sm">
              {adminEmails.map((email, index) => (
                <div key={email}>{index + 1}. {email}</div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              {t('screens.admin.cancel')}
            </Button>
            <Button onClick={runBootstrap} disabled={isLoading}>
              {isLoading ? "Processing..." : "Confirm Bootstrap"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}