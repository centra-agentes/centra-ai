# CentraVigía Agent

Agente de inteligencia judicial para firmas de abogados colombianas. Consulta, monitorea y analiza procesos judiciales automáticamente usando IA.

**Este agente corre en tu propia infraestructura. Tus datos, tu servidor, tu API key de Claude.**

---

## Instalación rápida

### Opción 1 — Docker (recomendado)

```bash
git clone https://github.com/centra-legaltech/centravigia-agent
cd centravigia-agent
bash setup.sh
```

El script configura todo automáticamente y el agente queda corriendo en `http://localhost:4000`.

### Opción 2 — Railway (un clic)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/centravigia-agent)

Configura estas variables de entorno en Railway:

| Variable | Descripción |
|---|---|
| `ANTHROPIC_API_KEY` | Tu API key de Claude (console.anthropic.com) |
| `MASTER_API_KEY` | Genera con `openssl rand -hex 32` |
| `AGENT_INSTANCE_NAME` | Nombre de tu firma (ej: `firma-garcia`) |
| `AGENT_PUBLIC_URL` | URL pública que Railway te asigna |

---

## Variables de entorno

Copia `.env.example` a `.env` y configura:

```bash
cp .env.example .env
```

Las variables **obligatorias** para producción:

```env
ANTHROPIC_API_KEY=sk-ant-...    # Tu API key de Claude
MASTER_API_KEY=...              # Clave maestra (genera con openssl rand -hex 32)
DATABASE_URL=postgresql://...   # O configura DB_HOST, DB_PORT, etc.
AGENT_PUBLIC_URL=https://...    # URL pública de tu agente
```

---

## Conectar con el dashboard de CentraVigía

Una vez que el agente esté corriendo, crea una API key para el dashboard:

```bash
curl -X POST https://tu-agente.railway.app/api/v1/auth/keys \
     -H "X-Master-Key: TU_MASTER_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"name": "dashboard-centravigia"}'
```

Copia la key generada y pégala en el dashboard de CentraVigía junto con la URL de tu agente.

---

## Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/v1/agent/analyze/:radicado` | Análisis inteligente de un proceso |
| `GET` | `/api/v1/vigilance/radicado/:numero` | Consulta cruda por radicado |
| `POST` | `/api/v1/vigilance/watches` | Crear monitoreo automático |
| `GET` | `/api/v1/vigilance/alerts` | Ver alertas pendientes |
| `GET` | `/api/v1/health/ping` | Estado del agente |
| `GET` | `/docs` | Documentación Swagger completa |

---

## Desarrollo local

```bash
npm install
cp .env.example .env   # configura tus variables
npm run start:dev      # puerto 3000
```

---

## Arquitectura

```
src/modules/
├── agent/        ← Orquestador + análisis Claude
├── vigilance/    ← Consultas + monitoreo + alertas
├── procesos/     ← Conector Rama Judicial
├── publicaciones/← Publicaciones procesales
└── auth/         ← Gestión de API keys
```

Cada conector judicial es un módulo independiente. Cuando Rama Judicial cambie su portal, solo se actualiza ese módulo sin tocar el resto.

---

## Principios de diseño

- **Sin dependencia del proveedor:** el agente corre completamente en tu infraestructura
- **Tu API key de Claude:** tus costos, tus datos, tu control
- **Conectores modulares:** cada fuente judicial es independiente
- **API abierta:** cualquier frontend puede conectarse vía REST
# centra-ai
