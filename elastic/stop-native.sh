#!/usr/bin/env bash
# stop-native.sh — derruba Kibana e Elasticsearch nativos (shutdown gracioso).
#
# Uso:
#   ./stop-native.sh            # derruba Kibana + ES
#   ./stop-native.sh --no-kib   # apenas ES (não mexe no Kibana)
set -u

BASE="${ELASTIC_NATIVE_HOME:-$HOME/elastic-native}"
KIB_PID_FILE="$BASE/kibana.pid"
LOG_DIR="$BASE/logs"

stop_pid() {
  local pid="$1" name="$2"
  kill -0 "$pid" 2>/dev/null || { echo "  · $name não está rodando"; return; }
  echo "▶ $name (pid $pid): TERM"
  kill "$pid" 2>/dev/null
  for i in $(seq 1 20); do
    kill -0 "$pid" 2>/dev/null || { echo "  ✓ $name parou"; return; }
    sleep 1
  done
  echo "  ⚠ $name não parou — KILL"
  kill -9 "$pid" 2>/dev/null || true
}

# Kibana primeiro (depende do ES)
if [ "${1:-}" != "--no-kib" ] && [ -f "$KIB_PID_FILE" ]; then
  stop_pid "$(cat "$KIB_PID_FILE")" "Kibana"
  rm -f "$KIB_PID_FILE"
fi

# Keycloak (depende de nada, mas derruba antes do ES por ordem)
if [ "${1:-}" != "--no-kib" ] && [ -f "$BASE/keycloak.pid" ]; then
  stop_pid "$(cat "$BASE/keycloak.pid")" "Keycloak"
  rm -f "$BASE/keycloak.pid"
fi

# ES — pega o pid do processo java do bootstrap (sem casar com o shell)
ES_PID=$(pgrep -f 'org.elasticsearch.bootstrap.Elasticsearch' | head -1)
if [ -n "${ES_PID:-}" ]; then
  stop_pid "$ES_PID" "Elasticsearch"
else
  echo "  · Elasticsearch não está rodando"
fi

echo ""
echo "Pronto. (Re)subir com: ./start-native.sh"
