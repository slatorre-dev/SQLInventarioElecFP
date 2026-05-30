#!/bin/bash
echo "=== MEMORIA ==="
free -h
echo "=== DISCO ==="
df -h /
echo "=== CONTENEDORES ==="
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo "=== DOCKER SYSTEM ==="
docker system df
echo "=== ERRORES DOCKER ==="
journalctl -u docker --no-pager -n 20 2>/dev/null || true
