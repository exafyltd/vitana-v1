import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Sparkles, Ticket, MapPin, CheckCircle2, ArrowDown } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import SEO from "@/components/SEO";
import { de as deCatalog, en as enCatalog } from "@/i18n";
import { toast } from "sonner";

// Route-scoped locale toggle. /apply renders in German by default (the IG
// post is German-Austrian) with an EN toggle for the international portion
// of Mariia's audience. We resolve keys against the requested catalog
// directly — no global locale mutation, no provider race, no flicker.
type Locale = "de" | "en";
const CATALOG: Record<Locale, Record<string, unknown>> = {
  de: deCatalog as Record<string, unknown>,
  en: enCatalog as Record<string, unknown>,
};

function resolveKey(
  catalog: Record<string, unknown>,
  key: string,
  params?: Record<string, string | number>,
): string {
  const parts = key.split(".");
  let v: unknown = catalog;
  for (const p of parts) {
    if (v && typeof v === "object" && p in (v as Record<string, unknown>)) {
      v = (v as Record<string, unknown>)[p];
    } else {
      return key;
    }
  }
  if (typeof v !== "string") return key;
  if (!params) return v;
  return Object.entries(params).reduce(
    (acc, [k, val]) =>
      acc.replace(new RegExp(`\\{${k}\\}`, "g"), String(val)),
    v,
  );
}

type Device = "ios" | "android";

interface FormState {
  full_name: string;
  email: string;
  phone: string;
  instagram_handle: string;
  device: Device | "";
  google_account_email: string;
  location: string;
  available_for_events: boolean;
  consent_age: boolean;
  consent_terms: boolean;
}

// Optional hero background video (e.g. Mariia Maksina in a wildflower
// field, short silent loop). Either drop an .mp4 at
// `src/assets/maxina-apply-hero.mp4` and import it:
//
//   import heroVideo from "@/assets/maxina-apply-hero.mp4";
//   const HERO_VIDEO_URL: string | null = heroVideo;
//
// …or point this at a CDN URL. The clip must have no audio track and
// stay short — autoplay only works muted, and every device downloads
// the whole file. The warm overlay below fades the footage into the
// page gradient so the dark headline copy stays legible on any frame.
const HERO_VIDEO_URL: string | null = null;

const EMPTY_FORM: FormState = {
  full_name: "",
  email: "",
  phone: "",
  instagram_handle: "",
  device: "",
  google_account_email: "",
  location: "",
  available_for_events: false,
  consent_age: false,
  consent_terms: false,
};

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INSTAGRAM_RX = /^@?[A-Za-z0-9._]{1,30}$/;

export default function Apply() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale>("de");
  const formRef = useRef<HTMLFormElement | null>(null);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      resolveKey(CATALOG[locale], key, params),
    [locale],
  );

  const utm = useMemo(
    () => ({
      utm_source: searchParams.get("utm_source") || null,
      utm_medium: searchParams.get("utm_medium") || null,
      utm_campaign: searchParams.get("utm_campaign") || null,
    }),
    [searchParams],
  );

  useEffect(() => {
    if (!success) return;
    const end = Date.now() + 600;
    const colors = ["#f59e0b", "#ec4899", "#8b5cf6", "#f97316"];
    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [success]);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((s) => ({ ...s, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !form.full_name.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.instagram_handle.trim() ||
      !form.device ||
      !form.location.trim() ||
      !form.consent_age ||
      !form.consent_terms
    ) {
      toast.error(t("apply.errorRequired"));
      return;
    }

    if (!EMAIL_RX.test(form.email.trim())) {
      toast.error(t("apply.errorInvalidEmail"));
      return;
    }

    if (!INSTAGRAM_RX.test(form.instagram_handle.trim())) {
      toast.error(t("apply.errorInvalidInstagram"));
      return;
    }

    if (form.device === "android" && !form.google_account_email.trim()) {
      toast.error(t("apply.errorAndroidGoogleRequired"));
      return;
    }

    const normalizedHandle = form.instagram_handle.trim().replace(/^@/, "");

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      instagram_handle: normalizedHandle,
      device: form.device,
      google_account_email:
        form.device === "android"
          ? form.google_account_email.trim().toLowerCase()
          : null,
      location: form.location.trim(),
      available_for_events: form.available_for_events,
      consent_age: form.consent_age,
      consent_terms: form.consent_terms,
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
    };

    setSubmitting(true);

    // Cast through any until Supabase types are regenerated post-migration.
    const { error } = await (supabase as unknown as {
      from: (table: string) => {
        insert: (rows: unknown) => Promise<{ error: { code?: string } | null }>;
      };
    })
      .from("test_user_applications")
      .insert(payload);

    setSubmitting(false);

    if (error) {
      if (error.code === "23505") {
        toast.error(t("apply.errorAlreadyApplied"));
        return;
      }
      toast.error(t("apply.errorGeneric"));
      return;
    }

    setSuccess(payload.email);
  };

  const headlineLine1 = t("apply.headlineLine1");
  const headlineLine2 = t("apply.headlineLine2");
  const subheadline = t("apply.subheadline");

  return (
    <>
      <SEO
        title={t("apply.seoTitle")}
        description={subheadline}
        url={`${window.location.origin}/apply`}
        type="website"
      />

      <div className="min-h-screen w-full bg-[radial-gradient(120%_120%_at_50%_0%,#FFF1D6_0%,#FFD7B5_35%,#F8A48A_65%,#C77BB8_100%)] text-neutral-900">
        {/* LOCALE TOGGLE */}
        <div
          className="absolute right-4 top-4 z-10 flex items-center gap-0.5 rounded-full border border-white/60 bg-white/60 p-0.5 text-xs shadow-sm backdrop-blur md:right-8 md:top-6"
          role="group"
          aria-label="Language"
        >
          <button
            type="button"
            onClick={() => setLocale("de")}
            aria-pressed={locale === "de"}
            className={cn(
              "rounded-full px-2.5 py-1 font-semibold tracking-wide transition",
              locale === "de"
                ? "bg-neutral-900 text-white"
                : "text-neutral-700 hover:text-neutral-900",
            )}
          >
            DE
          </button>
          <button
            type="button"
            onClick={() => setLocale("en")}
            aria-pressed={locale === "en"}
            className={cn(
              "rounded-full px-2.5 py-1 font-semibold tracking-wide transition",
              locale === "en"
                ? "bg-neutral-900 text-white"
                : "text-neutral-700 hover:text-neutral-900",
            )}
          >
            EN
          </button>
        </div>

        {/* HERO */}
        <section className="relative overflow-hidden px-5 pb-12 pt-20 md:px-10 md:pt-28">
          {HERO_VIDEO_URL && (
            <>
              <video
                aria-hidden
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className="pointer-events-none absolute inset-x-0 top-0 h-full w-full object-cover"
                src={HERO_VIDEO_URL}
              />
              {/* Overlay: faint at the top so the footage reads, opaque at the
                  bottom so the gradient continues seamlessly under value cards. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-full bg-gradient-to-b from-white/25 via-[#FFD7B5]/55 to-[#F8A48A]/95"
              />
            </>
          )}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative z-10 mx-auto max-w-3xl text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neutral-700">
              {t("apply.overline")}
            </p>

            <h1 className="mt-5 font-editorial text-[44px] leading-[1.05] text-neutral-900 md:text-[68px]">
              <span className="block">{headlineLine1}</span>
              <span className="block italic text-rose-700">{headlineLine2}</span>
            </h1>

            <p className="mx-auto mt-4 font-editorial text-lg italic text-rose-700/90 md:text-2xl">
              {t("apply.tagline")}
            </p>

            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-neutral-800 md:text-lg">
              {subheadline}
            </p>

            <div className="mx-auto mt-7 flex max-w-xl flex-wrap items-center justify-center gap-2.5">
              <Chip icon={<Sparkles className="h-3.5 w-3.5" />}>
                {t("apply.chipEvents")}
              </Chip>
              <Chip icon={<MapPin className="h-3.5 w-3.5" />}>
                {t("apply.chipLocation")}
              </Chip>
              <Chip icon={<Ticket className="h-3.5 w-3.5" />}>
                {t("apply.chipTicket")}
              </Chip>
            </div>

            <Button
              onClick={scrollToForm}
              className="mt-9 h-12 rounded-full bg-neutral-900 px-8 text-sm font-semibold tracking-wide text-white hover:bg-neutral-800"
            >
              {t("apply.ctaScroll")}
              <ArrowDown className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </section>

        {/* VALUE STRIP */}
        <section className="px-5 pb-12 md:px-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3"
          >
            <ValueCard
              icon={<Sparkles className="h-5 w-5" />}
              title={t("apply.valueAccessTitle")}
              body={t("apply.valueAccessBody")}
            />
            <ValueCard
              icon={<Ticket className="h-5 w-5" />}
              title={t("apply.valueTicketTitle")}
              body={t("apply.valueTicketBody")}
            />
            <ValueCard
              icon={<MapPin className="h-5 w-5" />}
              title={t("apply.valueMovementTitle")}
              body={t("apply.valueMovementBody")}
            />
          </motion.div>
        </section>

        {/* ABOUT / EXPLAINER — what you're joining + what you receive */}
        <section className="px-5 pb-12 md:px-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-3xl rounded-3xl border border-white/60 bg-white/75 p-6 shadow-sm backdrop-blur md:p-9"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-700">
              {t("apply.aboutEyebrow")}
            </p>
            <h2 className="mt-2 font-editorial text-2xl text-neutral-900 md:text-3xl">
              {t("apply.aboutTitle")}
            </h2>

            <div className="mt-6 divide-y divide-neutral-200/70">
              <EntityRow
                label={t("apply.aboutVitanalandLabel")}
                tag={t("apply.aboutVitanalandTag")}
                description={t("apply.aboutVitanalandDescription")}
              />
              <EntityRow
                label={t("apply.aboutVitanaLabel")}
                tag={t("apply.aboutVitanaTag")}
                description={t("apply.aboutVitanaDescription")}
              />
              <EntityRow
                label={t("apply.aboutMaxinaLabel")}
                tag={t("apply.aboutMaxinaTag")}
                description={t("apply.aboutMaxinaDescription")}
              />
              <EntityRow
                label={t("apply.aboutMaxinaExperienceLabel")}
                tag={t("apply.aboutMaxinaExperienceTag")}
                description={t("apply.aboutMaxinaExperienceDescription")}
              />
            </div>

            <div className="mt-8 border-t border-neutral-200/70 pt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-700">
                {t("apply.benefitsEyebrow")}
              </p>
              <h3 className="mt-2 font-editorial text-xl text-neutral-900 md:text-2xl">
                {t("apply.benefitsTitle")}
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm text-neutral-700 md:text-base">
                <BenefitItem>{t("apply.benefitTicket")}</BenefitItem>
                <BenefitItem>{t("apply.benefitEvents")}</BenefitItem>
                <BenefitItem>{t("apply.benefitVitana")}</BenefitItem>
                <BenefitItem>{t("apply.benefitSeat")}</BenefitItem>
              </ul>
            </div>
          </motion.div>
        </section>

        {/* FORM / SUCCESS */}
        <section id="apply" className="px-5 pb-16 md:px-10">
          <div className="mx-auto max-w-xl">
            {success ? (
              <SuccessPanel email={success} t={t} />
            ) : (
              <motion.form
                ref={formRef}
                onSubmit={handleSubmit}
                aria-label={t("apply.ariaApplyForm")}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5 }}
                className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-xl backdrop-blur-md md:p-8"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-700">
                  {t("apply.formEyebrow")}
                </p>
                <h2 className="mt-2 font-editorial text-2xl text-neutral-900 md:text-3xl">
                  {t("apply.formTitle")}
                </h2>
                <p className="mt-2 text-sm text-neutral-600">
                  {t("apply.formIntro")}
                </p>

                <div className="mt-6 space-y-5">
                  <Field
                    id="full_name"
                    label={t("apply.nameLabel")}
                    required
                  >
                    <Input
                      id="full_name"
                      autoComplete="name"
                      placeholder={t("apply.namePlaceholder")}
                      value={form.full_name}
                      onChange={(e) => update("full_name", e.target.value)}
                    />
                  </Field>

                  <Field id="email" label={t("apply.emailLabel")} required>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder={t("apply.emailPlaceholder")}
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                    />
                  </Field>

                  <Field id="phone" label={t("apply.phoneLabel")} required>
                    <Input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder={t("apply.phonePlaceholder")}
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                    />
                  </Field>

                  <Field
                    id="instagram_handle"
                    label={t("apply.instagramLabel")}
                    help={t("apply.instagramHelp")}
                    required
                  >
                    <Input
                      id="instagram_handle"
                      autoComplete="username"
                      placeholder={t("apply.instagramPlaceholder")}
                      value={form.instagram_handle}
                      onChange={(e) =>
                        update("instagram_handle", e.target.value)
                      }
                    />
                  </Field>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-neutral-800">
                      {t("apply.deviceLabel")}
                      <span className="ml-1 text-rose-600">*</span>
                    </Label>
                    <RadioGroup
                      value={form.device}
                      onValueChange={(v) => update("device", v as Device)}
                      className="grid grid-cols-2 gap-2"
                    >
                      <DeviceOption
                        value="ios"
                        selected={form.device === "ios"}
                        label={t("apply.deviceIos")}
                      />
                      <DeviceOption
                        value="android"
                        selected={form.device === "android"}
                        label={t("apply.deviceAndroid")}
                      />
                    </RadioGroup>
                  </div>

                  {form.device === "android" && (
                    <Field
                      id="google_account_email"
                      label={t("apply.googleEmailLabel")}
                      help={t("apply.googleEmailHelp")}
                      required
                    >
                      <Input
                        id="google_account_email"
                        type="email"
                        inputMode="email"
                        placeholder={t("apply.googleEmailPlaceholder")}
                        value={form.google_account_email}
                        onChange={(e) =>
                          update("google_account_email", e.target.value)
                        }
                      />
                    </Field>
                  )}

                  <Field
                    id="location"
                    label={t("apply.locationLabel")}
                    required
                  >
                    <Input
                      id="location"
                      autoComplete="address-level2"
                      placeholder={t("apply.locationPlaceholder")}
                      value={form.location}
                      onChange={(e) => update("location", e.target.value)}
                    />
                  </Field>

                  <ConsentRow
                    id="available_for_events"
                    checked={form.available_for_events}
                    onCheckedChange={(v) =>
                      update("available_for_events", v === true)
                    }
                    label={t("apply.availabilityLabel")}
                  />
                  <ConsentRow
                    id="consent_age"
                    checked={form.consent_age}
                    onCheckedChange={(v) => update("consent_age", v === true)}
                    label={t("apply.consentAgeLabel")}
                    required
                  />
                  <ConsentRow
                    id="consent_terms"
                    checked={form.consent_terms}
                    onCheckedChange={(v) =>
                      update("consent_terms", v === true)
                    }
                    label={t("apply.consentTermsLabel")}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="mt-7 h-12 w-full rounded-full bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 text-sm font-semibold uppercase tracking-wider text-white shadow-md hover:opacity-95 disabled:opacity-60"
                >
                  {submitting ? t("apply.submitting") : t("apply.submit")}
                </Button>
              </motion.form>
            )}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="px-5 pb-10 pt-2 md:px-10">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 border-t border-white/40 pt-6 text-xs text-neutral-700 md:flex-row">
            <p>© 2026 {t("apply.footerCopy")}</p>
            <div className="flex items-center gap-4">
              <a href="/privacy" className="hover:text-neutral-900">
                {t("apply.footerPrivacy")}
              </a>
              <a href="/terms" className="hover:text-neutral-900">
                {t("apply.footerTerms")}
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

function Chip({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/60 px-3 py-1.5 text-xs font-medium text-neutral-800 backdrop-blur">
      {icon}
      {children}
    </span>
  );
}

function EntityRow({
  label,
  tag,
  description,
}: {
  label: string;
  tag: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 py-4 md:flex-row md:items-start md:gap-6">
      <div className="flex items-baseline gap-2 md:w-44 md:shrink-0">
        <span className="font-editorial text-xl text-neutral-900 md:text-2xl">
          {label}
        </span>
        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-700">
          {tag}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-neutral-700 md:text-base">
        {description}
      </p>
    </div>
  );
}

function BenefitItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
      <span>{children}</span>
    </li>
  );
}

function ValueCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/75 p-5 shadow-sm backdrop-blur">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-700">
        {icon}
      </div>
      <h3 className="mt-3 font-editorial text-lg text-neutral-900">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-neutral-700">{body}</p>
    </div>
  );
}

function Field({
  id,
  label,
  help,
  required,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-neutral-800">
        {label}
        {required && <span className="ml-1 text-rose-600">*</span>}
      </Label>
      {children}
      {help && <p className="text-xs text-neutral-500">{help}</p>}
    </div>
  );
}

function DeviceOption({
  value,
  selected,
  label,
}: {
  value: Device;
  selected: boolean;
  label: string;
}) {
  return (
    <label
      htmlFor={`device-${value}`}
      className={cn(
        "flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition",
        selected
          ? "border-rose-500 bg-rose-50 text-rose-700"
          : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300",
      )}
    >
      <RadioGroupItem id={`device-${value}`} value={value} className="sr-only" />
      {label}
    </label>
  );
}

function ConsentRow({
  id,
  checked,
  onCheckedChange,
  label,
  required,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (v: boolean | "indeterminate") => void;
  label: string;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-lg px-1 py-1"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5"
      />
      <span className="text-sm leading-relaxed text-neutral-700">
        {label}
        {required && <span className="ml-1 text-rose-600">*</span>}
      </span>
    </label>
  );
}

function SuccessPanel({
  email,
  t,
}: {
  email: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="rounded-3xl border border-white/60 bg-white/90 p-8 text-center shadow-xl backdrop-blur-md"
    >
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <h2 className="mt-4 font-editorial text-3xl text-neutral-900">
        {t("apply.successTitle")}
      </h2>
      <p className="mt-3 text-base text-neutral-700">
        {t("apply.successBody", { email })}
      </p>
      <p className="mt-2 text-sm text-neutral-500">{t("apply.successHint")}</p>
    </motion.div>
  );
}
