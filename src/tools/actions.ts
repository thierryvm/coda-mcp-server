import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { codaRequest } from "../lib/api.js";
import { handleApiError } from "../utils.js";

/**
 * Action tools — triggers that execute side effects in Coda:
 * button presses, automation triggers (v2.2.0), etc.
 */
export function registerActionTools(server: McpServer): void {
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
