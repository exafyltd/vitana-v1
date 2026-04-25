/**
 * Tiny diagnostic overlay for OAuth-on-WebView debugging.
 *
 * Renders nothing unless `?diag=1` is in the URL. When active it shows
 * the current UA, Appilix bridge state, isAppilixWebView() result, and
 * the build's bundle hash so a user testing OAuth on a phone can take
 * one screenshot and tell us exactly what runtime they're on.
 *
 * Remove this component once iOS WebView OAuth is verified working.
 */

import { useEffect, useState } from "react";
import { isAppilix } from "@/lib/appilix";
import { isAppilixWebView } from "@/lib/webview";

export function WebViewDiagBadge() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("diag") === "1") setShow(true);
  }, []);

  if (!show) return null;

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "(no navigator)";
  const platform = typeof navigator !== "undefined" ? (navigator as Navigator & { platform: string }).platform : "?";
  const bridge = isAppilix();
  const webView = isAppilixWebView();
  const bundleHash = (() => {
    try {
      const scripts = Array.from(document.scripts).map((s) => s.src).filter((s) => s.includes("/assets/index-"));
      const m = scripts[0]?.match(/index-([A-Za-z0-9_-]+)\.js/);
      return m ? m[1] : "(unknown)";
    } catch {
      return "(error)";
    }
  })();
  const cookieHasIdentity = typeof document !== "undefined" && /appilix_push_notification_user_identity=/.test(document.cookie || "");

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: "8px 12px",
        background: "rgba(255, 220, 0, 0.95)",
        color: "#222",
        fontSize: 11,
        fontFamily: "monospace",
        lineHeight: 1.3,
        wordBreak: "break-all",
      }}
    >
      <div><b>BUNDLE:</b> {bundleHash}</div>
      <div><b>UA:</b> {ua}</div>
      <div><b>platform:</b> {platform}</div>
      <div><b>isAppilix() bridge:</b> {String(bridge)}</div>
      <div><b>isAppilixWebView():</b> {String(webView)}</div>
      <div><b>identity cookie:</b> {String(cookieHasIdentity)}</div>
      <div><b>origin:</b> {typeof location !== "undefined" ? location.origin : "?"}</div>
    </div>
  );
}
