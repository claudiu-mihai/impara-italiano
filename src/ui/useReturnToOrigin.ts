import type { MouseEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Pentru ✕ din sesiunile care se pot porni din mai multe locuri (Acasă, Învață, finalul altei sesiuni): dacă ai ajuns
 * în sesiune dintr-un link din aplicație, ✕ te întoarce în istoric la pagina de unde ai pornit, fără să adauge o intrare
 * nouă (butonul Înapoi al telefonului nu te readuce în sesiune). Dacă ai deschis sesiunea direct (semn de carte, tab
 * nou) nu există pagină anterioară din aplicație, deci linkul își urmează destinația obișnuită.
 *
 * Întoarce funcția de pus pe `onClick` al linkului, sau `undefined` când linkul trebuie lăsat în pace.
 */
export function useReturnToOrigin(enabled = true): ((event: MouseEvent<HTMLAnchorElement>) => void) | undefined {
  const { key } = useLocation();
  const navigate = useNavigate();
  // „default” = prima pagină a vizitei (adresă deschisă direct); orice navigare din aplicație are o cheie proprie
  if (!enabled || key === "default") return undefined;
  return (event) => {
    // deschiderea în tab nou (Ctrl/Cmd/Shift + clic) rămâne un link obișnuit
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    void navigate(-1);
  };
}
