/// <reference path="../pb_data/types.d.ts" />

// Colecțiile pentru sincronizarea progresului (vezi architecture.md §14).
// Fiecare utilizator vede și modifică doar înregistrările lui; înregistrarea publică de conturi este închisă
// (conturile se creează din panoul de administrare).
migrate(
  (app) => {
    // 1. Conturile nu se pot crea de către vizitatori.
    const users = app.findCollectionByNameOrId("users");
    users.createRule = null;
    app.save(users);

    // 2. Cererile în lot (batch) sunt folosite la trimiterea modificărilor; limitarea încercărilor de autentificare.
    const settings = app.settings();
    settings.batch.enabled = true;
    settings.batch.maxRequests = 100;
    // Limite pe IP. Valorile implicite ale PocketBase (autentificare: 2 cereri / 3 s; loturi: 3 / s) sunt prea
    // strânse: o primă încărcare mare trimite zeci de loturi, iar clientul reia singur cererile refuzate (429).
    settings.rateLimits.enabled = true;
    settings.rateLimits.rules = [
      { label: "*:auth", audience: "", duration: 10, maxRequests: 8 },
      { label: "*:create", audience: "", duration: 5, maxRequests: 20 },
      { label: "/api/batch", audience: "", duration: 1, maxRequests: 8 },
      { label: "/api/", audience: "", duration: 10, maxRequests: 300 },
    ];
    // în spatele nginx: adresa clientului vine în X-Real-IP (setat de nginx din X-Forwarded-For de la Traefik)
    settings.trustedProxy.headers = ["X-Real-IP"];
    settings.trustedProxy.useLeftmostIP = false;
    app.save(settings);

    const own = "user = @request.auth.id";
    const ownCreate = '@request.auth.id != "" && @request.body.user = @request.auth.id';
    // un utilizator nu poate muta o înregistrare pe contul altcuiva
    const ownUpdate = `${own} && (@request.body.user:isset = false || @request.body.user = @request.auth.id)`;

    const timestamps = [
      { type: "autodate", name: "created", onCreate: true, onUpdate: false },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ];

    const collection = (name, fields, indexes) =>
      new Collection({
        type: "base",
        name,
        listRule: own,
        viewRule: own,
        createRule: ownCreate,
        updateRule: ownUpdate,
        deleteRule: own,
        fields: [
          {
            type: "relation",
            name: "user",
            required: true,
            collectionId: users.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          ...fields,
          ...timestamps,
        ],
        indexes: [
          ...indexes,
          `CREATE INDEX idx_${name}_user_updated ON ${name} (user, updated)`,
        ],
      });

    const key = (name, max = 200) => ({ type: "text", name, required: true, max });
    const data = { type: "json", name: "data", maxSize: 100000 };

    // Cardurile FSRS (vocabular, conjugare, abilități). `deleted` = ștergere marcată, ca să ajungă și pe celelalte dispozitive.
    app.save(
      collection(
        "cards",
        [key("cardId"), data, { type: "number", name: "updatedAt", required: true }, { type: "bool", name: "deleted" }],
        ["CREATE UNIQUE INDEX idx_cards_user_card ON cards (user, cardId)"],
      ),
    );

    // Jurnalul de repetiții: doar adăugare, fiecare intrare cu un identificator unic (uid).
    app.save(
      collection("review_logs", [key("uid", 64), data], [
        "CREATE UNIQUE INDEX idx_review_logs_user_uid ON review_logs (user, uid)",
      ]),
    );

    // Setările: un singur rând pe utilizator.
    app.save(
      collection("settings", [data, { type: "number", name: "updatedAt", required: true }], [
        "CREATE UNIQUE INDEX idx_settings_user ON settings (user)",
      ]),
    );

    // Semnalările de greșeli: doar adăugare.
    app.save(
      collection("reports", [key("uid", 64), data], ["CREATE UNIQUE INDEX idx_reports_user_uid ON reports (user, uid)"]),
    );
  },
  (app) => {
    for (const name of ["reports", "settings", "review_logs", "cards"]) {
      app.delete(app.findCollectionByNameOrId(name));
    }
    const users = app.findCollectionByNameOrId("users");
    users.createRule = "";
    app.save(users);
  },
);
