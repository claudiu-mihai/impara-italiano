/**
 * Semnal „s-a schimbat ceva local”: scrierile în baza de date îl declanșează, iar sincronizarea automată
 * (doar cu cont) îl ascultă. Fără cont nu există niciun ascultător, deci nu se întâmplă nimic.
 */
export const LOCAL_CHANGE_EVENT = "impara:local-change";

export function notifyLocalChange(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(LOCAL_CHANGE_EVENT));
}
