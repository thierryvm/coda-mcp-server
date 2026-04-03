import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { codaRequest, ResponseFormat, responseFormatField, limitField, pageTokenField } from "../lib/api.js";
import { truncate, handleApiError } from "../utils.js";

export function registerDocTools(server: McpServer): void {
  // ─── coda_list_docs ──────────────────────────────────────────────────────────

  server.registerTool(
    "coda_list_docs",
    {
      title: "List Coda Docs",
      description: `List and search Coda documents accessible by the API token.

Returns doc titles, IDs, owner, creation dates and URLs.

Args:
  - query (string, optional): Filter by title keywords
  - limit (number): Max docs to return, 1–500 (default 25)
  - page_token (string, optional): Pagination token from previous response
  - response_format: 'markdown' or 'json'

Returns: List of docs with id, name, owner, createdAt, updatedAt, browserLink.`,
      inputSchema: z
        .object({
          query: z.string().optional().describe("Search keyword in doc title"),
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
    async ({ query, limit, page_token, response_format }) => {
      try {
        const data = await codaRequest<{ items: unknown[]; nextPageToken?: string }>(
          "/docs",
          "GET",
          undefined,
          { query, limit, pageToken: page_token }
        );
        const items = data.items as Array<Record<string, unknown>>;
        if (!items.length) return { content: [{ type: "text", text: "No docs found." }] };

        let text: string;
        if (response_format === ResponseFormat.JSON) {
          text = JSON.stringify({ items, nextPageToken: data.nextPageToken }, null, 2);
        } else {
          const lines = [`# Coda Docs (${items.length} shown)`, ""];
          if (data.nextPageToken)
            lines.push(`> ⚠️ More results available. Use page_token: \`${data.nextPageToken}\``, "");
          for (const doc of items) {
            lines.push(`## ${doc["name"]} \`${doc["id"]}\``);
            lines.push(`- **Propriétaire**: ${(doc["owner"] as string) ?? "—"}`);
            lines.push(`- **Mis à jour**: ${doc["updatedAt"] ?? "—"}`);
            lines.push(`- **Lien**: ${doc["browserLink"] ?? "—"}`);
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

  // ─── coda_get_doc ────────────────────────────────────────────────────────────

  server.registerTool(
    "coda_get_doc",
    {
      title: "Get Coda Doc",
      description: `Get metadata for a specific Coda document by its ID.

Args:
  - doc_id (string): The doc ID (e.g. "AbCdEfGh")
  - response_format: 'markdown' or 'json'

Returns: Doc metadata including name, owner, pages count, browserLink.`,
      inputSchema: z
        .object({
          doc_id: z.string().min(1).describe("Coda document ID"),
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
    async ({ doc_id, response_format }) => {
      try {
        const doc = await codaRequest<Record<string, unknown>>(`/docs/${doc_id}`);
        const text =
          response_format === ResponseFormat.JSON
            ? JSON.stringify(doc, null, 2)
            : [
                `# ${doc["name"]}`,
                `- **ID**: \`${doc["id"]}\``,
                `- **Propriétaire**: ${doc["owner"] ?? "—"}`,
                `- **Créé**: ${doc["createdAt"] ?? "—"}`,
                `- **Mis à jour**: ${doc["updatedAt"] ?? "—"}`,
                `- **Lien**: ${doc["browserLink"] ?? "—"}`,
              ].join("\n");
        return { content: [{ type: "text", text }] };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );

  // ─── coda_create_doc ─────────────────────────────────────────────────────────

  server.registerTool(
    "coda_create_doc",
    {
      title: "Create Coda Doc",
      description: `Create a new Coda document.

Args:
  - title (string): Title for the new document
  - source_doc (string, optional): ID of a doc to duplicate as template

Returns: New doc ID, name, and browserLink.`,
      inputSchema: z
        .object({
          title: z.string().min(1).max(256).describe("Title for the new document"),
          source_doc: z.string().optional().describe("Optional doc ID to duplicate"),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ title, source_doc }) => {
      try {
        const payload: Record<string, unknown> = { title };
        if (source_doc) payload["sourceDoc"] = source_doc;
        const doc = await codaRequest<Record<string, unknown>>("/docs", "POST", payload);
        return {
          content: [
            {
              type: "text",
              text: `✅ Doc créé !\n- **ID**: \`${doc["id"]}\`\n- **Titre**: ${doc["name"]}\n- **Lien**: ${doc["browserLink"]}`,
            },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );

  // ─── coda_search_docs ────────────────────────────────────────────────────────

  server.registerTool(
    "coda_search_docs",
    {
      title: "Search Coda Docs",
      description: `Search across all accessible Coda documents by title keyword.

Args:
  - query (string): Search term
  - limit (number): Max results (default 25)
  - response_format: 'markdown' or 'json'

Returns: Matching docs with id, name, browserLink.`,
      inputSchema: z
        .object({
          query: z.string().min(1).describe("Search keyword"),
          limit: limitField,
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
    async ({ query, limit, response_format }) => {
      try {
        const data = await codaRequest<{ items: unknown[] }>("/docs", "GET", undefined, {
          query,
          limit,
        });
        const items = data.items as Array<Record<string, unknown>>;
        if (!items.length)
          return { content: [{ type: "text", text: `Aucun doc trouvé pour "${query}".` }] };

        const text =
          response_format === ResponseFormat.JSON
            ? JSON.stringify(items, null, 2)
            : [
                `# Résultats pour "${query}" (${items.length})`,
                "",
                ...items.map((d) => `- **${d["name"]}** \`${d["id"]}\` — ${d["browserLink"]}`),
              ].join("\n");
        return { content: [{ type: "text", text: truncate(text) }] };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );
}
