import { useEffect } from "react";

/**
 * Sets the browser tab title for client-component dashboard pages.
 * Format: "Section · Page · Goodison Park Properties"
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · Goodison Park Properties`;
  }, [title]);
}
