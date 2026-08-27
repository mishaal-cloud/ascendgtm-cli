/**
 * Minimal JSON-RPC 2.0 client for the Ascend GTM public MCP endpoint.
 *
 * The endpoint (POST /public-mcp) implements the MCP "Streamable HTTP"
 * transport for a single request/response exchange — no session/SSE needed
 * for tools/call against this stub. See docs/openapi.yaml on the Worker
 * itself for the authoritative contract.
 */

export const DEFAULT_BASE_URL = "https://ascend-gateway-v5.ascendgtm.workers.dev";
const MCP_ENDPOINT_PATH = "/public-mcp";

export class AscendCliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AscendCliError";
  }
}

interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

interface JsonRpcResponse<T> {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: T;
  error?: JsonRpcError;
}

export interface McpToolCallResult {
  content?: Array<{ type: string; text?: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

/**
 * Calls a tool via `tools/call` and returns the parsed result payload.
 * Network failures, non-2xx responses, malformed JSON, and JSON-RPC-level
 * errors are all normalized into a thrown AscendCliError with a clear message.
 */
export async function callTool(
  toolName: string,
  args: Record<string, unknown> = {},
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<McpToolCallResult> {
  const url = `${baseUrl}${MCP_ENDPOINT_PATH}`;
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: toolName, arguments: args },
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new AscendCliError(
      `Could not reach the Ascend GTM gateway at ${url}: ${reason}`,
    );
  }

  const rawText = await response.text();

  if (!response.ok) {
    throw new AscendCliError(
      `Ascend GTM gateway returned HTTP ${response.status} for tool "${toolName}": ${rawText.slice(0, 500)}`,
    );
  }

  let parsed: JsonRpcResponse<McpToolCallResult>;
  try {
    parsed = JSON.parse(rawText) as JsonRpcResponse<McpToolCallResult>;
  } catch {
    throw new AscendCliError(
      `Ascend GTM gateway returned malformed JSON for tool "${toolName}": ${rawText.slice(0, 500)}`,
    );
  }

  if (parsed.error) {
    throw new AscendCliError(
      `Ascend GTM gateway rejected tool "${toolName}": ${parsed.error.message} (code ${parsed.error.code})`,
    );
  }

  if (!parsed.result) {
    throw new AscendCliError(
      `Ascend GTM gateway returned no result for tool "${toolName}".`,
    );
  }

  return parsed.result;
}

/**
 * Extracts the plain-text content from an MCP tool result's `content` array.
 * Falls back to a JSON dump if no text parts are present.
 */
export function extractText(result: McpToolCallResult): string {
  const parts = result.content
    ?.filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text as string);

  if (parts && parts.length > 0) {
    return parts.join("\n");
  }

  return JSON.stringify(result, null, 2);
}

/**
 * Attempts to parse the tool's text content as JSON (many Ascend tools
 * return a JSON payload inside a text content part). Falls back to the raw
 * text if it isn't valid JSON.
 */
export function extractJson(result: McpToolCallResult): unknown {
  const text = extractText(result);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
