/** Forma de comparație a unui răspuns: fără spații în plus, minuscule, apostrof uniform. */
export function normalize(text: string): string {
  return text
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, " ");
}

/** Elimină accentele (è → e), pentru a recunoaște greșelile care țin doar de accent. */
export function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").normalize("NFC");
}
