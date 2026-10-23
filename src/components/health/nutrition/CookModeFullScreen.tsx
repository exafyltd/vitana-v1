import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface CookModeFullScreenProps {
  steps: string[];
  recipeName: string;
  heroImage: string;
  onExit: () => void;
}

export function CookModeFullScreen({ 
  steps, 
  recipeName, 
  heroImage, 
  onExit 
}: CookModeFullScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExit();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setCurrentStep(prev => Math.min(steps.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setCurrentStep(prev => Math.max(0, prev - 1));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [steps.length, onExit]);
  
  return (
    // design-allow-next-line: on-media scrim, theme-independent (cook-mode backdrop over the blurred recipe photo)
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col">
      {/* Blurred Background Image */}
      <div 
        className="absolute inset-0 opacity-10 blur-3xl"
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      {/* Content Container */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/10">
          <h2 className="text-xl font-semibold text-primary-foreground">{recipeName}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onExit}
            className="text-primary-foreground hover:bg-card/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Step Progress */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-primary-foreground/70">{t('screens.health.stepValue0Length', { value0: currentStep + 1, length: steps.length })}</span>
            <span className="text-sm text-primary-foreground/70">{t('screens.health.value0Complete', { value0: Math.round(((currentStep + 1) / steps.length) * 100) })}
            </span>
          </div>
          <Progress 
            value={((currentStep + 1) / steps.length) * 100} 
            className="h-2 bg-card/20"
          />
        </div>
        
        {/* Step Content */}
        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <p className="text-2xl md:text-3xl lg:text-4xl text-primary-foreground text-center leading-relaxed max-w-4xl">
            {steps[currentStep]}
          </p>
        </div>
        
        {/* Navigation */}
        <div className="flex items-center gap-4 p-6 border-t border-border/10">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 bg-card/10 border-border/20 text-primary-foreground hover:bg-card/20"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          >
            <ChevronLeft className="w-5 h-5 me-2" />
            {t('screens.health.previous')}
          </Button>
          
          {currentStep === steps.length - 1 ? (
            <Button
              size="lg"
              className="flex-1 bg-status-success hover:bg-status-success text-primary-foreground border-0"
              onClick={onExit}
            >
              {t('screens.health.doneCooking')}
            </Button>
          ) : (
            <Button
              size="lg"
              className="flex-1 bg-card text-foreground hover:bg-card/90 border-0"
              onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
            >{t('screens.health.next')}
              <ChevronRight className="w-5 h-5 ms-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
