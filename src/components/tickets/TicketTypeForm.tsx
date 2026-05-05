import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Ticket } from "lucide-react";
import { t } from '@/lib/i18n-toast';

export interface TicketTypeInput {
  name: string;
  description: string;
  price: number;
  currency: 'USD' | 'EUR';
  quantity: number;
  saleStartDate: string;
  saleEndDate: string;
}

interface TicketTypeFormProps {
  ticketTypes: TicketTypeInput[];
  onChange: (ticketTypes: TicketTypeInput[]) => void;
  eventDate?: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
};

const DEFAULT_TICKET_TEMPLATES = [
  { name: "Early Bird", description: "Limited early access tickets at a discounted price", priceMultiplier: 0.8 },
  { name: "General Admission", description: "Standard entry ticket", priceMultiplier: 1.0 },
  { name: "VIP", description: "Premium experience with exclusive perks", priceMultiplier: 1.5 },
];

export function TicketTypeForm({ ticketTypes, onChange, eventDate }: TicketTypeFormProps) {
  const addTicketType = () => {
    onChange([
      ...ticketTypes,
      {
        name: "",
        description: "",
        price: 0,
        currency: 'USD',
        quantity: 50,
        saleStartDate: new Date().toISOString().split('T')[0],
        saleEndDate: eventDate || "",
      }
    ]);
  };

  const removeTicketType = (index: number) => {
    onChange(ticketTypes.filter((_, i) => i !== index));
  };

  const updateTicketType = (index: number, field: keyof TicketTypeInput, value: string | number) => {
    const updated = [...ticketTypes];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addFromTemplate = (template: typeof DEFAULT_TICKET_TEMPLATES[0], basePrice: number = 25) => {
    onChange([
      ...ticketTypes,
      {
        name: template.name,
        description: template.description,
        price: Math.round(basePrice * template.priceMultiplier),
        currency: 'USD',
        quantity: template.name === "VIP" ? 20 : 50,
        saleStartDate: new Date().toISOString().split('T')[0],
        saleEndDate: eventDate || "",
      }
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ticket className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">{t('screens.tickets.ticketTypes')}</h3>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addTicketType}>
          <Plus className="h-4 w-4 mr-1" />
          Add Ticket
        </Button>
      </div>

      {ticketTypes.length === 0 && (
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
          <Ticket className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">{t('screens.tickets.noTicketTypesAddedYet')}</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {DEFAULT_TICKET_TEMPLATES.map((template) => (
              <Button
                key={template.name}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => addFromTemplate(template)}
              >
                + {template.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {ticketTypes.map((ticket, index) => (
        <Card key={index} className="border-border/60">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Ticket {index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeTicketType(index)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{t('screens.tickets.ticketName')}</Label>
                <Input
                  value={ticket.name}
                  onChange={(e) => updateTicketType(index, "name", e.target.value)}
                  placeholder="e.g., General Admission"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">
                  Price ({CURRENCY_SYMBOLS[ticket.currency] || ticket.currency}) *
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ticket.price}
                    onChange={(e) => updateTicketType(index, "price", parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="flex-1"
                  />
                  <Select
                    value={ticket.currency}
                    onValueChange={(val) => updateTicketType(index, "currency", val)}
                  >
                    <SelectTrigger className="w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">{t('screens.tickets.usd')}</SelectItem>
                      <SelectItem value="EUR">{t('screens.tickets.eur')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={ticket.description}
                onChange={(e) => updateTicketType(index, "description", e.target.value)}
                placeholder="What's included with this ticket?"
                className="mt-1 min-h-[60px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={ticket.quantity}
                  onChange={(e) => updateTicketType(index, "quantity", parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">{t('screens.tickets.saleStart')}</Label>
                <Input
                  type="date"
                  value={ticket.saleStartDate}
                  onChange={(e) => updateTicketType(index, "saleStartDate", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">{t('screens.tickets.saleEnd')}</Label>
                <Input
                  type="date"
                  value={ticket.saleEndDate}
                  onChange={(e) => updateTicketType(index, "saleEndDate", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {ticketTypes.length > 0 && ticketTypes.length < 5 && (
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground self-center">{t('screens.tickets.quickAdd')}</span>
          {DEFAULT_TICKET_TEMPLATES.filter(
            (t) => !ticketTypes.some((existing) => existing.name === t.name)
          ).map((template) => (
            <Button
              key={template.name}
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => addFromTemplate(template, ticketTypes[0]?.price || 25)}
            >
              + {template.name}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
