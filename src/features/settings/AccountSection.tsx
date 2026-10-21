import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState, type FormEvent } from "react";
import { useContent } from "../../app/content.tsx";
import { db } from "../../data/db/instance.ts";
import { pendingCount } from "../../data/sync/pending.ts";
import { downloadBackup } from "./backupDownload.ts";

// Modulul cu SDK-ul PocketBase se încarcă doar când ai deja un cont sau când te autentifici.
const loadAccount = () => import("../../data/sync/account.ts");

const card = "rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900";
const heading = "text-sm font-semibold uppercase tracking-wide text-muted";
const input = "min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-800";
const primary = "min-h-12 rounded-xl bg-brand px-4 font-semibold text-white disabled:opacity-50";
const outline = "min-h-12 rounded-xl border-2 border-brand-fg px-4 font-semibold text-brand-fg disabled:opacity-50";
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

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" });

function Message({ text, error }: { text?: string; error?: boolean }) {
  if (!text) return null;
  return (
    <p role={error ? "alert" : "status"} className={`mt-3 text-sm ${error ? "text-red-700 dark:text-red-400" : "text-muted"}`}>
      {text}
    </p>
  );
}

function SignInForm({ lockedEmail, onDone }: { lockedEmail?: string; onDone?: () => void }) {
  const { meta } = useContent();
  const [email, setEmail] = useState(lockedEmail ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [choice, setChoice] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const { signIn } = await loadAccount();
      const result = await signIn(db, email, password);
      if (result.status === "error") setError(result.message);
      else if (result.status === "choice") setChoice(true);
      else onDone?.();
      setPassword("");
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
      <div className="mt-3 flex flex-col gap-3" role="group" aria-label="Cum combinăm progresul?">
        <p>
          Există progres și pe acest telefon, și în cont. Cum le combinăm?
        </p>
        <button type="button" disabled={busy} onClick={() => void finish("merge")} className={primary}>
          Combină cu contul
        </button>
        <p className="-mt-1 text-sm text-muted">Păstrează versiunea mai nouă a fiecărui card; repetițiile din ambele părți se adună.</p>
        <button type="button" disabled={busy} onClick={() => void finish("account-only")} className={outline}>
          Folosește doar progresul din cont
        </button>
        <p className="-mt-1 text-sm text-muted">Progresul de pe acest telefon se șterge. Alege asta dacă telefonul nu e al tău.</p>
        <button type="button" disabled={busy} onClick={() => void downloadBackup(meta.dataVersion)} className="min-h-12 rounded-lg bg-slate-100 px-4 text-sm font-semibold dark:bg-slate-800">
          Descarcă mai întâi un backup local
        </button>
        <button type="button" disabled={busy} onClick={() => void cancel()} className="min-h-12 text-sm text-muted underline">
          Renunță
        </button>
        <Message text={error} error />
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mt-3 flex flex-col gap-3">
      {lockedEmail ? (
        <p className="text-sm text-muted">
          Cont: <strong>{lockedEmail}</strong>
        </p>
      ) : (
        <label className="flex flex-col gap-1">
          <span>Email</span>
          <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        </label>
      )}
      <label className="flex flex-col gap-1">
        <span>Parola</span>
        <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
      </label>
      <button type="submit" disabled={busy} className={primary}>
        {busy ? "Se autentifică…" : "Autentifică-te"}
      </button>
      <Message text={error} error />
    </form>
  );
}

function SignedIn({ state }: { state: AccountState }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; error?: boolean }>();
  const authRequired = state.status === "auth-required";

  const syncNow = async () => {
    setBusy(true);
    setNote(undefined);
    try {
      const { syncNow: run } = await loadAccount();
      const outcome = await run(db);
      if (outcome.status === "offline") setNote({ text: "Ești offline. Modificările se trimit când revine conexiunea.", error: true });
      else if (outcome.status === "error") setNote({ text: `Sincronizarea a eșuat: ${outcome.message ?? "eroare necunoscută"}`, error: true });
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    if (!window.confirm("Te deconectezi? Progresul de pe acest telefon se șterge (rămâne în cont) și aplicația revine la modul fără cont.")) return;
    setBusy(true);
    try {
      const { signOut: run } = await loadAccount();
      const result = await run(db);
      if (result.status === "pending") {
        const force = window.confirm(
          `Ai ${result.pending} modificări care nu au ajuns încă în cont. Dacă te deconectezi acum, se pierd. Te deconectezi oricum?`,
        );
        if (force) await run(db, true);
      }
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm("Ștergi contul și toate datele lui de pe server? Acțiunea nu poate fi anulată. Progresul de pe acest telefon se șterge și el.")) return;
    setBusy(true);
    try {
      const { deleteAccount: run } = await loadAccount();
      const result = await run(db);
      if (result.status === "error") setNote({ text: result.message, error: true });
    } finally {
      setBusy(false);
    }
  };

  let line: string;
  if (state.status === "offline") line = `Offline · ${state.pending} modificări în așteptare`;
  else if (state.status === "error") line = `Sincronizarea a eșuat · ${state.pending} modificări în așteptare`;
  else if (state.pending > 0) line = `${state.pending} modificări în așteptare`;
  else line = state.lastAt ? `Sincronizat · ${formatTime(state.lastAt)}` : "Se sincronizează…";

  return (
    <div className="mt-3 flex flex-col gap-3">
      <p>
        Conectat ca <strong>{state.email ?? "cont"}</strong>
      </p>
      {authRequired ? (
        <>
          <p role="alert" className="text-amber-800 dark:text-amber-300">
            Sesiunea a expirat. Poți învăța în continuare; modificările se trimit după ce te autentifici din nou.
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
          {busy ? "Se sincronizează…" : "Sincronizează acum"}
        </button>
      )}
      <button type="button" disabled={busy} onClick={() => void signOut()} className={outline}>
        Deconectează-te
      </button>
      <button type="button" disabled={busy} onClick={() => void deleteAccount()} className={danger}>
        Șterge contul
      </button>
      <Message text={note?.text} error={note?.error} />
    </div>
  );
}

/** Secțiunea „Cont” din Setări: autentificare opțională și starea sincronizării. */
export function AccountSection() {
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
      <h2 id="account" className={heading}>
        Cont
      </h2>
      {!state ? null : state.userId ? (
        <SignedIn state={state} />
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">
            Opțional. Fără cont, progresul rămâne doar pe acest telefon și aplicația nu trimite nimic pe internet. Cu cont,
            progresul se sincronizează cu serverul și îl poți folosi și pe alte dispozitive.
          </p>
          <SignInForm />
        </>
      )}
    </section>
  );
}
