# Bookmarks Manager

## Introduction
A Basic Bookmarks Manager based on React and Go-Lang.

## Database (SQLite)
Location: `./data/data.sqlite`

## Docker run

```shell
# Create a local data folder if it doesn't exist
mkdir -p $(pwd)/data

docker run -d \
  --name bm-app \
  --restart unless-stopped \
  -p 3000:80 \
  -v $(pwd)/data:/data \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  bookmarks-manager
# or for temporary one
docker run -d --rm --name bm-app -p 3000:80 -v $(pwd)/data:/data -e JWT_SECRET=$(openssl rand -hex 32) bookmarks-manager
```

## Environment Variables
```shell
export AWS_ACCESS_KEY_ID=your_key_id
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
export S3_BUCKET_NAME=your-unique-bucket-name
# Run every day at midnight. Cron syntax: "0 0 * * *"
export BACKUP_SCHEDULE="0 0 * * *"
# If not provided then sets to @daily
```

### Check
API Check: Run `curl http://localhost:3000/api/v1/ping`. You should get `{"message":"pong"}`.


## Dockerfile
This Dockerfile with custom certs

```Dockerfile
# ==========================================
# Stage 1: Build the React Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# 0. Custom Certs
COPY ca-certs.crt /usr/local/share/ca-certificates/ca-certs.crt
# Manually append the custom cert to the system bundle.
# We do this manually because the 'ca-certificates' utility isn't installed yet!
RUN cat /usr/local/share/ca-certificates/ca-certs.crt >> /etc/ssl/certs/ca-certificates.crt && \
    apk update && \
    apk add --no-cache caddy ca-certificates curl && \
    # Now that the package is installed, run the official utility to ensure everything is clean
    update-ca-certificates

# Copy frontend dependency files
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Build static assets (Output goes to /app/dist)
RUN npm run build

# ==========================================
# Stage 2: Build the Go Backend
# ==========================================
FROM golang:1.25-alpine AS backend-builder

# 0. Custom Certs
COPY ca-certs.crt /usr/local/share/ca-certificates/ca-certs.crt
# Manually append the custom cert to the system bundle.
# We do this manually because the 'ca-certificates' utility isn't installed yet!
RUN cat /usr/local/share/ca-certificates/ca-certs.crt >> /etc/ssl/certs/ca-certificates.crt && \
    apk update && \
    apk add --no-cache caddy ca-certificates curl && \
    # Now that the package is installed, run the official utility to ensure everything is clean
    update-ca-certificates

# Install GCC (Required for SQLite CGO support)
RUN apk add --no-cache gcc musl-dev

WORKDIR /app

# Copy Go dependency files
COPY go.mod go.sum ./
RUN go mod download

# Copy Go source code
COPY . .

# Build the binary (CGO enabled for SQLite)
RUN CGO_ENABLED=1 GOOS=linux go build -o bookmarks-manager cmd/server/main.go

# ==========================================
# Stage 3: Final Production Image
# ==========================================
FROM alpine:latest

# 0. Custom Certs
COPY ca-certs.crt /usr/local/share/ca-certificates/ca-certs.crt
# Manually append the custom cert to the system bundle.
# We do this manually because the 'ca-certificates' utility isn't installed yet!
RUN cat /usr/local/share/ca-certificates/ca-certs.crt >> /etc/ssl/certs/ca-certificates.crt && \
    apk update && \
    apk add --no-cache caddy ca-certificates curl && \
    # Now that the package is installed, run the official utility to ensure everything is clean
    update-ca-certificates

# 1. Install Caddy (Web Server) & Certs
RUN apk add --no-cache caddy ca-certificates curl

# 2. Setup Directories
WORKDIR /srv

# 3. Copy Go Binary from Stage 2
COPY --from=backend-builder /app/bookmarks-manager /usr/local/bin/bookmarks-manager

# 4. Copy React Build from Stage 1 (Real Frontend!)
# We copy it to /srv/dist, which matches the Caddyfile "root" config
COPY --from=frontend-builder /app/dist /srv/dist

# 5. Copy Configuration Files
COPY Caddyfile /etc/caddy/Caddyfile
COPY start.sh /usr/local/bin/start.sh

# 6. Set Permissions & Environment
RUN chmod +x /usr/local/bin/start.sh

ENV GIN_MODE=release
ENV DB_PATH=/data/data.sqlite
ENV PORT=8080

# 7. Expose Ports & Define Volume
EXPOSE 80
VOLUME ["/data"]

# 8. Start the Application
CMD ["/usr/local/bin/start.sh"]
```