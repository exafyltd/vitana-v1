import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { walletNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Wallet, DollarSign, Gift, CreditCard, TrendingUp } from "lucide-react";

const balanceData = {
  currentBalance: 2450.75,
  pendingRewards: 125.50,
  lifetimeEarnings: 8950.25,
  benefits: [
    { name: "Premium Health Coaching", status: "active", value: "$299/month" },
    { name: "Lab Test Discounts", status: "active", value: "25% off" },
    { name: "Vitana Index Plus", status: "active", value: "Advanced Analytics" },
    { name: "Community Access", status: "active", value: "All Groups" }
  ],
  recentTransactions: [
    { date: "2024-01-15", description: "Health Coach Session Reward", amount: +25.00, type: "earned" },
    { date: "2024-01-12", description: "Lab Test Discount Applied", amount: -75.00, type: "discount" },
    { date: "2024-01-10", description: "Referral Bonus", amount: +50.00, type: "earned" },
    { date: "2024-01-08", description: "Wellness Challenge Prize", amount: +100.00, type: "earned" }
  ]
};

function Balance() {
  return (
    <AppLayout>
      <SEO 
        title="Balance & Benefits - Vitana Wallet" 
        description="Manage your Vitana wallet balance, view active benefits, and track your earnings and spending history."
      />
      <SubNavigation items={walletNavigation} />
      
      <div className="px-6 py-8 space-y-8">
        <StandardHeader 
          title="Balance & Benefits"
          description="Manage your wallet balance and track your active benefits"
        />

        {/* Balance Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${balanceData.currentBalance.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Available to spend</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Rewards</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${balanceData.pendingRewards.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Processing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lifetime Earnings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${balanceData.lifetimeEarnings.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Total earned</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active Benefits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Active Benefits
              </CardTitle>
              <CardDescription>
                Your current membership benefits and perks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {balanceData.benefits.map((benefit, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <div className="font-medium">{benefit.name}</div>
                    <div className="text-sm text-muted-foreground">Value: {benefit.value}</div>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Recent Transactions
              </CardTitle>
              <CardDescription>
                Your latest wallet activity and transactions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {balanceData.recentTransactions.map((transaction, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{transaction.description}</div>
                    <div className="text-sm text-muted-foreground">{transaction.date}</div>
                  </div>
                  <div className={`font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-blue-600'}`}>
                    {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4">
          <Button>
            <DollarSign className="h-4 w-4 mr-2" />
            Add Funds
          </Button>
          <Button variant="outline">
            <CreditCard className="h-4 w-4 mr-2" />
            Withdraw
          </Button>
          <Button variant="outline">View All Transactions</Button>
        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(Balance, SCREEN_IDS.WALLET_BALANCE);