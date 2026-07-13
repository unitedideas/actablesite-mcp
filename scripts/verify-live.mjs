import assert from "node:assert/strict";

const endpoint = "https://actablesite.com/mcp";

async function rpc(id, method, params = {}) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      "user-agent": "ActableSite release verifier",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  assert.equal(response.status, 200, `${method} returned ${response.status}`);
  return response.json();
}

const initialized = await rpc(1, "initialize", {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "actablesite-mcp-verifier", version: "1.4.2" },
});
assert.equal(initialized.result.protocolVersion, "2025-06-18");
assert.equal(initialized.result.serverInfo.name, "actablesite");
assert.equal(initialized.result.serverInfo.version, "1.4.2");

const listed = await rpc(2, "tools/list");
assert.deepEqual(listed.result.tools.map((tool) => tool.name), [
  "audit_public_website",
  "check_ai_crawler_policy",
  "get_crawler_watch_offer",
  "get_full_report_offer",
  "get_practice_radar_offer",
]);
assert.equal(listed.result.tools.every((tool) => tool.annotations?.readOnlyHint === true), true);

console.log(JSON.stringify({ ok: true, endpoint, protocol: initialized.result.protocolVersion, version: initialized.result.serverInfo.version, tools: listed.result.tools.map((tool) => tool.name) }));
