/**
 * Validări și mesaje în română pentru crearea contului. Fără dependențe (nici SDK, nici Zod): erorile serverului se
 * citesc „pe formă” (`status`, `response.data`), ca modulul să rămână testabil și ușor.
 */

export const PASSWORD_MIN_LENGTH = 8;
/** Serverul refuză parolele de 72 de octeți sau mai mari (limita algoritmului de hash); diacriticele ocupă doi octeți. */
export const PASSWORD_MAX_BYTES = 71;

/** Emailul se scrie mereu cu litere mici: serverul acceptă ca conturi diferite variante care diferă doar prin majuscule. */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const byteLength = (text: string) => new TextEncoder().encode(text).length;

/** Prima problemă a parolei (sau a confirmării ei), în română; undefined dacă e în regulă. */
export function passwordProblem(password: string, confirm?: string): string | undefined {
  if (password.length < PASSWORD_MIN_LENGTH) return `Parola trebuie să aibă cel puțin ${PASSWORD_MIN_LENGTH} caractere.`;
  if (byteLength(password) > PASSWORD_MAX_BYTES) {
    return `Parola poate avea cel mult ${PASSWORD_MAX_BYTES} de caractere (literele cu diacritice contează dublu).`;
  }
  if (confirm !== undefined && password !== confirm) return "Parolele nu coincid.";
  return undefined;
}

interface ServerError {
  status?: number;
  response?: { data?: Record<string, { code?: string } | undefined> };
}

/** Mesajul pentru o eroare la crearea contului. */
export function registerErrorMessage(error: unknown): string {
  const { status, response } = (error ?? {}) as ServerError;
  if (status === 0) return "Nu pot contacta serverul. Verifică conexiunea.";
  if (status === 429) return "Prea multe conturi create de pe această adresă. Încearcă din nou mai târziu.";
  if (status === 403) return "Crearea de conturi nu este disponibilă acum.";

  const fields = response?.data ?? {};
  if (fields.email) {
    return fields.email.code === "validation_not_unique"
      ? "Există deja un cont cu acest email."
      : "Adresa de email nu este validă.";
  }
  if (fields.password) {
    return fields.password.code === "validation_min_text_constraint"
      ? `Parola trebuie să aibă cel puțin ${PASSWORD_MIN_LENGTH} caractere.`
      : `Parola nu este acceptată. Alege una de ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_BYTES} de caractere.`;
  }
  if (fields.passwordConfirm) return "Parolele nu coincid.";
  // 400 fără detalii: așa răspunde serverul la o parolă prea lungă
  if (status === 400) return `Parola nu este acceptată. Alege una de ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_BYTES} de caractere.`;
  return "Nu am putut crea contul. Încearcă din nou.";
}
