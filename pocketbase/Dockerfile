# syntax=docker/dockerfile:1

# --- Descărcare: binarul oficial PocketBase, la o versiune fixă, verificat cu suma de control ---
# (aceleași valori ca în scripts/pocketbase/dev.ts; la schimbarea versiunii se actualizează ambele)
FROM docker.io/library/alpine:3 AS fetch
ARG POCKETBASE_VERSION=0.40.5
ARG SHA256_AMD64=1dbea1b01eb3dfe64953513859d01e759c96650c4e3264fa4eecd54b769382e4
ARG SHA256_ARM64=570baa1c45d2fb92fc0073582b945ca0ece03cbf9837ccabf49a222f99dd02e3
ARG TARGETARCH
RUN apk add --no-cache unzip
RUN set -eu; \
    case "$TARGETARCH" in \
      amd64) sha="$SHA256_AMD64" ;; \
      arm64) sha="$SHA256_ARM64" ;; \
      *) echo "Arhitectură nesuportată: $TARGETARCH" >&2; exit 1 ;; \
    esac; \
    wget -q -O /pocketbase.zip "https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_linux_${TARGETARCH}.zip"; \
    echo "${sha}  /pocketbase.zip" | sha256sum -c -; \
    unzip -q /pocketbase.zip pocketbase -d /out

# --- Runtime: fără privilegii, datele într-un volum ---
FROM docker.io/library/alpine:3 AS runtime
RUN apk add --no-cache ca-certificates \
 && adduser -D -u 10001 pocketbase \
 && mkdir -p /pb/pb_data \
 && chown -R pocketbase /pb
COPY --from=fetch /out/pocketbase /usr/local/bin/pocketbase
COPY pb_migrations /pb/pb_migrations

USER pocketbase
WORKDIR /pb
# volumul moștenește proprietarul directorului de mai sus la prima creare
VOLUME /pb/pb_data
EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8090/api/health || exit 1
CMD ["pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data", "--migrationsDir=/pb/pb_migrations"]
