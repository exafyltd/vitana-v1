/**
 * VTID-05117 — the container panel of a `form` screen (sign-in, password reset,
 * consent, onboarding, invite acceptance, legal text) or of an operator
 * `workspace` panel.
 *
 * Contract SR-09 keeps the raw shadcn `Card` for panels and VCard for content
 * items (posts, products, events …). A form container is a panel, not a content
 * item, so these pages use this wrapper instead of importing
 * `@/components/ui/card` themselves. It renders exactly the shadcn Card DOM and
 * classes, so a page that switches to it looks and behaves identically.
 *
 * Never use it for a member content item — that is a VCard.
 */
export {
  Card as Panel,
  CardHeader as PanelHeader,
  CardTitle as PanelTitle,
  CardDescription as PanelDescription,
  CardContent as PanelContent,
  CardFooter as PanelFooter,
} from '@/components/ui/card';
