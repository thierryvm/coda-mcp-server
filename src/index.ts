#!/usr/bin/env node
/**
 * MCP Server for Coda.io API
 *
 * Provides tools to interact with Coda docs, pages, tables, rows and columns.
 * Authentication via CODA_API_TOKEN environment variable.
 *
 * Rate limits: 100 reads/6s, 10 writes/6s, 5 doc-content writes/10s
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios, { AxiosError } from "axios";
import { z } from "zod";

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE_URL = "https://coda.io/apis/v1";
const CHARACTER_LIMIT = 25000;

// ─── Enums ────────────────────────────────────────────────────────────────────

enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json",
}

// ─── API Client ───────────────────────────────────────────────────────────────

function getApiToken(): string {
  const token = process.env.CODA_API_TOKEN;
  if (!token) throw new Error("CODA_API_TOKEN environment variable is not set");
  return token;
}

async function codaRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  data?: unknown,
  params?: Record<string, unknown>
): Promise<T> {
  const response = await axios({
    method,
    url: `${API_BASE_URL}${endpoint}`,
    data,
    params,
    timeout: 30000,
    headers: {
      "Authorization": `Bearer ${getApiToken()}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  });
  return response.data as T;
}

// ─── Error Handling ───────────────────────────────────────────────────────────

function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response) {
      const status = error.response.status;
      const msg = (error.response.data as { message?: string })?.message ?? "";
      switch (status) {
        case 401: return "Error: Unauthorized. Check your CODA_API_TOKEN.";
        case 403: return `Error: Forbidden. You don't have access to this resource. ${msg}`;
        case 404: return `Error: Not found. Check the doc/table/row ID. ${msg}`;
        case 429: return "Error: Rate limit exceeded. Wait a few seconds before retrying.";
        default:  return `Error: API request failed (${status}). ${msg}`;
      }
    }
    if (error.code === "ECONNABORTED") return "Error: Request timed out. Try again.";
  }
  return `Error: ${error instanceof Error ? error.message : String(error)}`;
}

function truncate(text: string): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  return text.slice(0, CHARACTER_LIMIT) +
    `\n\n⚠️ Response truncated (${text.length} chars). Use pagination (limit/pageToken) to see more.`;
}

// ─── Shared Zod fragments ─────────────────────────────────────────────────────

const responseFormatField = z
  .nativeEnum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe("Output format: 'markdown' for human-readable, 'json' for machine-readable");

const limitField = z.number().int().min(1).max(500).default(25)
  .describe("Max items to return (1–500, default 25)");

const pageTokenField = z.string().optional()
  .describe("Token for next page of results (from previous response)");

// ─── Server ───────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "coda-mcp-server",
  version: "1.0.0",
});

// ═══════════════════════════════════════════════════════════════════════════════
// DOCS
// ═══════════════════════════════════════════════════════════════════════════════

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
    inputSchema: z.object({
      query: z.string().optional().describe("Search keyword in doc title"),
      limit: limitField,
      page_token: pageTokenField,
      response_format: responseFormatField,
    }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
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
        if (data.nextPageToken) lines.push(`> ⚠️ More results available. Use page_token: \`${data.nextPageToken}\``, "");
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

server.registerTool(
  "coda_get_doc",
  {
    title: "Get Coda Doc",
    description: `Get metadata for a specific Coda document by its ID.

Args:
  - doc_id (string): The doc ID (e.g. "AbCdEfGh")
  - response_format: 'markdown' or 'json'

Returns: Doc metadata including name, owner, pages count, browserLink.`,
    inputSchema: z.object({
      doc_id: z.string().min(1).describe("Coda document ID"),
      response_format: responseFormatField,
    }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ doc_id, response_format }) => {
    try {
      const doc = await codaRequest<Record<string, unknown>>(`/docs/${doc_id}`);
      const text = response_format === ResponseFormat.JSON
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

server.registerTool(
  "coda_create_doc",
  {
    title: "Create Coda Doc",
    description: `Create a new Coda document.

Args:
  - title (string): Title for the new document
  - source_doc (string, optional): ID of a doc to duplicate as template

Returns: New doc ID, name, and browserLink.`,
    inputSchema: z.object({
      title: z.string().min(1).max(256).describe("Title for the new document"),
      source_doc: z.string().optional().describe("Optional doc ID to duplicate"),
    }).strict(),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  async ({ title, source_doc }) => {
    try {
      const payload: Record<string, unknown> = { title };
      if (source_doc) payload["sourceDoc"] = source_doc;
      const doc = await codaRequest<Record<string, unknown>>("/docs", "POST", payload);
      return {
        content: [{
          type: "text",
          text: `✅ Doc créé !\n- **ID**: \`${doc["id"]}\`\n- **Titre**: ${doc["name"]}\n- **Lien**: ${doc["browserLink"]}`,
        }],
      };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }] };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// PAGES
// ═══════════════════════════════════════════════════════════════════════════════

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
    inputSchema: z.object({
      doc_id: z.string().min(1).describe("Coda document ID"),
      limit: limitField,
      page_token: pageTokenField,
      response_format: responseFormatField,
    }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
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
      if (!items.length) return { content: [{ type: "text", text: "Aucune page trouvée dans ce doc." }] };

      let text: string;
      if (response_format === ResponseFormat.JSON) {
        text = JSON.stringify({ items, nextPageToken: data.nextPageToken }, null, 2);
      } else {
        const lines = [`# Pages du doc \`${doc_id}\` (${items.length} affichées)`, ""];
        if (data.nextPageToken) lines.push(`> Plus de résultats. page_token: \`${data.nextPageToken}\``, "");
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
    inputSchema: z.object({
      doc_id: z.string().min(1).describe("Coda document ID"),
      page_id: z.string().min(1).describe("Page ID or name"),
      name: z.string().optional().describe("New page title"),
      subtitle: z.string().optional().describe("New subtitle"),
      icon_name: z.string().optional().describe("Emoji icon name"),
      image_url: z.string().url().optional().describe("Cover image URL"),
    }).strict(),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ doc_id, page_id, name, subtitle, icon_name, image_url }) => {
    try {
      const payload: Record<string, unknown> = {};
      if (name) payload["name"] = name;
      if (subtitle) payload["subtitle"] = subtitle;
      if (icon_name) payload["iconName"] = icon_name;
      if (image_url) payload["imageUrl"] = image_url;
      const result = await codaRequest<Record<string, unknown>>(
        `/docs/${doc_id}/pages/${page_id}`, "PUT", payload
      );
      return {
        content: [{
          type: "text",
          text: `✅ Page mise à jour !\n- **ID**: \`${result["id"]}\`\n- **Nom**: ${result["name"]}`,
        }],
      };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }] };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// TABLES
// ═══════════════════════════════════════════════════════════════════════════════

server.registerTool(
  "coda_list_tables",
  {
    title: "List Coda Tables",
    description: `List all tables and views in a Coda document.

Args:
  - doc_id (string): The document ID
  - table_type (string, optional): Filter by type — 'table' or 'view'
  - limit (number): Max tables (default 25)
  - page_token (string, optional): Pagination token
  - response_format: 'markdown' or 'json'

Returns: List of tables with id, name, type, rowCount, browserLink.`,
    inputSchema: z.object({
      doc_id: z.string().min(1).describe("Coda document ID"),
      table_type: z.enum(["table", "view"]).optional().describe("Filter: 'table' or 'view'"),
      limit: limitField,
      page_token: pageTokenField,
      response_format: responseFormatField,
    }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ doc_id, table_type, limit, page_token, response_format }) => {
    try {
      const data = await codaRequest<{ items: unknown[]; nextPageToken?: string }>(
        `/docs/${doc_id}/tables`,
        "GET",
        undefined,
        { tableTypes: table_type, limit, pageToken: page_token }
      );
      const items = data.items as Array<Record<string, unknown>>;
      if (!items.length) return { content: [{ type: "text", text: "Aucune table trouvée." }] };

      let text: string;
      if (response_format === ResponseFormat.JSON) {
        text = JSON.stringify({ items, nextPageToken: data.nextPageToken }, null, 2);
      } else {
        const lines = [`# Tables du doc \`${doc_id}\` (${items.length} affichées)`, ""];
        if (data.nextPageToken) lines.push(`> page_token: \`${data.nextPageToken}\``, "");
        for (const t of items) {
          lines.push(`## ${t["name"]} \`${t["id"]}\``);
          lines.push(`- **Type**: ${t["tableType"] ?? t["type"] ?? "table"}`);
          lines.push(`- **Lignes**: ${t["rowCount"] ?? "—"}`);
          if (t["browserLink"]) lines.push(`- **Lien**: ${t["browserLink"]}`);
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

server.registerTool(
  "coda_list_columns",
  {
    title: "List Coda Columns",
    description: `List all columns in a Coda table, including their IDs and types.

Useful to get column IDs before reading/writing rows, since Coda rows use column IDs as keys.

Args:
  - doc_id (string): The document ID
  - table_id (string): The table ID or name
  - response_format: 'markdown' or 'json'

Returns: List of columns with id, name, type, format.`,
    inputSchema: z.object({
      doc_id: z.string().min(1).describe("Coda document ID"),
      table_id: z.string().min(1).describe("Table ID or name"),
      response_format: responseFormatField,
    }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ doc_id, table_id, response_format }) => {
    try {
      const data = await codaRequest<{ items: unknown[] }>(
        `/docs/${doc_id}/tables/${table_id}/columns`
      );
      const items = data.items as Array<Record<string, unknown>>;
      if (!items.length) return { content: [{ type: "text", text: "Aucune colonne trouvée." }] };

      let text: string;
      if (response_format === ResponseFormat.JSON) {
        text = JSON.stringify(items, null, 2);
      } else {
        const lines = [`# Colonnes de la table \`${table_id}\``, ""];
        for (const col of items) {
          const fmt = col["format"] as Record<string, unknown> | undefined;
          lines.push(`- **${col["name"]}** \`${col["id"]}\` — type: ${fmt?.["type"] ?? "—"}`);
        }
        text = lines.join("\n");
      }
      return { content: [{ type: "text", text: truncate(text) }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }] };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// ROWS
// ═══════════════════════════════════════════════════════════════════════════════

server.registerTool(
  "coda_list_rows",
  {
    title: "List Coda Rows",
    description: `List rows from a Coda table with optional filtering and sorting.

Args:
  - doc_id (string): The document ID
  - table_id (string): The table ID or name
  - query (string, optional): Filter rows — format: "columnId:value"
  - sort_by (string, optional): Sort column ID
  - limit (number): Max rows (default 25, max 500)
  - page_token (string, optional): Pagination token
  - value_format (string): 'simple' (default) or 'simpleWithArrays' or 'rich'
  - response_format: 'markdown' or 'json'

Returns: List of rows with their values keyed by column name.`,
    inputSchema: z.object({
      doc_id: z.string().min(1).describe("Coda document ID"),
      table_id: z.string().min(1).describe("Table ID or name"),
      query: z.string().optional().describe("Filter rows: 'columnId:value'"),
      sort_by: z.string().optional().describe("Column ID to sort by"),
      limit: limitField,
      page_token: pageTokenField,
      value_format: z.enum(["simple", "simpleWithArrays", "rich"]).default("simple")
        .describe("Value format for row cells"),
      response_format: responseFormatField,
    }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ doc_id, table_id, query, sort_by, limit, page_token, value_format, response_format }) => {
    try {
      const data = await codaRequest<{ items: unknown[]; nextPageToken?: string }>(
        `/docs/${doc_id}/tables/${table_id}/rows`,
        "GET",
        undefined,
        { query, sortBy: sort_by, limit, pageToken: page_token, valueFormat: value_format }
      );
      const items = data.items as Array<Record<string, unknown>>;
      if (!items.length) return { content: [{ type: "text", text: "Aucune ligne trouvée." }] };

      let text: string;
      if (response_format === ResponseFormat.JSON) {
        text = JSON.stringify({ items, nextPageToken: data.nextPageToken }, null, 2);
      } else {
        const lines = [`# Lignes de la table \`${table_id}\` (${items.length} affichées)`, ""];
        if (data.nextPageToken) lines.push(`> page_token: \`${data.nextPageToken}\``, "");
        for (const row of items) {
          const values = row["values"] as Record<string, unknown> | undefined;
          lines.push(`### Ligne \`${row["id"]}\` — ${row["name"] ?? ""}`);
          if (values) {
            for (const [colId, val] of Object.entries(values)) {
              lines.push(`  - **${colId}**: ${JSON.stringify(val)}`);
            }
          }
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

server.registerTool(
  "coda_get_row",
  {
    title: "Get Coda Row",
    description: `Get a specific row from a Coda table by its ID or name.

Args:
  - doc_id (string): The document ID
  - table_id (string): The table ID or name
  - row_id (string): The row ID or name
  - value_format: 'simple' or 'rich'
  - response_format: 'markdown' or 'json'

Returns: Row with all column values.`,
    inputSchema: z.object({
      doc_id: z.string().min(1).describe("Coda document ID"),
      table_id: z.string().min(1).describe("Table ID or name"),
      row_id: z.string().min(1).describe("Row ID or name"),
      value_format: z.enum(["simple", "simpleWithArrays", "rich"]).default("simple"),
      response_format: responseFormatField,
    }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ doc_id, table_id, row_id, value_format, response_format }) => {
    try {
      const row = await codaRequest<Record<string, unknown>>(
        `/docs/${doc_id}/tables/${table_id}/rows/${row_id}`,
        "GET",
        undefined,
        { valueFormat: value_format }
      );
      const values = row["values"] as Record<string, unknown> | undefined;
      let text: string;
      if (response_format === ResponseFormat.JSON) {
        text = JSON.stringify(row, null, 2);
      } else {
        const lines = [`# Ligne \`${row["id"]}\``, `- **Nom**: ${row["name"] ?? "—"}`, ""];
        if (values) {
          lines.push("## Valeurs");
          for (const [colId, val] of Object.entries(values)) {
            lines.push(`- **${colId}**: ${JSON.stringify(val)}`);
          }
        }
        text = lines.join("\n");
      }
      return { content: [{ type: "text", text }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }] };
    }
  }
);

server.registerTool(
  "coda_upsert_rows",
  {
    title: "Upsert Coda Rows",
    description: `Insert or update rows in a Coda table (base table only, not views).

Provide row data as an array of objects, each with column IDs as keys.
Use coda_list_columns to get the column IDs first.

Args:
  - doc_id (string): The document ID
  - table_id (string): The BASE table ID (not a view)
  - rows (array): Array of row objects. Each object has a "cells" array with {column, value} pairs.
    Example: [{"cells": [{"column": "c-ABC123", "value": "Hello"}]}]
  - key_columns (array, optional): Column IDs to use as unique keys for upsert matching

Returns: Request ID and number of rows added/updated.`,
    inputSchema: z.object({
      doc_id: z.string().min(1).describe("Coda document ID"),
      table_id: z.string().min(1).describe("Base table ID (not a view)"),
      rows: z.array(
        z.object({
          cells: z.array(
            z.object({
              column: z.string().describe("Column ID (e.g. 'c-ABC123')"),
              value: z.unknown().describe("Cell value"),
            })
          ).describe("Array of column-value pairs"),
        })
      ).min(1).describe("Rows to insert/update"),
      key_columns: z.array(z.string()).optional()
        .describe("Column IDs used as unique keys for upsert matching"),
    }).strict(),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  async ({ doc_id, table_id, rows, key_columns }) => {
    try {
      const payload: Record<string, unknown> = { rows };
      if (key_columns?.length) payload["keyColumns"] = key_columns;
      const result = await codaRequest<Record<string, unknown>>(
        `/docs/${doc_id}/tables/${table_id}/rows`,
        "POST",
        payload
      );
      return {
        content: [{
          type: "text",
          text: `✅ ${rows.length} ligne(s) insérée(s)/mise(s) à jour.\n- **Request ID**: ${result["requestId"] ?? "—"}`,
        }],
      };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }] };
    }
  }
);

server.registerTool(
  "coda_update_row",
  {
    title: "Update Coda Row",
    description: `Update specific cells in an existing row.

Args:
  - doc_id (string): The document ID
  - table_id (string): The table ID
  - row_id (string): The row ID
  - cells (array): Array of {column, value} pairs to update

Returns: Request ID confirmation.`,
    inputSchema: z.object({
      doc_id: z.string().min(1).describe("Coda document ID"),
      table_id: z.string().min(1).describe("Table ID"),
      row_id: z.string().min(1).describe("Row ID"),
      cells: z.array(
        z.object({
          column: z.string().describe("Column ID"),
          value: z.unknown().describe("New cell value"),
        })
      ).min(1).describe("Cells to update"),
    }).strict(),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ doc_id, table_id, row_id, cells }) => {
    try {
      const result = await codaRequest<Record<string, unknown>>(
        `/docs/${doc_id}/tables/${table_id}/rows/${row_id}`,
        "PUT",
        { row: { cells } }
      );
      return {
        content: [{
          type: "text",
          text: `✅ Ligne \`${row_id}\` mise à jour.\n- **Request ID**: ${result["requestId"] ?? "—"}`,
        }],
      };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }] };
    }
  }
);

server.registerTool(
  "coda_delete_row",
  {
    title: "Delete Coda Row",
    description: `Delete a specific row from a Coda table. This action is irreversible.

Args:
  - doc_id (string): The document ID
  - table_id (string): The table ID
  - row_id (string): The row ID to delete

Returns: Confirmation with request ID.`,
    inputSchema: z.object({
      doc_id: z.string().min(1).describe("Coda document ID"),
      table_id: z.string().min(1).describe("Table ID"),
      row_id: z.string().min(1).describe("Row ID to delete"),
    }).strict(),
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
  },
  async ({ doc_id, table_id, row_id }) => {
    try {
      const result = await codaRequest<Record<string, unknown>>(
        `/docs/${doc_id}/tables/${table_id}/rows/${row_id}`,
        "DELETE"
      );
      return {
        content: [{
          type: "text",
          text: `✅ Ligne \`${row_id}\` supprimée.\n- **Request ID**: ${result["requestId"] ?? "—"}`,
        }],
      };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }] };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// FORMULAS & SEARCH
// ═══════════════════════════════════════════════════════════════════════════════

server.registerTool(
  "coda_list_formulas",
  {
    title: "List Coda Formulas",
    description: `List all named formulas in a Coda document.

Args:
  - doc_id (string): The document ID
  - response_format: 'markdown' or 'json'

Returns: List of formulas with id, name, and value.`,
    inputSchema: z.object({
      doc_id: z.string().min(1).describe("Coda document ID"),
      response_format: responseFormatField,
    }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ doc_id, response_format }) => {
    try {
      const data = await codaRequest<{ items: unknown[] }>(`/docs/${doc_id}/formulas`);
      const items = data.items as Array<Record<string, unknown>>;
      if (!items.length) return { content: [{ type: "text", text: "Aucune formule trouvée." }] };

      // Fetch each formula individually to get the computed value
      const formulas: Array<Record<string, unknown>> = await Promise.all(
        items.map(async (f) => {
          try {
            const detail = await codaRequest<Record<string, unknown>>(
              `/docs/${doc_id}/formulas/${f["id"]}`
            );
            return { ...f, value: detail["value"] } as Record<string, unknown>;
          } catch {
            return { ...f, value: undefined } as Record<string, unknown>;
          }
        })
      );

      const text = response_format === ResponseFormat.JSON
        ? JSON.stringify(formulas, null, 2)
        : [`# Formules du doc \`${doc_id}\``, "",
            ...formulas.map(f => `- **${f["name"]}** \`${f["id"]}\` = ${f["value"] !== undefined ? JSON.stringify(f["value"]) : "—"}`)
          ].join("\n");
      return { content: [{ type: "text", text: truncate(text) }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }] };
    }
  }
);

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
    inputSchema: z.object({
      query: z.string().min(1).describe("Search keyword"),
      limit: limitField,
      response_format: responseFormatField,
    }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  async ({ query, limit, response_format }) => {
    try {
      const data = await codaRequest<{ items: unknown[] }>(
        "/docs", "GET", undefined, { query, limit }
      );
      const items = data.items as Array<Record<string, unknown>>;
      if (!items.length) return { content: [{ type: "text", text: `Aucun doc trouvé pour "${query}".` }] };

      const text = response_format === ResponseFormat.JSON
        ? JSON.stringify(items, null, 2)
        : [`# Résultats pour "${query}" (${items.length})`, "",
            ...items.map(d => `- **${d["name"]}** \`${d["id"]}\` — ${d["browserLink"]}`)
          ].join("\n");
      return { content: [{ type: "text", text: truncate(text) }] };
    } catch (e) {
      return { content: [{ type: "text", text: handleApiError(e) }] };
    }
  }
);

// ─── Start ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!process.env.CODA_API_TOKEN) {
    process.stderr.write("❌ ERREUR: La variable d'environnement CODA_API_TOKEN est requise.\n");
    process.stderr.write("   Générer un token sur: https://coda.io/account → API Settings\n");
    process.exit(1);
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("✅ Coda MCP Server démarré (stdio)\n");
}

main().catch((error: unknown) => {
  process.stderr.write(`❌ Erreur fatale: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
