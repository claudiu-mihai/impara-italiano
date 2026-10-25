import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App.tsx";
import { loadContentStore } from "./data/content/contentStore.ts";
import { initUiLanguage } from "./i18n/index.ts";
import { initPwa } from "./services/pwaUpdate.ts";
import { requestPersistentStorage } from "./services/storagePersist.ts";
import { initTheme } from "./services/theme.ts";
import "./index.css";

initTheme();
// pornește încărcarea listei de cuvinte înainte ca React să se monteze (cererea se suprapune cu randarea)
void loadContentStore();
initPwa();
void requestPersistentStorage();

// italiana (dacă e aleasă) se încarcă înainte de prima afișare; româna e deja în pachet
void initUiLanguage().then(() =>
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
);
