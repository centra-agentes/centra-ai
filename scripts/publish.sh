#!/bin/bash
# Publica la imagen de CentraVigía en Docker Hub
# Uso: ./scripts/publish.sh [tag]
# Ejemplo: ./scripts/publish.sh 1.0.0

set -e

IMAGE="daimer003/centravigia"
TAG="${1:-latest}"

echo ""
echo "  CentraVigía — Publicar imagen Docker"
echo "  ════════════════════════════════════"
echo ""

# Verificar Docker
if ! docker info &> /dev/null; then
  echo "  ❌ Docker Desktop no está corriendo. Ábrelo y vuelve a intentarlo."
  exit 1
fi

# Verificar login
if ! docker system info 2>/dev/null | grep -q "Username"; then
  echo "  Iniciando sesión en Docker Hub..."
  docker login
fi

# Crear builder multi-plataforma si no existe
if ! docker buildx inspect centra-builder &>/dev/null; then
  echo "  Creando builder multi-plataforma..."
  docker buildx create --name centra-builder --use
else
  docker buildx use centra-builder
fi

PLATFORMS="linux/amd64,linux/arm64"
TAGS="-t ${IMAGE}:${TAG}"
if [ "${TAG}" != "latest" ]; then
  TAGS="${TAGS} -t ${IMAGE}:latest"
fi

echo "  Construyendo y publicando: ${IMAGE}:${TAG} (${PLATFORMS})"
docker buildx build --platform "${PLATFORMS}" ${TAGS} --push .

echo ""
echo "  ✓ Imagen publicada: docker.io/${IMAGE}:${TAG}"
echo "  ✓ Los usuarios podrán descargarla con: docker pull ${IMAGE}:latest"
echo ""
