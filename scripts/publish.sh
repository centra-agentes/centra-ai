#!/bin/bash
# Publica la imagen de CentraVigía en Docker Hub
# Uso: ./scripts/publish.sh [tag]
# Ejemplo: ./scripts/publish.sh 1.0.0

set -e

IMAGE="centra-agentes/centravigia"
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

echo "  Construyendo imagen: ${IMAGE}:${TAG}"
docker build --platform linux/amd64,linux/arm64 -t "${IMAGE}:${TAG}" .

if [ "${TAG}" != "latest" ]; then
  echo "  Etiquetando también como :latest"
  docker tag "${IMAGE}:${TAG}" "${IMAGE}:latest"
fi

echo "  Publicando ${IMAGE}:${TAG}..."
docker push "${IMAGE}:${TAG}"

if [ "${TAG}" != "latest" ]; then
  docker push "${IMAGE}:latest"
fi

echo ""
echo "  ✓ Imagen publicada: docker.io/${IMAGE}:${TAG}"
echo "  ✓ Los usuarios podrán descargarla con: docker pull ${IMAGE}:latest"
echo ""
