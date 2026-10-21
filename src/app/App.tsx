import { useLiveQuery } from "dexie-react-hooks";
import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, NavLink, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { db } from "../data/db/instance.ts";
import { getSettings } from "../data/db/repositories.ts";
import { startAutoSync } from "../data/sync/autoSync.ts";
import { HomePage } from "../features/home/HomePage.tsx";
import { applyPwaUpdate, usePwaNeedRefresh } from "../services/pwaUpdate.ts";
import { applyTheme } from "../services/theme.ts";
import { setPreferredVoice, useTtsStatus } from "../services/tts.ts";
import { ContentProvider } from "./content.tsx";

// Ecranele în afară de cel de start se încarcă la nevoie, ca pornirea să rămână rapidă;
// service worker-ul le pune oricum în cache pentru funcționarea offline.
const AboutPage = lazy(() => import("../features/about/AboutPage.tsx").then((m) => ({ default: m.AboutPage })));
const BrowsePage = lazy(() => import("../features/browse/BrowsePage.tsx").then((m) => ({ default: m.BrowsePage })));
const WordDetailPage = lazy(() => import("../features/browse/WordDetailPage.tsx").then((m) => ({ default: m.WordDetailPage })));
const ConjugationPage = lazy(() => import("../features/conjugation/ConjugationPage.tsx").then((m) => ({ default: m.ConjugationPage })));
const FlashcardsPage = lazy(() => import("../features/flashcards/FlashcardsPage.tsx").then((m) => ({ default: m.FlashcardsPage })));
const LearnPage = lazy(() => import("../features/learn/LearnPage.tsx").then((m) => ({ default: m.LearnPage })));
const QuizPage = lazy(() => import("../features/quiz/QuizPage.tsx").then((m) => ({ default: m.QuizPage })));
const SentencePage = lazy(() => import("../features/sentence/SentencePage.tsx").then((m) => ({ default: m.SentencePage })));
const TopicsPage = lazy(() => import("../features/topics/TopicsPage.tsx").then((m) => ({ default: m.TopicsPage })));
const TopicPage = lazy(() => import("../features/topics/TopicPage.tsx").then((m) => ({ default: m.TopicPage })));
const MatchPage = lazy(() => import("../features/topics/MatchPage.tsx").then((m) => ({ default: m.MatchPage })));
const OrderPage = lazy(() => import("../features/topics/OrderPage.tsx").then((m) => ({ default: m.OrderPage })));
const SkillPage = lazy(() => import("../features/topics/SkillPage.tsx").then((m) => ({ default: m.SkillPage })));
const CatPage = lazy(() => import("../features/topics/CatPage.tsx").then((m) => ({ default: m.CatPage })));
const SettingsPage = lazy(() => import("../features/settings/SettingsPage.tsx").then((m) => ({ default: m.SettingsPage })));
const StatsPage = lazy(() => import("../features/stats/StatsPage.tsx").then((m) => ({ default: m.StatsPage })));

const NOTICE_KEY = "impara.ttsNoticeDismissed";

function readDismissed(): boolean {
  try {
    return localStorage.getItem(NOTICE_KEY) === "1";
  } catch {
    return false;
  }
}

function Banners() {
  const needRefresh = usePwaNeedRefresh();
  const tts = useTtsStatus();
  const settings = useLiveQuery(() => getSettings(db), []);

  // Vocea aleasă în Setări se aplică pentru toate butoanele de audio.
  useEffect(() => setPreferredVoice(settings?.ttsVoiceURI ?? null), [settings?.ttsVoiceURI]);
  useEffect(() => {
    if (settings) applyTheme(settings.theme);
  }, [settings?.theme]);
  const [dismissed, setDismissed] = useState(readDismissed);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(NOTICE_KEY, "1");
    } catch {
      // fără localStorage mesajul reapare la următoarea pornire; nu e grav
    }
  };

  return (
    <>
      {needRefresh && (
        <div role="status" className="flex items-center justify-between gap-3 bg-brand px-4 py-3 text-white">
          <span>Versiune nouă disponibilă</span>
          <button
            type="button"
            onClick={applyPwaUpdate}
            className="min-h-12 rounded-lg bg-white/20 px-4 font-semibold"
          >
            Reîncarcă
          </button>
        </div>
      )}
      {tts === "no-voice" && !dismissed && (
        <div role="status" className="flex items-start justify-between gap-3 bg-amber-100 px-4 py-3 text-amber-950">
          <span>
            Dispozitivul nu are o voce italiană, deci butonul de audio este ascuns. Mac: Setări de sistem →
            Accesibilitate → Conținut vorbit → Voce de sistem → Gestionează vocile. iPhone: Setări → Accesibilitate →
            Conținut vorbit → Voci. Android: Setări → Gestionare generală → Text în vorbire.
          </span>
          <button type="button" onClick={dismiss} aria-label="Închide" className="min-h-12 min-w-12 text-xl">
            ✕
          </button>
        </div>
      )}
    </>
  );
}

const NAV = [
  { to: "/", label: "Acasă", icon: "🏠", end: true },
  { to: "/learn", label: "Învață", icon: "🃏", end: false },
  { to: "/browse", label: "Dicționar", icon: "📖", end: false },
  { to: "/stats", label: "Statistici", icon: "📈", end: false },
  { to: "/settings", label: "Setări", icon: "⚙️", end: false },
];

// Ecranele de studiu ocupă tot ecranul: bara de jos este ascunsă acolo.
const STUDY_ROUTES = ["/learn/vocab", "/learn/conjugation", "/learn/sentence", "/quiz"];
// sesiunile și exercițiile unei teme (/learn/topics/<id>/flashcards, /quiz, /match…) tot pe tot ecranul
const isStudyRoute = (pathname: string) => STUDY_ROUTES.includes(pathname) || /^\/learn\/topics\/[^/]+\/[a-z]+$/.test(pathname);

function Layout() {
  const { pathname } = useLocation();
  const studying = isStudyRoute(pathname);

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <Banners />
      <main className="flex flex-1 flex-col">
        <Suspense fallback={<p className="p-6 text-center text-muted">Se încarcă…</p>}>
          <Outlet />
        </Suspense>
      </main>
      {!studying && (
        <nav
          aria-label="Navigare principală"
          className="sticky bottom-0 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900"
        >
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex min-h-16 flex-col items-center justify-center gap-0.5 text-sm ${
                  isActive ? "font-semibold text-brand-fg" : "text-muted"
                }`
              }
            >
              <span aria-hidden="true" className="text-xl">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}

export function App() {
  // sincronizarea automată pornește doar cu cont; fără cont nu face nimic și nu încarcă nimic
  useEffect(() => startAutoSync(db), []);

  return (
    <BrowserRouter>
      <ContentProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="learn" element={<LearnPage />} />
            <Route path="learn/vocab" element={<FlashcardsPage />} />
            <Route path="learn/conjugation" element={<ConjugationPage />} />
            <Route path="learn/sentence" element={<SentencePage />} />
            <Route path="learn/topics" element={<TopicsPage />} />
            <Route path="learn/topics/:id" element={<TopicPage />} />
            <Route path="learn/topics/:id/flashcards" element={<FlashcardsPage />} />
            <Route path="learn/topics/:id/quiz" element={<QuizPage />} />
            <Route path="learn/topics/:id/match" element={<MatchPage />} />
            <Route path="learn/topics/:id/order" element={<OrderPage />} />
            <Route path="learn/topics/:id/numbers" element={<SkillPage />} />
            <Route path="learn/topics/:id/clock" element={<SkillPage />} />
            <Route path="learn/topics/:id/cat" element={<CatPage />} />
            <Route path="quiz" element={<QuizPage />} />
            <Route path="browse" element={<BrowsePage />} />
            <Route path="browse/:id" element={<WordDetailPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="about" element={<AboutPage />} />
          </Route>
        </Routes>
      </ContentProvider>
    </BrowserRouter>
  );
}
