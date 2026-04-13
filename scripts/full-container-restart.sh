docker compose down -v
docker rmi $(docker images -q twofold* 2>/dev/null) 2>/dev/null || true
docker compose up -d --build
