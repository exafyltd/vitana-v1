import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { getCategoryGroups } from './supplementCategories';
import { t } from '@/lib/i18n-toast';

const supplementSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  category: z.string().min(1, 'Category is required'),
  dosage: z.string().trim().max(50, 'Dosage must be less than 50 characters').optional(),
  frequency: z.string().trim().max(50, 'Frequency must be less than 50 characters').optional(),
  notes: z.string().trim().max(500, 'Notes must be less than 500 characters').optional(),
  start_date: z.string().optional(),
});

type SupplementFormData = z.infer<typeof supplementSchema>;

interface AddSupplementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SupplementFormData & { is_active: boolean }) => Promise<void>;
  initialData?: SupplementFormData & { is_active?: boolean };
  mode?: 'add' | 'edit';
}

export function AddSupplementDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  mode = 'add',
}: AddSupplementDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<SupplementFormData>({
    resolver: zodResolver(supplementSchema),
    defaultValues: initialData || {
      name: '',
      category: '',
      dosage: '',
      frequency: '',
      notes: '',
      start_date: new Date().toISOString().split('T')[0],
    },
  });

  React.useEffect(() => {
    if (initialData && open) {
      form.reset(initialData);
    } else if (!open) {
      form.reset({
        name: '',
        category: '',
        dosage: '',
        frequency: '',
        notes: '',
        start_date: new Date().toISOString().split('T')[0],
      });
    }
  }, [initialData, open, form]);

  const handleSubmit = async (data: SupplementFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...data,
        is_active: initialData?.is_active ?? true,
      });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error submitting supplement:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryGroups = getCategoryGroups();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add' : 'Edit'} Supplement</DialogTitle>
          <DialogDescription>
            {mode === 'add' 
              ? 'Add a new supplement to your regimen'
              : 'Update supplement information'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('screens.supplements.supplementName')}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={t('screens.supplements.eGVitaminD3Omega3')} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('screens.supplements.category')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('screens.supplements.selectCategory')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px]">
                      {categoryGroups.map((group) => (
                        <SelectGroup key={group.label}>
                          <SelectLabel>{group.label}</SelectLabel>
                          {group.items.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dosage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dosage</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={t('screens.supplements.eG1000Iu500mg')} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={t('screens.supplements.eGOnceDailyTwiceDaily')} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('screens.supplements.startDate')}</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={t('screens.supplements.anyAdditionalInformation')} 
                      className="resize-none"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'add' ? 'Add' : 'Update'} Supplement
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
