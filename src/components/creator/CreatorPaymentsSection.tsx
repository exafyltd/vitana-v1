import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCreatorStatus, useCreatorDashboard } from '@/hooks/useCreator';
import { EnablePaymentsButton } from './EnablePaymentsButton';
import { DollarSign, ExternalLink } from 'lucide-react';

export function CreatorPaymentsSection() {
  const { data: status, isLoading } = useCreatorStatus();
  const { mutate: openDashboard, isPending: isDashboardLoading } = useCreatorDashboard();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Creator Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading status...</p>
        </CardContent>
      </Card>
    );
  }

  const isFullyOnboarded = status?.charges_enabled && status?.payouts_enabled;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Creator Payments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Payment Status</p>
            <p className="text-xs text-muted-foreground">Receive 90% of revenue</p>
          </div>
          {isFullyOnboarded ? (
            <Badge variant="default" className="bg-green-600">Active</Badge>
          ) : (
            <Badge variant="secondary">Not Enabled</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <EnablePaymentsButton />
          {isFullyOnboarded && (
            <Button variant="outline" size="sm" onClick={() => openDashboard()} disabled={isDashboardLoading}>
              <ExternalLink className="h-4 w-4" />
              View Dashboard
            </Button>
          )}
        </div>

        <div className="rounded-md border p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Revenue Examples (90/10 split)</p>
          <div className="space-y-1">
            {[9.99, 19.99, 49.99].map(price => (
              <div key={price} className="flex justify-between text-xs">
                <span className="text-muted-foreground">Price: ${price}</span>
                <span className="font-medium">You: ${(price * 0.9).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
