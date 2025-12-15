# Bookmarks Manager

## Introduction
Bookmarks Manager is a self-hosted, multi-user bookmarking application built for speed and simplicity. It allows users to save, organize, and search their links with a clean, responsive interface.

The application is distributed as a single Docker container that includes:
* **Frontend:** React (Vite) + Tailwind CSS
* **Backend:** Go (Gin Framework) + GORM
* **Database:** SQLite (Embedded, zero-config)
* **Server:** Caddy (Reverse Proxy & Static File Server)

## Features
* **Multi-User Support:**
    * **Role-Based Access:** Admin and Standard User roles.
    * **Data Isolation:** Each user has their own private bookmarks and tags.
* **Organization:**
    * **Tagging System:** Auto-complete tags when adding bookmarks.
    * **Search:** Filter by title, URL, or tags instantly.
* **Data Management:**
    * **Import/Export:** Support for standard Netscape HTML bookmark files (compatible with Chrome, Firefox, etc.).
    * **Automated Backups:** Scheduled database backups to AWS S3.
* **Security:**
    * JWT-based authentication.
    * Password hashing (Bcrypt).
    * Secure environment variable configuration.

---

## 🚀 Getting Started (Docker)

This is the recommended way to run the application.

### 1. Run the Container
You can start the application with a single command. This will persist your data to a local `data` folder.

```bash
# Create a local data folder if it doesn't exist
mkdir -p $(pwd)/data

# Run the container
docker run -d \
  --name bm-app \
  --restart unless-stopped \
  -p 3000:80 \
  -v $(pwd)/data:/data \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  bookmarks-manager
```

### 2. Access the App
Open your browser and navigate to:
**http://localhost:3000**

### 3. Default Login
When the application starts for the first time, it creates a default administrator account:

* **Username:** `admin`
* **Password:** `admin123`
* **Role:** Admin

> **⚠️ Important:** Log in immediately and change your password via the settings or user management screen.

---

## ⚙️ Configuration

The application is configured via environment variables. You can pass these to Docker using `-e VARIABLE=value`.

### Core Configuration
| Variable | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `JWT_SECRET` | A secure random string used to sign auth tokens. **Crucial for security.** | **YES** | *None (App will crash if missing)* |
| `PORT` | Internal port the Go backend listens on. | No | `8080` |
| `DB_PATH` | Location of the SQLite database file inside the container. | No | `/data/data.sqlite` |
| `GIN_MODE` | Set to `debug` for logs or `release` for production. | No | `release` |

### AWS S3 Backup Configuration (Optional)
To enable automated nightly backups, provide the following credentials.

| Variable | Description | Example |
| :--- | :--- | :--- |
| `AWS_ACCESS_KEY_ID` | AWS Access Key ID | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Access Key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION` | AWS Region where the bucket exists | `us-east-1` |
| `S3_BUCKET_NAME` | The name of your S3 bucket | `my-bookmarks-backup` |
| `BACKUP_SCHEDULE` | Cron syntax for backup frequency | `0 0 * * *` (Midnight daily) |

---

## 🛠️ Development & Building

### Build from Source
If you want to build the Docker image yourself (for example, if you have modified the source code):

```bash
# Build the image
docker build -t bookmarks-manager .

# Run your custom image
docker run -d -p 3000:80 -v $(pwd)/data:/data -e JWT_SECRET="mysecret" bookmarks-manager
```

### Local Development (Non-Docker)
If you are developing features, you can run the frontend and backend separately.

**1. Backend (Go)**
```bash
# Create a .env file
echo "JWT_SECRET=dev-secret" > .env
echo "PORT=8080" >> .env

# Run the server
go run cmd/server/main.go
```

**2. Frontend (React)**
```bash
cd frontend
npm install
npm run dev
```

---

## 🔍 API Health Check
To verify the backend is running correctly within the container:

```bash
curl http://localhost:3000/api/v1/ping
# Response: {"message":"pong"}
```

## Data Location
* **Database:** `./data/data.sqlite`
* **Backups:** Local backups are stored in `./data/backups/` before being uploaded to S3.