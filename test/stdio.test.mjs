import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createInterface } from "node:readline";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { handleMessage, tools } from "../src/stdio.mjs";

test("publishes the same five read-only tools", async () => {
  const initialized = await handleMessage({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } });
  assert.equal(initialized.result.serverInfo.version, "1.4.2");
  assert.equal(initialized.result.protocolVersion, "2025-06-18");

  const listed = await handleMessage({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
  assert.deepEqual(listed.result.tools.map((tool) => tool.name), ["audit_public_website", "check_ai_crawler_policy", "get_crawler_watch_offer", "get_full_report_offer", "get_practice_radar_offer"]);
  assert.equal(tools.every((tool) => tool.annotations.readOnlyHint === true && tool.annotations.destructiveHint === false), true);
});

test("routes tool calls only to the bounded public API", async () => {
  const requests = [];
  const fetchMock = async (url, options = {}) => {
    requests.push({ url, options });
    return new Response(JSON.stringify({ ok: true, url }), { status: 200, headers: { "content-type": "application/json" } });
  };

  for (const [id, name, args] of [
    [1, "audit_public_website", { url: "https://example.com" }],
    [2, "check_ai_crawler_policy", { url: "https://example.com" }],
    [3, "get_crawler_watch_offer", {}],
    [4, "get_full_report_offer", {}],
    [5, "get_practice_radar_offer", {}],
  ]) {
    const result = await handleMessage({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } }, fetchMock);
    assert.equal(result.result.isError, false);
  }

  assert.deepEqual(requests.map((request) => request.url), [
    "https://actablesite.com/api/audit",
    "https://actablesite.com/api/ai-crawler-check",
    "https://actablesite.com/api/crawler-watch-offer",
    "https://actablesite.com/api/offer",
    "https://actablesite.com/api/practice-radar-offer",
  ]);
  assert.equal(requests[0].options.method, "POST");
  assert.equal(requests[2].options.method, undefined);
});

test("returns tool errors without crashing the protocol", async () => {
  const failingFetch = async () => new Response(JSON.stringify({ error: "Only public websites can be scanned." }), { status: 400, headers: { "content-type": "application/json" } });
  const result = await handleMessage({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "audit_public_website", arguments: { url: "http://127.0.0.1" } } }, failingFetch);
  assert.equal(result.result.isError, true);
  assert.match(result.result.content[0].text, /Only public websites/);

  const unknown = await handleMessage({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "write_file", arguments: {} } }, failingFetch);
  assert.equal(unknown.result.isError, true);
  assert.match(unknown.result.content[0].text, /Unknown tool/);
});

test("runs as a newline-delimited stdio MCP process", async (t) => {
  const child = spawn(process.execPath, [fileURLToPath(new URL("../src/stdio.mjs", import.meta.url))], { stdio: ["pipe", "pipe", "pipe"] });
  t.after(() => child.kill());
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 9, method: "tools/list", params: {} })}\n`);
  const [line] = await once(lines, "line");
  const response = JSON.parse(line);
  assert.equal(response.id, 9);
  assert.deepEqual(response.result.tools.map((tool) => tool.name), ["audit_public_website", "check_ai_crawler_policy", "get_crawler_watch_offer", "get_full_report_offer", "get_practice_radar_offer"]);
});
