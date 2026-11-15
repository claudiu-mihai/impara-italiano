import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useDialogues } from "../../app/dialogues.ts";
import { db } from "../../data/db/instance.ts";
import { getSettings } from "../../data/db/repositories.ts";
import { dialogueCardId } from "../../domain/dialogue/due.ts";
import { useT } from "../../i18n/index.ts";
import { stopSpeaking } from "../../services/tts.ts";
import { BackLink } from "../../ui/BackLink.tsx";
import { BilingualLabel } from "../../ui/BilingualLabel.tsx";
import { CefrBadge } from "../../ui/CefrBadge.tsx";
import { ReviewStatus } from "../grammar/ReviewStatus.tsx";
import { ListenMode } from "./ListenMode.tsx";
import { RolePlayMode } from "./RolePlayMode.tsx";

type Mode = "menu" | "listen" | "roleplay";

const modeButton =
  "flex min-h-16 items-center justify-center gap-2 rounded-xl px-4 text-lg font-semibold";

/** Un dialog al unei teme: antet (titlu, obiectivul „pot să…”, repetarea) și cele două moduri, Ascultă și Joc de rol. */
export function DialoguePage() {
  const { t, language } = useT();
  const { id: topicId = "", dialogueId = "" } = useParams();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<Mode>(params.get("mode") === "roleplay" ? "roleplay" : "menu");
  const dialogues = useDialogues();
  const settings = useLiveQuery(() => getSettings(db), []);
  const card = useLiveQuery(() => db.cards.get(dialogueCardId(dialogueId)), [dialogueId]);
  const exitTo = `/learn/topics/${topicId}`;

  // vocea se oprește când ieși din dialog
  useEffect(() => stopSpeaking, []);

  if (!dialogues || !settings) return <p className="p-6 text-center text-muted">{t("common.loading")}</p>;

  const dialogue = dialogues.find((d) => d.id === dialogueId && d.topicId === topicId);
  if (!dialogue) {
    return (
      <div className="p-6 text-center">
        <p className="mb-4">{t("dialogue.notFound")}.</p>
        <Link to={exitTo} className="text-brand-fg underline">
          {t("flash.backToTopic")}
        </Link>
      </div>
    );
  }

  if (mode === "listen") {
    return <ListenMode key="listen" dialogue={dialogue} settings={settings} exitTo={exitTo} onRolePlay={() => setMode("roleplay")} />;
  }
  if (mode === "roleplay") {
    return <RolePlayMode key="roleplay" dialogue={dialogue} settings={settings} exitTo={exitTo} backLabel={t("flash.backToTopic")} />;
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-8 pt-4">
      <BackLink to={exitTo} label={t("flash.backToTopic")} />
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="flex-1 text-3xl font-bold">
            <BilingualLabel text={dialogue.title} />
          </h1>
          <CefrBadge level={dialogue.level} />
        </div>
        <p data-testid="canDo" className="font-semibold">
          🎯 <span className="sr-only">{t("dialogue.canDo")}: </span>
          {language === "it" ? dialogue.canDo.it : dialogue.canDo.ro}
        </p>
        <ReviewStatus card={card} start={t("dialogue.reviewStart")} testId="dialogue-review" />
      </header>
      <div className="grid gap-3">
        <button type="button" onClick={() => setMode("listen")} className={`${modeButton} border-2 border-brand text-brand-fg active:bg-slate-100 dark:active:bg-slate-800`}>
          <span aria-hidden="true">🎧</span>
          {t("dialogue.listen")}
        </button>
        <button type="button" onClick={() => setMode("roleplay")} className={`${modeButton} bg-brand text-white active:bg-brand-dark`}>
          <span aria-hidden="true">🗣️</span>
          {t("dialogue.rolePlay")}
        </button>
      </div>
    </div>
  );
}
