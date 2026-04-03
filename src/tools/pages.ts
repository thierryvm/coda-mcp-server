import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { codaRequest, ResponseFormat, responseFormatField, limitField, pageTokenField } from "../lib/api.js";
import { fetchPageContentAsMarkdown, assertCodaUrl, MAX_CONTENT_LENGTH } from "../lib/content.js";
import { truncate, handleApiError } from "../utils.js";

export function registerPageTools(server: McpServer): void {
  // ─── coda_list_pages ─────────────────────────────────────────────────────────

  server.registerTool(
    "coda_list_pages",
    {
      title: "List Coda Pages",
      description: `List all pages in a Coda document.

Args:
  - doc_id (string): The document ID
  - limit (number): Max pages to return (default 25)
  - page_token (string, optional): Pagination token
  - response_format: 'markdown' or 'json'

Returns: List of pages with id, name, type, browserLink.`,
      inputSchema: z
        .object({
          doc_id: z.string().min(1).describe("Coda document ID"),
          limit: limitField,
          page_token: pageTokenField,
          response_format: responseFormatField,
        })
        .strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ doc_id, limit, page_token, response_format }) => {
      try {
        const data = await codaRequest<{ items: unknown[]; nextPageToken?: string }>(
          `/docs/${doc_id}/pages`,
          "GET",
          undefined,
          { limit, pageToken: page_token }
        );
        const items = data.items as Array<Record<string, unknown>>;
        if (!items.length)
          return { content: [{ type: "text", text: "Aucune page trouvée dans ce doc." }] };

        let text: string;
        if (response_format === ResponseFormat.JSON) {
          text = JSON.stringify({ items, nextPageToken: data.nextPageToken }, null, 2);
        } else {
          const lines = [`# Pages du doc \`${doc_id}\` (${items.length} affichées)`, ""];
          if (data.nextPageToken)
            lines.push(`> Plus de résultats. page_token: \`${data.nextPageToken}\``, "");
          for (const p of items) {
            lines.push(`## ${p["name"]} \`${p["id"]}\``);
            lines.push(`- **Type**: ${p["type"] ?? "page"}`);
            if (p["browserLink"]) lines.push(`- **Lien**: ${p["browserLink"]}`);
            lines.push("");
          }
          text = lines.join("\n");
        }
        return { content: [{ type: "text", text: truncate(text) }] };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );

  // ─── coda_update_page ────────────────────────────────────────────────────────

  server.registerTool(
    "coda_update_page",
    {
      title: "Update Coda Page",
      description: `Update a page's name or content in a Coda document.

Args:
  - doc_id (string): The document ID
  - page_id (string): The page ID or name
  - name (string, optional): New name for the page
  - subtitle (string, optional): New subtitle
  - icon_name (string, optional): Emoji icon name (e.g. "gear")
  - image_url (string, optional): Cover image URL

Returns: Confirmation with updated page info.`,
      inputSchema: z
        .object({
          doc_id: z.string().min(1).describe("Coda document ID"),
          page_id: z.string().min(1).describe("Page ID or name"),
          name: z.string().optional().describe("New page title"),
          subtitle: z.string().optional().describe("New subtitle"),
          icon_name: z.string().optional().describe("Emoji icon name"),
          image_url: z.string().url().optional().describe("Cover image URL"),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ doc_id, page_id, name, subtitle, icon_name, image_url }) => {
      try {
        const payload: Record<string, unknown> = {};
        if (name) payload["name"] = name;
        if (subtitle) payload["subtitle"] = subtitle;
        if (icon_name) payload["iconName"] = icon_name;
        if (image_url) payload["imageUrl"] = image_url;
        const result = await codaRequest<Record<string, unknown>>(
          `/docs/${doc_id}/pages/${page_id}`,
          "PUT",
          payload
        );
        return {
          content: [
            {
              type: "text",
              text: `✅ Page mise à jour !\n- **ID**: \`${result["id"]}\`\n- **Nom**: ${result["name"]}`,
            },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );

  // ─── coda_rename_page ────────────────────────────────────────────────────────

  server.registerTool(
    "coda_rename_page",
    {
      title: "Rename Page",
      description: "Renomme une page existante. Raccourci explicite pour changer uniquement le nom.",
      inputSchema: z
        .object({
          doc_id: z.string().min(1).describe("ID du document"),
          page_id: z.string().min(1).describe("ID ou nom de la page"),
          new_name: z.string().min(1).max(256).describe("Nouveau nom de la page"),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ doc_id, page_id, new_name }) => {
      try {
        const result = await codaRequest<Record<string, unknown>>(
          `/docs/${doc_id}/pages/${page_id}`,
          "PUT",
          { name: new_name }
        );
        return {
          content: [
            {
              type: "text",
              text: `✅ Page renommée !\n- **ID**: \`${result["id"]}\`\n- **Nom**: ${result["name"]}`,
            },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );

  // ─── coda_create_page ────────────────────────────────────────────────────────

  server.registerTool(
    "coda_create_page",
    {
      title: "Create Page",
      description: "Crée une nouvelle page dans un document Coda, avec contenu markdown optionnel.",
      inputSchema: z
        .object({
          doc_id: z.string().min(1).describe("ID du document"),
          name: z.string().min(1).max(256).describe("Nom de la page"),
          content: z
            .string()
            .max(MAX_CONTENT_LENGTH)
            .optional()
            .describe("Contenu markdown initial (optionnel)"),
          parent_page_id: z
            .string()
            .optional()
            .describe("ID de la page parente pour créer une sous-page (optionnel)"),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ doc_id, name, content, parent_page_id }) => {
      try {
        const body: Record<string, unknown> = { name };
        if (parent_page_id) body["parentPageId"] = parent_page_id;
        if (content)
          body["pageContent"] = { type: "canvas", canvasContent: { format: "markdown", content } };
        const result = await codaRequest<Record<string, unknown>>(
          `/docs/${doc_id}/pages`,
          "POST",
          body
        );
        return {
          content: [
            {
              type: "text",
              text: `✅ Page créée !\n- **ID**: \`${result["id"]}\`\n- **Nom**: ${result["name"]}\n- **Lien**: ${result["browserLink"] ?? "—"}`,
            },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );

  // ─── coda_get_page_content ───────────────────────────────────────────────────

  server.registerTool(
    "coda_get_page_content",
    {
      title: "Get Page Content",
      description: "Récupère le contenu complet d'une page Coda au format markdown.",
      inputSchema: z
        .object({
          doc_id: z.string().min(1).describe("ID du document"),
          page_id: z.string().min(1).describe("ID ou nom de la page"),
        })
        .strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ doc_id, page_id }) => {
      try {
        const content = await fetchPageContentAsMarkdown(doc_id, page_id);
        return { content: [{ type: "text", text: truncate(content) }] };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );

  // ─── coda_peek_page ──────────────────────────────────────────────────────────

  server.registerTool(
    "coda_peek_page",
    {
      title: "Peek Page",
      description: "Aperçu des premières lignes d'une page Coda (évite de charger tout le contenu).",
      inputSchema: z
        .object({
          doc_id: z.string().min(1).describe("ID du document"),
          page_id: z.string().min(1).describe("ID ou nom de la page"),
          num_lines: z
            .number()
            .int()
            .min(1)
            .max(200)
            .default(30)
            .describe("Nombre de lignes à retourner (défaut 30)"),
        })
        .strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ doc_id, page_id, num_lines }) => {
      try {
        const content = await fetchPageContentAsMarkdown(doc_id, page_id);
        const preview = content.split(/\r?\n/).slice(0, num_lines).join("\n");
        return { content: [{ type: "text", text: preview }] };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );

  // ─── coda_replace_page_content ───────────────────────────────────────────────

  server.registerTool(
    "coda_replace_page_content",
    {
      title: "Replace Page Content",
      description:
        "Remplace entièrement le contenu d'une page par du markdown. ATTENTION : action irréversible.",
      inputSchema: z
        .object({
          doc_id: z.string().min(1).describe("ID du document"),
          page_id: z.string().min(1).describe("ID ou nom de la page"),
          content: z.string().min(1).max(MAX_CONTENT_LENGTH).describe("Nouveau contenu markdown"),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ doc_id, page_id, content }) => {
      try {
        await codaRequest(`/docs/${doc_id}/pages/${page_id}`, "PUT", {
          contentUpdate: { insertionMode: "replace", canvasContent: { format: "markdown", content } },
        });
        return {
          content: [{ type: "text", text: `✅ Contenu de la page \`${page_id}\` remplacé.` }],
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );

  // ─── coda_append_page_content ────────────────────────────────────────────────

  server.registerTool(
    "coda_append_page_content",
    {
      title: "Append Page Content",
      description: "Ajoute du contenu markdown à la fin d'une page Coda.",
      inputSchema: z
        .object({
          doc_id: z.string().min(1).describe("ID du document"),
          page_id: z.string().min(1).describe("ID ou nom de la page"),
          content: z.string().min(1).max(MAX_CONTENT_LENGTH).describe("Contenu markdown à ajouter"),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ doc_id, page_id, content }) => {
      try {
        await codaRequest(`/docs/${doc_id}/pages/${page_id}`, "PUT", {
          contentUpdate: { insertionMode: "append", canvasContent: { format: "markdown", content } },
        });
        return { content: [{ type: "text", text: `✅ Contenu ajouté à la page \`${page_id}\`.` }] };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );

  // ─── coda_duplicate_page ─────────────────────────────────────────────────────

  server.registerTool(
    "coda_duplicate_page",
    {
      title: "Duplicate Page",
      description: "Duplique une page existante sous un nouveau nom.",
      inputSchema: z
        .object({
          doc_id: z.string().min(1).describe("ID du document"),
          page_id: z.string().min(1).describe("ID ou nom de la page à dupliquer"),
          new_name: z.string().min(1).max(256).describe("Nom de la nouvelle page"),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ doc_id, page_id, new_name }) => {
      try {
        const content = await fetchPageContentAsMarkdown(doc_id, page_id);
        const result = await codaRequest<Record<string, unknown>>(`/docs/${doc_id}/pages`, "POST", {
          name: new_name,
          pageContent: { type: "canvas", canvasContent: { format: "markdown", content } },
        });
        return {
          content: [
            {
              type: "text",
              text: `✅ Page dupliquée !\n- **ID**: \`${result["id"]}\`\n- **Nom**: ${result["name"]}`,
            },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );

  // ─── coda_resolve_link ───────────────────────────────────────────────────────

  server.registerTool(
    "coda_resolve_link",
    {
      title: "Resolve Coda Link",
      description:
        "Résout une URL Coda (browserLink) en métadonnées : type d'objet, ID doc, ID page, etc.",
      inputSchema: z
        .object({
          url: z.string().url().describe("URL Coda à résoudre (ex: https://coda.io/d/...)"),
        })
        .strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ url }) => {
      try {
        assertCodaUrl(url);
        const data = await codaRequest<Record<string, unknown>>(
          "/resolveBrowserLink",
          "GET",
          undefined,
          { url }
        );
        const text = [
          `# Résolution de lien Coda`,
          `- **Type**: ${data["type"] ?? "—"}`,
          `- **ID**: \`${data["id"] ?? "—"}\``,
          `- **Nom**: ${data["name"] ?? "—"}`,
          `- **browserLink**: ${data["browserLink"] ?? "—"}`,
        ].join("\n");
        return { content: [{ type: "text", text }] };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );
}
