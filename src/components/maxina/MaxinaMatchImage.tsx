// Renders the image portion of a MAXINA match card with the canonical
// fallback ladder: uploaded → imported → generated → initials monogram.
//
// All priority logic lives on the backend (`resolve-match-images`); this
// component only chooses between (a) the URL it was given and (b) a premium
// initials avatar when the URL is missing.

import { useMemo, useState } from "react";
import { buildInitialsAvatar, deriveInitials } from "@/utils/initialsAvatar";
import type {
  MatchCoverSource,
  ProfileImageSource,
  ResolvedMatchImage,
} from "@/hooks/useMaxinaMatchImages";

export type MaxinaMatchImageVariant = "avatar" | "cover";

interface MaxinaMatchImageProps {
  resolved: ResolvedMatchImage | undefined;
  variant: MaxinaMatchImageVariant;
  /** Pixel size for square avatars; ignored for covers. */
  size?: number;
  className?: string;
  alt?: string;
}

export function MaxinaMatchImage({
  resolved,
  variant,
  size = 96,
  className,
  alt,
}: MaxinaMatchImageProps) {
  const [errored, setErrored] = useState(false);

  const url = variant === "cover"
    ? resolved?.matchCoverImageUrl
    : resolved?.profileImageUrl;

  const source: ProfileImageSource | MatchCoverSource = variant === "cover"
    ? (resolved?.matchCoverSource ?? "initials")
    : (resolved?.profileImageSource ?? "initials");

  const initialsDataUrl = useMemo(
    () =>
      buildInitialsAvatar(
        resolved?.displayName,
        resolved?.fallbackSeed ?? resolved?.userId ?? null,
        { size: variant === "avatar" ? size : 512 },
      ),
    [resolved?.displayName, resolved?.fallbackSeed, resolved?.userId, size, variant],
  );

  const showInitials = !url || errored;
  const finalSrc = showInitials ? initialsDataUrl : url!;
  const effectiveSource: ProfileImageSource | MatchCoverSource =
    showInitials ? "initials" : source;

  const altText = alt ??
    (resolved?.displayName ?? deriveInitials(resolved?.displayName ?? ""));

  return (
    <img
      src={finalSrc}
      alt={altText}
      loading="lazy"
      decoding="async"
      data-image-source={effectiveSource}
      data-image-variant={variant}
      onError={() => setErrored(true)}
      className={className}
      style={variant === "avatar" ? { width: size, height: size } : undefined}
    />
  );
}

export default MaxinaMatchImage;
