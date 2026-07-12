FROM node:20-alpine

LABEL org.opencontainers.image.source="https://github.com/unitedideas/actablesite-mcp"
LABEL org.opencontainers.image.description="Read-only ActableSite stdio MCP bridge"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src

USER node
ENTRYPOINT ["node", "src/stdio.mjs"]
