import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState, type FormEvent } from "react";
import { useContent } from "../../app/content.tsx";
import { db } from "../../data/db/instance.ts";
import { passwordProblem } from "../../data/sync/messages.ts";
import { pendingCount } from "../../data/sync/pending.ts";
import { useT } from "../../i18n/index.ts";
import { InfoHeading } from "../../ui/Info.tsx";
import { downloadBackup } from "./backupDownload.ts";

// Modulul cu SDK-ul PocketBase se încarcă doar când ai deja un cont sau când te autentifici.
const loadAccount = () => import("../../data/sync/account.ts");

const card = "rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900";
const heading = "text-sm font-semibold uppercase tracking-wide text-muted";
const input = "min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-800";
const primary = "min-h-12 rounded-xl bg-brand px-4 font-semibold text-white disabled:opacity-50";
const outline = "min-h-12 rounded-xl border-2 border-brand-fg px-4 font-semibold text-brand-fg disabled:opacity-50";
const tab = (active: boolean) =>
  `min-h-12 rounded-xl border-2 px-3 font-semibold ${active ? "border-brand-fg bg-brand-fg/10 text-brand-fg" : "border-slate-300 text-muted dark:border-slate-700"}`;
const danger = "min-h-12 rounded-xl border-2 border-red-600 px-4 font-semibold text-red-700 disabled:opacity-50 dark:text-red-400";

/** Cheia în care SDK-ul păstrează sesiunea; o ștergem direct când nu există cont, fără să încărcăm SDK-ul. */
const SDK_AUTH_KEY = "pocketbase_auth";

interface AccountState {
  userId?: string;
  email?: string;
  lastAt?: string;
  status?: string;
  message?: string;
  pending: number;
}

function useAccountState(): AccountState | undefined {
  return useLiveQuery(async () => {
    const meta = async (key: string) => (await db.meta.get(key))?.value as string | undefined;
    return {
      userId: await meta("syncUserId"),
      email: await meta("syncEmail"),
      lastAt: await meta("syncLastAt"),
      status: await meta("syncStatus"),
      message: (await meta("syncMessage")) ?? undefined,
      pending: await pendingCount(db),
    };
  }, []);
}

const formatTime = (iso: string, locale: string) =>
  new Date(iso).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" });

function Message({ text, error }: { text?: string; error?: boolean }) {
  if (!text) return null;
  return (
    <p role={error ? "alert" : "status"} className={`mt-3 text-sm ${error ? "text-red-700 dark:text-red-400" : "text-muted"}`}>
      {text}
    </p>
  );
}

function SignInForm({ lockedEmail, onDone }: { lockedEmail?: string; onDone?: () => void }) {
  const { t, rich } = useT();
  const { meta } = useContent();
  const [email, setEmail] = useState(lockedEmail ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [choice, setChoice] = useState(false);
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [confirmPassword, setConfirmPassword] = useState("");
  // reautentificarea (email cunoscut) nu poate crea un cont nou
  const registering = mode === "register" && !lockedEmail;

  const switchMode = (next: "signin" | "register") => {
    setMode(next);
    setError(undefined);
    setConfirmPassword("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(undefined);
    if (registering) {
      const problem = passwordProblem(password, confirmPassword);
      if (problem) {
        setError(problem);
        return;
      }
    }
    setBusy(true);
    try {
      const account = await loadAccount();
      const result = registering ? await account.register(db, email, password) : await account.signIn(db, email, password);
      if (result.status === "error") setError(result.message);
      else if (result.status === "choice") setChoice(true);
      else onDone?.();
      setPassword("");
      setConfirmPassword("");
    } finally {
      setBusy(false);
    }
  };

  const finish = async (mode: "merge" | "account-only") => {
    setBusy(true);
    try {
      const { completeSignIn } = await loadAccount();
      const result = await completeSignIn(db, mode);
      if (result.status === "error") setError(result.message);
      setChoice(false);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    const { cancelSignIn } = await loadAccount();
    cancelSignIn();
    setChoice(false);
  };

  if (choice) {
    return (
      <div className="mt-3 flex flex-col gap-3" role="group" aria-label={t("account.combineQuestion")}>
        <p>{t("account.bothHaveProgress")}</p>
        <button type="button" disabled={busy} onClick={() => void finish("merge")} className={primary}>
          {t("account.merge")}
        </button>
        <p className="-mt-1 text-sm text-muted">{t("account.mergeHint")}</p>
        <button type="button" disabled={busy} onClick={() => void finish("account-only")} className={outline}>
          {t("account.accountOnly")}
        </button>
        <p className="-mt-1 text-sm text-muted">{t("account.accountOnlyHint")}</p>
        <button type="button" disabled={busy} onClick={() => void downloadBackup(meta.dataVersion)} className="min-h-12 rounded-lg bg-slate-100 px-4 text-sm font-semibold dark:bg-slate-800">
          {t("account.backupFirst")}
        </button>
        <button type="button" disabled={busy} onClick={() => void cancel()} className="min-h-12 text-sm text-muted underline">
          {t("account.cancel")}
        </button>
        <Message text={error} error />
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mt-3 flex flex-col gap-3">
      {lockedEmail ? (
        <p className="text-sm text-muted">
          {rich("account.lockedAccount", { email: <strong>{lockedEmail}</strong> })}
        </p>
      ) : (
        <>
          <div role="group" aria-label={t("account.accessType")} className="grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={!registering} onClick={() => switchMode("signin")} className={tab(!registering)}>
              {t("account.haveAccount")}
            </button>
            <button type="button" aria-pressed={registering} onClick={() => switchMode("register")} className={tab(registering)}>
              {t("account.newAccount")}
            </button>
          </div>
          <label className="flex flex-col gap-1">
            <span>{t("account.email")}</span>
            <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
          </label>
        </>
      )}
      <label className="flex flex-col gap-1">
        <span>{t("account.password")}</span>
        <input
          type="password"
          required
          autoComplete={registering ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={input}
        />
      </label>
      {registering && (
        <>
          <label className="flex flex-col gap-1">
            <span>{t("account.confirmPassword")}</span>
            <input type="password" required autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={input} />
          </label>
          <p className="text-sm text-muted">{t("account.passwordHint")}</p>
        </>
      )}
      <button type="submit" disabled={busy} className={primary}>
        {registering ? (busy ? t("account.creating") : t("account.create")) : busy ? t("account.signingIn") : t("account.signIn")}
      </button>
      <Message text={error} error />
    </form>
  );
}

function SignedIn({ state }: { state: AccountState }) {
  const { t, tp, rich, locale } = useT();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; error?: boolean }>();
  const authRequired = state.status === "auth-required";
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  const syncNow = async () => {
    setBusy(true);
    setNote(undefined);
    try {
      const { syncNow: run } = await loadAccount();
      const outcome = await run(db);
      if (outcome.status === "offline") setNote({ text: t("account.offlineNote"), error: true });
      else if (outcome.status === "error") setNote({ text: t("account.syncFailed", { message: outcome.message ?? t("account.unknownError") }), error: true });
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    if (!window.confirm(t("account.confirmSignOut"))) return;
    setBusy(true);
    try {
      const { signOut: run } = await loadAccount();
      const result = await run(db);
      if (result.status === "pending") {
        const force = window.confirm(tp("account.confirmPending", result.pending));
        if (force) await run(db, true);
      }
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setNote(undefined);
    try {
      const { deleteAccount: run } = await loadAccount();
      const result = await run(db, deletePassword);
      if (result.status === "error") setNote({ text: result.message, error: true });
      setDeletePassword("");
    } finally {
      setBusy(false);
    }
  };

  let line: string;
  const pending = tp("account.pending", state.pending);
  if (state.status === "offline") line = t("account.lineOffline", { pending });
  else if (state.status === "error") line = t("account.lineError", { pending });
  else if (state.pending > 0) line = pending;
  else line = state.lastAt ? t("account.lineSynced", { time: formatTime(state.lastAt, locale) }) : t("account.lineSyncing");

  return (
    <div className="mt-3 flex flex-col gap-3">
      <p>
        {rich("account.connectedAs", { email: <strong>{state.email ?? t("account.fallbackName")}</strong> })}
      </p>
      {authRequired ? (
        <>
          <p role="alert" className="text-amber-800 dark:text-amber-300">
            {t("account.sessionExpired")}
          </p>
          <SignInForm lockedEmail={state.email} />
        </>
      ) : (
        <p data-testid="sync-status" className="text-sm text-muted">
          {line}
        </p>
      )}
      {!authRequired && (
        <button type="button" disabled={busy} onClick={() => void syncNow()} className={outline}>
          {busy ? t("account.lineSyncing") : t("account.syncNow")}
        </button>
      )}
      <button type="button" disabled={busy} onClick={() => void signOut()} className={outline}>
        {t("account.signOut")}
      </button>
      {deleting ? (
        <form
          onSubmit={(e) => void deleteAccount(e)}
          aria-label={t("account.confirmDeletion")}
          className="flex flex-col gap-3 rounded-xl border-2 border-red-600 p-4"
        >
          <p>{t("account.deleteWarning")}</p>
          <label className="flex flex-col gap-1">
            <span>{t("account.passwordForConfirm")}</span>
            <input
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className={input}
            />
          </label>
          <button type="submit" disabled={busy} className={danger}>
            {busy ? t("account.deleting") : t("account.confirmDelete")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setDeleting(false);
              setDeletePassword("");
              setNote(undefined);
            }}
            className="min-h-12 text-sm text-muted underline"
          >
            {t("account.cancel")}
          </button>
        </form>
      ) : (
        <button type="button" disabled={busy} onClick={() => setDeleting(true)} className={danger}>
          {t("account.delete")}
        </button>
      )}
      <Message text={note?.text} error={note?.error} />
    </div>
  );
}

/** Secțiunea „Cont” din Setări: autentificare opțională și starea sincronizării. */
export function AccountSection() {
  const { t } = useT();
  const state = useAccountState();

  // fără cont nu păstrăm nicio sesiune veche a SDK-ului (ex. o autentificare abandonată la alegerea combinării)
  const loaded = state !== undefined;
  const hasAccount = state?.userId !== undefined;
  useEffect(() => {
    if (loaded && !hasAccount) {
      try {
        localStorage.removeItem(SDK_AUTH_KEY);
      } catch {
        // fără localStorage nu există nimic de șters
      }
    }
  }, [loaded, hasAccount]);

  return (
    <section className={card} aria-labelledby="account">
      {state && !state.userId ? (
        <InfoHeading id="account" title={t("account.title")} className={heading}>
          {t("account.optional")}
        </InfoHeading>
      ) : (
        <h2 id="account" className={heading}>
          {t("account.title")}
        </h2>
      )}
      {!state ? null : state.userId ? <SignedIn state={state} /> : <SignInForm />}
    </section>
  );
}
