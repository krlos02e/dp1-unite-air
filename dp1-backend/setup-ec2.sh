#!/bin/bash
# =====================================
# EC2 SETUP SCRIPT (RUN ONCE)
# - Docker, Nginx, MySQL container
# =====================================

DOMAIN="uniteapps.com"
MYSQL_ROOT_PASSWORD="root"
MYSQL_DATABASE="unite_air"

set -e

echo "====================================="
echo "[1/5] Installing Docker..."
echo "====================================="
sudo apt update
sudo apt install -y docker.io
sudo systemctl enable docker

echo "====================================="
echo "[2/5] Installing Nginx + Certbot..."
echo "====================================="
sudo apt install -y nginx certbot python3-certbot-nginx

echo "====================================="
echo "[3/5] Creating project directory..."
echo "====================================="
mkdir -p /home/ubuntu/dp1-unite-air

echo "====================================="
echo "[4/5] Creating Docker network and starting MySQL..."
echo "====================================="
sudo docker network create unite-air-net 2>/dev/null || true

if sudo docker ps -a --format '{{.Names}}' | grep -q '^unite-air-mysql$'; then
  echo "MySQL ya existe, omitiendo..."
else
  sudo docker run -d \
    --name unite-air-mysql \
    --network unite-air-net \
    --restart unless-stopped \
    -e MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD} \
    -e MYSQL_DATABASE=${MYSQL_DATABASE} \
    -v mysql_data:/var/lib/mysql \
    mysql:8.0

  echo "Esperando que MySQL inicie..."
  for i in $(seq 1 30); do
    if sudo docker exec unite-air-mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} -e "SELECT 1" &>/dev/null; then
      echo "MySQL listo!"
      break
    fi
    sleep 2
  done
fi

echo "====================================="
echo "[5/5] Setup completo!"
echo ""
echo "MySQL corriendo en: localhost:3306"
echo "Base de datos: ${MYSQL_DATABASE}"
echo "Usuario: root"
echo "Password: ${MYSQL_ROOT_PASSWORD}"
echo ""
echo "Ahora ejecuta setup-https.sh para configurar Nginx + SSL"
echo "Y luego deploy.sh para subir el backend"
echo "====================================="
