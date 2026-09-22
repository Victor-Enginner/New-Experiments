#!/usr/bin/env bash
# deploy.sh — SOAR SIEM (ELK) em Docker Swarm, deploy com proteção total
#
# Fase 1: verifica Docker/Swarm, gera segredos, builda imagens.
# Fase 2: deploy do stack, espera ES verde, bootstrap (kibana_system,
#         usuário shipper), copia CA e credenciais para ~/.elastic.
#
# Uso:
#   ./elastic/deploy.sh            # deploy completo
#   ./elastic/deploy.sh --no-rm    # não apaga o stack antigo
#   ./elastic/deploy.sh --keep-secrets  # não regenera secrets existentes
#
# Requisitos: Docker Engine (com swarm), bash, openssl. Rode NA MÁQUINA
# com Docker (manager). NÃO precisa ser este diretório.

set -euo pipefail

STACK_NAME=soc
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCKER_DIR="${PROJECT_DIR}/elastic/docker"
STATE_DIR="${HOME}/.elastic"
SWARM_ADVERTISE="${SWARM_ADVERTISE_ADDR:-}"

RM_STACK=1
[ "${1:-}" = "--no-rm" ] && RM_STACK=0
KEEP_SECRETS=0
[ "${1:-}" = "--keep-secrets" ] && KEEP_SECRETS=1

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SOAR SIEM — deploy ELK em Docker Swarm (proteção total)    ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# ── 0. Pré-requisitos ──────────────────────────────────────────────
command -v docker >/dev/null || { echo "✖ Docker não instalado. Instale o Docker Engine e rode novamente." >&2; exit 1; }
command -v openssl >/dev/null || { echo "✖ openssl ausente." >&2; exit 1; }

echo "✔ Docker presente."
if ! docker node ls >/dev/null 2>&1; then
  echo "→ Inicializando Docker Swarm (single-node)..."
  if [ -n "$SWARM_ADVERTISE" ]; then
    docker swarm init --advertise-addr "$SWARM_ADVERTISE"
  else
    docker swarm init || echo "⚠ swarm init falhou — inicialize manualmente e rode de novo."
  fi
fi
docker node ls >/dev/null 2>&1 || { echo "✖ Swarm indisponível." >&2; exit 1; }

# ── 1. Secrets do Swarm (criados UMA vez) ──────────────────────────
mkdir -p "$STATE_DIR"
chmod 700 "$STATE_DIR"

create_secret() { # name file
  if docker secret inspect "$1" >/dev/null 2>&1; then
    echo "· secret $1 já existe (mantido)"
  else
    docker secret create "$1" "$2" >/dev/null
    echo "✔ secret $1 criado"
  fi
}

if [ "$KEEP_SECRETS" = "0" ] || [ ! -f "$STATE_DIR/es_password" ]; then
  openssl rand -base64 24 | tr -d '\n' > "$STATE_DIR/es_password"
  openssl rand -base64 24 | tr -d '\n' > "$STATE_DIR/kibana_password"
  openssl rand -base64 24 | tr -d '\n' > "$STATE_DIR/shipper_password"
  openssl rand -hex 32 > "$STATE_DIR/kibana_encryption_key"
  openssl req -x509 -newkey rsa:3072 -nodes -days 365 \
    -keyout "$STATE_DIR/kibana_key" -out "$STATE_DIR/kibana_cert" \
    -subj "/CN=kibana" -addext "subjectAltName=DNS:kibana,DNS:localhost,IP:127.0.0.1" \
    >/dev/null 2>&1
  chmod 600 "$STATE_DIR"/es_password "$STATE_DIR"/kibana_password \
    "$STATE_DIR"/shipper_password "$STATE_DIR"/kibana_encryption_key "$STATE_DIR"/kibana_key
  echo "✔ credenciais geradas em $STATE_DIR (modo 600)"
fi

create_secret es_password        "$STATE_DIR/es_password"
create_secret kibana_password    "$STATE_DIR/kibana_password"
create_secret shipper_password   "$STATE_DIR/shipper_password"
create_secret kibana_encryption_key "$STATE_DIR/kibana_encryption_key"
create_secret kibana_cert        "$STATE_DIR/kibana_cert"
create_secret kibana_key         "$STATE_DIR/kibana_key"

# ── 2. Build das imagens ────────────────────────────────────────────
echo "→ Build das imagens..."
docker build -q -f "$DOCKER_DIR/Dockerfile.es"      -t soc-elasticsearch:8.15.3 "$DOCKER_DIR"
docker build -q -f "$DOCKER_DIR/Dockerfile.kibana"  -t soc-kibana:8.15.3 "$DOCKER_DIR"
docker build -q -f "$DOCKER_DIR/Dockerfile.shipper" -t soc-shipper:latest "$PROJECT_DIR"
echo "✔ imagens soc-* buildadas."

# ── 3. Deploy do stack ─────────────────────────────────────────────
if [ "$RM_STACK" = "1" ]; then
  docker stack rm "$STACK_NAME" >/dev/null 2>&1 || true
  echo "· stack antigo removido"
fi
echo "→ Deploy do stack '${STACK_NAME}'..."
docker stack deploy -c "$PROJECT_DIR/elastic/docker-stack.yml" "$STACK_NAME"
echo "✔ stack deployado. Serviços:"
docker service ls --filter name="${STACK_NAME}_" --format "  · {{.Name}}: {{.Replicas}}"

# ── 4. Aguardar Elasticsearch saudável ─────────────────────────────
ELASTIC_PASSWORD="$(cat "$STATE_DIR/es_password")"
echo "→ Aguardando Elasticsearch (https://localhost:9200)..."
for i in $(seq 1 90); do
  if curl -fsS -k -u "elastic:${ELASTIC_PASSWORD}" \
    "https://localhost:9200/_cluster/health" | grep -q '"status":"green"\|"status":"yellow"'; then
    echo "✔ Elasticsearch pronto."
    break
  fi
  [ "$i" -eq 90 ] && { echo "✖ ES não respondeu. Veja: docker service logs ${STACK_NAME}_elasticsearch" >&2; exit 1; }
  sleep 3
done

# ── 5. Bootstrap (kibana_system + shipper) — via serviço es-setup ──
echo "→ Bootstrap de segurança (es-setup)..."
docker service update --force "${STACK_NAME}_es-setup" >/dev/null 2>&1 || true
for i in $(seq 1 60); do
  sleep 3
  # shipper user existe?
  if curl -fsS -k -u "elastic:${ELASTIC_PASSWORD}" \
    "https://localhost:9200/_security/user/shipper" >/dev/null 2>&1; then
    echo "✔ kibana_system + usuário shipper configurados."
    break
  fi
  [ "$i" -eq 60 ] && echo "⚠ es-setup não completou. Veja: docker service logs ${STACK_NAME}_es-setup"
done

# ── 6. Copiar CA e credenciais para a máquina host ─────────────────
ES_CONTAINER="$(docker ps -q --filter name="${STACK_NAME}_elasticsearch" | head -1)"
if [ -n "$ES_CONTAINER" ]; then
  docker cp "$ES_CONTAINER:/usr/share/elasticsearch/config/certs/http_ca.crt" \
    "$STATE_DIR/ca.crt" 2>/dev/null || true
fi
[ -f "$STATE_DIR/ca.crt" ] && chmod 644 "$STATE_DIR/ca.crt" && echo "✔ CA copiado para $STATE_DIR/ca.crt"

cat > "$STATE_DIR/env.sh" <<EOF
export ES_URL="https://localhost:9200"
export ES_USER="shipper"
export ES_PASS_FILE="$STATE_DIR/shipper_password"
export ES_TLS_CA="$STATE_DIR/ca.crt"
export ES_TLS_REJECT="1"
EOF
chmod 600 "$STATE_DIR/env.sh"
echo "✔ credenciais host em $STATE_DIR/env.sh (para os shippers rodando na máquina)"

# ── 7. Resumo ──────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  DEPLOY CONCLUÍDO                                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo "  Kibana      : https://localhost:5601"
echo "  ES (TLS)    : https://localhost:9200  (usuário: elastic)"
echo "  Usuário shipper: criado (papel soc_ingest, escopo mínimo)"
echo "  Segredos    : $STATE_DIR/ (senhas em arquivos modo 600)"
echo ""
echo "  Para usar os shippers NA MÁQUINA HOST:"
echo "    source $STATE_DIR/env.sh && npm run soc:ship"
echo ""
echo "  Kibana login: usuário 'elastic' (ou crie um usuário de UI com"
echo "  papel 'kibana_admin' + acesso aos índices soc-*)."
