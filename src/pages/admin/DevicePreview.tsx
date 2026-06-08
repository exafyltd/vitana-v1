/**
 * Device Preview — admin "simulator" for the mobile UI on staging.
 *
 * Renders the responsive web build (default: the staging frontend,
 * preview.vitanaland.com) inside a phone/tablet device frame so the team
 * can eyeball the mobile layout at real device dimensions without DevTools.
 *
 * This is a UI-only preview. It does NOT reproduce the native Appilix
 * WebView shell (push notifications, native safe-area insets, WebView
 * user-agent handling) — for that, use an Appilix staging build on the
 * internal Play/TestFlight tracks. See CLAUDE.md / the device-preview notes.
 */

import { useMemo, useState } from "react";
import { RotateCw, RefreshCw, ExternalLink, Smartphone, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AppLayout from "@/components/AppLayout";
import AdminHeader from "@/components/admin/AdminHeader";
import { t } from "@/lib/i18n-toast";

// Device model names are proper nouns — kept as literals, rendered via a
// variable (not raw JSX text) so the i18n lint rule is satisfied.
const DEVICES = [
  { id: "iphone14", label: "iPhone 14 / 15", width: 390, height: 844 },
  { id: "iphonese", label: "iPhone SE", width: 375, height: 667 },
  { id: "pixel7", label: "Pixel 7", width: 412, height: 915 },
  { id: "galaxys20", label: "Galaxy S20", width: 360, height: 800 },
  { id: "ipadmini", label: "iPad Mini", width: 768, height: 1024 },
] as const;

// Environment base URLs. Staging is the default — this is the whole point.
// Production is the apex domain the Appilix iOS/Android WebView shells load
// (iOS → /, Android → /home).
const ENVIRONMENTS = {
  staging: { url: "https://preview.vitanaland.com", labelKey: "devicePreviewEnvStaging" },
  production: { url: "https://vitanaland.com", labelKey: "devicePreviewEnvProduction" },
  custom: { url: "", labelKey: "devicePreviewEnvCustom" },
} as const;

type EnvKey = keyof typeof ENVIRONMENTS;

const SCALES = [1, 0.75, 0.5] as const;

export default function DevicePreview() {
  const [deviceId, setDeviceId] = useState<string>(DEVICES[0].id);
  const [env, setEnv] = useState<EnvKey>("staging");
  const [customUrl, setCustomUrl] = useState("");
  const [path, setPath] = useState("/");
  const [landscape, setLandscape] = useState(false);
  const [scale, setScale] = useState<number>(1);
  const [reloadKey, setReloadKey] = useState(0);

  const device = DEVICES.find((d) => d.id === deviceId) ?? DEVICES[0];
  const baseUrl = env === "custom" ? customUrl.trim() : ENVIRONMENTS[env].url;

  const src = useMemo(() => {
    if (!baseUrl) return "";
    const p = path.startsWith("/") ? path : `/${path}`;
    try {
      return new URL(p, baseUrl).toString();
    } catch {
      return "";
    }
  }, [baseUrl, path]);

  const frameW = landscape ? device.height : device.width;
  const frameH = landscape ? device.width : device.height;

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <AdminHeader
          emoji="📱"
          title={t("screens.admin.devicePreview")}
          description={t("screens.admin.devicePreviewDesc")}
        />

        {/* Controls */}
        <div className="grid gap-4 rounded-2xl border bg-card p-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="dp-env">{t("screens.admin.devicePreviewEnvironment")}</Label>
            <Select value={env} onValueChange={(v) => setEnv(v as EnvKey)}>
              <SelectTrigger id="dp-env">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ENVIRONMENTS) as EnvKey[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {t(`screens.admin.${ENVIRONMENTS[k].labelKey}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {env === "custom" && (
              <Input
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder={t("screens.admin.devicePreviewCustomUrlPlaceholder")}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dp-device">{t("screens.admin.devicePreviewDevice")}</Label>
            <Select value={deviceId} onValueChange={setDeviceId}>
              <SelectTrigger id="dp-device">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEVICES.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.label} ({d.width}×{d.height})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dp-path">{t("screens.admin.devicePreviewPath")}</Label>
            <Input
              id="dp-path"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder={t("screens.admin.devicePreviewPathPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("screens.admin.devicePreviewView")}</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLandscape((v) => !v)}
                title={t("screens.admin.devicePreviewRotate")}
              >
                <RotateCw className="mr-1 h-4 w-4" />
                {landscape
                  ? t("screens.admin.devicePreviewLandscape")
                  : t("screens.admin.devicePreviewPortrait")}
              </Button>
              <Select value={String(scale)} onValueChange={(v) => setScale(parseFloat(v))}>
                <SelectTrigger className="w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCALES.map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      {Math.round(s * 100)}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Action row */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)} disabled={!src}>
            <RefreshCw className="mr-1 h-4 w-4" />
            {t("screens.admin.devicePreviewReload")}
          </Button>
          <Button variant="outline" size="sm" asChild disabled={!src}>
            <a href={src || undefined} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1 h-4 w-4" />
              {t("screens.admin.devicePreviewOpenNewTab")}
            </a>
          </Button>
          {src && <span className="truncate font-mono text-xs text-muted-foreground">{src}</span>}
        </div>

        {/* Shell caveat */}
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
          <span>{t("screens.admin.devicePreviewShellNote")}</span>
        </div>

        {/* Device frame */}
        <div className="flex justify-center overflow-auto rounded-2xl border bg-muted/30 p-6">
          {src ? (
            <div
              style={{ width: frameW * scale, height: frameH * scale }}
              className="relative shrink-0"
            >
              <div
                style={{
                  width: frameW,
                  height: frameH,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
                className="absolute left-0 top-0 rounded-[2.25rem] border-[10px] border-neutral-800 bg-neutral-800 shadow-2xl"
              >
                <iframe
                  key={reloadKey}
                  src={src}
                  title={t("screens.admin.devicePreview")}
                  className="h-full w-full rounded-[1.6rem] bg-white"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <Smartphone className="h-8 w-8" />
              <span className="text-sm">{t("screens.admin.devicePreviewEnterUrl")}</span>
            </div>
          )}
        </div>

        {/* Embed-blocked fallback note */}
        <p className="text-center text-xs text-muted-foreground">
          {t("screens.admin.devicePreviewFrameBlockedNote")}
        </p>
      </div>
    </AppLayout>
  );
}
