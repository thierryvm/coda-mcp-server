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

import { registerDocTools } from "./tools/docs.js";
import { registerPageTools } from "./tools/pages.js";
import { registerTableTools } from "./tools/tables.js";

// ─── Server ───────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "coda-mcp-server",
  version: "2.1.0",
});

registerDocTools(server);
registerPageTools(server);
registerTableTools(server);

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
  process.stderr.write(
    `❌ Erreur fatale: ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});
