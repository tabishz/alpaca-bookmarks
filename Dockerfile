# Stage 1: Build the React Frontend
FROM node:24-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
# Install dependencies
RUN npm ci
# Copy the rest of the frontend source code
COPY frontend/ ./
# Build static assets
RUN npm run build

# Stage 2: Build the Go Backend
FROM golang:1.25.5-alpine AS backend-builder
# Install build dependencies for CGO (SQLite)
RUN apk add --no-cache gcc musl-dev
WORKDIR /app
# Copy Go modules and download dependencies first to leverage caching
COPY go.mod go.sum ./
RUN go mod download
# Copy the rest of the backend source code
COPY cmd/ ./cmd/
COPY internal/ ./internal/
# Build the Go binary
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o alpaca-bookmarks cmd/server/main.go

# Stage 3: Final Production Image
FROM alpine:latest
# Caddy for web server, curl for healthcheck, and libc6-compat for Go CGO
RUN apk add --no-cache caddy ca-certificates curl libc6-compat
# 2. Create a non-root user and group with fixed IDs
RUN addgroup -g 1000 -S appgroup && \
    adduser -u 1000 -S appuser -G appgroup
# 3. Setup Directories and Permissions
WORKDIR /app
# Create data directory and set ownership
RUN mkdir -p /data && chown -R appuser:appgroup /data && chmod 775 /data
# 4. Copy Go Binary from backend-builder
COPY --from=backend-builder --chown=appuser:appgroup /app/alpaca-bookmarks /usr/local/bin/
# 5. Copy React Build from frontend-builder
COPY --from=frontend-builder --chown=appuser:appgroup /app/dist /app/dist
# 6. Copy Caddyfile
COPY --chown=appuser:appgroup Caddyfile /etc/caddy/Caddyfile
# 7. Set User and Environment
USER appuser
ENV GIN_MODE=release
ENV DB_PATH=/data/data.sqlite
ENV PORT=8080
# 8. Expose port, define volume
EXPOSE 80
VOLUME ["/data"]

# 9. Add Health Check for the Go backend
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl --fail http://localhost:8080/api/v1/ping || exit 1
# 10. Entrypoint
# This starts the Go backend in the background and Caddy in the foreground
# Caddy will act as the main process for the container
CMD ["sh", "-c", "/usr/local/bin/alpaca-bookmarks & caddy run --config /etc/caddy/Caddyfile --adapter caddyfile"]
