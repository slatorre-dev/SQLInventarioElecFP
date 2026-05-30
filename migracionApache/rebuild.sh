#!/bin/bash
docker kill inventario-node 2>/dev/null
docker rm inventario-node 2>/dev/null
docker build -t inventario-node /tmp/inventario-node/ 2>&1
docker run -d --name inventario-node --network RedColmena -p 3001:3001 \
  -e DB_HOST=mysql -e DB_USER=inventarioelec -e DB_PASS=QuesoFrito_1 \
  inventario-node 2>&1
sleep 4
docker logs inventario-node 2>&1 | tail -8
echo "=TEST="
curl -s "http://localhost:3001/api/auth?action=login&u=seba&p=ServidorBosco" 2>&1
