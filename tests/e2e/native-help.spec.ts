import { expect, test, type Page } from "@playwright/test";

const toggle = (page: Page) => page.getByRole("checkbox", { name: "Traducere în limba maternă" });
const stoppedNotice = (page: Page) =>
  page.getByRole("status").filter({ hasText: /s-a oprit pentru nivelul/ });

test("la A1 Temele arată italiana mare, cu limba maternă dedesubt", async ({ page }) => {
  await page.goto("/learn/topics");
  await expect(page.getByRole("heading", { name: /Tempo/, level: 2 })).toContainText("Timp");
  await expect(page.getByRole("heading", { name: /Vita quotidiana/, level: 2 })).toContainText("Zi de zi");

  const link = page.getByRole("link", { name: /I giorni della settimana/ });
  await expect(link).toContainText("Zilele săptămânii");
  // textul italian e marcat ca italiană, pentru cititoarele de ecran
  await expect(link.locator('[lang="it"]')).toHaveText("I giorni della settimana");

  await link.click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("I giorni della settimana");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Zilele săptămânii");
  await expect(page.getByRole("heading", { name: /I giorni/, level: 2 })).toContainText("Zilele");
});

test("pagina cuvântului trimite la temă cu numele în ambele limbi", async ({ page }) => {
  await page.goto("/browse/n-lunedì");
  const link = page.getByRole("link", { name: /Vezi tema/ });
  await expect(link).toContainText("I giorni della settimana");
  await expect(link).toContainText("Zilele săptămânii");
});

test("„De reținut” se întoarce toată, cu titlu cu tot, și arată regulile comparate doar în română", async ({ page }) => {
  await page.goto("/learn/topics/familia");
  const box = page.getByTestId("rules-box");
  await expect(box).toHaveAttribute("data-face", "italian");
  await expect(page.getByRole("heading", { name: "Da ricordare" })).toBeVisible();
  // fața în română nu e în arborele de accesibilitate cât timp e în spate
  await expect(page.getByRole("heading", { name: "De reținut" })).toHaveCount(0);
  await expect(page.getByText(/Con i parenti al singolare/)).toBeHidden();

  await page.getByRole("button", { name: "Da ricordare" }).click();
  const italianRule = page.getByText(/Con i parenti al singolare/);
  await expect(italianRule).toBeVisible();

  // atingerea casetei deschise o întoarce
  await italianRule.click();
  await expect(box).toHaveAttribute("data-face", "native");
  await expect(page.getByRole("heading", { name: "De reținut" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Da ricordare" })).toHaveCount(0);
  await expect(page.getByText(/Cu rudele la singular, posesivul stă fără articol/)).toBeVisible();
  await expect(page.getByText(/prieten fals: «parenti»/)).toBeVisible();

  // și înapoi, cu butonul (pentru tastatură)
  await page.getByRole("button", { name: "Mostra in italiano" }).click();
  await expect(box).toHaveAttribute("data-face", "italian");
  await expect(page.getByRole("heading", { name: "Da ricordare" })).toBeVisible();
  await expect(page.getByText(/Con i parenti al singolare/)).toBeVisible();
});

test("întoarcerea merge și cu animațiile reduse și mută focusul pe fața nouă", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/learn/topics/culori");
  await page.getByRole("button", { name: "Da ricordare" }).click();
  await page.getByRole("button", { name: "Arată în română" }).click();
  await expect(page.getByTestId("rules-box")).toHaveAttribute("data-face", "native");
  await expect(page.getByRole("button", { name: "Mostra in italiano" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("rules-box")).toHaveAttribute("data-face", "italian");
  await expect(page.getByRole("button", { name: "Arată în română" })).toBeFocused();
});

test("oprită din Setări, Temele și „De reținut” arată doar italiana", async ({ page }) => {
  await page.goto("/settings");
  await expect(toggle(page)).toBeChecked();
  await toggle(page).click();
  await expect(toggle(page)).not.toBeChecked();

  await page.goto("/learn/topics");
  await expect(page.getByRole("heading", { name: "Tempo", level: 2, exact: true })).toBeVisible();
  await expect(page.getByText("Timp", { exact: true })).toHaveCount(0);
  const link = page.getByRole("link", { name: /I giorni della settimana/ });
  await expect(link).toBeVisible();
  await expect(link).not.toContainText("Zilele săptămânii");
  await expect(link.locator('[lang="it"]')).toHaveText("I giorni della settimana");

  await page.goto("/learn/topics/familia");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("La famiglia");
  // traducerea cuvintelor de pe fișă nu depinde de setare
  await expect(page.getByText("soție", { exact: true })).toBeVisible();

  // „De reținut”: o singură casetă, în italiană, fără întoarcere și fără regulile comparate cu româna
  await expect(page.getByTestId("rules-box")).toHaveCount(0);
  await expect(page.getByText("De reținut")).toHaveCount(0);
  await page.getByRole("button", { name: "Da ricordare" }).click();
  await expect(page.getByText(/Con i parenti al singolare/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Arată în română" })).toHaveCount(0);
  await expect(page.getByText(/Cu rudele la singular/)).toHaveCount(0);
  await expect(page.getByText(/prieten fals/)).toHaveCount(0);
});

test("la trecerea peste nivelul A se oprește singură, cu un mesaj care apare o singură dată", async ({ page }) => {
  await page.goto("/settings");
  await page.getByLabel("Nivelul curent").selectOption("A2");
  await expect(toggle(page)).toBeChecked();
  await expect(stoppedNotice(page)).toHaveCount(0);

  await page.getByLabel("Nivelul curent").selectOption("B1");
  await expect(toggle(page)).not.toBeChecked();
  await expect(stoppedNotice(page)).toContainText("nivelul B1");

  await page.goto("/learn/topics");
  await expect(stoppedNotice(page)).toContainText("O poți reporni din Setări");
  await expect(page.getByRole("heading", { name: "Tempo", level: 2, exact: true })).toBeVisible();
  await expect(page.getByText("Timp", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Am înțeles" }).click();
  await expect(stoppedNotice(page)).toHaveCount(0);
  await page.reload();
  await expect(stoppedNotice(page)).toHaveCount(0);

  // revenirea la A nu o repornește
  await page.goto("/settings");
  await page.getByLabel("Nivelul curent").selectOption("A2");
  await expect(toggle(page)).not.toBeChecked();

  // pornită manual la B1, rămâne pornită la schimbarea nivelului
  await page.getByLabel("Nivelul curent").selectOption("B1");
  await toggle(page).click();
  await expect(toggle(page)).toBeChecked();
  await page.getByLabel("Nivelul curent").selectOption("B2");
  await expect(toggle(page)).toBeChecked();
  await expect(stoppedNotice(page)).toHaveCount(0);
});
