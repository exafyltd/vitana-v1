// Real exchange rates from database
import { supabase } from '@/integrations/supabase/client';
import { ExchangeRate } from './exchangeRates';

export const getRealExchangeRates = async (): Promise<ExchangeRate[]> => {
  try {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(rate => ({
      from: rate.from_currency as 'USD' | 'VTN' | 'CREDITS',
      to: rate.to_currency as 'USD' | 'VTN' | 'CREDITS',
      rate: Number(rate.rate),
      trend: rate.trend as 'up' | 'down' | 'stable',
      change24h: Number(rate.change_24h),
      lastUpdated: new Date(rate.created_at)
    }));
  } catch (error) {
    console.error('Error fetching real exchange rates:', error);
    // Fallback to mock data if database fails
    const { getCurrentExchangeRates } = await import('./exchangeRates');
    return getCurrentExchangeRates();
  }
};

export const updateExchangeRates = async (rates: Partial<ExchangeRate>[]): Promise<void> => {
  try {
    const { error } = await supabase
      .from('exchange_rates')
      .upsert(
        rates.map(rate => ({
          from_currency: rate.from,
          to_currency: rate.to,
          rate: rate.rate,
          trend: rate.trend,
          change_24h: rate.change24h,
          is_active: true
        })),
        { onConflict: 'from_currency,to_currency' }
      );

    if (error) throw error;
  } catch (error) {
    console.error('Error updating exchange rates:', error);
  }
};