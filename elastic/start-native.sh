#!/usr/bin/env bash
# start-native.sh — sobe Elasticsearch + Kibana nativos no sandbox (sem root).
#
# Uso:
#   ./start-native.sh            # sobe ES (se parado) e Kibana (se parado)
#   ./start-native.sh --no-kib   # apenas ES
set -euo pipefail

BASE="${ELASTIC_NATIVE_HOME:-$HOME/elastic-native}"
ES_BIN="$BASE/es/bin/elasticsearch"
KIB_BIN="$BASE/kibana/bin/kibana"
LOG_DIR="$BASE/logs"
KIB_PID_FILE="$BASE/kibana.pid"
CA="$BASE/es/config/certs/http_ca.crt"

mkdir -p "$LOG_DIR"

curl_es() { curl -sk --max-time 5 "https://127.0.0.1:9200" -o /dev/null -w '%{http_code}' 2>/dev/null || true; }
curl_kib() { curl -sk --max-time 5 "https://127.0.0.1:5601/api/status" -o /dev/null -w '%{http_code}' 2>/dev/null || true; }
curl_kc() { curl -sk --max-time 5 "https://127.0.0.1:8443/realms/soc" -o /dev/null -w '%{http_code}' 2>/dev/null || true; }
es_proc() { pgrep -f 'org.elasticsearch.bootstrap.Elasticsearch' | head -1; }

if [ -n "$(es_proc)" ]; then
  echo "● Elasticsearch já está rodando (pid $(es_proc))"
elif [ "$(curl_es)" != "401" ] && [ "$(curl_es)" != "200" ]; then
  echo "▶ Elasticsearch: subindo..."
  ES_JAVA_OPTS="-Xms1g -Xmx1g" setsid nohup "$ES_BIN" >> "$LOG_DIR/es-start.log" 2>&1 < /dev/null &
  disown 2>/dev/null || true
  for i in $(seq 1 60); do
    code=$(curl_es)
    if [ "$code" = "401" ] || [ "$code" = "200" ]; then
      echo "  ✓ Elasticsearch pronto em https://127.0.0.1:9200 (https, security)"
      break
    fi
    [ "$i" = "60" ] && { echo "  ✖ Elasticsearch não respondeu. Ver $LOG_DIR/es-start.log"; exit 1; }
    sleep 2
  done
else
  echo "● Elasticsearch já está rodando em https://127.0.0.1:9200"
fi

if [ "${1:-}" = "--no-kib" ]; then exit 0; fi

if [ -f "$KIB_PID_FILE" ] && kill -0 "$(cat "$KIB_PID_FILE")" 2>/dev/null; then
  echo "● Kibana já está rodando em https://127.0.0.1:5601"
else

echo "▶ Kibana: subindo..."
setsid nohup "$KIB_BIN" >> "$LOG_DIR/kibana.log" 2>&1 < /dev/null &
KIB_PID=$!
echo "$KIB_PID" > "$KIB_PID_FILE"
disown "$KIB_PID" 2>/dev/null || true
for i in $(seq 1 45); do
  code=$(curl_kib)
  if [ "$code" = "200" ] || [ "$code" = "401" ] || [ "$code" = "302" ]; then
    echo "  ✓ Kibana pronto em https://127.0.0.1:5601"
    echo ""
    echo "  Login na UI:  usuário: elastic | senha: ~/.elastic/es_password"
    echo "  SSO:          Entrar com Keycloak (SSO) → realm soc"
    break
  fi
  [ "$i" = "45" ] && { echo "  ✖ Kibana não respondeu. Ver $LOG_DIR/kibana.log"; exit 1; }
  sleep 2
done
fi

# Keycloak (identidade/OIDC)
if [ "$(curl_kc)" != "200" ] && [ "$(curl_kc)" != "302" ]; then
  KC_DIR="$HOME/elastic-native/keycloak/keycloak-26.7.0"
  if [ -x "$KC_DIR/bin/kc.sh" ]; then
    echo "▶ Keycloak: subindo (https://127.0.0.1:8443)..."
    KC_PW=$(cat "$HOME/.elastic/keycloak_keystore_password" 2>/dev/null || true)
    export JAVA_HOME="${JAVA_HOME:-/home/yoxzy/.sdkman/candidates/java/current}"
    setsid nohup env JAVA_HOME="$JAVA_HOME" JAVA_OPTS_APPEND="-Xms128m -Xmx768m" \
      "$KC_DIR/bin/kc.sh" start-dev --http-port 8081 --https-port 8443 \
      --hostname-strict=false \
      --https-key-store-file="$HOME/elastic-native/keycloak/certs/keycloak.p12" \
      --https-key-store-password="$KC_PW" --https-key-store-type=pkcs12 \
      >> "$LOG_DIR/keycloak.log" 2>&1 < /dev/null &
    KC_PID=$!
    echo "$KC_PID" > "$BASE/keycloak.pid"
    disown "$KC_PID" 2>/dev/null || true
    for i in $(seq 1 30); do
      code=$(curl_kc)
      if [ "$code" = "200" ] || [ "$code" = "302" ]; then
        echo "  ✓ Keycloak pronto em https://127.0.0.1:8443 (admin em ~/.elastic/keycloak_admin_password)"
        break
      fi
      [ "$i" = "30" ] && { echo "  ✖ Keycloak não respondeu. Ver $LOG_DIR/keycloak.log"; exit 1; }
      sleep 3
    done
  else
    echo "  · Keycloak não instalado em $KC_DIR (pulei)"
  fi
else
  echo "● Keycloak já está rodando em https://127.0.0.1:8443"
fi
