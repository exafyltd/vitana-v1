import { useState } from 'react';
import { X, ShoppingCart, Zap, Star, Crown, Sparkles, ArrowRight } from 'lucide-react';
import { 
  ResponsiveDialog, 
  ResponsiveDialogContent, 
  ResponsiveDialogHeader, 
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle 
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { isIAPRestricted } from '@/lib/appilix';
import { notify, notifyError } from '@/lib/i18n-toast';

interface SpendCreditsPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const spendingCategories = [
  {
    id: 'premium-features',
    title: 'Premium Features',
    icon: Crown,
    items: [
      { name: 'Advanced Analytics Dashboard', cost: 100, description: 'Detailed health insights and predictions' },
      { name: 'Priority Customer Support', cost: 50, description: '24/7 dedicated support channel' },
      { name: 'Custom Health Plan Generation', cost: 150, description: 'AI-powered personalized health plans' }
    ]
  },
  {
    id: 'marketplace',
    title: 'Marketplace',
    icon: ShoppingCart,
    items: [
      { name: 'Premium Theme Pack', cost: 75, description: 'Exclusive app themes and customizations' },
      { name: 'Health Coaching Session', cost: 200, description: '1-on-1 session with certified health coach' },
      { name: 'Nutrition Analysis Add-on', cost: 125, description: 'Advanced meal planning and nutrition tracking' }
    ]
  },
  {
    id: 'services',
    title: 'Services',
    icon: Zap,
    items: [
      { name: 'Telehealth Consultation', cost: 300, description: 'Video consultation with healthcare provider' },
      { name: 'Lab Results Analysis', cost: 100, description: 'AI-powered analysis of your lab results' },
      { name: 'Fitness Plan Optimization', cost: 150, description: 'Personalized workout plan adjustments' }
    ]
  }
];

const quickSpendAmounts = [25, 50, 100, 250];

export function SpendCreditsPopup({ open, onOpenChange }: SpendCreditsPopupProps) {
  // Hide spend credits on iOS — prototype feature only
  if (isIAPRestricted()) return null;

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  
  const { getBalance, updateBalance } = useWallet();
  const creditsBalance = getBalance('CREDITS') || 0;

  const handleQuickSpend = (amount: number) => {
    setCustomAmount(amount.toString());
    setSelectedItem({ name: `${amount} Credits Purchase`, cost: amount, description: 'General platform credits' });
  };

  const handleItemSelect = (item: any) => {
    setSelectedItem(item);
    setCustomAmount(item.cost.toString());
  };

  const handleSpendCredits = async () => {
    const amount = parseInt(customAmount);
    
    if (!amount || amount <= 0) {
      notifyError('toasts.wallet.error', 'toasts.wallet.pleaseEnterValidAmount');
      return;
    }

    if (amount > creditsBalance) {
      notifyError('toasts.wallet.error', 'toasts.wallet.insufficientCreditsBalance');
      return;
    }

    setIsProcessing(true);
    
    try {
      await updateBalance('CREDITS', amount, 'subtract');
      
      notify('toasts.wallet.success');
      
      onOpenChange(false);
      setSelectedItem(null);
      setCustomAmount('');
      setSelectedCategory(null);
    } catch (error) {
      notifyError('toasts.wallet.error', 'toasts.wallet.failedProcessSpendingPleaseTryAgain');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-4xl" fullscreenOnMobile>
        <ResponsiveDialogHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <ResponsiveDialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Spend Credits
              </ResponsiveDialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Available: {creditsBalance.toLocaleString()} Credits
              </p>
            </div>
          </div>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody>
          <div className="space-y-6">
            {/* Quick Spend Options */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Quick Spend</Label>
              <div className="grid grid-cols-4 gap-3">
                {quickSpendAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant={customAmount === amount.toString() ? "default" : "outline"}
                    onClick={() => handleQuickSpend(amount)}
                    className="h-12 flex flex-col items-center justify-center"
                  >
                    <span className="font-semibold">{amount}</span>
                    <span className="text-xs">Credits</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div>
              <Label htmlFor="custom-amount" className="text-base font-semibold mb-2 block">
                Custom Amount
              </Label>
              <Input
                id="custom-amount"
                type="number"
                placeholder="Enter credits amount..."
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Spending Categories */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Available Purchases</Label>
              <div className="grid gap-4">
                {spendingCategories.map((category) => (
                  <Card key={category.id} className="border-2 hover:border-primary/50 transition-colors">
                    <CardHeader 
                      className="cursor-pointer" 
                      onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                    >
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <category.icon className="w-5 h-5" />
                          <span>{category.title}</span>
                        </div>
                        <ArrowRight className={`w-4 h-4 transition-transform ${
                          selectedCategory === category.id ? 'rotate-90' : ''
                        }`} />
                      </CardTitle>
                    </CardHeader>
                    
                    {selectedCategory === category.id && (
                      <CardContent className="pt-0">
                        <div className="grid gap-3">
                          {category.items.map((item) => (
                            <div
                              key={item.name}
                              className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-accent/50 ${
                                selectedItem?.name === item.name ? 'border-primary bg-accent' : ''
                              }`}
                              onClick={() => handleItemSelect(item)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold">{item.name}</h4>
                                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                                </div>
                                <Badge variant="secondary" className="ml-3">
                                  {item.cost} Credits
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>

            {/* Selected Item Summary */}
            {selectedItem && (
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Star className="w-5 h-5 text-primary" />
                    <span>Purchase Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{selectedItem.name}</span>
                      <Badge>{selectedItem.cost} Credits</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-semibold">Total Cost:</span>
                      <span className="font-bold text-lg">{selectedItem.cost} Credits</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <Button
            onClick={handleSpendCredits}
            disabled={!customAmount || parseInt(customAmount) <= 0 || parseInt(customAmount) > creditsBalance || isProcessing}
            className="flex-1 h-12"
          >
            {isProcessing ? 'Processing...' : `Spend ${customAmount || 0} Credits`}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-12">
            Cancel
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
