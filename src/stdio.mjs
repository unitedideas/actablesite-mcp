#!/usr/bin/env node

import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";

const ORIGIN = "https://actablesite.com";
const VERSION = "1.2.0";
const MAX_MESSAGE_BYTES = 1_000_000;

export const tools = [
  {
    name: "audit_public_website",
    title: "Audit public website readiness",
    description: "Run ActableSite's free three-signal readiness scan for a public website. Returns observable evidence and does not guarantee crawling, indexing, citation, ranking, recommendation, traffic, or revenue.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: { url: { type: "string", description: "Public HTTP or HTTPS website URL." } },
      required: ["url"],
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: "check_ai_crawler_policy",
    title: "Check AI crawler robots.txt policy",
    description: "Check the homepage robots.txt rule for eight named OpenAI, Anthropic, Perplexity, and Google AI crawler tokens.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: { url: { type: "string", description: "Public HTTP or HTTPS website URL." } },
      required: ["url"],
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
  {
    name: "get_full_report_offer",
    title: "Get the full repair report offer",
    description: "Return the exact price, deliverables, checkout URL, support contact, and limitations. Require explicit user confirmation before any separate checkout action.",
    inputSchema: { type: "object", additionalProperties: false, properties: {} },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
];

function response(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function error(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

async function readJson(fetchImpl, path, options) {
  const requestOptions = {
    ...options,
    headers: {
      accept: "application/json",
      "user-agent": `ActableSite stdio bridge/${VERSION}`,
      ...(options?.body ? { "content-type": "application/json" } : {}),
      ...options?.headers,
    },
  };
  const remote = await fetchImpl(`${ORIGIN}${path}`, requestOptions);
  const body = await remote.json().catch(() => null);
  if (!remote.ok) throw new Error(typeof body?.error === "string" ? body.error : `ActableSite returned HTTP ${remote.status}.`);
  return body;
}

async function callTool(name, args, fetchImpl) {
  if (name === "get_full_report_offer") return readJson(fetchImpl, "/api/offer");
  if (name !== "audit_public_website" && name !== "check_ai_crawler_policy") throw new Error(`Unknown tool: ${name || "missing name"}.`);
  const path = name === "audit_public_website" ? "/api/audit" : "/api/ai-crawler-check";
  return readJson(fetchImpl, path, { method: "POST", body: JSON.stringify({ url: args?.url }) });
}

export async function handleMessage(message, fetchImpl = fetch) {
  if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") return error(message?.id ?? null, -32600, "invalid request");
  if (!Object.prototype.hasOwnProperty.call(message, "id")) return null;
  const id = message.id;
  if (message.method === "initialize") {
    return response(id, {
      protocolVersion: "2025-06-18",
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "actablesite-stdio", title: "ActableSite", version: VERSION },
      instructions: "Use these read-only tools only for public websites. Results are observable evidence, not a guarantee of crawling, ranking, traffic, or revenue.",
    });
  }
  if (message.method === "ping") return response(id, {});
  if (message.method === "tools/list") return response(id, { tools });
  if (message.method !== "tools/call") return error(id, -32601, `method not found: ${message.method}`);

  const params = message.params && typeof message.params === "object" && !Array.isArray(message.params) ? message.params : {};
  const name = typeof params.name === "string" ? params.name : "";
  const args = params.arguments && typeof params.arguments === "object" && !Array.isArray(params.arguments) ? params.arguments : {};
  try {
    const result = await callTool(name, args, fetchImpl);
    return response(id, {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
      isError: false,
    });
  } catch (caught) {
    return response(id, {
      content: [{ type: "text", text: caught instanceof Error ? caught.message : "tool call failed" }],
      isError: true,
    });
  }
}

export function run() {
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity, terminal: false });
  lines.on("line", async (line) => {
    if (!line.trim()) return;
    let output;
    try {
      if (Buffer.byteLength(line, "utf8") > MAX_MESSAGE_BYTES) throw new Error("message too large");
      output = await handleMessage(JSON.parse(line));
    } catch (caught) {
      output = error(null, -32700, caught instanceof Error ? caught.message : "parse error");
    }
    if (output) process.stdout.write(`${JSON.stringify(output)}\n`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
