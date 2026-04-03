import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { codaRequest, ResponseFormat, responseFormatField } from "../lib/api.js";
import { truncate, handleApiError } from "../utils.js";

export function registerFormulaTools(server: McpServer): void {
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
}
