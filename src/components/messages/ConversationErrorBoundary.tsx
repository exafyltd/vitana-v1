import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { t } from '@/lib/i18n-toast';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ConversationErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ConversationView Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="flex flex-col h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {t('screens.messages.conversationError')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                {t('screens.messages.failedLoadConversation')}
              </p>
              <p className="text-sm text-muted-foreground">
                {this.state.error?.message || 'Unknown error'}
              </p>
              <Button 
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {t('screens.messages.tryAgain')}
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}