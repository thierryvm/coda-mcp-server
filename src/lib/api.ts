import axios from "axios";
import { z } from "zod";

// ─── Constants ────────────────────────────────────────────────────────────────

export const API_BASE_URL = "https://coda.io/apis/v1";

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json",
}

// ─── API Client ───────────────────────────────────────────────────────────────

export function getApiToken(): string {
  const token = process.env.CODA_API_TOKEN;
  if (!token) throw new Error("CODA_API_TOKEN environment variable is not set");
  return token;
}

export async function codaRequest<T>(
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
      Authorization: `Bearer ${getApiToken()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
  return response.data as T;
}

// ─── Shared Zod fragments ─────────────────────────────────────────────────────

export const responseFormatField = z
  .nativeEnum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe("Output format: 'markdown' for human-readable, 'json' for machine-readable");

export const limitField = z
  .number()
  .int()
  .min(1)
  .max(500)
  .default(25)
  .describe("Max items to return (1–500, default 25)");

export const pageTokenField = z
  .string()
  .optional()
  .describe("Token for next page of results (from previous response)");
