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
  -p 3000:80 \
  -v $(pwd)/data:/data \
  -e JWT_SECRET=mysecretkey \
  bookmark-manager
```

### Check
API Check: Run `curl http://localhost:3000/api/v1/ping`. You should get `{"message":"pong"}`.