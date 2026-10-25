/**
 * Validări și mesaje (în limba interfeței) pentru crearea contului. Fără dependențe (nici SDK, nici Zod): erorile serverului se
 * citesc „pe formă” (`status`, `response.data`), ca modulul să rămână testabil și ușor.
 */

import { t } from "../../i18n/standalone.ts";

export const PASSWORD_MIN_LENGTH = 8;
/** Serverul refuză parolele de 72 de octeți sau mai mari (limita algoritmului de hash); diacriticele ocupă doi octeți. */
export const PASSWORD_MAX_BYTES = 71;

/** Emailul se scrie mereu cu litere mici: serverul acceptă ca conturi diferite variante care diferă doar prin majuscule. */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const byteLength = (text: string) => new TextEncoder().encode(text).length;

/** Prima problemă a parolei (sau a confirmării ei), în limba interfeței; undefined dacă e în regulă. */
export function passwordProblem(password: string, confirm?: string): string | undefined {
  if (password.length < PASSWORD_MIN_LENGTH) return t("err.passwordMin", { min: PASSWORD_MIN_LENGTH });
  if (byteLength(password) > PASSWORD_MAX_BYTES) {
    return t("err.passwordMax", { max: PASSWORD_MAX_BYTES });
  }
  if (confirm !== undefined && password !== confirm) return t("err.passwordMismatch");
  return undefined;
}

interface ServerError {
  status?: number;
  response?: { data?: Record<string, { code?: string } | undefined> };
}

/** Mesajul pentru o eroare la crearea contului. */
export function registerErrorMessage(error: unknown): string {
  const { status, response } = (error ?? {}) as ServerError;
  if (status === 0) return t("err.cannotReachServer");
  if (status === 429) return t("err.tooManyAccounts");
  if (status === 403) return t("err.registrationClosed");

  const fields = response?.data ?? {};
  if (fields.email) {
    return t(fields.email.code === "validation_not_unique" ? "err.emailTaken" : "err.emailInvalid");
  }
  if (fields.password) {
    return fields.password.code === "validation_min_text_constraint"
      ? t("err.passwordMin", { min: PASSWORD_MIN_LENGTH })
      : t("err.passwordRejected", { min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_BYTES });
  }
  if (fields.passwordConfirm) return t("err.passwordMismatch");
  // 400 fără detalii: așa răspunde serverul la o parolă prea lungă
  if (status === 400) return t("err.passwordRejected", { min: PASSWORD_MIN_LENGTH, max: PASSWORD_MAX_BYTES });
  return t("err.createFailed");
}
