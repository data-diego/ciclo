FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_STDB_HOST=wss://maincloud.spacetimedb.com
ARG VITE_STDB_MODULE=ciclo-game
ENV VITE_STDB_HOST=$VITE_STDB_HOST
ENV VITE_STDB_MODULE=$VITE_STDB_MODULE

RUN pnpm build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
