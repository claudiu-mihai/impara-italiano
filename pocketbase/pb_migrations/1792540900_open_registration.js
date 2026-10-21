/// <reference path="../pb_data/types.d.ts" />

// Înregistrare liberă din aplicație. Singura protecție este o limită strictă de conturi create pe oră de pe aceeași
// adresă IP (vizitatori neautentificați); administratorul care creează conturi din panou nu este limitat.
// Parola uitată nu se poate reseta din aplicație (nu există email configurat): o resetează administratorul din panou.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.createRule = "";
    app.save(users);

    // regula specifică trebuie să fie înaintea celor generale (*:create, /api/)
    const settings = app.settings();
    const rules = [{ label: "users:create", audience: "@guest", duration: 3600, maxRequests: 5 }];
    for (const rule of settings.rateLimits.rules) {
      if (rule.label !== "users:create") rules.push(rule);
    }
    settings.rateLimits.rules = rules;
    app.save(settings);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.createRule = null;
    app.save(users);

    const settings = app.settings();
    const rules = [];
    for (const rule of settings.rateLimits.rules) {
      if (rule.label !== "users:create") rules.push(rule);
    }
    settings.rateLimits.rules = rules;
    app.save(settings);
  },
);
