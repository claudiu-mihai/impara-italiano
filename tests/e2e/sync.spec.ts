import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type APIRequestContext, type Browser, type BrowserContext, type Page } from "@playwright/test";

/**
 * Teste cu un PocketBase real (pornit de Playwright, bază curată la fiecare rulare). Fiecare test își creează
 * propriul utilizator; „telefoanele” sunt contexte de browser separate, cu baze de date locale separate.
 */
const PB = "http://127.0.0.1:8090/api";
const PASSWORD = "parola-de-test-1";

let counter = 0;
const uniqueEmail = () => `u${Date.now()}-${++counter}-${Math.floor(Math.random() * 1e6)}@test.local`;

let adminToken: string | undefined;
async function adminHeaders(request: APIRequestContext) {
  if (!adminToken) {
    const response = await request.post(`${PB}/collections/_superusers/auth-with-password`, {
      data: { identity: "admin@test.local", password: "adminpass123" },
    });
    expect(response.ok()).toBe(true);
    adminToken = ((await response.json()) as { token: string }).token;
  }
  return { Authorization: adminToken };
}

async function createUser(request: APIRequestContext) {
  const email = uniqueEmail();
  const response = await request.post(`${PB}/collections/users/records`, {
    headers: await adminHeaders(request),
    data: { email, password: PASSWORD, passwordConfirm: PASSWORD },
  });
  expect(response.ok()).toBe(true);
  return { email, id: ((await response.json()) as { id: string }).id };
}

/** Conturile de pe server cu acest email (admin). */
async function serverUsers(request: APIRequestContext, email: string) {
  const response = await request.get(`${PB}/collections/users/records`, {
    headers: await adminHeaders(request),
    params: { filter: `email = "${email}"` },
  });
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { items: { id: string; email: string }[] }).items;
}

/** Ce are serverul pentru un utilizator, într-o colecție. */
async function serverRecords(request: APIRequestContext, collection: string, userId: string) {
  const response = await request.get(`${PB}/collections/${collection}/records`, {
    headers: await adminHeaders(request),
    params: { filter: `user = "${userId}"`, perPage: "500" },
  });
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { items: Record<string, unknown>[] }).items;
}

async function phone(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ ...devices["Pixel 7"], baseURL: "http://localhost:4173" });
  const page = await context.newPage();
  page.on("dialog", (dialog) => void dialog.accept());
  return { context, page };
}

async function markKnown(page: Page, wordId: string) {
  await page.goto(`/browse/${wordId}`);
  await page.getByRole("button", { name: "Știu deja acest cuvânt" }).click();
  await expect(page.getByText("În învățare", { exact: true })).toBeVisible();
}

const isKnown = async (page: Page, wordId: string) => {
  await page.goto(`/browse/${wordId}`);
  const known = page.getByText("În învățare", { exact: true });
  const fresh = page.getByText("Nou", { exact: true });
  await expect(known.or(fresh)).toBeVisible();
  return known.isVisible();
};

/** Așteaptă (cu reîncărcări) până când starea cuvântului pe acest telefon este cea cerută. */
const eventuallyKnown = (page: Page, wordId: string, expected: boolean) =>
  expect.poll(() => isKnown(page, wordId), { timeout: 15_000, intervals: [300, 500, 1000] }).toBe(expected);

async function openAccount(page: Page) {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Cont" })).toBeVisible();
}

async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Parola", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Autentifică-te" }).click();
}

/** Creează un cont nou din formularul din Setări. */
async function register(page: Page, email: string, password = PASSWORD, confirm = password) {
  await page.getByRole("button", { name: "Cont nou" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Parola", { exact: true }).fill(password);
  await page.getByLabel("Confirmă parola").fill(confirm);
  await page.getByRole("button", { name: "Creează cont" }).click();
}

/** Deschide panoul de ștergere a contului și introduce parola. */
async function confirmDeleteWith(page: Page, password: string) {
  await page.getByRole("button", { name: "Șterge contul" }).click();
  await expect(page.getByRole("form", { name: "Confirmă ștergerea contului" })).toBeVisible();
  await page.getByLabel("Parola pentru confirmare").fill(password);
  await page.getByRole("button", { name: "Confirmă ștergerea" }).click();
}

const status = (page: Page) => page.getByTestId("sync-status");
const syncedStatus = (page: Page) => expect(status(page)).toContainText("Sincronizat", { timeout: 15_000 });

test("fără cont aplicația nu face nicio cerere către server", async ({ page }) => {
  const calls: string[] = [];
  page.on("request", (request) => {
    const { pathname } = new URL(request.url());
    // nici cererile spre server, nici codul de sincronizare (SDK-ul PocketBase) nu se încarcă fără cont
    if (pathname.startsWith("/api/") || pathname.startsWith("/assets/account-")) calls.push(request.url());
  });

  await markKnown(page, "v-parlare");
  await openAccount(page);
  await expect(page.getByRole("button", { name: "Autentifică-te" })).toBeVisible();
  await page.goto("/learn/vocab");
  await page.goto("/stats");
  await page.goto("/settings");
  await page.getByLabel("Cuvinte noi pe zi").selectOption("5");
  await page.goto("/");
  await page.waitForTimeout(1500); // dacă ar exista sincronizare automată, ar porni în acest interval

  expect(calls).toEqual([]);
});

test("oricine poate crea un cont, dar nu unul „verificat” și nu cu un id ales", async ({ request }) => {
  const ok = await request.post(`${PB}/collections/users/records`, {
    data: { email: uniqueEmail(), password: PASSWORD, passwordConfirm: PASSWORD },
  });
  expect(ok.ok()).toBe(true);
  expect(((await ok.json()) as { verified: boolean }).verified).toBe(false);

  const forged = await request.post(`${PB}/collections/users/records`, {
    data: { email: uniqueEmail(), password: PASSWORD, passwordConfirm: PASSWORD, verified: true },
  });
  expect(forged.status()).toBe(400);
});

test("creează un cont din aplicație: intră direct, iar progresul local urcă în cont", async ({ browser, request }) => {
  const email = uniqueEmail();
  const a = await phone(browser);
  const b = await phone(browser);

  await markKnown(a.page, "v-parlare"); // progres făcut înainte de a avea cont
  await openAccount(a.page);
  await register(a.page, email);
  await expect(a.page.getByText(`Conectat ca ${email}`)).toBeVisible();
  await syncedStatus(a.page);

  const users = await serverUsers(request, email);
  expect(users.length).toBe(1);
  expect((await serverRecords(request, "cards", users[0]!.id)).length).toBe(2);

  // pe alt telefon, cu aceleași date, apare progresul
  await openAccount(b.page);
  await signIn(b.page, email);
  await syncedStatus(b.page);
  expect(await isKnown(b.page, "v-parlare")).toBe(true);

  await a.context.close();
  await b.context.close();
});

test("emailul se salvează cu litere mici, iar contul se poate folosi cu orice majuscule", async ({ browser, request }) => {
  const email = uniqueEmail();
  const mixed = email.replace(/^u/, "U").replace("@test.local", "@Test.LOCAL");
  const { page, context } = await phone(browser);
  await openAccount(page);
  await register(page, mixed);
  await syncedStatus(page);

  expect((await serverUsers(request, email)).length).toBe(1);
  await expect(page.getByText(`Conectat ca ${email}`)).toBeVisible();
  await context.close();
});

test("crearea contului: erorile se explică și nu schimbă nimic", async ({ browser, request }) => {
  const taken = await createUser(request);
  const { page, context } = await phone(browser);
  await openAccount(page);

  // verificări locale, înainte de orice cerere
  const requests: string[] = [];
  page.on("request", (r) => {
    if (new URL(r.url()).pathname.startsWith("/api/")) requests.push(r.url());
  });
  await register(page, uniqueEmail(), "scurta", "scurta");
  await expect(page.getByRole("alert")).toHaveText("Parola trebuie să aibă cel puțin 8 caractere.");
  await register(page, uniqueEmail(), "parola-buna-1", "parola-buna-2");
  await expect(page.getByRole("alert")).toHaveText("Parolele nu coincid.");
  await register(page, uniqueEmail(), "ă".repeat(40), "ă".repeat(40));
  await expect(page.getByRole("alert")).toContainText("cel mult 71");
  expect(requests).toEqual([]);

  // verificat de server
  await register(page, taken.email);
  await expect(page.getByRole("alert")).toHaveText("Există deja un cont cu acest email.");
  await expect(page.getByRole("button", { name: "Creează cont" })).toBeVisible();
  await context.close();
});

test("parolă greșită: mesaj clar și nimic nu se schimbă local", async ({ browser, request }) => {
  const user = await createUser(request);
  const { page, context } = await phone(browser);
  await markKnown(page, "v-parlare");
  await openAccount(page);
  await signIn(page, user.email, "parola-gresita");

  await expect(page.getByRole("alert")).toHaveText("Email sau parolă greșite.");
  await expect(page.getByRole("button", { name: "Autentifică-te" })).toBeVisible();
  expect(await isKnown(page, "v-parlare")).toBe(true);
  await context.close();
});

test("două telefoane cu același cont: progresul făcut separat se combină pe ambele", async ({ browser, request }) => {
  const user = await createUser(request);
  const a = await phone(browser);
  const b = await phone(browser);

  // telefonul A: învață două cuvinte, apoi se autentifică (progresul local urcă în cont)
  await markKnown(a.page, "v-parlare");
  await markKnown(a.page, "v-mangiare");
  await openAccount(a.page);
  await signIn(a.page, user.email);
  await expect(a.page.getByText(`Conectat ca ${user.email}`)).toBeVisible();
  await syncedStatus(a.page);
  expect((await serverRecords(request, "cards", user.id)).length).toBe(4);

  // telefonul B: avea deja alt progres local; la autentificare alege „Combină cu contul”
  await markKnown(b.page, "v-dire");
  await openAccount(b.page);
  await signIn(b.page, user.email);
  await expect(b.page.getByRole("group", { name: "Cum combinăm progresul?" })).toBeVisible();
  await b.page.getByRole("button", { name: "Combină cu contul" }).click();
  await syncedStatus(b.page);

  // B are acum și cuvintele lui A, iar în cont sunt toate cele 3 cuvinte (6 carduri)
  expect(await isKnown(b.page, "v-parlare")).toBe(true);
  expect(await isKnown(b.page, "v-mangiare")).toBe(true);
  expect(await isKnown(b.page, "v-dire")).toBe(true);
  expect((await serverRecords(request, "cards", user.id)).length).toBe(6);

  // A primește cuvântul lui B după o sincronizare
  await openAccount(a.page);
  await a.page.getByRole("button", { name: "Sincronizează acum" }).click();
  await eventuallyKnown(a.page, "v-dire", true);

  await a.context.close();
  await b.context.close();
});

test("repetițiile din jurnal ajung în cont și pe al doilea telefon", async ({ browser, request }) => {
  const user = await createUser(request);
  const a = await phone(browser);
  const b = await phone(browser);

  await a.page.goto("/");
  await a.page.getByRole("link", { name: "Începe sesiunea" }).click();
  await a.page.getByRole("button", { name: "Arată răspunsul" }).click();
  await a.page.getByRole("button", { name: /^Bine/ }).click();
  await expect(a.page.getByText(/^2 \/ \d+$/)).toBeVisible();
  await openAccount(a.page);
  await signIn(a.page, user.email);
  await syncedStatus(a.page);

  const logs = await serverRecords(request, "review_logs", user.id);
  expect(logs.length).toBe(1);

  await openAccount(b.page);
  await signIn(b.page, user.email);
  await syncedStatus(b.page);
  // B are aceeași repetiție în jurnalul lui
  const counts = await b.page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const open = indexedDB.open("impara-italiano");
      open.onsuccess = () => resolve(open.result);
    });
    const count = (store: string) =>
      new Promise<number>((resolve) => {
        const request = db.transaction(store).objectStore(store).count();
        request.onsuccess = () => resolve(request.result);
      });
    return { cards: await count("cards"), logs: await count("reviewLog") };
  });
  expect(counts.logs).toBe(1);
  expect(counts.cards).toBeGreaterThan(0);

  await a.context.close();
  await b.context.close();
});

test("„Folosește doar progresul din cont” șterge progresul de pe telefon", async ({ browser, request }) => {
  const user = await createUser(request);
  const a = await phone(browser);
  const b = await phone(browser);
  await markKnown(a.page, "v-parlare");
  await openAccount(a.page);
  await signIn(a.page, user.email);
  await syncedStatus(a.page);

  await markKnown(b.page, "v-dire"); // progres care nu e al contului
  await openAccount(b.page);
  await signIn(b.page, user.email);
  await b.page.getByRole("button", { name: "Folosește doar progresul din cont" }).click();
  await syncedStatus(b.page);

  expect(await isKnown(b.page, "v-parlare")).toBe(true);
  expect(await isKnown(b.page, "v-dire")).toBe(false);
  // contul nu a primit nimic de la telefonul lui B
  expect((await serverRecords(request, "cards", user.id)).length).toBe(2);

  await a.context.close();
  await b.context.close();
});

test("renunțarea la alegere nu schimbă nimic și nu lasă telefonul conectat", async ({ browser, request }) => {
  const user = await createUser(request);
  const a = await phone(browser);
  const b = await phone(browser);
  await markKnown(a.page, "v-parlare");
  await openAccount(a.page);
  await signIn(a.page, user.email);
  await syncedStatus(a.page);

  await markKnown(b.page, "v-dire");
  await openAccount(b.page);
  await signIn(b.page, user.email);
  await b.page.getByRole("button", { name: "Renunță" }).click();
  await expect(b.page.getByRole("button", { name: "Autentifică-te" })).toBeVisible();
  expect(await isKnown(b.page, "v-dire")).toBe(true);
  expect(await isKnown(b.page, "v-parlare")).toBe(false);
  expect((await serverRecords(request, "cards", user.id)).length).toBe(2);

  await a.context.close();
  await b.context.close();
});

test("offline: starea arată modificările în așteptare, iar la reconectare se trimit", async ({ browser, request }) => {
  const user = await createUser(request);
  const { page, context } = await phone(browser);
  await openAccount(page);
  await signIn(page, user.email);
  await syncedStatus(page);

  // pagina cuvântului se încarcă online; apoi telefonul rămâne offline cât învață
  await page.goto("/browse/v-parlare");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Știu deja acest cuvânt" }).click();
  await expect(page.getByText("În învățare", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Setări" }).click();

  await expect(status(page)).toHaveText("2 modificări în așteptare");
  await page.getByRole("button", { name: "Sincronizează acum" }).click();
  await expect(page.getByText("Ești offline")).toBeVisible();
  expect((await serverRecords(request, "cards", user.id)).length).toBe(0);

  await context.setOffline(false);
  await page.getByRole("button", { name: "Sincronizează acum" }).click();
  await syncedStatus(page);
  expect((await serverRecords(request, "cards", user.id)).length).toBe(2);
  await context.close();
});

test("ștergerea progresului unui cuvânt pe un telefon îl șterge și pe celălalt", async ({ browser, request }) => {
  const user = await createUser(request);
  const a = await phone(browser);
  const b = await phone(browser);
  await markKnown(a.page, "v-parlare");
  await openAccount(a.page);
  await signIn(a.page, user.email);
  await syncedStatus(a.page);
  await openAccount(b.page);
  await signIn(b.page, user.email);
  await syncedStatus(b.page);
  expect(await isKnown(b.page, "v-parlare")).toBe(true);

  await a.page.goto("/browse/v-parlare");
  await a.page.getByRole("button", { name: "Șterge progresul acestui cuvânt" }).click();
  await expect(a.page.getByText("Nou", { exact: true })).toBeVisible();
  await openAccount(a.page);
  await a.page.getByRole("button", { name: "Sincronizează acum" }).click();
  await syncedStatus(a.page);

  await openAccount(b.page);
  await b.page.getByRole("button", { name: "Sincronizează acum" }).click();
  await eventuallyKnown(b.page, "v-parlare", false);

  await a.context.close();
  await b.context.close();
});

test("setările se sincronizează, dar vocea aleasă rămâne pe dispozitiv", async ({ browser, request }) => {
  const user = await createUser(request);
  const a = await phone(browser);
  const b = await phone(browser);
  await openAccount(a.page);
  await a.page.getByLabel("Cuvinte noi pe zi").selectOption("20");
  await signIn(a.page, user.email);
  await syncedStatus(a.page);
  const settings = await serverRecords(request, "settings", user.id);
  expect(settings.length).toBe(1);
  expect(JSON.stringify(settings[0]?.data)).not.toContain("ttsVoiceURI");

  await openAccount(b.page);
  await signIn(b.page, user.email);
  await syncedStatus(b.page);
  await expect(b.page.getByLabel("Cuvinte noi pe zi")).toHaveValue("20");

  await a.context.close();
  await b.context.close();
});

test("sesiune expirată: se poate învăța în continuare, iar după reautentificare modificările pleacă", async ({ browser, request }) => {
  const user = await createUser(request);
  const { page, context } = await phone(browser);
  await openAccount(page);
  await signIn(page, user.email);
  await syncedStatus(page);

  // sesiunea dispare (ca după expirare) și se învață un cuvânt
  await page.evaluate(() => localStorage.removeItem("pocketbase_auth"));
  await markKnown(page, "v-parlare");
  await page.goto("/settings");
  await page.getByRole("button", { name: "Autentifică-te" }).waitFor({ timeout: 15_000 });
  await expect(page.getByRole("alert").filter({ hasText: "Sesiunea a expirat" })).toBeVisible();
  // adresa de email e deja cunoscută; se cere doar parola
  await expect(page.getByLabel("Email")).toHaveCount(0);
  expect((await serverRecords(request, "cards", user.id)).length).toBe(0);

  await page.getByLabel("Parola").fill(PASSWORD);
  await page.getByRole("button", { name: "Autentifică-te" }).click();
  await syncedStatus(page);
  expect((await serverRecords(request, "cards", user.id)).length).toBe(2);
  await context.close();
});

test("deconectarea cu modificări netrimise avertizează; după sincronizare telefonul revine curat", async ({ browser, request }) => {
  const user = await createUser(request);
  const { page, context } = await phone(browser);
  const dialogs: string[] = [];
  let acceptSecond = false;
  page.removeAllListeners("dialog");
  page.on("dialog", (dialog) => {
    dialogs.push(dialog.message());
    // primul dialog confirmă deconectarea; al doilea (avertismentul) se acceptă doar când testul o cere
    void (dialog.message().startsWith("Ai ") && !acceptSecond ? dialog.dismiss() : dialog.accept());
  });

  await markKnown(page, "v-parlare");
  await openAccount(page);
  await signIn(page, user.email);
  await syncedStatus(page);

  await page.goto("/browse/v-dire");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Știu deja acest cuvânt" }).click();
  await expect(page.getByText("În învățare", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Setări" }).click();

  await page.getByRole("button", { name: "Deconectează-te" }).click();
  await expect.poll(() => dialogs.some((m) => m.startsWith("Ai 2 modificări"))).toBe(true);
  // refuzat: rămâne conectat, cu modificările în așteptare
  await expect(page.getByText(`Conectat ca ${user.email}`)).toBeVisible();
  await expect(status(page)).toContainText("2 modificări în așteptare");

  await context.setOffline(false);
  await page.getByRole("button", { name: "Deconectează-te" }).click();
  await expect(page.getByRole("button", { name: "Autentifică-te" })).toBeVisible({ timeout: 15_000 });
  // tot ce era netrimis a ajuns în cont înainte de deconectare
  expect((await serverRecords(request, "cards", user.id)).length).toBe(4);
  // telefonul e curat și în modul fără cont
  expect(await isKnown(page, "v-parlare")).toBe(false);
  expect(await isKnown(page, "v-dire")).toBe(false);
  await context.close();
});

test("ștergerea contului cere parola: cu parola greșită nu se șterge nimic", async ({ browser, request }) => {
  const user = await createUser(request);
  const { page, context } = await phone(browser);
  await markKnown(page, "v-parlare");
  await openAccount(page);
  await signIn(page, user.email);
  await syncedStatus(page);

  await confirmDeleteWith(page, "parola-gresita");
  await expect(page.getByRole("alert")).toHaveText("Parola e greșită.");
  await expect(page.getByText(`Conectat ca ${user.email}`)).toBeVisible();
  expect((await serverUsers(request, user.email)).length).toBe(1);
  expect((await serverRecords(request, "cards", user.id)).length).toBe(2);

  // „Renunță” închide panoul fără să șteargă nimic
  await page.getByRole("button", { name: "Renunță" }).click();
  await expect(page.getByRole("form", { name: "Confirmă ștergerea contului" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Șterge contul" })).toBeVisible();
  await context.close();
});

test("ștergerea contului cu parola corectă elimină datele de pe server și curăță telefonul", async ({ browser, request }) => {
  const user = await createUser(request);
  const { page, context } = await phone(browser);
  await markKnown(page, "v-parlare");
  await openAccount(page);
  await signIn(page, user.email);
  await syncedStatus(page);
  expect((await serverRecords(request, "cards", user.id)).length).toBe(2);

  await confirmDeleteWith(page, PASSWORD);
  await expect(page.getByRole("button", { name: "Autentifică-te" })).toBeVisible({ timeout: 15_000 });

  expect((await serverRecords(request, "cards", user.id)).length).toBe(0);
  const gone = await request.get(`${PB}/collections/users/records/${user.id}`, { headers: await adminHeaders(request) });
  expect(gone.status()).toBe(404);
  expect(await isKnown(page, "v-parlare")).toBe(false);

  await openAccount(page);
  await signIn(page, user.email);
  await expect(page.getByRole("alert")).toHaveText("Email sau parolă greșite.");
  await context.close();
});

test("ștergerea contului merge și cu sesiunea expirată (parola reautentifică)", async ({ browser, request }) => {
  const user = await createUser(request);
  const { page, context } = await phone(browser);
  await openAccount(page);
  await signIn(page, user.email);
  await syncedStatus(page);

  await page.evaluate(() => localStorage.removeItem("pocketbase_auth"));
  await page.reload();
  await expect(page.getByRole("alert").filter({ hasText: "Sesiunea a expirat" })).toBeVisible({ timeout: 15_000 });

  await confirmDeleteWith(page, PASSWORD);
  // cu sesiunea expirată „Autentifică-te” e vizibil de la început: se așteaptă ieșirea din starea „Conectat”
  await expect(page.getByText("Conectat ca")).toHaveCount(0, { timeout: 15_000 });
  expect((await serverUsers(request, user.email)).length).toBe(0);
  await context.close();
});

test("ștergerea întregului progres cu cont îl șterge și din cont", async ({ browser, request }) => {
  const user = await createUser(request);
  const { page, context } = await phone(browser);
  await markKnown(page, "v-parlare");
  await openAccount(page);
  await signIn(page, user.email);
  await syncedStatus(page);
  expect((await serverRecords(request, "cards", user.id)).length).toBe(2);

  await page.getByRole("button", { name: "Șterge tot progresul" }).click();
  await expect(page.getByText("Progresul a fost șters.")).toBeVisible();
  await page.getByRole("button", { name: "Sincronizează acum" }).click();
  await syncedStatus(page);
  expect((await serverRecords(request, "cards", user.id)).length).toBe(0);
  await context.close();
});

test("un utilizator nu vede datele altuia", async ({ request }) => {
  const one = await createUser(request);
  const two = await createUser(request);
  const login = async (email: string) => {
    const response = await request.post(`${PB}/collections/users/auth-with-password`, { data: { identity: email, password: PASSWORD } });
    return ((await response.json()) as { token: string }).token;
  };
  const tokenOne = await login(one.email);
  const tokenTwo = await login(two.email);

  const created = await request.post(`${PB}/collections/cards/records`, {
    headers: { Authorization: tokenOne },
    data: { user: one.id, cardId: "vocab:x:it-ro", data: {}, updatedAt: 1, deleted: false },
  });
  expect(created.ok()).toBe(true);

  const list = await request.get(`${PB}/collections/cards/records`, { headers: { Authorization: tokenTwo } });
  expect(((await list.json()) as { totalItems: number }).totalItems).toBe(0);
  const id = ((await created.json()) as { id: string }).id;
  expect((await request.patch(`${PB}/collections/cards/records/${id}`, { headers: { Authorization: tokenTwo }, data: { updatedAt: 99 } })).ok()).toBe(false);
  const forged = await request.post(`${PB}/collections/cards/records`, {
    headers: { Authorization: tokenTwo },
    data: { user: one.id, cardId: "vocab:y:it-ro", data: {}, updatedAt: 1, deleted: false },
  });
  expect(forged.ok()).toBe(false);
});

for (const scheme of ["light", "dark"] as const) {
  test(`accesibilitate (axe, ${scheme}): secțiunea Cont fără cont, la alegere și cu cont`, async ({ browser, request }) => {
    const user = await createUser(request);
    const context = await browser.newContext({ ...devices["Pixel 7"], baseURL: "http://localhost:4173", colorScheme: scheme });
    const page = await context.newPage();
    const audit = async (label: string) => {
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(violations.map((v) => `${v.id}: ${v.help} (${v.nodes[0]?.target.join(" ")})`), label).toEqual([]);
    };

    await openAccount(page);
    await audit("fără cont");
    await page.getByRole("button", { name: "Cont nou" }).click();
    await expect(page.getByLabel("Confirmă parola")).toBeVisible();
    await audit("cont nou");
    await page.getByRole("button", { name: "Am deja cont" }).click();

    // alegerea de la prima autentificare (progres și local, și în cont)
    const other = await phone(browser);
    await markKnown(other.page, "v-parlare");
    await openAccount(other.page);
    await signIn(other.page, user.email);
    await syncedStatus(other.page);
    await markKnown(page, "v-dire");
    await openAccount(page);
    await signIn(page, user.email);
    await expect(page.getByRole("group", { name: "Cum combinăm progresul?" })).toBeVisible();
    await audit("alegerea");

    await page.getByRole("button", { name: "Combină cu contul" }).click();
    await syncedStatus(page);
    await audit("cu cont");
    await page.getByRole("button", { name: "Șterge contul" }).click();
    await expect(page.getByRole("form", { name: "Confirmă ștergerea contului" })).toBeVisible();
    await audit("ștergere cont");

    await other.context.close();
    await context.close();
  });
}
