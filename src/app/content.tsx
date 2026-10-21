import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { loadContentStore, type ContentStore } from "../data/content/contentStore.ts";

const ContentContext = createContext<ContentStore | undefined>(undefined);

/** Încarcă dicționarul o singură dată și îl oferă restului aplicației. */
export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ContentStore>();

  useEffect(() => {
    let alive = true;
    void loadContentStore().then((store) => {
      if (alive) setContent(store);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!content) {
    return <p className="p-6 text-center text-muted">Se încarcă…</p>;
  }
  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}

export function useContent(): ContentStore {
  const content = useContext(ContentContext);
  if (!content) throw new Error("useContent trebuie folosit în interiorul ContentProvider");
  return content;
}
