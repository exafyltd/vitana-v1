import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCreatorStatus } from '@/hooks/useCreator';
import { CheckCircle, Sparkles } from 'lucide-react';

export default function CreatorOnboarded() {
  const navigate = useNavigate();
  const { refetch } = useCreatorStatus();

  useEffect(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          <div className="flex justify-center gap-2">
            <Sparkles className="h-8 w-8 text-yellow-500" />
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold">Payment Setup Complete!</h1>
          <p className="text-muted-foreground">You're ready to start earning.</p>
          <Button onClick={() => navigate('/settings/billing')}>
            Go to Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
