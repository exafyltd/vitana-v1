import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";

export type VoucherTier = "test" | "experience" | "exclusive";

interface CreateVoucherCheckoutParams {
  tier: VoucherTier;
}

export const useCreateVoucherCheckout = () => {
  return useMutation({
    mutationFn: async ({ tier }: CreateVoucherCheckoutParams) => {
      const { data, error } = await supabase.functions.invoke('stripe-create-voucher-checkout', {
        body: { tier }
      });
      
      if (error) throw error;
      return data as { url: string };
    },
  });
};

export interface VoucherData {
  code: string;
  tier: string;
  tierName: string;
  price: string;
  purchaseDate: string;
  expiresAt: string;
  benefits: string[];
  buyerEmail: string;
  orderId: string;
}

export const useDownloadVoucherPdf = () => {
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.functions.invoke('voucher-download-pdf', {
        body: { orderId }
      });
      
      if (error) throw error;
      return data as { success: boolean; voucher: VoucherData; signedPdfUrl: string };
    },
  });
};

export const useSendVoucherEmail = () => {
  return useMutation({
    mutationFn: async ({ orderId, recipientEmail, recipientName, message }: {
      orderId: string;
      recipientEmail: string;
      recipientName?: string;
      message?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('voucher-send-email', {
        body: { orderId, recipientEmail, recipientName, message }
      });
      
      if (error) throw error;
      return data;
    },
  });
};

export const useMyVouchers = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-vouchers', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('voucher_orders')
        .select('*')
        .eq('buyer_user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });
};

export const useRedeemableVouchers = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['redeemable-vouchers', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('voucher_orders')
        .select('*')
        .eq('status', 'paid')
        .eq('buyer_user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });
};
