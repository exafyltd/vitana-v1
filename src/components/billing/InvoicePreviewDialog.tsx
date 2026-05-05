import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Printer } from "lucide-react";
import { t } from '@/lib/i18n-toast';

export interface InvoiceData {
  id: string;
  date: string;
  amount: number;
  description: string;
  items: Array<{
    description: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  billingAddress?: string;
  paymentMethod?: string;
}

interface InvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceData: InvoiceData | null;
}

export function InvoicePreviewDialog({
  open,
  onOpenChange,
  invoiceData,
}: InvoicePreviewDialogProps) {
  if (!invoiceData) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Future: implement PDF download
    console.log("Download invoice:", invoiceData.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t('screens.billing.invoiceId', { id: invoiceData.id })}</span>
            <Badge variant="secondary">{t('screens.billing.paid')}</Badge>
          </DialogTitle>
          <DialogDescription>{t('screens.billing.invoiceDateDate', { date: invoiceData.date })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Company Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">{t('screens.billing.from')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('screens.billing.vitanalandInc')}<br />
                    {t('screens.billing.text123WellnessStreet')}<br />{t('screens.billing.healthCityHc12345')}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{t('screens.billing.bill')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {invoiceData.billingAddress || "Account Holder\nEmail on file"}
                  </p>
                  {invoiceData.paymentMethod && (
                    <p className="text-sm text-muted-foreground mt-2">{t('screens.billing.paymentMethodPaymentmethod', { paymentMethod: invoiceData.paymentMethod })}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">{t('screens.billing.invoiceDetails')}</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
                  <div className="col-span-6">{t('screens.billing.description')}</div>
                  <div className="col-span-2 text-right">{t('screens.billing.quantity')}</div>
                  <div className="col-span-2 text-right">{t('screens.billing.price')}</div>
                  <div className="col-span-2 text-right">{t('screens.billing.amount')}</div>
                </div>
                {invoiceData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 text-sm py-2">
                    <div className="col-span-6">{item.description}</div>
                    <div className="col-span-2 text-right">{item.quantity}</div>
                    <div className="col-span-2 text-right">
                      ${item.price.toFixed(2)}
                    </div>
                    <div className="col-span-2 text-right font-medium">
                      ${(item.quantity * item.price).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('screens.billing.subtotal')}</span>
                  <span className="font-medium">${invoiceData.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('screens.billing.tax')}</span>
                  <span className="font-medium">${invoiceData.tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>{t('screens.billing.total')}</span>
                  <span>${invoiceData.total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              {t('screens.billing.print')}
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              {t('screens.billing.downloadPdf')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
