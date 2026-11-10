# Contexto de build: raiz do repositório. Roda as migrações pendentes e sai.
FROM node:20-slim
RUN npm install -g pnpm@9.15.9
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY database/package.json database/
RUN pnpm install --frozen-lockfile --prod --filter @central/database
COPY database database
USER node
WORKDIR /repo/database
CMD ["node_modules/.bin/tsx", "migrar.ts"]
