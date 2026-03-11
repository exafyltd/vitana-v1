import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Droplets, FlaskConical, Heart, AlertTriangle, ArrowRight, Stethoscope } from "lucide-react";

const LAB_TESTS = [
  {
    name: "Complete Blood Panel",
    description: "CBC, metabolic panel, lipids, vitamins & minerals",
    icon: Droplets,
    color: "bg-red-500/10 text-red-600",
  },
  {
    name: "Metabolic Health Panel",
    description: "Glucose, insulin, HbA1c, liver & kidney function",
    icon: FlaskConical,
    color: "bg-cyan-500/10 text-cyan-600",
  },
  {
    name: "Hormones Panel",
    description: "Testosterone, estrogen, cortisol, thyroid hormones",
    icon: Heart,
    color: "bg-indigo-500/10 text-indigo-600",
  },
  {
    name: "Allergy Panel",
    description: "IgE levels, food sensitivities, environmental allergens",
    icon: AlertTriangle,
    color: "bg-orange-500/10 text-orange-600",
  },
];

interface QuickLabOrderSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickLabOrderSheet({ open, onOpenChange }: QuickLabOrderSheetProps) {
  const navigate = useNavigate();

  const handleOrder = (testName: string) => {
    onOpenChange(false);
    navigate('/health/services-hub');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[75dvh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" />
            Order a Lab Test
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-3">
          {LAB_TESTS.map((test) => {
            const Icon = test.icon;
            return (
              <div
                key={test.name}
                className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg ${test.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{test.name}</p>
                  <p className="text-xs text-muted-foreground">{test.description}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleOrder(test.name)}>
                  Order
                </Button>
              </div>
            );
          })}

          <button
            onClick={() => { onOpenChange(false); navigate('/health/services-hub'); }}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary hover:underline"
          >
            Browse All Tests <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
