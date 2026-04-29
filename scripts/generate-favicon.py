#!/usr/bin/env python3
"""Generate the MAXINA favicon set: a black rounded-square tile with the
white dancer figure centered.

Source : public/images/maxina-logo.png  (full brand mark, kept as-is)
Outputs:
  public/images/maxina-favicon.png   512x512 master
  public/apple-touch-icon.png        180x180
  public/favicon-32x32.png           32x32
  public/favicon-16x16.png           16x16
  public/favicon.ico                 multi-res (16/32/48)

Re-run after any update to maxina-logo.png.
"""
from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "images" / "maxina-logo.png"
PUBLIC = ROOT / "public"
IMAGES = PUBLIC / "images"

TILE = 512
CORNER_RADIUS = round(TILE * 0.225)   # iOS squircle-ish
DANCER_FRAC = 0.78                    # dancer's longer side / tile size
SUPERSAMPLE = 4                       # for crisp rounded corners


def extract_dancer(src: Image.Image) -> Image.Image:
    """Return an RGBA image of just the dancer, white on transparent."""
    rgb = src.convert("RGB")
    w, h = rgb.size
    # Drop the bottom region containing the "MAXINA" wordmark.
    top = rgb.crop((0, 0, w, int(h * 0.55)))

    # Tight bbox around the dark ink. Threshold first so faint
    # near-white anti-aliasing pixels don't inflate the bbox.
    gray = top.convert("L")
    threshold = 180
    ink_mask = gray.point(lambda v: 255 if v < threshold else 0, mode="L")
    bbox = ink_mask.getbbox()
    if bbox is None:
        raise RuntimeError("No dancer pixels found in source image.")
    pad = 12
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(top.width, x1 + pad)
    y1 = min(top.height, y1 + pad)
    dancer_gray = gray.crop((x0, y0, x1, y1))

    # alpha = 255 - luminance, so dark ink becomes opaque white.
    alpha = ImageChops.invert(dancer_gray)
    white = Image.new("RGB", dancer_gray.size, (255, 255, 255))
    out = Image.new("RGBA", dancer_gray.size)
    out.paste(white, mask=alpha)
    return out


def rounded_mask(size: int, radius: int) -> Image.Image:
    """Return an L-mode rounded-square mask, antialiased via supersampling."""
    big = size * SUPERSAMPLE
    big_radius = radius * SUPERSAMPLE
    mask = Image.new("L", (big, big), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, big - 1, big - 1), radius=big_radius, fill=255
    )
    return mask.resize((size, size), Image.LANCZOS)


def build_tile(dancer: Image.Image) -> Image.Image:
    """Composite the dancer onto a black rounded tile at TILE x TILE."""
    tile = Image.new("RGBA", (TILE, TILE), (0, 0, 0, 255))
    tile.putalpha(rounded_mask(TILE, CORNER_RADIUS))

    target = int(TILE * DANCER_FRAC)
    dw, dh = dancer.size
    scale = target / max(dw, dh)
    new_size = (max(1, round(dw * scale)), max(1, round(dh * scale)))
    dancer_resized = dancer.resize(new_size, Image.LANCZOS)

    pos = ((TILE - new_size[0]) // 2, (TILE - new_size[1]) // 2)
    tile.alpha_composite(dancer_resized, dest=pos)
    return tile


def export(tile: Image.Image) -> None:
    IMAGES.mkdir(parents=True, exist_ok=True)
    master = IMAGES / "maxina-favicon.png"
    tile.save(master, format="PNG", optimize=True)

    sizes = {
        PUBLIC / "apple-touch-icon.png": 180,
        PUBLIC / "favicon-32x32.png": 32,
        PUBLIC / "favicon-16x16.png": 16,
    }
    for path, size in sizes.items():
        tile.resize((size, size), Image.LANCZOS).save(path, format="PNG", optimize=True)

    ico_path = PUBLIC / "favicon.ico"
    tile.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])

    print(f"Wrote: {master.relative_to(ROOT)}")
    for path in sizes:
        print(f"Wrote: {path.relative_to(ROOT)}")
    print(f"Wrote: {ico_path.relative_to(ROOT)}")


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Source not found: {SRC}")
    with Image.open(SRC) as src:
        dancer = extract_dancer(src)
    tile = build_tile(dancer)
    export(tile)


if __name__ == "__main__":
    main()
