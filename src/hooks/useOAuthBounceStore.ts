/**
 * Tracks the in-flight OAuth bounce flow so the UI can show a persistent
 * "we're waiting for sign-in" overlay while the user is in the system
 * browser, and surface a clear success / timeout state when they return.
 *
 * Lives outside React so the connector hook can drive it from the
 * mutation + poller without prop-drilling.
 */

import { create } from "zustand";

export type OAuthBounceProvider = "google" | "youtube";
export type OAuthBounceStatus = "idle" | "pending" | "success" | "timed_out";

interface OAuthBounceState {
  status: OAuthBounceStatus;
  provider: OAuthBounceProvider | null;
  startedAt: number | null;
  start: (provider: OAuthBounceProvider) => void;
  succeed: () => void;
  timeout: () => void;
  reset: () => void;
}

export const useOAuthBounceStore = create<OAuthBounceState>((set) => ({
  status: "idle",
  provider: null,
  startedAt: null,
  start: (provider) =>
    set({ status: "pending", provider, startedAt: Date.now() }),
  succeed: () =>
    set((s) => (s.status === "pending" ? { ...s, status: "success" } : s)),
  timeout: () =>
    set((s) => (s.status === "pending" ? { ...s, status: "timed_out" } : s)),
  reset: () => set({ status: "idle", provider: null, startedAt: null }),
}));
