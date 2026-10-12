/**
 * VTID-05081: News stays alive across tab switches.
 *
 * Every page wraps its own AppLayout, so a bottom-nav switch used to unmount
 * the whole /home tree (AuthGuard → ProtectedRoute → AppLayout → Home) and
 * rebuild it on return: the calendar button refetched, every first-viewport
 * image was created anew, and the robot measured 4.3–5.6 s for "News return".
 * The feed DATA was already kept warm (useNewsFeedKeepAlive); this keeps the
 * rendered content.
 *
 * Two halves, so exactly one AppLayout exists at any time:
 *   - NewsKeepAliveHost — mounted once next to <Routes> in App.tsx. It owns one
 *     stable <div> and portals the News content into it. It mounts only after
 *     the first /home visit by a signed-in member with community permission,
 *     is keyed by user + tenant, and unmounts on sign-out.
 *   - NewsKeepAliveSlot — rendered by the /home route inside its normal
 *     AuthGuard → ProtectedRoute → AppLayout. It attaches the stable <div> while
 *     mounted and detaches it on unmount. Detached, the News DOM (and every
 *     decoded image in it) survives untouched.
 *
 * This file is imported by App.tsx (main chunk), so it must never import the
 * News page itself — the slot hands the already-loaded component to the host.
 */
import {
  createContext,
  Suspense,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ComponentType,
} from "react";
import { createPortal } from "react-dom";
import { UNSAFE_LocationContext } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useTenantSafe } from "@/hooks/useTenant";
import { useRole } from "@/hooks/useRole";

// ── Module store (one News per page session) ────────────────────────
type ScrollKeeper = { save: () => void; restore: () => void };

let attached = false;
let requestedOwner: string | null = null;
let content: ComponentType | null = null;
let container: HTMLDivElement | null = null;
let scrollKeeper: ScrollKeeper | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((cb) => cb());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getContainer(): HTMLDivElement {
  if (!container) {
    container = document.createElement("div");
    // `contents` keeps News's root a direct flex item of the shell, exactly
    // where it sat before it moved into this container.
    container.className = "contents";
    container.dataset.testid = "news-keepalive";
  }
  return container;
}

function setAttached(next: boolean) {
  if (attached === next) return;
  attached = next;
  emit();
}

function request(owner: string, component: ComponentType) {
  if (requestedOwner === owner && content === component) return;
  requestedOwner = owner;
  content = component;
  emit();
}

function release() {
  if (requestedOwner === null) return;
  requestedOwner = null;
  emit();
}

function ownerKey(userId: string | undefined, tenantId: string | null | undefined): string | null {
  return userId ? `${userId}:${tenantId ?? ""}` : null;
}

/**
 * News registers how to save and restore its scroll offset (it knows the
 * active feed tab); the slot calls it on detach / attach.
 */
export function registerNewsScrollKeeper(keeper: ScrollKeeper | null): void {
  scrollKeeper = keeper;
}

/** True while the slot has News attached, read synchronously (no render). */
export function isNewsAttached(): boolean {
  return attached;
}

/** Test helper. */
export function __resetNewsKeepAlive(): void {
  attached = false;
  requestedOwner = null;
  content = null;
  scrollKeeper = null;
  container?.remove();
  container = null;
  emit();
}

// ── Active context ──────────────────────────────────────────────────
// True outside the keep-alive host (News rendered any other way behaves as it
// always did); inside the host, true only while the slot is attached.
const NewsActiveContext = createContext(true);

export function useNewsActive(): boolean {
  return useContext(NewsActiveContext);
}

function isHomePath(pathname: string): boolean {
  return pathname === "/home" || pathname.startsWith("/home/");
}

// ── Host ────────────────────────────────────────────────────────────
export function NewsKeepAliveHost() {
  const { user } = useAuth();
  const tenantCtx = useTenantSafe();
  const owner = ownerKey(user?.id, tenantCtx?.activeTenantId);
  const requested = useSyncExternalStore(subscribe, () => requestedOwner);
  const Content = useSyncExternalStore(subscribe, () => content);

  // Signing out (or never having visited News) mounts nothing; the next
  // member has to open News first.
  useLayoutEffect(() => {
    if (!owner) release();
  }, [owner]);

  if (!owner || requested !== owner || !Content) return null;
  return <NewsKeepAliveMount key={owner} content={Content} />;
}

function NewsKeepAliveMount({ content: Content }: { content: ComponentType }) {
  const { hasPermission } = useRole();
  const isAttached = useSyncExternalStore(subscribe, () => attached);
  const routerLocation = useContext(UNSAFE_LocationContext);

  // Frozen location: News only ever sees the last /home* location. While
  // detached the value below does not change, so a navigation elsewhere does
  // not re-render the hidden tree at all, `?tab` is never reset by another
  // route's URL, and News's impressions never fire for another screen.
  // Navigation (useNavigate, <Link>) still uses the real router — only the
  // location is overridden — but a RELATIVE navigate() inside News would
  // resolve against the frozen /home location; every navigate() in News is
  // absolute (`/news/${id}`, `/home`, calendarTargetFor()) and must stay so.
  // UNSAFE_LocationContext is react-router v6 API (6.30.1, pinned ^6):
  // revisit on a react-router v7 migration, under its own VTID.
  const frozen = useRef(routerLocation);
  if (isAttached && isHomePath(routerLocation.location.pathname)) {
    frozen.current = routerLocation;
  }
  const locationValue = frozen.current;

  // Stable element: the host re-renders on every navigation (it reads the
  // router location); News content (React.memo, no props) stops it there.
  const tree = useMemo(
    () => (
      <Suspense fallback={null}>
        <Content />
      </Suspense>
    ),
    [Content],
  );

  if (!hasPermission("community")) return null;

  return createPortal(
    <UNSAFE_LocationContext.Provider value={locationValue}>
      <NewsActiveContext.Provider value={isAttached}>{tree}</NewsActiveContext.Provider>
    </UNSAFE_LocationContext.Provider>,
    getContainer(),
  );
}

// ── Slot ────────────────────────────────────────────────────────────
export function NewsKeepAliveSlot({ content: component }: { content: ComponentType }) {
  const { user } = useAuth();
  const tenantCtx = useTenantSafe();
  const owner = ownerKey(user?.id, tenantCtx?.activeTenantId);
  const slotRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (owner) request(owner, component);
  }, [owner, component]);

  useLayoutEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const node = getContainer();
    slot.appendChild(node);
    setAttached(true);
    scrollKeeper?.restore();
    return () => {
      // Runs before the next screen is inserted, so window.scrollY is still
      // News's own offset here.
      scrollKeeper?.save();
      setAttached(false);
      if (node.parentNode === slot) slot.removeChild(node);
    };
  }, []);

  return <div ref={slotRef} className="contents" />;
}
