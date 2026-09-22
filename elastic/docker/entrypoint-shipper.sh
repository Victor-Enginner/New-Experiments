#!/bin/sh
# entrypoint-shipper.sh — roda os 4 shippers SIEM dentro do Swarm.
#
# Os shippers leem os eventos dos bind-mounts (/sensors/*) e enviam ao ES
# via rede overlay cifrada (https://elasticsearch:9200), autenticando como
# o usuário `shipper` (criado pelo es-setup) e confiando no CA do ES
# (volume compartilhado escerts -> /certs/http_ca.crt).
#
# Cada shipper já espera/retenta quando o ES ainda está subindo (waitForEs),
# então não há corrida com o es-setup.

set -e

exec /bin/sh -c '
  echo "[SHIPPER] iniciando netwatch/egress/usage/urlhaus shippers..."
  node /app/elastic/ingest/netwatch-shipper.mjs &
  node /app/elastic/ingest/egress-shipper.mjs &
  node /app/elastic/ingest/usage-shipper.mjs &
  node /app/elastic/ingest/urlhaus-shipper.mjs &
  wait
'
