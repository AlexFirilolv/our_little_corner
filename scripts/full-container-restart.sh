docker compose down -v
docker rmi $(docker images -q our_little_corner* 2>/dev/null) 2>/dev/null || true
docker compose up -d --build
