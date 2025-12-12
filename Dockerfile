# ==========================================
# Stage 1: Build the Go Backend
# ==========================================
FROM golang:1.23-alpine AS backend-builder

# Install GCC (Required for SQLite CGO support)
RUN apk add --no-cache gcc musl-dev

WORKDIR /app

# Copy dependency files first (for better caching)
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
# CGO_ENABLED=1 is strictly required for go-sqlite3
RUN CGO_ENABLED=1 GOOS=linux go build -o bookmark-manager cmd/server/main.go

# ==========================================
# Stage 2: Final Production Image
# ==========================================
FROM alpine:latest

# 1. Install Caddy and Certificates
RUN apk add --no-cache caddy ca-certificates curl

# 2. Setup Directories
WORKDIR /srv

# 3. Copy Go Binary from Stage 1
COPY --from=backend-builder /app/bookmarks-manager /usr/local/bin/bookmarks-manager

# 4. Copy Configuration Files
COPY Caddyfile /etc/caddy/Caddyfile
COPY start.sh /usr/local/bin/start.sh

# 5. Create a placeholder index.html
# (This ensures the container works even before we build the actual React app)
RUN mkdir -p /srv/dist && \
    echo "<h1>Frontend Placeholder</h1><p>React app not yet built.</p>" > /srv/dist/index.html

# 6. Set Permissions
RUN chmod +x /usr/local/bin/start.sh

# 7. Define Environment Variables
ENV GIN_MODE=release
ENV DB_PATH=/data/data.sqlite
ENV PORT=8080

# 8. Expose Ports & Define Volume
EXPOSE 80
VOLUME ["/data"]

# 9. Start the Application
CMD ["/usr/local/bin/start.sh"]
