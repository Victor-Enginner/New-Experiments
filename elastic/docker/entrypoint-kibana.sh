#!/bin/sh
# entrypoint-kibana.sh — injeta segredos do Swarm e sobe o Kibana.
#
# O Kibana precisa de: senha do kibana_system (para falar com o ES via
# https) e a chave de criptografia da sessão (XPACK_SECURITY_ENCRYPTIONKEY).
# Ambas vêm de secrets, montados em /run/secrets (tmpfs in-memory).

set -e

export ELASTICSEARCH_PASSWORD="$(cat /run/secrets/kibana_password 2>/dev/null || true)"
export XPACK_SECURITY_ENCRYPTIONKEY="$(cat /run/secrets/kibana_encryption_key 2>/dev/null || true)"

exec /bin/tini -- /usr/local/bin/kibana-docker
