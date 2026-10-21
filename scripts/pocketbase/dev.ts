// Pornește un PocketBase local, curat, pentru dezvoltare și testele E2E (portul 8090, date șterse la fiecare pornire).
//
//   npm run pocketbase            # server de dezvoltare cu migrările din pocketbase/pb_migrations
//
// Binarul oficial se descarcă o singură dată în .pocketbase/ și se verifică cu suma de control fixată mai jos
// (aceeași versiune ca în pocketbase/Dockerfile).
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const POCKETBASE_VERSION = "0.40.5";
const SHA256: Record<string, string> = {
  darwin_amd64: "3640f0c4d9e0e5a47e321f10ddf6698508d4f20721bcf5dfb7c4192835e5105f",
  darwin_arm64: "d9a176e0491bc825fff88c2a4edffb07307f785ac2bd9710e82c5d223669fc17",
  linux_amd64: "1dbea1b01eb3dfe64953513859d01e759c96650c4e3264fa4eecd54b769382e4",
  linux_arm64: "570baa1c45d2fb92fc0073582b945ca0ece03cbf9837ccabf49a222f99dd02e3",
};

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const HOME = resolve(ROOT, ".pocketbase");
const PORT = process.env.POCKETBASE_PORT ?? "8090";
export const ADMIN = { email: "admin@test.local", password: "adminpass123" };

async function ensureBinary(): Promise<string> {
  const platform = `${process.platform}_${process.arch === "x64" ? "amd64" : process.arch}`;
  const expected = SHA256[platform];
  if (!expected) throw new Error(`Platformă nesuportată: ${platform}`);

  const dir = resolve(HOME, POCKETBASE_VERSION);
  const binary = resolve(dir, "pocketbase");
  if (existsSync(binary)) return binary;

  mkdirSync(dir, { recursive: true });
  const url = `https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_${platform}.zip`;
  console.log(`Descarc ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Descărcarea a eșuat: ${response.status}`);
  const zip = Buffer.from(await response.arrayBuffer());
  const actual = createHash("sha256").update(zip).digest("hex");
  if (actual !== expected) throw new Error(`Suma de control nu se potrivește (${actual}); arhiva nu se folosește.`);

  const archive = resolve(dir, "pocketbase.zip");
  writeFileSync(archive, zip);
  const unzip = spawnSync("unzip", ["-o", "-j", archive, "pocketbase", "-d", dir], { stdio: "inherit" });
  rmSync(archive);
  if (unzip.status !== 0) throw new Error("Nu am putut dezarhiva (este nevoie de `unzip`).");
  chmodSync(binary, 0o755);
  return binary;
}

const binary = await ensureBinary();
const data = resolve(HOME, "dev-data");
rmSync(data, { recursive: true, force: true });
mkdirSync(data, { recursive: true });

// Migrările reale + una doar pentru dezvoltare care oprește limitele pe IP: toate cererile din teste vin de la
// 127.0.0.1, deci limitele din migrare ar refuza testele paralele. Se pornesc cu POCKETBASE_RATE_LIMITS=on.
const migrations = resolve(HOME, "dev-migrations");
rmSync(migrations, { recursive: true, force: true });
mkdirSync(migrations, { recursive: true });
for (const file of readdirSync(resolve(ROOT, "pocketbase/pb_migrations"))) {
  copyFileSync(resolve(ROOT, "pocketbase/pb_migrations", file), resolve(migrations, file));
}
if (process.env.POCKETBASE_RATE_LIMITS !== "on") {
  writeFileSync(
    resolve(migrations, "1999999999_dev_no_rate_limits.js"),
    "migrate((app) => { const s = app.settings(); s.rateLimits.enabled = false; app.save(s); }, () => {});\n",
  );
}

const common = ["--dir", data, "--migrationsDir", migrations];
const admin = spawnSync(binary, ["superuser", "upsert", ADMIN.email, ADMIN.password, ...common], { stdio: "inherit" });
if (admin.status !== 0) throw new Error("Nu am putut crea administratorul de test.");

const server = spawn(binary, ["serve", ...common, "--http", `127.0.0.1:${PORT}`], { stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => server.kill(signal));
server.on("exit", (code) => process.exit(code ?? 0));
