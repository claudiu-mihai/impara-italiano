import { Navigate, useLocation } from "react-router-dom";

/** Rutele vechi `/learn/games/...` (secțiunea „Jocuri”) trimit la aceeași pagină din `/learn/grammar/...`. */
export function LegacyGamesRedirect() {
  const { pathname, search } = useLocation();
  return <Navigate replace to={pathname.replace(/^\/learn\/games/, "/learn/grammar") + search} />;
}
