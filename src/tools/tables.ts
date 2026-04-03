import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { codaRequest, ResponseFormat, responseFormatField, limitField, pageTokenField } from "../lib/api.js";
import { truncate, handleApiError } from "../utils.js";

export function registerTableTools(server: McpServer): void {
  // ─── coda_list_tables ────────────────────────────────────────────────────────

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
      inputSchema: z
        .object({
          doc_id: z.string().min(1).describe("Coda document ID"),
          table_type: z.enum(["table", "view"]).optional().describe("Filter: 'table' or 'view'"),
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

  // ─── coda_list_columns ───────────────────────────────────────────────────────

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
      inputSchema: z
        .object({
          doc_id: z.string().min(1).describe("Coda document ID"),
          table_id: z.string().min(1).describe("Table ID or name"),
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

  // ─── coda_list_rows ──────────────────────────────────────────────────────────

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
      inputSchema: z
        .object({
          doc_id: z.string().min(1).describe("Coda document ID"),
          table_id: z.string().min(1).describe("Table ID or name"),
          query: z.string().optional().describe("Filter rows: 'columnId:value'"),
          sort_by: z.string().optional().describe("Column ID to sort by"),
          limit: limitField,
          page_token: pageTokenField,
          value_format: z
            .enum(["simple", "simpleWithArrays", "rich"])
            .default("simple")
            .describe("Value format for row cells"),
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

  // ─── coda_get_row ────────────────────────────────────────────────────────────

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
      inputSchema: z
        .object({
          doc_id: z.string().min(1).describe("Coda document ID"),
          table_id: z.string().min(1).describe("Table ID or name"),
          row_id: z.string().min(1).describe("Row ID or name"),
          value_format: z.enum(["simple", "simpleWithArrays", "rich"]).default("simple"),
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

  // ─── coda_upsert_rows ────────────────────────────────────────────────────────

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
      inputSchema: z
        .object({
          doc_id: z.string().min(1).describe("Coda document ID"),
          table_id: z.string().min(1).describe("Base table ID (not a view)"),
          rows: z
            .array(
              z.object({
                cells: z
                  .array(
                    z.object({
                      column: z.string().describe("Column ID (e.g. 'c-ABC123')"),
                      value: z.unknown().describe("Cell value"),
                    })
                  )
                  .describe("Array of column-value pairs"),
              })
            )
            .min(1)
            .describe("Rows to insert/update"),
          key_columns: z
            .array(z.string())
            .optional()
            .describe("Column IDs used as unique keys for upsert matching"),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
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
          content: [
            {
              type: "text",
              text: `✅ ${rows.length} ligne(s) insérée(s)/mise(s) à jour.\n- **Request ID**: ${result["requestId"] ?? "—"}`,
            },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );

  // ─── coda_update_row ─────────────────────────────────────────────────────────

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
      inputSchema: z
        .object({
          doc_id: z.string().min(1).describe("Coda document ID"),
          table_id: z.string().min(1).describe("Table ID"),
          row_id: z.string().min(1).describe("Row ID"),
          cells: z
            .array(
              z.object({
                column: z.string().describe("Column ID"),
                value: z.unknown().describe("New cell value"),
              })
            )
            .min(1)
            .describe("Cells to update"),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ doc_id, table_id, row_id, cells }) => {
      try {
        const result = await codaRequest<Record<string, unknown>>(
          `/docs/${doc_id}/tables/${table_id}/rows/${row_id}`,
          "PUT",
          { row: { cells } }
        );
        return {
          content: [
            {
              type: "text",
              text: `✅ Ligne \`${row_id}\` mise à jour.\n- **Request ID**: ${result["requestId"] ?? "—"}`,
            },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );

  // ─── coda_delete_row ─────────────────────────────────────────────────────────

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
      inputSchema: z
        .object({
          doc_id: z.string().min(1).describe("Coda document ID"),
          table_id: z.string().min(1).describe("Table ID"),
          row_id: z.string().min(1).describe("Row ID to delete"),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ doc_id, table_id, row_id }) => {
      try {
        const result = await codaRequest<Record<string, unknown>>(
          `/docs/${doc_id}/tables/${table_id}/rows/${row_id}`,
          "DELETE"
        );
        return {
          content: [
            {
              type: "text",
              text: `✅ Ligne \`${row_id}\` supprimée.\n- **Request ID**: ${result["requestId"] ?? "—"}`,
            },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );

  // ─── coda_delete_rows ────────────────────────────────────────────────────────

  server.registerTool(
    "coda_delete_rows",
    {
      title: "Delete Multiple Rows",
      description:
        "Supprime plusieurs lignes d'une table en une seule opération. Action irréversible.",
      inputSchema: z
        .object({
          doc_id: z.string().min(1).describe("ID du document"),
          table_id: z.string().min(1).describe("ID ou nom de la table"),
          row_ids: z
            .array(z.string().min(1))
            .min(1)
            .max(100)
            .describe("Liste des IDs de lignes à supprimer (max 100)"),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ doc_id, table_id, row_ids }) => {
      try {
        const result = await codaRequest<Record<string, unknown>>(
          `/docs/${doc_id}/tables/${table_id}/rows`,
          "DELETE",
          { rowIds: row_ids }
        );
        return {
          content: [
            {
              type: "text",
              text: `✅ ${row_ids.length} ligne(s) supprimée(s).\n- **Request ID**: ${result["requestId"] ?? "—"}`,
            },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );

  // ─── coda_list_formulas ──────────────────────────────────────────────────────

  server.registerTool(
    "coda_list_formulas",
    {
      title: "List Coda Formulas",
      description: `List all named formulas in a Coda document.

Args:
  - doc_id (string): The document ID
  - response_format: 'markdown' or 'json'

Returns: List of formulas with id, name, and value.`,
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
        const data = await codaRequest<{ items: unknown[] }>(`/docs/${doc_id}/formulas`);
        const items = data.items as Array<Record<string, unknown>>;
        if (!items.length) return { content: [{ type: "text", text: "Aucune formule trouvée." }] };

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

        const text =
          response_format === ResponseFormat.JSON
            ? JSON.stringify(formulas, null, 2)
            : [
                `# Formules du doc \`${doc_id}\``,
                "",
                ...formulas.map(
                  (f) =>
                    `- **${f["name"]}** \`${f["id"]}\` = ${f["value"] !== undefined ? JSON.stringify(f["value"]) : "—"}`
                ),
              ].join("\n");
        return { content: [{ type: "text", text: truncate(text) }] };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );

  // ─── coda_push_button ────────────────────────────────────────────────────────

  server.registerTool(
    "coda_push_button",
    {
      title: "Push Button",
      description: "Déclenche un bouton Coda sur une ligne spécifique d'une table.",
      inputSchema: z
        .object({
          doc_id: z.string().min(1).describe("ID du document"),
          table_id: z.string().min(1).describe("ID ou nom de la table"),
          row_id: z.string().min(1).describe("ID ou nom de la ligne"),
          column_id: z.string().min(1).describe("ID ou nom de la colonne bouton"),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ doc_id, table_id, row_id, column_id }) => {
      try {
        const result = await codaRequest<Record<string, unknown>>(
          `/docs/${doc_id}/tables/${table_id}/rows/${row_id}/buttons/${column_id}`,
          "POST"
        );
        return {
          content: [
            {
              type: "text",
              text: `✅ Bouton déclenché.\n- **Request ID**: ${result["requestId"] ?? "—"}`,
            },
          ],
        };
      } catch (e) {
        return { content: [{ type: "text", text: handleApiError(e) }] };
      }
    }
  );
}
