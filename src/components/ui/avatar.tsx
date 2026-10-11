import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"
import { isDiceBear9Url, localAvatarDataUri, peekLocalAvatar } from "@/lib/localAvatar"
import { transformedCoverUrl } from "@/lib/eventCoverImage"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      "ring-1 ring-border/60 bg-card",
      "shadow-[0_2px_10px_rgba(0,0,0,0.06)]",
      "transition-transform duration-150 ease-out hover:scale-[1.02]",
      "focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

type AvatarImageProps = React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>

/**
 * VTID-05066: a DiceBear 9.x auto-avatar is drawn on the device (byte-identical
 * SVG, see lib/localAvatar.ts) instead of fetched from api.dicebear.com. Until
 * it is ready the AvatarFallback shows; if it cannot be drawn, the original URL
 * is used as before.
 */
const DiceBearAvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  AvatarImageProps & { src: string }
>(({ src, ...props }, ref) => {
  const [local, setLocal] = React.useState<string | null | undefined>(() => peekLocalAvatar(src))
  React.useEffect(() => {
    let alive = true
    const known = peekLocalAvatar(src)
    if (known !== undefined) {
      setLocal(known)
      return
    }
    setLocal(undefined)
    void localAvatarDataUri(src).then((uri) => {
      if (alive) setLocal(uri)
    })
    return () => {
      alive = false
    }
  }, [src])
  // undefined → still drawing (no src, the fallback shows); null → not drawable, use the URL.
  const resolved = local === undefined ? undefined : local ?? src
  return <AvatarPrimitive.Image ref={ref} src={resolved} {...props} />
})
DiceBearAvatarImage.displayName = "DiceBearAvatarImage"

/** Width an uploaded photo is resized to: the largest avatar (128 px call screens) at DPR 3. */
const STORAGE_AVATAR_WIDTH = 384

/**
 * VTID-05066 (amendment A1): an uploaded profile photo from Supabase storage is
 * served through the resize CDN instead of as the phone's original (1–3 MB
 * each, measured on staging, saturating a 4G connection on Events and News).
 * One-shot fallback to the original if the transform is rejected.
 */
const StorageAvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  AvatarImageProps & { src: string; resized: string }
>(({ src, resized, ...props }, ref) => {
  const [failed, setFailed] = React.useState(false)
  React.useEffect(() => setFailed(false), [src])
  return (
    <AvatarPrimitive.Image
      ref={ref}
      src={failed ? src : resized}
      {...props}
      onLoadingStatusChange={(status) => {
        if (status === "error" && !failed) setFailed(true)
        props.onLoadingStatusChange?.(status)
      }}
    />
  )
})
StorageAvatarImage.displayName = "StorageAvatarImage"

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  AvatarImageProps
>(({ className, src, ...props }, ref) => {
  const cls = cn("aspect-square h-full w-full object-cover", className)
  // Every other src renders exactly as before: no state, hook or effect.
  if (isDiceBear9Url(src)) return <DiceBearAvatarImage ref={ref} className={cls} src={src} {...props} />
  const resized = typeof src === "string" ? transformedCoverUrl(src, STORAGE_AVATAR_WIDTH) : undefined
  if (resized) return <StorageAvatarImage ref={ref} className={cls} src={src as string} resized={resized} {...props} />
  return <AvatarPrimitive.Image ref={ref} className={cls} src={src} {...props} />
})
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
