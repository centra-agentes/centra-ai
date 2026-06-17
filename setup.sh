#!/bin/bash
# ─── CentraVigía Agent — Setup inicial ────────────────────────────────────────
# Uso: bash setup.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║      CentraVigía Agent — Setup           ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# ─── Verificar prerequisitos ──────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || { echo "❌ Docker no está instalado. Instálalo en https://docker.com"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || docker compose version >/dev/null 2>&1 || { echo "❌ Docker Compose no está disponible."; exit 1; }

echo -e "${GREEN}✓ Docker disponible${NC}"

# ─── Generar .env si no existe ────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "${GREEN}✓ Archivo .env creado desde .env.example${NC}"
fi

# ─── Generar MASTER_API_KEY si está vacía ─────────────────────────────────────
MASTER_KEY=$(grep "^MASTER_API_KEY=" .env | cut -d'=' -f2)
if [ -z "$MASTER_KEY" ]; then
  NEW_KEY=$(openssl rand -hex 32)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/^MASTER_API_KEY=.*/MASTER_API_KEY=$NEW_KEY/" .env
  else
    sed -i "s/^MASTER_API_KEY=.*/MASTER_API_KEY=$NEW_KEY/" .env
  fi
  echo -e "${GREEN}✓ MASTER_API_KEY generada automáticamente${NC}"
  MASTER_KEY=$NEW_KEY
fi

# ─── Solicitar variables obligatorias ─────────────────────────────────────────
ANTHROPIC_KEY=$(grep "^ANTHROPIC_API_KEY=" .env | cut -d'=' -f2)
if [ -z "$ANTHROPIC_KEY" ]; then
  echo ""
  echo -e "${YELLOW}⚠️  Necesitas una API key de Anthropic (Claude)${NC}"
  echo "   Obtén una en: https://console.anthropic.com"
  echo -n "   Pega tu ANTHROPIC_API_KEY: "
  read -r INPUT_KEY
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|^ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=$INPUT_KEY|" .env
  else
    sed -i "s|^ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=$INPUT_KEY|" .env
  fi
  echo -e "${GREEN}✓ ANTHROPIC_API_KEY configurada${NC}"
fi

INSTANCE_NAME=$(grep "^AGENT_INSTANCE_NAME=" .env | cut -d'=' -f2)
if [ "$INSTANCE_NAME" = "mi-firma-juridica" ] || [ -z "$INSTANCE_NAME" ]; then
  echo ""
  echo -n "   Nombre de tu firma/empresa (sin espacios, ej: firma-garcia): "
  read -r INPUT_NAME
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|^AGENT_INSTANCE_NAME=.*|AGENT_INSTANCE_NAME=$INPUT_NAME|" .env
  else
    sed -i "s|^AGENT_INSTANCE_NAME=.*|AGENT_INSTANCE_NAME=$INPUT_NAME|" .env
  fi
fi

# ─── Levantar servicios ───────────────────────────────────────────────────────
echo ""
echo "🚀 Iniciando CentraVigía Agent..."
docker compose up -d --build

# ─── Esperar a que esté listo ─────────────────────────────────────────────────
echo -n "   Esperando que el agente esté listo"
for i in {1..30}; do
  sleep 2
  if curl -sf http://localhost:4000/api/v1/health/ping >/dev/null 2>&1; then
    echo ""
    break
  fi
  echo -n "."
done

# ─── Resultado ────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ CentraVigía Agent corriendo en localhost:4000    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  📡 API:        ${CYAN}http://localhost:4000/api/v1${NC}"
echo -e "  📚 Docs:       ${CYAN}http://localhost:4000/docs${NC}"
echo -e "  🔑 Master key: ${CYAN}$(grep "^MASTER_API_KEY=" .env | cut -d'=' -f2)${NC}"
echo ""
echo -e "  ${YELLOW}Próximo paso:${NC}"
echo -e "  Crea tu primera API key para conectar con el dashboard:"
echo -e "  ${CYAN}curl -X POST http://localhost:4000/api/v1/auth/keys \\${NC}"
echo -e "  ${CYAN}     -H 'X-Master-Key: \$(grep MASTER_API_KEY .env | cut -d= -f2)' \\${NC}"
echo -e "  ${CYAN}     -H 'Content-Type: application/json' \\${NC}"
echo -e "  ${CYAN}     -d '{\"name\": \"dashboard\"}'${NC}"
echo ""
