# soc-elasticsearch — ES 8 endurecido com credenciais via secrets do Swarm
FROM docker.elastic.co/elasticsearch/elasticsearch:8.15.3

USER root
COPY --chown=elasticsearch:elasticsearch entrypoint-es.sh /usr/local/bin/entrypoint-es.sh
COPY --chown=elasticsearch:elasticsearch es-setup.sh /usr/local/bin/es-setup.sh
RUN chmod +x /usr/local/bin/entrypoint-es.sh /usr/local/bin/es-setup.sh
USER elasticsearch

ENTRYPOINT ["/usr/local/bin/entrypoint-es.sh"]
CMD ["eswrapper"]
