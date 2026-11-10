# Contexto de build: raiz do repositório.
FROM node:20-slim AS build
RUN npm install -g pnpm@9.15.9
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages packages
COPY database/package.json database/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @central/api...
COPY apps/api apps/api
RUN pnpm --filter @central/api... build \
 && pnpm --filter @central/api deploy --prod /saida

FROM node:20-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /saida/node_modules node_modules
COPY --from=build /repo/apps/api/dist dist
COPY --from=build /repo/apps/api/package.json .
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
