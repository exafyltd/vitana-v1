import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Bot, MessageSquare, Zap, Play, Save } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import SEO from '@/components/SEO';
import StandardHeader from '@/components/StandardHeader';
import { t } from '@/lib/i18n-toast';

export default function AgentPromptCenter() {
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');

  const promptTemplates = [
    {
      id: 'health-optimization',
      title: 'Health Optimization Agent',
      description: 'Focus on analyzing health data and suggesting improvements',
      prompt: 'You are a health optimization AI. Analyze my wellness data and provide actionable recommendations for improving my Vitana Index score.',
      category: 'Health',
      color: 'bg-green-500'
    },
    {
      id: 'longevity-coach',
      title: 'Longevity Lifestyle Coach',
      description: 'Provide guidance on longevity-focused lifestyle changes',
      prompt: 'Act as my longevity coach. Help me make daily decisions that support healthy aging and optimal lifespan.',
      category: 'Lifestyle',
      color: 'bg-blue-500'
    },
    {
      id: 'social-connector',
      title: 'Community Connection Agent',
      description: 'Help find and connect with like-minded people and groups',
      prompt: 'You are my social wellness assistant. Help me find meaningful connections and community activities that align with my health goals.',
      category: 'Social',
      color: 'bg-purple-500'
    },
    {
      id: 'productivity-optimizer',
      title: 'Wellness Productivity Agent',
      description: 'Optimize schedules and routines for better wellness outcomes',
      prompt: 'Optimize my daily schedule and routines to maximize wellness while maintaining productivity and work-life balance.',
      category: 'Productivity',
      color: 'bg-orange-500'
    }
  ];

  return (
    <AppLayout>
      <SEO 
        title={t('screens.ai.agentPromptCenterVitana')} 
        description="Customize your AI agent's behavior and focus areas"
        canonical={window.location.href}
      />
      <div className="p-6 space-y-6">
        <StandardHeader
          title={t('screens.ai.agentPromptCenter')}
          description="Customize how your AI agent thinks and responds to your needs"
          emoji="🤖"
        />

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Prompt Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {t('screens.ai.agentTemplates')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {promptTemplates.map((template) => (
                <div 
                  key={template.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedPrompt === template.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/30'
                  }`}
                  onClick={() => setSelectedPrompt(template.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${template.color}`} />
                      <h3 className="font-medium">{template.title}</h3>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {template.description}
                  </p>
                  <div className="bg-muted/50 p-3 rounded text-xs font-mono leading-relaxed">
                    {template.prompt}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Custom Prompt Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                {t('screens.ai.customAgentPrompt')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('screens.ai.agentName')}</label>
                <Input placeholder={t('screens.ai.myWellnessAssistant')} />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('screens.ai.systemPrompt')}</label>
                <Textarea 
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={t('screens.ai.defineHowYourAiAgentShould')}
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('screens.ai.focusAreas')}</label>
                <div className="flex flex-wrap gap-2">
                  {['Health', 'Social', 'Productivity', 'Longevity', 'Wellness', 'Community'].map((area) => (
                    <Badge key={area} variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button className="flex-1" disabled>
                  <Play className="h-4 w-4 mr-2" />
                  {t('screens.ai.testAgent')}
                </Button>
                <Button variant="outline" className="flex-1" disabled>
                  <Save className="h-4 w-4 mr-2" />
                  {t('screens.ai.savePrompt')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Placeholder Notice */}
        <Card className="max-w-6xl mx-auto border-dashed">
          <CardContent className="p-6 text-center">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('screens.ai.agentPromptCenterPhase5')}</h3>
            <p className="text-muted-foreground">{t('screens.ai.thisReadonlyPlaceholderForAgentPrompt')}
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}