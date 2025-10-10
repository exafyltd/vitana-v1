import React from 'react';
import { DollarSign, Coins, CreditCard } from 'lucide-react';

export interface CurrencyConfig {
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
    value: 'VTNA',
    label: 'VTNA',
    icon: Coins,
    fullLabel: 'VTNA Tokens'
  },
  {
    value: 'CREDITS',
    label: 'Credits',
    icon: CreditCard,
    fullLabel: 'Platform Credits'
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