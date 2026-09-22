#!/usr/bin/env node
/**
 * elastic/kibana-dashboards.mjs — cria/atualiza o dashboard "SOC SIEM" no Kibana
 * sobre a data view soc-* (visualizações + painéis de alertas em tempo real).
 *
 * Uso:
 *   source ~/.elastic/env.sh && node elastic/kibana-dashboards.mjs
 *
 * Env (via ~/.elastic/env.sh ou direto):
 *   KIBANA_URL  (default https://localhost:5601)
 *   ES_USER     (default elastic)      ES_PASS | ES_PASS_FILE (auth)
 *
 * Idempotente: cria se não existir, atualiza se já existir (upsert).
 */
import { readFileSync } from 'node:fs';

const KIB = process.env.KIBANA_URL || 'https://localhost:5601';

// Credenciais de acesso ao KIBANA (saved objects precisam do superusuário
// ou de um usuário com privilégio de kibana_admin). Ordem de preferência:
//   KIBANA_USER/KIBANA_PASS(_FILE) → ES_PASS(_FILE) → ~/.elastic/es_password
const readSecret = (p) => {
  try { return readFileSync(p, 'utf8').trim(); } catch { return ''; }
};
let USER = process.env.KIBANA_USER || process.env.ES_USER || 'elastic';
let PASS = process.env.KIBANA_PASS || '';
if (!PASS && process.env.KIBANA_PASS_FILE) PASS = readSecret(process.env.KIBANA_PASS_FILE);
if (!PASS && process.env.ES_PASS) PASS = process.env.ES_PASS;
if (!PASS && process.env.ES_PASS_FILE) PASS = readSecret(process.env.ES_PASS_FILE);
if (!PASS && !process.env.ES_USER && !process.env.ES_PASS_FILE) {
  // fallback: senha do superusuário elastic (login da UI/API)
  const home = process.env.HOME || '';
  PASS = readSecret(`${home}/.elastic/es_password`);
}
if (!PASS) {
  console.error('✖ Sem credenciais do Kibana. Use KIBANA_PASS(_FILE) ou ES_PASS(_FILE) ou ~/.elastic/es_password.');
  process.exit(1);
}

// Kibana local usa certificado self-signed — permite ignorar em dev
// (desative com KIBANA_TLS_INSECURE=0 se quiser exigir o CA).
if (process.env.KIBANA_TLS_INSECURE !== '0') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const auth = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');

async function api(method, path, body) {
  const res = await fetch(`${KIB}${path}`, {
    method,
    headers: { 'kbn-xsrf': 'true', authorization: auth, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* não-JSON */ }
  return { status: res.status, json, text };
}

/** Localiza a data view soc-* (cria se faltar). @returns {string} id */
async function findDataView() {
  const { status, json } = await api('GET', '/api/data_views');
  if (status === 401 || status === 403) {
    console.error(`✖ Kibana recusou auth (HTTP ${status}) — credenciais erradas?`);
    process.exit(1);
  }
  const found = (json?.data_view || []).find((v) => v.title === 'soc-*');
  if (found) { console.log(`✓ data view soc-* → ${found.id}`); return found.id; }
  const created = await api('POST', '/api/data_views', {
    data_view: { title: 'soc-*', name: 'SOC SIEM (soc-*)', timeFieldName: '@timestamp' },
  });
  const id = created.json?.data_view?.id;
  if (!id) { console.error('✖ Falha ao criar data view:', created.text.slice(0, 300)); process.exit(1); }
  console.log(`✓ data view soc-* criada → ${id}`);
  return id;
}

const searchSource = (indexId) => JSON.stringify({
  query: { query: '', language: 'kuery' },
  filter: [],
  index: indexId,
});

/** Monta o visState de uma visualização aggs-based */
function visState(title, type, aggs, params) {
  return JSON.stringify({ title, type, aggs, params });
}

const VIS = {
  total: (indexId) => ({
    attributes: {
      title: 'Total de alertas SIEM',
      visState: visState('Total de alertas SIEM', 'metric', [
        { id: '1', enabled: true, type: 'count', schema: 'metric', params: {} },
      ], {}),
      uiStateJSON: '{}',
      version: 1,
      kibanaSavedObjectMeta: { searchSourceJSON: searchSource(indexId) },
    },
  }),
  porThreat: (indexId) => ({
    attributes: {
      title: 'Alertas por tipo de ameaça',
      visState: visState('Alertas por tipo de ameaça', 'pie', [
        { id: '1', enabled: true, type: 'terms', schema: 'segment', params: { field: 'threat', size: 10, orderBy: '2' } },
        { id: '2', enabled: true, type: 'count', schema: 'metric', params: {} },
      ], { addTooltip: true, legendPosition: 'right' }),
      uiStateJSON: '{}',
      version: 1,
      kibanaSavedObjectMeta: { searchSourceJSON: searchSource(indexId) },
    },
  }),
  porSeveridade: (indexId) => ({
    attributes: {
      title: 'Alertas por severidade',
      visState: visState('Alertas por severidade', 'histogram', [
        { id: '1', enabled: true, type: 'terms', schema: 'group', params: { field: 'severity', size: 10, orderBy: '2' } },
        { id: '2', enabled: true, type: 'count', schema: 'metric', params: {} },
      ], { type: 'bar', addLegend: true, scale: 'linear', mode: 'stacked' }),
      uiStateJSON: '{}',
      version: 1,
      kibanaSavedObjectMeta: { searchSourceJSON: searchSource(indexId) },
    },
  }),
  ultimos: (indexId) => ({
    attributes: {
      title: 'Últimos alertas',
      visState: visState('Últimos alertas', 'table', [
        { id: '1', enabled: true, type: 'count', schema: 'metric', params: {} },
      ], { perPage: 10, showPartialRows: false, sort: { columnIndex: 0, direction: 'desc' } }),
      uiStateJSON: '{}',
      version: 1,
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({
          index: indexId,
          query: { query: '', language: 'kuery' },
          filter: [],
          sort: [{ '@timestamp': 'desc' }],
          columns: ['host', 'threat', 'alert_type', 'severity', 'source', '@timestamp'],
        }),
      },
    },
  }),
};

async function upsert(type, id, body) {
  const { status, json } = await api('POST', `/api/saved_objects/${type}/${id}`, body);
  const ok = status === 200 || status === 201 || (json && json.id);
  console.log(`${ok ? '✓' : '✖'} ${type} "${body.attributes?.title || body.title || id}" (HTTP ${status})`);
  return ok ? id : null;
}

// ────────────────────────── exec ──────────────────────────
const indexId = await findDataView();

const visTotal = await upsert('visualization', 'soc-vis-total', VIS.total(indexId));
const visThreat = await upsert('visualization', 'soc-vis-threat', VIS.porThreat(indexId));
const visSev = await upsert('visualization', 'soc-vis-severity', VIS.porSeveridade(indexId));
const visLast = await upsert('visualization', 'soc-vis-last', VIS.ultimos(indexId));

const visIds = [visTotal, visThreat, visSev, visLast].filter(Boolean);
if (visIds.length < 4) {
  console.error('✖ Nem todas as visualizações foram criadas — abortando dashboard.');
  process.exit(1);
}

const panels = [
  { id: 'p1', type: 'visualization', gridData: { x: 0, y: 0, w: 12, h: 8, i: 'p1' }, panelIndex: 'p1', version: '8.15.0', embeddableConfig: {} },
  { id: 'p2', type: 'visualization', gridData: { x: 12, y: 0, w: 12, h: 16, i: 'p2' }, panelIndex: 'p2', version: '8.15.0', embeddableConfig: {} },
  { id: 'p3', type: 'visualization', gridData: { x: 0, y: 8, w: 12, h: 8, i: 'p3' }, panelIndex: 'p3', version: '8.15.0', embeddableConfig: {} },
  { id: 'p4', type: 'visualization', gridData: { x: 0, y: 16, w: 24, h: 16, i: 'p4' }, panelIndex: 'p4', version: '8.15.0', embeddableConfig: {} },
];

const dashBody = {
  attributes: {
    title: 'SOC SIEM — Visão Geral',
    description: 'Alertas dos sensores (netguard, egress, usage, noc, idps, urlhaus) sobre a data view soc-*.',
    version: 1,
    hits: 0,
    timeRestore: true,
    optionsJSON: JSON.stringify({ useMargins: true, hidePanelTitles: false }),
    panelsJSON: JSON.stringify(panels),
    timeFrom: 'now-24h',
    timeTo: 'now',
    refreshInterval: { pause: false, value: 30000 },
  },
};

await upsert('dashboard', 'soc-dashboard-overview', dashBody);
console.log('\n✅ Dashboard pronto: https://localhost:5601/app/dashboards#/view/soc-dashboard-overview');
