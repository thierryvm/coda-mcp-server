import { AxiosError } from "axios";

export const CHARACTER_LIMIT = 25000;

export function truncate(text: string): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  return (
    text.slice(0, CHARACTER_LIMIT) +
    `\n\n⚠️ Response truncated (${text.length} chars). Use pagination (limit/pageToken) to see more.`
  );
}

export function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response) {
      const status = error.response.status;
      const msg = (error.response.data as { message?: string })?.message ?? "";
      switch (status) {
        case 401:
          return "Error: Unauthorized. Check your CODA_API_TOKEN.";
        case 403:
          return `Error: Forbidden. You don't have access to this resource. ${msg}`;
        case 404:
          return `Error: Not found. Check the doc/table/row ID. ${msg}`;
        case 429:
          return "Error: Rate limit exceeded. Wait a few seconds before retrying.";
        default:
          return `Error: API request failed (${status}). ${msg}`;
      }
    }
    if (error.code === "ECONNABORTED") return "Error: Request timed out. Try again.";
  }
  return `Error: ${error instanceof Error ? error.message : String(error)}`;
}
