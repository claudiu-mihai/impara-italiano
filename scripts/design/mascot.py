"""
Lupino, mascota aplicației: din desenele JPG din design/lupino/ produce
  - SVG-urile ipostazelor, fără fundal, în src/ui/mascot/;
  - iconițele aplicației (PWA) din capul lui Lupino, în public/icons/.

Pași pentru fiecare desen: netezirea zgomotului JPG, decuparea fundalului (umplere pornită de la margini, deci
albul din interiorul conturului rămâne), mărire de 2 ori, trasare color cu vtracer, eliminarea fundalului din SVG.
Ipostaza „serie” primește capul din „in-bocca-al-lupo” (zâmbet, face cu ochiul), ca să fie veselă.

Rulare (o singură dată: pip install -r scripts/design/requirements.txt):
  python scripts/design/mascot.py
"""
import re
import tempfile
from collections import deque
from pathlib import Path

import numpy as np
import resvg_py
import vtracer
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "design/lupino"
OUT = ROOT / "src/ui/mascot"
ICONS = ROOT / "public/icons"

POSES = ["ciao", "in-bocca-al-lupo", "bravo", "serie", "pensa", "a-domani", "relax", "cap"]
# zone închise în care se vede fundalul (de aceeași culoare cu albul din desen, deci nu se pot deosebi automat):
# câte un punct din fiecare, în pixelii desenului sursă; se fac transparente
HOLES = {"relax": [(1179, 1690), (1352, 1297)]}
# desenele cu margini mari se decupează la conținut, ca personajul să aibă aceeași mărime ca în celelalte
CROP_TO_CONTENT = {"relax"}
WORK_SIZE = 1160  # latura la care se trasează (desenele de 580 px, mărite de 2 ori)
KEY = (255, 0, 255)  # culoare-cheie pentru fundal, eliminată după trasare
# fundalul iconiței: bleumarinul din iconița desenată (design/lupino/lupino-app-icon.jpg)
ICON_BG = "#1e3f5a"


def remove_background(img: Image.Image, holes: list[tuple[int, int]] = ()) -> Image.Image:
    """
    Pune culoarea-cheie pe fundalul deschis legat de margini (inclusiv umbra difuză de sub picioare) și pe zonele
    închise date prin câte un punct (`holes`).
    """
    a = np.asarray(img).astype(np.int32)
    h, w, _ = a.shape
    lum = (a[..., 0] * 299 + a[..., 1] * 587 + a[..., 2] * 114) // 1000
    sat = a.max(axis=2) - a.min(axis=2)
    candidate = (lum > 188) & (sat < 26)
    seen = np.zeros((h, w), bool)
    queue = deque()
    for y in range(h):
        for x in range(w):
            if (y in (0, h - 1) or x in (0, w - 1)) and candidate[y, x]:
                seen[y, x] = True
                queue.append((y, x))
    for x, y in holes:
        if not candidate[y, x]:
            raise ValueError(f"punctul ({x}, {y}) nu e într-o zonă de fundal")
        seen[y, x] = True
        queue.append((y, x))
    while queue:
        y, x = queue.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and candidate[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                queue.append((ny, nx))
    out = np.asarray(img).copy()
    out[seen] = KEY
    return Image.fromarray(out)


def happy_streak() -> Image.Image:
    """„serie” cu capul din „in-bocca-al-lupo”: aceeași încadrare, eșarfele se suprapun la deplasarea (6, -2)."""
    serie = Image.open(SRC / "lupino-serie.jpg").convert("RGB")
    head = Image.open(SRC / "lupino-in-bocca-al-lupo.jpg").convert("RGB")
    shifted = Image.new("RGB", head.size, (238, 238, 238))
    shifted.paste(head, (6, -2))
    # capul până la eșarfă; flacăra din dreapta rămâne din „serie”
    mask = Image.new("L", serie.size, 0)
    ImageDraw.Draw(mask).rectangle((0, 0, 408, 290), fill=255)
    return Image.composite(shifted, serie, mask.filter(ImageFilter.GaussianBlur(3)))


def prepare(img: Image.Image, holes: list[tuple[int, int]] = (), crop: bool = False) -> Image.Image:
    img = img.convert("RGB").filter(ImageFilter.MedianFilter(3))
    keyed = np.asarray(remove_background(img, holes))
    mask = Image.fromarray(((keyed == np.array(KEY)).all(axis=2) * 255).astype(np.uint8))
    if crop:
        # pătrat în jurul conținutului, cu o margine de 3%, ca la celelalte desene
        ys, xs = np.nonzero(np.asarray(mask) == 0)
        side = int(max(xs.max() - xs.min(), ys.max() - ys.min()) * 1.06)
        cx, cy = (xs.min() + xs.max()) // 2, (ys.min() + ys.max()) // 2
        left, top = cx - side // 2, cy - side // 2
        # pe o pânză nouă, ca zona care ar ieși din imagine să fie fundal (cheie), nu desen
        canvas = Image.new("RGB", (side, side), (255, 255, 255))
        canvas.paste(img, (-left, -top))
        canvas_mask = Image.new("L", (side, side), 255)
        canvas_mask.paste(mask, (-left, -top))
        img, mask = canvas, canvas_mask
    size = (WORK_SIZE, WORK_SIZE)
    big = img.resize(size, Image.LANCZOS).filter(ImageFilter.MedianFilter(5))
    a = np.asarray(big).copy()
    a[np.asarray(mask.resize(size, Image.NEAREST)) > 0] = KEY
    return Image.fromarray(a)


def trace(img: Image.Image) -> str:
    with tempfile.TemporaryDirectory() as tmp:
        png, svg_path = Path(tmp) / "in.png", Path(tmp) / "out.svg"
        img.save(png)
        vtracer.convert_image_to_svg_py(
            str(png), str(svg_path),
            colormode="color", hierarchical="stacked", mode="spline",
            filter_speckle=10, color_precision=6, layer_difference=18,
            corner_threshold=80, length_threshold=8.0, max_iterations=10,
            splice_threshold=60, path_precision=0,
        )
        svg = svg_path.read_text()

    def is_key(m: re.Match) -> bool:
        r, g, b = (int(m.group(1)[i:i + 2], 16) for i in (0, 2, 4))
        return abs(r - KEY[0]) + abs(g - KEY[1]) + abs(b - KEY[2]) < 60

    svg = re.sub(r'<path[^>]*fill="#([0-9A-Fa-f]{6})"[^>]*/>\s*', lambda m: "" if is_key(m) else m.group(0), svg)
    svg = re.sub(r"<\?xml[^>]*>\s*|<!--.*?-->\s*", "", svg, flags=re.S)
    m = re.search(r'width="(\d+)" height="(\d+)"', svg)
    svg = svg.replace(m.group(0), f'viewBox="0 0 {m.group(1)} {m.group(2)}"', 1)
    return svg.replace('<svg version="1.1" ', "<svg ", 1)


def inner(svg: str) -> tuple[str, int]:
    """Conținutul unui SVG (fără elementul <svg>) și latura viewBox-ului."""
    side = int(re.search(r'viewBox="0 0 (\d+) \d+"', svg).group(1))
    return re.sub(r"^<svg[^>]*>", "", svg.strip()).rsplit("</svg>", 1)[0], side


def bbox(svg: str) -> tuple[float, float, float, float]:
    """Dreptunghiul care cuprinde desenul, ca fracții din latură (din randarea pe fundal transparent)."""
    png = bytes(resvg_py.svg_to_bytes(svg_string=svg, width=400))
    with tempfile.NamedTemporaryFile(suffix=".png") as f:
        f.write(png)
        f.flush()
        alpha = np.asarray(Image.open(f.name).convert("RGBA"))[..., 3]
    ys, xs = np.nonzero(alpha > 8)
    return xs.min() / 400, ys.min() / 400, (xs.max() + 1) / 400, (ys.max() + 1) / 400


def icon_svg(cap: str, rounded: bool, fill: float) -> str:
    """Capul centrat pe fundalul bleumarin; `fill` = cât din latură ocupă cea mai mare dimensiune a capului."""
    body, side = inner(cap)
    x0, y0, x1, y1 = bbox(cap)
    scale = fill * 512 / (max(x1 - x0, y1 - y0) * side)
    cx, cy = (x0 + x1) / 2 * side, (y0 + y1) / 2 * side
    radius = ' rx="112"' if rounded else ""
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">'
        f'<rect width="512" height="512"{radius} fill="{ICON_BG}"/>'
        f'<g transform="translate(256 256) scale({scale:.5f}) translate({-cx:.1f} {-cy:.1f})">{body}</g></svg>\n'
    )


def write_png(svg: str, path: Path, size: int) -> None:
    path.write_bytes(bytes(resvg_py.svg_to_bytes(svg_string=svg, width=size)))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for pose in POSES:
        source = happy_streak() if pose == "serie" else Image.open(next(SRC.glob(f"lupino-{pose}.jp*g")))
        svg = trace(prepare(source, HOLES.get(pose, ()), pose in CROP_TO_CONTENT))
        (OUT / f"lupino-{pose}.svg").write_text(svg + "\n")
        print(f"src/ui/mascot/lupino-{pose}.svg: {len(svg) // 1024} KB")

    cap = (OUT / "lupino-cap.svg").read_text()
    # iconița obișnuită: pătrat rotunjit; „maskable”: fundal plin, capul în cercul central pe care Android nu-l taie
    regular = icon_svg(cap, rounded=True, fill=0.84)
    maskable = icon_svg(cap, rounded=False, fill=0.62)
    (ICONS / "icon.svg").write_text(regular)
    write_png(regular, ICONS / "icon-192.png", 192)
    write_png(regular, ICONS / "icon-512.png", 512)
    write_png(maskable, ICONS / "icon-maskable-512.png", 512)
    print("public/icons: icon.svg, icon-192.png, icon-512.png, icon-maskable-512.png")


if __name__ == "__main__":
    main()
