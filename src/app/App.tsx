import { useLiveQuery } from "dexie-react-hooks";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { BrowserRouter, NavLink, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { db } from "../data/db/instance.ts";
import { getSettings } from "../data/db/repositories.ts";
import { startAutoSync } from "../data/sync/autoSync.ts";
import { setUiLanguage, useT, type Key } from "../i18n/index.ts";
import { HomePage } from "../features/home/HomePage.tsx";
// redirecționarea rutelor vechi e de câteva rânduri: se încarcă direct, nu la nevoie
import { LegacyGamesRedirect } from "../features/grammar/LegacyGamesRedirect.tsx";
import { applyPwaUpdate, usePwaNeedRefresh } from "../services/pwaUpdate.ts";
import { applyTheme } from "../services/theme.ts";
import { setPreferredVoice, useTtsStatus } from "../services/tts.ts";
import { ContentProvider } from "./content.tsx";
import { COMPACT_BELOW, useVisibleViewport } from "./useVisibleViewport.ts";
import { Splash } from "../features/splash/Splash.tsx";
import { shouldShowSplash } from "../services/splash.ts";

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
const GrammarListPage = lazy(() => import("../features/grammar/GrammarListPage.tsx").then((m) => ({ default: m.GrammarListPage })));
const GrammarTopicPage = lazy(() => import("../features/grammar/GrammarTopicPage.tsx").then((m) => ({ default: m.GrammarTopicPage })));
const GameCardsPage = lazy(() => import("../features/grammar/CardsGame.tsx").then((m) => ({ default: m.CardsPage })));
const GameMatchPage = lazy(() => import("../features/grammar/MatchGame.tsx").then((m) => ({ default: m.MatchPage })));
const GameTypePage = lazy(() => import("../features/grammar/TypeGame.tsx").then((m) => ({ default: m.TypePage })));
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
  const { t } = useT();
  const needRefresh = usePwaNeedRefresh();
  const tts = useTtsStatus();
  const settings = useLiveQuery(() => getSettings(db), []);

  // Vocea aleasă în Setări se aplică pentru toate butoanele de audio.
  useEffect(() => setPreferredVoice(settings?.ttsVoiceURI ?? null), [settings?.ttsVoiceURI]);
  useEffect(() => {
    if (settings) applyTheme(settings.theme);
  }, [settings?.theme]);
  useEffect(() => {
    if (settings) void setUiLanguage(settings.uiLanguage);
  }, [settings?.uiLanguage]);
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
          <span>{t("banner.update")}</span>
          <button
            type="button"
            onClick={applyPwaUpdate}
            className="min-h-12 rounded-lg bg-white/20 px-4 font-semibold"
          >
            {t("banner.reload")}
          </button>
        </div>
      )}
      {tts === "no-voice" && !dismissed && (
        <div role="status" className="flex items-start justify-between gap-3 bg-amber-100 px-4 py-3 text-amber-950">
          <span>{t("banner.noVoice")}</span>
          <button type="button" onClick={dismiss} aria-label={t("common.close")} className="min-h-12 min-w-12 text-xl">
            ✕
          </button>
        </div>
      )}
    </>
  );
}

const NAV: { to: string; label: Key; icon: string; end: boolean }[] = [
  { to: "/", label: "nav.home", icon: "🏠", end: true },
  { to: "/learn", label: "nav.learn", icon: "🎓", end: false },
  { to: "/browse", label: "nav.browse", icon: "🔎", end: false },
  { to: "/stats", label: "nav.stats", icon: "📈", end: false },
  { to: "/settings", label: "nav.settings", icon: "⚙️", end: false },
];

// Ecranele de studiu ocupă tot ecranul: bara de jos este ascunsă acolo.
const STUDY_ROUTES = ["/learn/vocab", "/learn/conjugation", "/learn/sentence", "/quiz"];
// sesiunile și exercițiile unei teme (/learn/topics/<id>/flashcards, /quiz, /match…) și jocurile de gramatică
// (/learn/grammar/<id>/cards, /match, /type) tot pe tot ecranul
const isStudyRoute = (pathname: string) =>
  STUDY_ROUTES.includes(pathname) || /^\/learn\/(topics|grammar)\/[^/]+\/[a-z]+$/.test(pathname);

function Layout() {
  const { t } = useT();
  const { pathname } = useLocation();
  const studying = isStudyRoute(pathname);
  // Pe ecranele de studiu pagina are exact mărimea zonei vizibile: cu tastatura deschisă nu derulează, iar cerința
  // rămâne în ecran; sub o anumită înălțime ecranele trec în aspectul compact (`compact:` din index.css).
  const viewport = useVisibleViewport(studying);
  const compact = viewport !== undefined && viewport.height < COMPACT_BELOW;

  return (
    <div
      className={studying ? "fixed inset-x-0 overflow-y-auto" : undefined}
      style={studying ? (viewport ? { top: viewport.top, height: viewport.height } : { top: 0, bottom: 0 }) : undefined}
    >
      <div
        data-compact={compact ? "" : undefined}
        className={`mx-auto flex max-w-xl flex-col ${studying ? "h-full" : "min-h-dvh"}`}
      >
        <Banners />
        <main className="flex min-h-0 flex-1 flex-col">
          <Suspense fallback={<p className="p-6 text-center text-muted">{t("common.loading")}</p>}>
            <Outlet />
          </Suspense>
        </main>
        {!studying && (
          <nav
            aria-label={t("nav.label")}
            className="sticky bottom-0 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900"
          >
            {NAV.map((item) => (
              // iconiță + nume vizibil; numele accesibil vine chiar din text, iar pagina activă are fundal și etichetă verde
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className="flex min-h-16 flex-col items-center justify-center gap-0.5 pb-1 pt-1.5"
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden="true"
                      className={`flex h-8 w-14 items-center justify-center rounded-full text-xl transition-colors motion-reduce:transition-none ${
                        isActive ? "bg-brand/15 dark:bg-brand/30" : "opacity-70"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span
                      className={`max-w-full whitespace-nowrap text-[11px] leading-tight tracking-tight ${
                        isActive ? "font-bold text-brand-fg" : "font-medium text-muted"
                      }`}
                    >
                      {t(item.label)}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}

export function App() {
  // sincronizarea automată pornește doar cu cont; fără cont nu face nimic și nu încarcă nimic
  useEffect(() => startAutoSync(db), []);
  // Lupino te salută la deschiderea aplicației; ecranul Acasă se încarcă între timp dedesubt
  const [splash, setSplash] = useState(() => shouldShowSplash(window.location.pathname));
  const hideSplash = useCallback(() => setSplash(false), []);

  return (
    <>
      {splash && <Splash onDone={hideSplash} />}
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
              <Route path="learn/grammar" element={<GrammarListPage />} />
              <Route path="learn/grammar/:id" element={<GrammarTopicPage />} />
              <Route path="learn/grammar/:id/cards" element={<GameCardsPage />} />
              <Route path="learn/grammar/:id/match" element={<GameMatchPage />} />
              <Route path="learn/grammar/:id/type" element={<GameTypePage />} />
              {/* „Jocuri” a devenit „Gramatică”: semnele de carte vechi continuă să meargă */}
              <Route path="learn/games" element={<LegacyGamesRedirect />} />
              <Route path="learn/games/*" element={<LegacyGamesRedirect />} />
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
    </>
  );
}
