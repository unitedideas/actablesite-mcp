# ActableSite MCP

A remote, read-only MCP server for auditing public website readiness and AI crawler policy.

It exposes three tools over Streamable HTTP:

- `audit_public_website` checks public identity, offer evidence, action paths, discovery files, metadata, and structured data.
- `check_ai_crawler_policy` evaluates eight OpenAI, Anthropic, Perplexity, and Google crawler tokens.
- `get_full_report_offer` returns explicit metadata for an optional $19 one-time report. It cannot open checkout or purchase anything.

## Connect

Claude Code:

```bash
claude mcp add --transport http actablesite https://actablesite.com/mcp
```

For another MCP client, add a remote server named `actablesite` with:

- URL: `https://actablesite.com/mcp`
- Transport: Streamable HTTP
- Authentication: none

The server implements MCP protocol version `2025-06-18` and is published in the official registry as [`com.actablesite/readiness`](https://registry.modelcontextprotocol.io/v0.1/servers?search=com.actablesite/readiness&version=latest).

## Safety contract

- Public HTTP and HTTPS websites only; private, local, loopback, and reserved network destinations are rejected.
- No browser control, file access, account access, write, or mutation tools.
- No authentication header or API key is requested.
- Tool calls are limited to 60 per caller per hour.
- Offer metadata requires explicit user confirmation before any separate checkout action.
- Results do not guarantee crawling, indexing, citation, ranking, recommendation, traffic, legal compliance, or revenue.

## Verify the live server

Node.js 20 or newer is required.

```bash
npm test
npm run verify:live
```

The verifier initializes the live server, checks its protocol and version, and confirms the exact read-only tool inventory. It does not call an audit tool or create a funnel event.

## Repository scope

This repository contains the public registry manifest, connection contract, live verifier, and security policy for the hosted ActableSite MCP server. The production runtime is operated at `https://actablesite.com/mcp`.

## License

MIT
