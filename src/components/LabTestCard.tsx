import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Droplets, Building2, Star } from 'lucide-react';
import { withCardId } from '@/lib/withCardId';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
import { t } from '@/lib/i18n-toast';

interface LabTest {
  id: string;
  name: string;
  description: string;
  category: string;
  biomarkers: string[];
  price: number;
  turnaround_days: number;
  sample_type: string;
  provider_name: string;
}

interface LabTestCardProps {
  labTest: LabTest;
  onOrder: (labTest: LabTest) => void;
}

const getCategoryColor = (category: string) => {
  const colors = {
    'blood_markers': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    'genomics': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    'microbiome': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'metabolomics': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    'allergy': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    'cancer': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
    'specialized': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  };
  return colors[category as keyof typeof colors] || colors.specialized;
};

const formatCategoryName = (category: string) => {
  return category.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

function LabTestCardBase({ labTest, onOrder }: LabTestCardProps) {
  return (
    <Card className="h-full hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Badge className={getCategoryColor(labTest.category)}>
            {formatCategoryName(labTest.category)}
          </Badge>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              ${labTest.price.toFixed(0)}
            </div>
            <div className="text-sm text-muted-foreground">
              ${(labTest.price / labTest.biomarkers.length).toFixed(0)}/marker
            </div>
          </div>
        </div>
        <CardTitle className="text-xl leading-tight">{labTest.name}</CardTitle>
        <CardDescription className="text-sm line-clamp-2">
          {labTest.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{labTest.turnaround_days} days</span>
          </div>
          <div className="flex items-center gap-1">
            <Droplets className="h-4 w-4" />
            <span>{labTest.sample_type}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{labTest.provider_name}</span>
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-muted-foreground">4.8</span>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium mb-2">
            Biomarkers ({labTest.biomarkers.length}):
          </div>
          <div className="flex flex-wrap gap-1">
            {labTest.biomarkers.slice(0, 4).map((biomarker, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {biomarker}
              </Badge>
            ))}
            {labTest.biomarkers.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{labTest.biomarkers.length - 4} more
              </Badge>
            )}
          </div>
        </div>

        <div className="pt-2 flex gap-2">
          <AddToCartButton
            item={{
              item_type: 'lab_test',
              item_id: labTest.id,
              item_name: labTest.name,
              item_price: labTest.price,
              item_metadata: {
                category: labTest.category,
                turnaround_days: labTest.turnaround_days,
                biomarkers_count: labTest.biomarkers.length,
              },
            }}
            variant="outline"
            size="sm"
            className="flex-1"
          />
          <Button 
            onClick={() => onOrder(labTest)} 
            className="flex-1"
            size="sm"
          >
            {t('screens.common.orderNow')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const LabTestCard = withCardId(LabTestCardBase, "CT-UT-002");
export default LabTestCard;