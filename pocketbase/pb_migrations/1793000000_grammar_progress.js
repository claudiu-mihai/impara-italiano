/// <reference path="../pb_data/types.d.ts" />

// Progresul la gramatică (lecție citită, cel mai bun scor la jocuri): un rând pe utilizator și temă.
// Aceleași reguli de acces ca celelalte colecții de sincronizare: fiecare vede și modifică doar rândurile lui.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    const own = "user = @request.auth.id";
    const ownCreate = '@request.auth.id != "" && @request.body.user = @request.auth.id';
    const ownUpdate = `${own} && (@request.body.user:isset = false || @request.body.user = @request.auth.id)`;

    app.save(
      new Collection({
        type: "base",
        name: "grammar_progress",
        listRule: own,
        viewRule: own,
        createRule: ownCreate,
        updateRule: ownUpdate,
        deleteRule: own,
        fields: [
          { type: "relation", name: "user", required: true, collectionId: users.id, cascadeDelete: true, maxSelect: 1 },
          { type: "text", name: "topicId", required: true, max: 100 },
          { type: "json", name: "data", maxSize: 10000 },
          { type: "number", name: "updatedAt", required: true },
          { type: "autodate", name: "created", onCreate: true, onUpdate: false },
          { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
        ],
        indexes: [
          "CREATE UNIQUE INDEX idx_grammar_progress_user_topic ON grammar_progress (user, topicId)",
          "CREATE INDEX idx_grammar_progress_user_updated ON grammar_progress (user, updated)",
        ],
      }),
    );
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("grammar_progress"));
  },
);
