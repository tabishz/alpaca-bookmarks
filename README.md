# Alpaca Bookmarks

## Version
0.3.5-beta

## Introduction
Alpaca Bookmarks is a self-hosted, multi-user bookmarking application built for speed and simplicity. It allows users to save, organize, and search their links with a clean, responsive interface.

The application is distributed as a single Docker container that includes:
* **Frontend:** React (Vite) + Tailwind CSS
* **Backend:** Go (Gin Framework) + GORM
* **Database:** SQLite (Embedded, zero-config)
* **Server:** Go (Embedded Static File Serving)

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

## ⌨️ Keyboard Shortcuts
Keyboard shortcuts for quick navigation and actions:

| Key(s) | Action |
| :--- | :--- |
| `/` | Focus the main search bar. |
| `t` | Toggle the tags filter menu. |
| `f` | Navigate to Favorites dashboard. |
| `d` | Todo List dashboard. |
| `i` | Open keyboard shortcuts info panel. |
| `k` | Kanban board. |
| `Esc` | Close any open menu (Tags, Settings) or unfocus the search bar. |
| `Backspace` | When a tag is selected, this will clear the filter. |
| `Tab` / `Enter` | When the tags menu is open, this selects the first visible tag. |

### Tag Input
When adding or editing a bookmark, the tag input field has its own shortcuts:

| Key(s) | Action |
| :--- | :--- |
| `Enter` or `,` | Add the currently typed text as a new tag. |
| `Tab` | Autocomplete the tag with the first available suggestion. |
| `Backspace` | When the input is empty, delete the last added tag. |

### Favorites Dashboard
| Key(s) | Action |
| :--- | :--- |
| `f` | Toggle to Main dashboard. |
| `h` | Navigate to main page from favorites dashboard. |
| `i` | Open keyboard shortcuts info panel. |
| `Backscape` | Navigate to main page from favorites dashboard. |

### Todo List
| Key(s) | Action |
| :--- | :--- |
| `f` | Navigate to Favorites dashboard. |
| `k` | Navigate to Kanban Board. |
| `h` | Navigate to main page from favorites dashboard. |
| `i` | Open keyboard shortcuts info panel. |

### Kanban Board
| Key(s) | Action |
| :--- | :--- |
| `1-9` | Switch between Kanban boards left to right. |
| `f` | Navigate to Favorites dashboard. |
| `d` | Navigate to Todo List. |
| `h` | Navigate to main page from favorites dashboard. |
| `i` | Open keyboard shortcuts info panel. |

---


## Icons Endpoint
To enable icons endpoint and icon selection option, set these environment variables:
```
ICONS_ENDPOINT=https://pocketbase.url
ICONS_COLLECTION=icons
ICONS_LOCATION=https://web.url/png
```

`ICONS_LOCATION` is the URL where all the png icons are hosted
`ICONS_ENDPOINT` is the PocketBase's base URL
`ICONS_COLLECTION` is the PocketBase's collection name which is open to public for search and list.

Collection format
```json
{
	filename: 'Name of file with extension',
  name: 'Name of the app',
  tags: 'app tags separated by commas',
  description: 'description of the app',
  updated: 'Last updated date/time'
}
```

Icon Selection Modal searches in pocket base to get the filename and list with in conjunction with `ICONS_COLLECTION`.

---

## 🚀 Getting Started (Docker)

This is the recommended way to run the application.

### 1. Run the Container
You can start the application with a single command. This will persist your data to a local `data` folder.

```bash
# Create a local docker volume if it doesn't exist
docker volume create alpaca_data

# Run the container
docker run -d \
  --name alpaca \
  --restart unless-stopped \
  -p 3000:8081 \
  -v alpaca_data:/data \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  tabishz/alpaca-bookmarks:latest
```

#### With Docker Compose
```yaml
services:
  alpaca-bookmarks:
    image: tabishz/alpaca-bookmarks:latest
    container_name: alpaca-bookmarks
    ports:
      # Map host port 8081 to container port 8081 (which the Go backend listens on)
      - "${ALPACA_PORT:-8081}:8081"
    volumes:
      # Use a named volume to persist the SQLite database
      - alpaca_data:/data
    restart: unless-stopped
    environment:
      - TZ=${TZ:-America/Edmonton}
      # openssl rand -hex 32
      - JWT_SECRET=${JWT_SECRET:=someSecret}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_REGION=${AWS_REGION:=garage}
      - S3_BUCKET_NAME=your-%{S3_BUCKET_NAME}
      - S3_ENDPOINT_URL=${S3_ENDPOINT_URL}
      - ICONS_ENDPOINT=https://pocketbase.url
      - ICONS_COLLECTION=icons
      - ICONS_LOCATION=https://web.url/png
    healthcheck:
      # This healthcheck pings the Go backend directly on port 8081.
      test: ["CMD", "curl", "--fail", "http://localhost:8081/api/v1/ping"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
    logging:
      driver: "json-file"
      options:
        max-size: "1m"
        max-file: "3"

volumes:
  alpaca_data:
```


### 2. Access the App
Open your browser and navigate to:
**http://localhost:3000**

### 3. Default Login
When the application starts for the first time, it creates a default administrator account:

* **Username:** `admin`
* **Password:** `admin`
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
| `S3_ENDPOINT_URL` | S3 endpoint URL for non-AWS | `https://s3.domain.com` |
| `BACKUP_SCHEDULE` | Cron syntax for backup frequency | `0 0 * * *` (Midnight daily) |

#### Backup Retention Settings (Optional)
Control how many backups to keep in S3. Old backups are automatically deleted based on the following rules:
- **Monthly backups**: Backups created on the 1st of each month
- **Weekly backups**: Backups created on Sundays
- **Daily backups**: All other backups

| Variable | Description | Default |
| :--- | :--- | :--- |
| `BACKUP_RETENTION_DAILY` | Number of daily backups to keep | `7` |
| `BACKUP_RETENTION_WEEKLY` | Number of weekly backups to keep | `4` |
| `BACKUP_RETENTION_MONTHLY` | Number of monthly backups to keep | `12` |

---

## 🛠️ Development & Building

### Build from Source
If you want to build the Docker image yourself (for example, if you have modified the source code):

```bash
# Build the image
docker build -t alpaca-bookmarks .

# Run your custom image
docker run -d -p 3000:8081 -v $(pwd)/data:/data -e JWT_SECRET="mysecret" alpaca-bookmarks
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

## API Structure
```
/api/v1/
├── ping            # GET: Health check & version
├── auth/           # Authentication
│   ├── register    # POST: Create new account
│   └── login       # POST: Authenticate user
├── user/           # User settings & data
│   ├── me          # GET: Current user ID
│   ├── preferences # PATCH: Update theme/display settings
│   ├── password    # PATCH: Update account password
│   ├── layout      # GET/PUT: Dashboard tile positions
│   ├── export      # GET: Full account JSON export
│   └── import      # POST: Full account JSON import
├── bookmarks/      # Bookmark management
│   ├── (root)      # GET/POST: List & Create
│   ├── :id         # PUT/DELETE: Update & Remove
│   └── :id/icon    # GET/POST: Fetch or Update custom icon
├── tags/           # Tag management
│   ├── (root)      # GET: All user tags
│   └── :id         # DELETE: Remove tag
├── todos/          # Todo list management
│   ├── (root)      # GET/POST: List & Create
│   ├── :id         # PUT/DELETE: Update & Remove list
│   ├── :id/items   # POST: Add item to list
│   └── items/:itemId # PATCH/DELETE: Update/Remove item
├── kanban/         # Kanban board management
│   ├── boards/     # GET/POST/PUT/DELETE: Board CRUD
│   ├── columns/    # POST/PUT/DELETE: Column CRUD
│   └── cards/      # POST/PUT/DELETE: Card CRUD
├── system/         # Bulk operations
│   ├── import      # POST: Import bookmarks (Netscape format)
│   ├── export      # GET: Export bookmarks (Netscape format)
│   └── purge       # DELETE: Wipe all user data
└── admin/          # Admin-only operations
    ├── backup      # POST: Trigger system backup
    └── users/      # CRUD for system users & password resets
```

## 📜 License

This project is licensed under the GNU AGPL v3.0 License - see the [LICENSE](LICENSE) file for details.
