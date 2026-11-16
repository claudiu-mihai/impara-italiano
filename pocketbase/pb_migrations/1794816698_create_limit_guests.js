/// <reference path="../pb_data/types.d.ts" />

// Limita de creări (`*:create`, 20 la 5 s) se aplică fiecărei cereri dintr-un lot. Sincronizarea trimite loturi cu
// zeci de înregistrări noi (jurnalul de repetiții se doar adaugă), așa că pentru un utilizator autentificat lotul se
// refuza întreg („Batch transaction failed”) și modificările rămâneau netrimise. Limita rămâne doar pentru vizitatori;
// utilizatorii autentificați sunt limitați în continuare de regulile pentru /api/batch și /api/.
migrate(
  (app) => {
    const settings = app.settings();
    for (const rule of settings.rateLimits.rules) {
      if (rule.label === "*:create") rule.audience = "@guest";
    }
    app.save(settings);
  },
  (app) => {
    const settings = app.settings();
    for (const rule of settings.rateLimits.rules) {
      if (rule.label === "*:create") rule.audience = "";
    }
    app.save(settings);
  },
);
