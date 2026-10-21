# syntax=docker/dockerfile:1

# --- Build: generează datele din content/, verifică tipurile și face build-ul Vite (cu service worker) ---
# Node 24 este necesar: scripts/ rulează direct .ts, cu eliminarea tipurilor făcută de Node.
FROM docker.io/library/node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .
RUN npm run build

# --- Runtime: nginx fără privilegii, servește doar fișierele statice din dist/ ---
FROM docker.io/nginxinc/nginx-unprivileged:stable-alpine AS runtime

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
