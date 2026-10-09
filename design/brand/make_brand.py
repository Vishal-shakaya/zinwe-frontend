"""
Regenerate the web brand assets:  python design/brand/make_brand.py   (needs numpy + pillow)

Derive web-ready Zinwe brand assets from the founder's original logo PNGs.

The originals have a baked-in, slightly noisy white background (values 236-255).
For every pixel we fit "brand colour F composited over white" for each brand colour
(orange Z, dark-grey letters) and keep the best fit:  C = a*F + (1-a)*255.
That gives a true alpha (clean anti-aliased edges, no white fringe) while the RGB is
snapped to the exact brand colour. Background noise is removed with a dilated
foreground mask, so edges are not eroded.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
SRC = HERE / "originals"                      # founder's original PNGs (white background)
PUBLIC = HERE.parent.parent / "public"
OUT = PUBLIC / "brand"                        # logo + mark variants, share image
ICONS = PUBLIC                                # favicon / touch / app icons live at the site root
OUT.mkdir(parents=True, exist_ok=True)

ORANGE = np.array([253, 109, 2], dtype=np.float64)   # sampled median of the solid Z
GREY = np.array([43, 43, 42], dtype=np.float64)      # sampled median of "inwe"
WHITE = 255.0


def matte(path: Path, colours: list[np.ndarray]) -> tuple[np.ndarray, np.ndarray]:
    """Return (alpha HxW in 0..1, index HxW of the best-fitting brand colour)."""
    c = np.asarray(Image.open(path).convert("RGB"), dtype=np.float64)
    best_err = None
    best_a = best_i = None
    for i, f in enumerate(colours):
        denom = WHITE - f                       # per channel, >0 for our colours
        w = denom ** 2                          # least-squares alpha over the 3 channels
        a = np.clip(((WHITE - c) * denom).sum(-1) / w.sum(), 0, 1)
        recon = a[..., None] * f + (1 - a[..., None]) * WHITE
        err = ((recon - c) ** 2).sum(-1)
        if best_err is None:
            best_err, best_a, best_i = err, a, np.zeros(a.shape, int)
        else:
            better = err < best_err
            best_err = np.where(better, err, best_err)
            best_a = np.where(better, a, best_a)
            best_i = np.where(better, i, best_i)
    # Foreground mask: clearly non-white pixels, dilated 3px; outside it is background noise.
    core = (c.min(-1) < 200).astype(np.uint8) * 255
    mask = np.asarray(Image.fromarray(core).filter(ImageFilter.MaxFilter(7))) > 0
    a = np.where(mask, best_a, 0.0)
    a = np.where(a < 0.03, 0.0, np.where(a > 0.97, 1.0, a))
    return a, best_i


def compose(alpha: np.ndarray, idx: np.ndarray, palette: list[tuple[int, int, int]]) -> Image.Image:
    rgb = np.zeros(alpha.shape + (3,), dtype=np.uint8)
    for i, col in enumerate(palette):
        rgb[idx == i] = col
    rgba = np.dstack([rgb, (alpha * 255).round().astype(np.uint8)])
    img = Image.fromarray(rgba, "RGBA")
    return img.crop(img.getchannel("A").getbbox())


def pad(img: Image.Image, frac: float, square: bool = False) -> Image.Image:
    w, h = img.size
    p = round(max(w, h) * frac)
    W, H = (max(w, h) + 2 * p,) * 2 if square else (w + 2 * p, h + 2 * p)
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    canvas.paste(img, ((W - w) // 2, (H - h) // 2), img)
    return canvas


def by_height(img: Image.Image, h: int) -> Image.Image:
    w = round(img.width * h / img.height)
    return img.resize((w, h), Image.LANCZOS)


def on_bg(img: Image.Image, size: tuple[int, int], scale: float, bg=(255, 255, 255, 255)) -> Image.Image:
    canvas = Image.new("RGBA", size, bg)
    s = min(size[0] * scale / img.width, size[1] * scale / img.height)
    im = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    canvas.paste(im, ((size[0] - im.width) // 2, (size[1] - im.height) // 2), im)
    return canvas


def save(img: Image.Image, name: str, webp: bool = False) -> None:
    img.save(OUT / f"{name}.png", optimize=True)
    if webp:
        img.save(OUT / f"{name}.webp", quality=92, method=6)


report = {}

# ---- Wordmark (orange Z + grey "inwe"), and a light variant for dark surfaces
a, i = matte(SRC / "logo.png", [ORANGE, GREY])
logo = pad(compose(a, i, [tuple(map(int, ORANGE)), tuple(map(int, GREY))]), 0.0)
logo_light = pad(compose(a, i, [tuple(map(int, ORANGE)), (255, 255, 255)]), 0.0)
save(logo, "zinwe-logo")                       # full-res master
save(logo_light, "zinwe-logo-light")
for h in (32, 64, 96):                          # 1x / 2x / 3x at a 32px display height
    save(by_height(logo, h), f"zinwe-logo-{h}", webp=True)
    save(by_height(logo_light, h), f"zinwe-logo-light-{h}", webp=True)
report["logo"] = {"size": logo.size, "aspect": round(logo.width / logo.height, 4)}

# ---- Mark (the Z alone)
a, i = matte(SRC / "logo-mark.png", [ORANGE])
mark = compose(a, i, [tuple(map(int, ORANGE))])
mark_sq = pad(mark, 0.0, square=True)
save(mark_sq.resize((512, 512), Image.LANCZOS), "zinwe-mark")
for s in (32, 64, 128, 256):
    save(mark_sq.resize((s, s), Image.LANCZOS), f"zinwe-mark-{s}", webp=s >= 64)
report["mark"] = {"trimmed": mark.size}

# ---- Browser + device icons
fav = pad(mark, 0.04, square=True)              # tiny breathing room so the Z isn't clipped
fav.resize((256, 256), Image.LANCZOS).save(ICONS / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
for s in (16, 32):
    fav.resize((s, s), Image.LANCZOS).save(ICONS / f"favicon-{s}x{s}.png", optimize=True)
on_bg(mark, (180, 180), 0.62).convert("RGB").save(ICONS / "apple-touch-icon.png", optimize=True)
for s in (192, 512):                            # maskable: keep the Z inside the 80% safe zone
    on_bg(mark, (s, s), 0.56).convert("RGB").save(ICONS / f"icon-{s}.png", optimize=True)

# ---- Social share image (Open Graph / Twitter), 1200x630
og = on_bg(logo, (1200, 630), 0.52)
og.convert("RGB").save(OUT / "og-image.png", optimize=True)

report["files"] = sorted(p.name for p in OUT.iterdir())
print(json.dumps(report, indent=1))
