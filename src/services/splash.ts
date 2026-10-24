const KEY = "impara.splash";

/**
 * Ecranul de întâmpinare apare doar când aplicația se deschide pe pagina de start: o reîncărcare pe altă pagină
 * nu te mută de unde erai. `impara.splash = "off"` în localStorage îl oprește (testele automate îl folosesc).
 */
export function shouldShowSplash(pathname: string): boolean {
  if (pathname !== "/") return false;
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}
