import axios from "axios";
import { codaRequest } from "./api.js";

export const MAX_CONTENT_LENGTH = 100_000;

/** Sécurité : vérifie que l'URL appartient bien à coda.io */
export function assertCodaUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("URL invalide.");
  }
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith("coda.io")) {
    throw new Error("URL non autorisée : seules les URLs coda.io sont acceptées.");
  }
}

/** Exporte le contenu d'une page en markdown via l'API Coda (polling) */
export async function fetchPageContentAsMarkdown(doc_id: string, page_id: string): Promise<string> {
  // 1. Déclencher l'export
  const beginData = await codaRequest<{ id: string }>(
    `/docs/${doc_id}/pages/${page_id}/export`,
    "POST",
    { outputFormat: "markdown" }
  );
  const requestId = beginData.id;

  // 2. Polling (max 10 tentatives, 3s d'intervalle)
  const maxRetries = 10;
  for (let i = 0; i < maxRetries; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const status = await codaRequest<{ status: string; downloadLink?: string }>(
      `/docs/${doc_id}/pages/${page_id}/export/${requestId}`
    );
    if (status.status === "complete" && status.downloadLink) {
      assertCodaUrl(status.downloadLink);
      const resp = await axios.get<string>(status.downloadLink, {
        responseType: "text",
        timeout: 15000,
      });
      return resp.data;
    }
    if (status.status === "failed") throw new Error("L'export de la page a échoué.");
  }
  throw new Error("Timeout : l'export n'a pas abouti après 30 secondes.");
}
