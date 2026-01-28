/**
 * EARNINGS BY SOURCE CARDS
 * 
 * Two expandable cards showing earnings breakdown by source:
 * - My Event Sales (direct sales as organizer)
 * - Reseller Commissions (from Sell & Earn)
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Ticket, Award, ChevronDown, ChevronRight, Wallet, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";

interface EarningsBySourceCardsProps {
  directSales: {
    gross: number;
    tickets: number;
    lastMonth: number;
  };
  resellerCommissions: {
    earned: number;
    pending: number;
    inWallet: number;
    ticketsSold: number;
  };
  isLoading?: boolean;
}

export function EarningsBySourceCards({
  directSales,
  resellerCommissions,
  isLoading,
}: EarningsBySourceCardsProps) {
  const navigate = useNavigate();
  const [directOpen, setDirectOpen] = useState(false);
  const [resellerOpen, setResellerOpen] = useState(false);
  const { translate } = useTranslation();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">{translate('business.kpi.earningsBySource')}</h3>
      
      {/* My Event Sales Card */}
      <Collapsible open={directOpen} onOpenChange={setDirectOpen}>
        <Card className="bg-card/70 backdrop-blur-sm border-border/40 rounded-2xl shadow-sm overflow-hidden">
          <CollapsibleTrigger asChild>
            <CardContent className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                  <Ticket className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{translate('business.kpi.myEventSales')}</p>
                  <p className="text-xs text-muted-foreground">
                    {directSales.tickets} {translate('business.reseller.tickets')} · {translate('business.history.last30Days')}: {formatCurrency(directSales.lastMonth)}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                    {isLoading ? "..." : formatCurrency(directSales.gross)}
                  </p>
                  {directOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardContent>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="px-4 pb-4 pt-0 border-t border-border/30">
              <div className="pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{translate('business.kpi.totalGrossSales')}</span>
                  <span className="font-medium">{formatCurrency(directSales.gross)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{translate('business.history.ticketsSold')}</span>
                  <span className="font-medium">{directSales.tickets}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{translate('business.history.last30Days')}</span>
                  <span className="font-medium">{formatCurrency(directSales.lastMonth)}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 rounded-full gap-2"
                  onClick={() => navigate("/business/services")}
                >
                  {translate('business.kpi.viewMyEvents')}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Reseller Commissions Card */}
      <Collapsible open={resellerOpen} onOpenChange={setResellerOpen}>
        <Card className="bg-card/70 backdrop-blur-sm border-border/40 rounded-2xl shadow-sm overflow-hidden">
          <CollapsibleTrigger asChild>
            <CardContent className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                  <Award className="h-5 w-5 text-accent" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{translate('business.kpi.resellerCommissions')}</p>
                  <p className="text-xs text-muted-foreground">
                    {resellerCommissions.ticketsSold} {translate('business.reseller.tickets')} · {formatCurrency(resellerCommissions.pending)} {translate('business.history.pendingPayout').toLowerCase()}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold text-accent">
                    {isLoading ? "..." : formatCurrency(resellerCommissions.earned)}
                  </p>
                  {resellerOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardContent>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="px-4 pb-4 pt-0 border-t border-border/30">
              <div className="pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{translate('business.kpi.totalEarned')}</span>
                  <span className="font-medium">{formatCurrency(resellerCommissions.earned)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{translate('business.history.pendingPayout')}</span>
                  <span className="font-medium text-amber-600">{formatCurrency(resellerCommissions.pending)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{translate('business.reseller.inWallet')}</span>
                  <span className="font-medium text-emerald-600">{formatCurrency(resellerCommissions.inWallet)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{translate('business.history.ticketsSold')}</span>
                  <span className="font-medium">{resellerCommissions.ticketsSold}</span>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-full gap-2"
                    onClick={() => navigate("/business/sell-earn")}
                  >
                    {translate('business.kpi.goToSellEarn')}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full gap-2"
                    onClick={() => navigate("/wallet?filter=reseller_commission")}
                  >
                    <Wallet className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
