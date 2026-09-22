#!/bin/bash
# es-setup.sh — bootstrap de segurança (job one-shot dentro do Swarm)
#
# 1. Espera o ES subir (https, TLS auto-assinado -> curl -k).
# 2. Define a senha do usuário built-in `kibana_system` (o ES só define a do
#    `elastic` quando ELASTIC_PASSWORD é informado).
# 3. Cria o papel `soc_ingest` (escopo mínimo: escrever em soc-*).
# 4. Cria o usuário `shipper` com esse papel — os shippers usam ELE,
#    nunca o admin `elastic`.
#
# Idempotente: PUT/POST com upsert; pode rodar várias vezes sem quebrar.

set -euo pipefail

ES="${ES_HOST:-https://elasticsearch:9200}"
ELASTIC_PASSWORD="$(cat /run/secrets/es_password)"
KIBANA_PASSWORD="$(cat /run/secrets/kibana_password)"
SHIPPER_PASSWORD="$(cat /run/secrets/shipper_password)"

echo "[SETUP] aguardando Elasticsearch..."
for i in $(seq 1 120); do
  if curl -fsS -k -u "elastic:${ELASTIC_PASSWORD}" "${ES}/_cluster/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
  if [ "$i" -eq 120 ]; then
    echo "[SETUP] ERRO: Elasticsearch não subiu a tempo." >&2
    exit 1
  fi
done
echo "[SETUP] Elasticsearch OK."

# senha do kibana_system
curl -fsS -k -u "elastic:${ELASTIC_PASSWORD}" -X POST \
  "${ES}/_security/user/kibana_system/_password" \
  -H 'Content-Type: application/json' \
  -d "{\"password\":\"${KIBANA_PASSWORD}\"}" >/dev/null

# papel de ingestão com escopo mínimo (somente escrita/leitura em soc-*)
curl -fsS -k -u "elastic:${ELASTIC_PASSWORD}" -X PUT \
  "${ES}/_security/role/soc_ingest" \
  -H 'Content-Type: application/json' \
  -d '{
    "cluster": ["monitor", "manage_ilm"],
    "indices": [
      {
        "names": ["soc-*"],
        "privileges": ["read", "write", "create_index", "view_index_metadata", "manage"]
      }
    ],
    "run_as": []
  }' >/dev/null

# usuário shipper (upsert)
curl -fsS -k -u "elastic:${ELASTIC_PASSWORD}" -X PUT \
  "${ES}/_security/user/shipper" \
  -H 'Content-Type: application/json' \
  -d "{\"password\":\"${SHIPPER_PASSWORD}\",\"roles\":[\"soc_ingest\"],\"full_name\":\"SOAR shippers\"}" >/dev/null

echo "[SETUP] kibana_system + papel soc_ingest + usuário shipper configurados."
