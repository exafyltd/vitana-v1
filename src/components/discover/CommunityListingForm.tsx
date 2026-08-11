/**
 * BOOTSTRAP-COMMUNITY-MARKETPLACE (Chunk 4): shared create/edit form.
 *
 * `listing_kind` is fixed once created (the backend's edit schema omits it —
 * see EditListingSchema in services/gateway/src/routes/community-marketplace.ts),
 * so it's disabled whenever `mode === "edit"`.
 */

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { CommunityListingImageUploader } from "@/components/discover/CommunityListingImageUploader";
import { useCommunityListingCategories, type CommunityListing, type CommunityListingInput } from "@/hooks/useCommunityMarketplace";
import { categoryOptionLabel } from "@/lib/community-marketplace-categories";
import { t } from "@/lib/i18n-toast";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF"];

function buildSchema() {
  return z
    .object({
      listing_kind: z.enum(["product", "service"]),
      category: z.string().min(1, t("screens.communityMarketplace.validation.categoryRequired")),
      subcategory: z.string().max(64).optional(),
      condition: z.enum(["new", "like_new", "good", "fair", "used"]).optional(),
      title: z
        .string()
        .trim()
        .min(3, t("screens.communityMarketplace.validation.titleRequired"))
        .max(120, t("screens.communityMarketplace.validation.titleTooLong")),
      description: z
        .string()
        .trim()
        .min(10, t("screens.communityMarketplace.validation.descriptionRequired"))
        .max(4000, t("screens.communityMarketplace.validation.descriptionTooLong")),
      images: z.array(z.string()).max(10),
      price_on_request: z.boolean(),
      price: z.string().optional(),
      currency: z.string().length(3),
      location_text: z.string().max(200).optional(),
      is_remote_service: z.boolean(),
      delivery_method: z.enum(["pickup", "shipping", "both", "not_applicable"]),
    })
    .refine(
      (v) => v.listing_kind !== "product" || !!v.condition,
      { message: t("screens.communityMarketplace.validation.conditionRequired"), path: ["condition"] }
    )
    .refine(
      (v) => v.price_on_request || (!!v.price && !Number.isNaN(Number(v.price)) && Number(v.price) >= 0),
      { message: t("screens.communityMarketplace.validation.priceInvalid"), path: ["price"] }
    );
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

function toFormValues(listing?: CommunityListing): FormValues {
  return {
    listing_kind: listing?.listing_kind ?? "product",
    category: listing?.category ?? "",
    subcategory: listing?.subcategory ?? "",
    condition: listing?.condition ?? undefined,
    title: listing?.title ?? "",
    description: listing?.description ?? "",
    images: listing?.images ?? [],
    price_on_request: listing?.price_on_request ?? false,
    price: listing?.price_cents != null ? (listing.price_cents / 100).toFixed(2) : "",
    currency: listing?.currency ?? "EUR",
    location_text: listing?.location_text ?? "",
    is_remote_service: listing?.is_remote_service ?? false,
    delivery_method: listing?.delivery_method ?? "not_applicable",
  };
}

interface CommunityListingFormProps {
  mode: "create" | "edit";
  initialListing?: CommunityListing;
  onSubmit: (input: CommunityListingInput) => Promise<void>;
  onCancel: () => void;
}

export function CommunityListingForm({ mode, initialListing, onSubmit, onCancel }: CommunityListingFormProps) {
  const schema = useMemo(buildSchema, []);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(initialListing),
  });

  useEffect(() => {
    form.reset(toFormValues(initialListing));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialListing?.id]);

  const listingKind = form.watch("listing_kind");
  const priceOnRequest = form.watch("price_on_request");
  const { data: categoriesData } = useCommunityListingCategories(listingKind);
  const categories = categoriesData?.categories ?? [];

  const isSubmitting = form.formState.isSubmitting;

  const handleSubmit = async (values: FormValues) => {
    const input: CommunityListingInput = {
      listing_kind: values.listing_kind,
      category: values.category,
      subcategory: values.subcategory || undefined,
      condition: values.listing_kind === "product" ? values.condition : undefined,
      title: values.title,
      description: values.description,
      images: values.images,
      price_on_request: values.price_on_request,
      price_cents: values.price_on_request ? undefined : Math.round(Number(values.price) * 100),
      currency: values.price_on_request ? undefined : values.currency,
      location_text: values.location_text || undefined,
      is_remote_service: values.listing_kind === "service" ? values.is_remote_service : false,
      delivery_method: values.listing_kind === "product" ? values.delivery_method : "not_applicable",
    };
    await onSubmit(input);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="listing_kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("screens.communityMarketplace.listingKindLabel")}</FormLabel>
              <Select
                onValueChange={(v) => {
                  field.onChange(v);
                  form.setValue("category", "");
                }}
                value={field.value}
                disabled={mode === "edit"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="product">{t("screens.communityMarketplace.listingKindProduct")}</SelectItem>
                  <SelectItem value="service">{t("screens.communityMarketplace.listingKindService")}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("screens.communityMarketplace.categoryLabel")}</FormLabel>
              {/* Edit mode prefills field.value before the matching
                  SelectItem exists (categories load async), and Radix Select
                  never resolves a display label for a value that had no
                  matching item at mount time. Remount once the real list
                  catches up so it picks the value up — but only in that
                  specific pending-value case, so a plain empty create-mode
                  Select never remounts (and never has its dropdown yanked
                  shut) just because the categories list loaded a beat late. */}
              <Select
                key={field.value && !categories.some((c) => c.key === field.value) ? "pending" : "ready"}
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("screens.communityMarketplace.filterAllCategories")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.key} value={c.key}>
                      {categoryOptionLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subcategory"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("screens.communityMarketplace.subcategoryLabel")}</FormLabel>
              <FormControl>
                <Input placeholder={t("screens.communityMarketplace.subcategoryPlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {listingKind === "product" && (
          <FormField
            control={form.control}
            name="condition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("screens.communityMarketplace.conditionLabel")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="new">{t("screens.communityMarketplace.conditionNew")}</SelectItem>
                    <SelectItem value="like_new">{t("screens.communityMarketplace.conditionLikeNew")}</SelectItem>
                    <SelectItem value="good">{t("screens.communityMarketplace.conditionGood")}</SelectItem>
                    <SelectItem value="fair">{t("screens.communityMarketplace.conditionFair")}</SelectItem>
                    <SelectItem value="used">{t("screens.communityMarketplace.conditionUsed")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("screens.communityMarketplace.titleLabel")}</FormLabel>
              <FormControl>
                <Input placeholder={t("screens.communityMarketplace.titlePlaceholder")} maxLength={120} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("screens.communityMarketplace.descriptionLabel")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t("screens.communityMarketplace.descriptionPlaceholder")}
                  rows={5}
                  maxLength={4000}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="images"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("screens.communityMarketplace.imagesLabel")}</FormLabel>
              <FormControl>
                <CommunityListingImageUploader value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price_on_request"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
              <FormLabel className="!mt-0">{t("screens.communityMarketplace.priceOnRequestLabel")}</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {!priceOnRequest && (
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("screens.communityMarketplace.priceLabel")}</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" inputMode="decimal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("screens.communityMarketplace.currencyLabel")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="location_text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("screens.communityMarketplace.locationLabel")}</FormLabel>
              <FormControl>
                <Input placeholder={t("screens.communityMarketplace.locationPlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {listingKind === "product" ? (
          <FormField
            control={form.control}
            name="delivery_method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("screens.communityMarketplace.deliveryMethodLabel")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pickup">{t("screens.communityMarketplace.deliveryPickup")}</SelectItem>
                    <SelectItem value="shipping">{t("screens.communityMarketplace.deliveryShipping")}</SelectItem>
                    <SelectItem value="both">{t("screens.communityMarketplace.deliveryBoth")}</SelectItem>
                    <SelectItem value="not_applicable">{t("screens.communityMarketplace.deliveryNotApplicable")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name="is_remote_service"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                <FormLabel className="!mt-0">{t("screens.communityMarketplace.remoteServiceLabel")}</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1" disabled={isSubmitting}>
            {t("screens.communityMarketplace.cancel")}
          </Button>
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {mode === "create" ? t("screens.communityMarketplace.submitCreate") : t("screens.communityMarketplace.submitEdit")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
