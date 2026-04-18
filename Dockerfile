FROM oven/bun:1.3.6 AS build
WORKDIR /app

ARG NODE_ENV=production
ARG MONGO_URL
ARG NFZ_WITH_MONGO_URL
ARG NFZ_ENABLE_SOCKETIO=false
ARG NFZ_AUTH_PROVIDER=local
ARG NFZ_MONGO_ADMIN_ENABLED=true
ARG NFZ_MONGO_ADMIN_DANGEROUS=false
ARG NFZ_PRODUCT_EDITION=community
ARG NFZ_BUILDER_APPLY_MODE=workspace
ARG NFZ_DEVTOOLS_ENABLED=false

ENV NODE_ENV=${NODE_ENV}
ENV MONGO_URL=${MONGO_URL}
ENV NFZ_WITH_MONGO_URL=${NFZ_WITH_MONGO_URL}
ENV NFZ_ENABLE_SOCKETIO=${NFZ_ENABLE_SOCKETIO}
ENV NFZ_AUTH_PROVIDER=${NFZ_AUTH_PROVIDER}
ENV NFZ_MONGO_ADMIN_ENABLED=${NFZ_MONGO_ADMIN_ENABLED}
ENV NFZ_MONGO_ADMIN_DANGEROUS=${NFZ_MONGO_ADMIN_DANGEROUS}
ENV NFZ_PRODUCT_EDITION=${NFZ_PRODUCT_EDITION}
ENV NFZ_BUILDER_APPLY_MODE=${NFZ_BUILDER_APPLY_MODE}
ENV NFZ_DEVTOOLS_ENABLED=${NFZ_DEVTOOLS_ENABLED}

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1.3.6 AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
ENV NFZ_DATA_DIR=/data
ENV NFZ_WORKSPACE_DIR=/workspace
ENV NFZ_WORKSPACE_SEED_DIR=/opt/nfz/workspace-seed
ENV NFZ_BUILDER_EXPORT_DIR=/data/exports

COPY --from=build /app/.output ./.output
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/public ./public
COPY --from=build /app/docker/entrypoint.sh /entrypoint.sh
COPY --from=build /app/nuxt.config.ts /opt/nfz/workspace-seed/nuxt.config.ts
COPY --from=build /app/services /opt/nfz/workspace-seed/services
COPY --from=build /app/shared /opt/nfz/workspace-seed/shared
COPY --from=build /app/AI_CONTEXT /opt/nfz/workspace-seed/AI_CONTEXT
COPY --from=build /app/PATCHLOG.md /opt/nfz/workspace-seed/PATCHLOG.md
COPY --from=build /app/PROMPT_CONTEXT.md /opt/nfz/workspace-seed/PROMPT_CONTEXT.md
COPY --from=build /app/JOURNAL.md /opt/nfz/workspace-seed/JOURNAL.md
COPY --from=build /app/README.md /opt/nfz/workspace-seed/README.md
COPY --from=build /app/.env.example ./.env.example

RUN chmod +x /entrypoint.sh \
  && mkdir -p /data /workspace /opt/nfz/workspace-seed /app/.output/server \
  && rm -rf /app/.output/server/node_modules \
  && ln -s /app/node_modules /app/.output/server/node_modules \
  && bun -e "import fs from 'node:fs'; const p = JSON.parse(fs.readFileSync('/app/package.json', 'utf8')); const seed = ['app=' + (p.version || ''), 'module=' + ((p.dependencies || {})['nuxt-feathers-zod'] || ''), 'workspaceSeed=versioned']; fs.writeFileSync('/opt/nfz/workspace-seed/.nfz-seed-version', seed.join('\n') + '\n');"

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["bun", ".output/server/index.mjs"]
