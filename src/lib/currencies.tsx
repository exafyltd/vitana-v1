import React from 'react';
import { DollarSign, Coins, CreditCard } from 'lucide-react';

export interface CurrencyConfig {
  // 'VTNA' kept in the union for historical transaction rows (from_currency /
  // to_currency) written before the VTNA/Credits merge — it is no longer
  // offered as a selectable currency (see CURRENCY_CONFIGS below).
  value: 'USD' | 'VTNA' | 'CREDITS';
  label: string;
  icon: typeof DollarSign;
  fullLabel: string;
}

export const CURRENCY_CONFIGS: CurrencyConfig[] = [
  {
    value: 'USD',
    label: 'USD',
    icon: DollarSign,
    fullLabel: 'US Dollars'
  },
  {
    value: 'CREDITS',
    label: 'VTNA Credits',
    icon: CreditCard,
    fullLabel: 'VTNA Credits'
  }
];

export const getCurrencyConfig = (currency: string): CurrencyConfig => {
  return CURRENCY_CONFIGS.find(c => c.value === currency) || CURRENCY_CONFIGS[0];
};

export const getCurrencyIcon = (currency: string, className: string = "h-4 w-4") => {
  const config = getCurrencyConfig(currency);
  const Icon = config.icon;
  return <Icon className={className} />;
};