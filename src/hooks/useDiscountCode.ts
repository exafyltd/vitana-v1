import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DiscountCode {
  id: string;
  code: string;
  discount_percent: number;
  valid_for: string;
  tenant_slug: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export function useDiscountCode(tenantSlug: string = 'maxina') {
  const [discountCode, setDiscountCode] = useState<DiscountCode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDiscount = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setDiscountCode(null);
        setLoading(false);
        return;
      }

      // Use .rpc or raw select — table may not be in generated types yet
      const { data, error } = await (supabase as any)
        .from("user_discount_codes")
        .select("id, code, discount_percent, valid_for, tenant_slug, expires_at, used_at, created_at")
        .eq("user_id", user.id)
        .eq("tenant_slug", tenantSlug)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("Failed to fetch discount code:", error.message);
        setDiscountCode(null);
      } else {
        setDiscountCode(data);
      }
      setLoading(false);
    };

    fetchDiscount();
  }, [tenantSlug]);

  const clearDiscount = () => setDiscountCode(null);

  return { discountCode, loading, clearDiscount };
}
