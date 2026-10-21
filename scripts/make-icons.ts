import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { crc32, deflateSync } from "node:zlib";
import { ROOT } from "./content.ts";

// Generează iconițele PWA (steag tricolor pe pătrat rotunjit) fără dependențe de imagini.
// Rulare: node scripts/make-icons.ts

const OUT = resolve(ROOT, "public/icons");
const GREEN = [0, 146, 70];
const WHITE = [255, 255, 255];
const RED = [206, 43, 55];

function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}

function png(size: number, rounded: boolean): Buffer {
  const radius = rounded ? size * 0.22 : 0;
  const rows = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    rows[rowStart] = 0; // filtru „None”
    for (let x = 0; x < size; x++) {
      const color = x < size / 3 ? GREEN : x < (2 * size) / 3 ? WHITE : RED;
      // Distanța semnată până la pătratul rotunjit, pentru margini netezite.
      const cx = Math.min(Math.max(x + 0.5, radius), size - radius);
      const cy = Math.min(Math.max(y + 0.5, radius), size - radius);
      const dist = rounded ? Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - radius : -1;
      const alpha = Math.round(255 * Math.min(1, Math.max(0, 0.5 - dist)));
      const i = rowStart + 1 + x * 4;
      rows[i] = color[0]!;
      rows[i + 1] = color[1]!;
      rows[i + 2] = color[2]!;
      rows[i + 3] = alpha;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // adâncime de biți
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <clipPath id="r"><rect width="512" height="512" rx="112"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="171" height="512" fill="#009246"/>
    <rect x="171" width="170" height="512" fill="#ffffff"/>
    <rect x="341" width="171" height="512" fill="#ce2b37"/>
  </g>
</svg>
`;

mkdirSync(OUT, { recursive: true });
writeFileSync(resolve(OUT, "icon.svg"), svg);
writeFileSync(resolve(OUT, "icon-192.png"), png(192, true));
writeFileSync(resolve(OUT, "icon-512.png"), png(512, true));
writeFileSync(resolve(OUT, "icon-maskable-512.png"), png(512, false));
console.log(`Iconițe scrise în ${OUT}`);
