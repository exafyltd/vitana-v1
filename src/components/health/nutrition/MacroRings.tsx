import { RecipeMacros } from "@/types/recipe";
import { t } from '@/lib/i18n-toast';

interface MacroRingsProps {
  macros: RecipeMacros;
  calories: number;
}

export function MacroRings({ macros, calories }: MacroRingsProps) {
  const totalMacros = macros.protein * 4 + macros.carbs * 4 + macros.fat * 9;
  const proteinPercent = (macros.protein * 4 / totalMacros) * 100;
  const carbsPercent = (macros.carbs * 4 / totalMacros) * 100;
  const fatPercent = (macros.fat * 9 / totalMacros) * 100;
  
  return (
    <div className="flex items-center justify-between p-6 bg-gradient-to-r from-primary/5 to-purple-500/5 dark:from-primary/10 dark:to-purple-500/10 rounded-2xl border border-border/50">
      <div className="flex gap-4">
        {/* Protein Ring */}
        <div className="relative w-20 h-20">
          <svg className="w-full h-full -rotate-90">
            <circle 
              cx="40" 
              cy="40" 
              r="32" 
              fill="none" 
              stroke="currentColor" 
              className="text-muted/30" 
              strokeWidth="6" 
            />
            <circle 
              cx="40" 
              cy="40" 
              r="32" 
              fill="none" 
              stroke="currentColor"
              className="text-blue-500 transition-all duration-1000"
              strokeWidth="6" 
              strokeDasharray={`${proteinPercent * 2} ${200 - proteinPercent * 2}`}
              strokeLinecap="round" 
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
              {Math.round(proteinPercent)}%
            </span>
            <span className="text-[10px] text-muted-foreground">P</span>
          </div>
        </div>
        
        {/* Carbs Ring */}
        <div className="relative w-20 h-20">
          <svg className="w-full h-full -rotate-90">
            <circle 
              cx="40" 
              cy="40" 
              r="32" 
              fill="none" 
              stroke="currentColor" 
              className="text-muted/30" 
              strokeWidth="6" 
            />
            <circle 
              cx="40" 
              cy="40" 
              r="32" 
              fill="none" 
              stroke="currentColor"
              className="text-teal-500 transition-all duration-1000"
              strokeWidth="6" 
              strokeDasharray={`${carbsPercent * 2} ${200 - carbsPercent * 2}`}
              strokeLinecap="round" 
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
              {Math.round(carbsPercent)}%
            </span>
            <span className="text-[10px] text-muted-foreground">C</span>
          </div>
        </div>
        
        {/* Fat Ring */}
        <div className="relative w-20 h-20">
          <svg className="w-full h-full -rotate-90">
            <circle 
              cx="40" 
              cy="40" 
              r="32" 
              fill="none" 
              stroke="currentColor" 
              className="text-muted/30" 
              strokeWidth="6" 
            />
            <circle 
              cx="40" 
              cy="40" 
              r="32" 
              fill="none" 
              stroke="currentColor"
              className="text-amber-500 transition-all duration-1000"
              strokeWidth="6" 
              strokeDasharray={`${fatPercent * 2} ${200 - fatPercent * 2}`}
              strokeLinecap="round" 
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              {Math.round(fatPercent)}%
            </span>
            <span className="text-[10px] text-muted-foreground">F</span>
          </div>
        </div>
      </div>
      
      {/* AI Microtip */}
      <div className="flex-1 ml-6">
        <p className="text-sm text-muted-foreground italic">
          {t('screens.health.balancedForRecoveryFocus')}
        </p>
      </div>
    </div>
  );
}
