import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("publishes a transparent remote MCP manifest", async () => {
  const manifest = JSON.parse(await readFile(new URL("server.json", root), "utf8"));
  assert.equal(manifest.name, "com.actablesite/readiness");
  assert.equal(manifest.version, "1.1.1");
  assert.deepEqual(manifest.remotes, [{ type: "streamable-http", url: "https://actablesite.com/mcp" }]);
  assert.deepEqual(manifest.repository, {
    url: "https://github.com/unitedideas/actablesite-mcp",
    source: "github",
    id: "1298130629",
  });
});

test("documents every read-only tool and the purchase boundary", async () => {
  const readme = await readFile(new URL("README.md", root), "utf8");
  assert.match(readme, /^## Tools$/m);
  for (const tool of ["audit_public_website", "check_ai_crawler_policy", "get_full_report_offer"]) assert.match(readme, new RegExp(tool));
  assert.match(readme, /cannot open checkout or purchase anything/);
  assert.match(readme, /private, local, loopback, and reserved network destinations are rejected/);
  assert.match(readme, /60 per caller per hour/);
  assert.match(readme, /https:\/\/actablesite\.com\/\.well-known\/mcp\.json/);
  assert.match(readme, /https:\/\/actablesite\.com\/\.well-known\/mcp\/server-card\.json/);
  assert.match(readme, /static tool descriptions and JSON input schemas/);
  assert.match(readme, /npm run start:stdio/);
  assert.match(readme, /src\/stdio\.mjs/);
  assert.match(readme, /Distribution version `1\.2\.1`/);
  assert.match(readme, /official registry[^\n]+version `1\.1\.1`/);
  assert.match(readme, /docker run --rm -i ghcr\.io\/unitedideas\/actablesite-mcp:1\.2\.1/);
  assert.match(readme, /no file, shell, browser, account, or write capability/i);
});

test("builds and publishes a least-privilege public container", async () => {
  const dockerfile = await readFile(new URL("Dockerfile", root), "utf8");
  assert.match(dockerfile, /^FROM node:20-alpine$/m);
  assert.match(dockerfile, /^USER node$/m);
  assert.match(dockerfile, /^ENTRYPOINT \["node", "src\/stdio\.mjs"\]$/m);
  assert.doesNotMatch(dockerfile, /ENV|ARG|EXPOSE|COPY \. /);

  const workflow = await readFile(new URL(".github/workflows/publish-container.yml", root), "utf8");
  assert.match(workflow, /permissions:\n  contents: read\n  packages: write/);
  assert.match(workflow, /docker build --pull --tag actablesite-mcp:test/);
  assert.match(workflow, /docker logout ghcr\.io/);
  assert.match(workflow, /docker pull "ghcr\.io\/\$\{GITHUB_REPOSITORY\}/);
  assert.match(workflow, /uses: actions\/checkout@[a-f0-9]{40}/);
  assert.match(workflow, /uses: docker\/login-action@[a-f0-9]{40}/);
  assert.match(workflow, /uses: docker\/build-push-action@[a-f0-9]{40}/);
  assert.doesNotMatch(workflow, /pull_request_target|personal access token|PAT_/i);
});

test("declares the GitHub maintainer for Glama verification", async () => {
  const metadata = JSON.parse(await readFile(new URL("glama.json", root), "utf8"));
  assert.equal(metadata.$schema, "https://glama.ai/mcp/schemas/server.json");
  assert.deepEqual(metadata.maintainers, ["unitedideas"]);
});

test("runs the public crawler-policy action with least privilege", async () => {
  const workflow = await readFile(new URL(".github/workflows/ai-crawler-policy.yml", root), "utf8");
  assert.match(workflow, /permissions:\n  contents: read/);
  assert.match(workflow, /uses: unitedideas\/actablesite-check@v1/);
  assert.match(workflow, /website: actablesite\.com/);
  assert.match(workflow, /fail-on-blocked: "false"/);
  assert.doesNotMatch(workflow, /pull_request_target|secrets\.|permissions:\s*write/);
});
