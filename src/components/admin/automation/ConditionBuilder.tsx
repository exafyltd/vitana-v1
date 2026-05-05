import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface ConditionBuilderProps {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
}

const FIELD_OPTIONS = [
  { value: "user_role", label: "User Role" },
  { value: "user_status", label: "User Status" },
  { value: "time_of_day", label: "Time of Day" },
  { value: "day_of_week", label: "Day of Week" },
  { value: "inactive_days", label: "Days Inactive" },
];

const OPERATOR_OPTIONS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
  { value: "contains", label: "Contains" },
];

export default function ConditionBuilder({ conditions, onChange }: ConditionBuilderProps) {
  const addCondition = () => {
    onChange([...conditions, { field: "", operator: "", value: "" }]);
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    const updated = conditions.map((cond, i) => 
      i === index ? { ...cond, ...updates } : cond
    );
    onChange(updated);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('screens.admin.text2AddConditionsOptional')}</CardTitle>
        <CardDescription>{t('screens.admin.defineWhenThisAutomationShouldRun')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {conditions.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">{t('screens.admin.noConditionsSetAutomationWill')}</p>
            <Button onClick={addCondition} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t('screens.admin.addFirstCondition')}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {conditions.map((condition, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">{t('screens.admin.field')}</Label>
                  <Select 
                    value={condition.field} 
                    onValueChange={(value) => updateCondition(index, { field: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('screens.admin.selectField')} />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 space-y-2">
                  <Label className="text-xs">{t('screens.admin.operator')}</Label>
                  <Select 
                    value={condition.operator} 
                    onValueChange={(value) => updateCondition(index, { operator: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('screens.admin.selectOperator')} />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATOR_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 space-y-2">
                  <Label className="text-xs">{t('screens.admin.value')}</Label>
                  <Input 
                    value={condition.value}
                    onChange={(e) => updateCondition(index, { value: e.target.value })}
                    placeholder={t('screens.admin.enterValue')}
                  />
                </div>

                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => removeCondition(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button onClick={addCondition} variant="outline" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {t('screens.admin.addAnotherCondition')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
