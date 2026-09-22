#!/bin/sh
# entrypoint-es.sh — injeta credenciais dos secrets do Swarm e sobe o ES.
#
# Os segredos são montados pelo Swarm em /run/secrets/* (tmpfs, in-memory).
# As imagens oficiais não leem senha de arquivo, então exportamos antes do
# entrypoint original (tini -> docker-entrypoint.sh -> eswrapper).
#
# Modo especial:  `setup`  roda o es-setup.sh (job one-shot) em vez do ES.

set -e

if [ "$1" = "setup" ]; then
  shift
  exec /usr/local/bin/es-setup.sh "$@"
fi

export ELASTIC_PASSWORD="$(cat /run/secrets/es_password 2>/dev/null || true)"
export KIBANA_PASSWORD="$(cat /run/secrets/kibana_password 2>/dev/null || true)"
export SHIPPER_PASSWORD="$(cat /run/secrets/shipper_password 2>/dev/null || true)"

exec /bin/tini -- /usr/local/bin/docker-entrypoint.sh "$@"
