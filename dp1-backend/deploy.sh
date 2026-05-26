#!/bin/bash
# =====================================
#  DEPLOY: build + run on EC2
# =====================================

IMAGE_NAME="dp1-backend"
IMAGE_TAG="v1"

# EDIT THESE
PEM_PATH="$(dirname "$0")/unite-air-server.pem"
EC2_USER="ubuntu"
EC2_HOST="ec2-35-169-159-82.compute-1.amazonaws.com"
EC2_DIR="/home/ubuntu/dp1-unite-air"
DOMAIN="uniteapps.com"

set -e

echo "====================================="
echo "[1/6] Uploading source code to EC2..."
echo "====================================="
SSH_BASE="-i ${PEM_PATH} ${EC2_USER}@${EC2_HOST}"

ssh ${SSH_BASE} "mkdir -p ${EC2_DIR}"
rsync -e "ssh -i ${PEM_PATH}" -avz --delete \
  --exclude='.git' --exclude='.idea' --exclude='target' --exclude='node_modules' \
  --exclude='dp1-frontend' --exclude='*.tar' --exclude='*.tar.gz' \
  $(dirname "$0")/../ ${EC2_USER}@${EC2_HOST}:${EC2_DIR}/

echo "====================================="
echo "[2/6] Setting up EC2 (Docker + MySQL + Nginx)..."
echo "====================================="
ssh ${SSH_BASE} "chmod +x ${EC2_DIR}/dp1-backend/setup-ec2.sh && sudo ${EC2_DIR}/dp1-backend/setup-ec2.sh"
ssh ${SSH_BASE} "chmod +x ${EC2_DIR}/dp1-backend/setup-https.sh && sudo ${EC2_DIR}/dp1-backend/setup-https.sh"

echo "====================================="
echo "[3/6] Building Docker image on EC2..."
echo "====================================="
ssh ${SSH_BASE} \
  "cd ${EC2_DIR} && sudo docker build -t ${IMAGE_NAME}:${IMAGE_TAG} -f dp1-backend/Dockerfile ."

echo "====================================="
echo "[4/6] Replacing backend container..."
echo "====================================="
ssh ${SSH_BASE} "sudo docker rm -f ${IMAGE_NAME} || true"
ssh ${SSH_BASE} \
  "sudo docker run -d \
    -p 8080:8080 \
    --name ${IMAGE_NAME} \
    --network unite-air-net \
    -e SPRING_DATASOURCE_URL='jdbc:mysql://unite-air-mysql:3306/unite_air?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC' \
    -e SPRING_DATASOURCE_USERNAME=root \
    -e SPRING_DATASOURCE_PASSWORD=root \
    -e SERVER_SERVLET_CONTEXT_PATH=/api \
    ${IMAGE_NAME}:${IMAGE_TAG}"

echo "====================================="
echo "[5/6] Verifying backend..."
echo "====================================="
sleep 10
curl -s -o /dev/null -w "%{http_code}" https://${DOMAIN}/api/simulacion/iniciar || echo "Aún no responde, espera unos segundos"

echo ""
echo "====================================="
echo " DEPLOY COMPLETED"
echo " Frontend: https://${DOMAIN}"
echo " Backend:  https://${DOMAIN}/api/simulacion/iniciar"
echo "====================================="
