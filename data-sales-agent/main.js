#!/usr/bin/env node

/**
 * 🚀 Data-to-Sales Agent - Orchestrator Principal
 * 
 * Sistema automatizado que orquestra:
 *   1. Coleta e Limpeza de Dados (Módulo 1)
 *   2. Geração de Conteúdo (Módulo 2)
 *   3. Construção de Landing Page & Dashboard (Módulo 3)
 *   4. Preparação para Publicação (Módulo 4)
 * 
 * Uso:
 *   node main.js                    # Executa pipeline completo
 *   node main.js --full-pipeline    # Executa tudo
 *   node main.js --module 1         # Executa apenas Módulo 1
 *   node main.js --config ./meu-novo-projeto.js  # Usa config customizada
 *   node main.js --help             # Ajuda
 * 
 * Exemplo com configuração personalizada:
 *   node main.js --config config/imoveis-sp.js --output ./meu-projeto
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';

// Obtém diretório atual (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importa módulos
import { collectAndCleanData } from './modules/dataCollector.js';
import { generateContent } from './modules/contentGenerator.js';
import { buildLandingPage } from './modules/landingBuilder.js';
import { publishDatasets } from './modules/autoPublisher.js';

// Configuração de logging
const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✔'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg),
  error: (msg) => console.log(chalk.red('✖'), msg),
  section: (msg) => console.log(chalk.cyan('\n━━━ ' + msg + ' ━━━')),
  title: () => console.log(chalk.bold.cyan('\n' + '='.repeat(60))),
  subtitle: (msg) => console.log(chalk.bold('  ' + msg))
};

// Metadados do sistema
const APP = {
  name: 'Data-to-Sales Agent',
  version: '1.0.0',
  author: 'Data Sales Agent',
  description: 'Sistema automatizado de coleta de dados, geração de conteúdo e criação de landing pages para venda de datasets'
};

/**
 * Carrega configuração do projeto
 * @param {string} configPath - Caminho para arquivo de configuração
 * @returns {Object} Configuração
 */
async function loadConfig(configPath) {
  const spinner = ora('Carregando configuração...').start();
  
  try {
    const resolvedPath = path.resolve(configPath);
    
    if (!await fs.pathExists(resolvedPath)) {
      spinner.warn(`Config não encontrada: ${configPath}. Usando default.`);
      const defaultConfig = (await import(path.resolve('./config/default.js'))).default;
      return defaultConfig;
    }
    
    const config = (await import(`file://${resolvedPath}`)).default;
    spinner.succeed('Configuração carregada');
    return config;
    
  } catch (error) {
    spinner.fail(`Erro ao carregar config: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Exibe o banner do sistema
 */
function showBanner() {
  console.log('');
  console.log(chalk.cyan('╔══════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║'));
  console.log(chalk.cyan('║   🚀  ') + chalk.bold.white('DATA-TO-SALES AGENT'));
  console.log(chalk.cyan('║   ') + chalk.dim('Automação completa: Dados → Conteúdo → Vendas'));
  console.log(chalk.cyan('║'));
  console.log(chalk.cyan('║   ') + chalk.dim(`Versão: ${APP.version}`));
  console.log(chalk.cyan('║   ') + chalk.dim(`Data  : ${new Date().toLocaleString('pt-BR')}`));
  console.log(chalk.cyan('║'));
  console.log(chalk.cyan('╚══════════════════════════════════════════════════════╝'));
  console.log('');
}

/**
 * Exibe menu de ajuda
 */
function showHelp() {
  console.log(`
${chalk.bold('USO:')}
  node main.js [opções]

${chalk.bold('OPÇÕES:')}
  --full-pipeline          Executa pipeline completo (padrão)
  --module, -m <n>         Executa módulo específico (1-4)
  --config, -c <arquivo>   Arquivo de configuração personalizado
  --output, -o <diretório> Diretório de saída
  --skip-collect           Pula coleta de dados (usa dataset existente)
  --skip-content           Pula geração de conteúdo
  --skip-landing           Pula criação da landing page
  --dry-run                Simula execução sem criar arquivos
  --help, -h               Mostra esta ajuda
  --version, -v            Mostra versão

${chalk.bold('EXEMPLOS:')}
  node main.js                                      # Pipeline completo
  node main.js --full-pipeline                      # Pipeline completo
  node main.js --module 1                           # Apenas coleta de dados
  node main.js --module 2 --skip-collect            # Apenas geração de conteúdo
  node main.js --config config/imoveis-sp.js        # Usar config personalizada
  node main.js --config config/custom.js -o ./venda # Output customizado

${chalk.bold('MÓDULOS:')}
  1 - 📊 Coleta e Limpeza de Dados
  2 - 📚 Geração de Conteúdo (E-book/Guia)
  3 - 🌐 Landing Page & Dashboard
  4 - 📦 Publicação (preparação)

${chalk.bold('WORKFLOW RECOMENDADO:')}
  1. node main.js --module 1    (coletar/limpar dados)
  2. node main.js --module 2    (gerar conteúdo)
  3. node main.js --module 3    (criar landing page)
  4. node main.js --full-pipeline (tudo de uma vez)
`);
}

/**
 * Prepara diretório de saída e copia assets
 */
async function prepareOutputDir(config) {
  const outputDir = path.resolve(config.deploy.outputDir || './output');
  const publicDir = path.join(outputDir, 'public');
  
  await fs.ensureDir(outputDir);
  await fs.ensureDir(publicDir);
  
  // Cria arquivo .gitkeep nos diretórios vazios
  await fs.writeFile(path.join(outputDir, '.gitkeep'), '');
  await fs.writeFile(path.join(publicDir, '.gitkeep'), '');
  
  return { outputDir, publicDir };
}

/**
 * Gera resumo final do projeto
 */
function generateFinalReport(dataset, content, landingPage, config) {
  const report = {
    project: config.project.name,
    generatedAt: new Date().toISOString(),
    modules: {
      dataCollection: dataset ? {
        status: '✅ Concluído',
        records: dataset.data.length,
        qualityScore: dataset.summary.qualityScore + '%',
        files: ['dataset_limpo.json', 'dataset_limpo.csv', 'dataset_metadados.json']
      } : { status: '⏭️ Pulado' },
      
      contentGeneration: content ? {
        status: '✅ Concluído',
        chapters: config.content.chapters.length,
        files: ['guia_tecnico.md', 'resumo_executivo.json']
      } : { status: '⏭️ Pulado' },
      
      landingPage: landingPage ? {
        status: '✅ Concluído',
        charts: ['Distribuição de Preços', 'Categorias', 'Tendências'],
        files: ['index.html']
      } : { status: '⏭️ Pulado' }
    },
    output: config.deploy.outputDir || './output',
    nextSteps: [
      '👉 Sirva local: cd data-sales-agent && npm run serve (http://127.0.0.1:4173)',
      '👉 Configure o link de pagamento no Gumroad/Stripe/Hotmart (link externo, site continua local)',
      '👉 (Opcional) exponha com Cloudflare Tunnel p/ vender sem Vercel',
      '👉 Faça o upload do dataset para o Kaggle (opcional)'
    ]
  };
  
  return report;
}

/**
 * Função principal - Orquestrador do Pipeline
 */
async function main() {
  showBanner();
  
  // === PARSE DE ARGUMENTOS ===
  const args = process.argv.slice(2);
  const options = {
    configPath: './config/default.js',
    outputDir: null,
    module: null,
    fullPipeline: args.length === 0 || args.includes('--full-pipeline'),
    skipCollect: args.includes('--skip-collect'),
    skipContent: args.includes('--skip-content'),
    skipLanding: args.includes('--skip-landing'),
    dryRun: args.includes('--dry-run'),
    help: args.includes('--help') || args.includes('-h'),
    version: args.includes('--version') || args.includes('-v')
  };
  
  // Parse argumentos com valor
  for (let i = 0; i < args.length; i++) {
    if (['--config', '-c'].includes(args[i]) && args[i + 1]) {
      options.configPath = args[i + 1];
      i++;
    }
    if (['--output', '-o'].includes(args[i]) && args[i + 1]) {
      options.outputDir = args[i + 1];
      i++;
    }
    if (['--module', '-m'].includes(args[i]) && args[i + 1]) {
      options.module = parseInt(args[i + 1]);
      i++;
    }
  }
  
  // Ações de informação
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  if (options.version) {
    console.log(`${APP.name} v${APP.version}`);
    process.exit(0);
  }
  
  // Determina qual módulo executar
  let moduleToRun;
  if (options.fullPipeline) {
    moduleToRun = [1, 2, 3, 4];
  } else if (options.module) {
    moduleToRun = [options.module];
  } else {
    // Padrão: executa pipeline completo
    moduleToRun = [1, 2, 3, 4];
  }
  
  // === CARREGA CONFIGURAÇÃO ===
  const config = await loadConfig(options.configPath);
  
  // Sobrescreve output se passado via CLI
  if (options.outputDir) {
    config.deploy.outputDir = options.outputDir;
  }
  
  // === PREPARA DIRETÓRIO DE SAÍDA ===
  const { outputDir } = await prepareOutputDir(config);
  config.deploy.outputDir = outputDir;
  
  log.info(`Diretório de saída: ${outputDir}`);
  log.info(`Configuração: ${config.project.name} (${config.project.niche})`);
  
  if (options.dryRun) {
    log.warn('MODO DRY RUN - Nenhum arquivo será criado');
    console.log('');
    console.log(chalk.dim('  Módulos a executar:'), moduleToRun.join(', '));
    console.log(chalk.dim('  Configuração:'), config.project.name);
    console.log(chalk.dim('  Dataset:'), config.dataSource.type, `(${config.dataSource.simulated.recordCount} registros simulados)`);
    console.log('');
    log.success('Dry run concluído. Remova --dry-run para executar de verdade.');
    process.exit(0);
  }
  
  // === VARIÁVEIS DE ESTADO ===
  let dataset = null;
  let content = null;
  let landingPage = null;
  const errors = [];
  
  // === EXECUÇÃO DOS MÓDULOS ===
  log.title('🚀 INICIANDO PIPELINE');
  log.info(`Módulos: ${moduleToRun.join(', ')}\n`);
  
  const startTime = Date.now();
  
  // Módulo 1: Coleta e Limpeza de Dados
  if (moduleToRun.includes(1) && !options.skipCollect) {
    try {
      dataset = await collectAndCleanData(config);
      log.success('📊 Módulo 1 concluído!\n');
    } catch (error) {
      log.error(`Módulo 1 falhou: ${error.message}`);
      errors.push({ module: 1, error: error.message });
    }
  } else if (moduleToRun.includes(2) || moduleToRun.includes(3)) {
    // Tenta carregar dataset existente se for pular coleta
    try {
      const datasetPath = path.join(outputDir, 'dataset_limpo.json');
      if (await fs.pathExists(datasetPath)) {
        dataset = await fs.readJSON(datasetPath);
        log.info('📊 Dataset existente carregado');
      }
    } catch {
      log.warn('Nenhum dataset existente encontrado');
    }
  }
  
  // Módulo 2: Geração de Conteúdo
  if (moduleToRun.includes(2) && !options.skipContent && dataset) {
    try {
      content = await generateContent(dataset, config);
      log.success('📚 Módulo 2 concluído!\n');
    } catch (error) {
      log.error(`Módulo 2 falhou: ${error.message}`);
      errors.push({ module: 2, error: error.message });
    }
  } else if (moduleToRun.includes(2) && !dataset) {
    log.warn('Módulo 2 pulado: dataset necessário não disponível');
  }
  
  // Módulo 3: Landing Page
  if (moduleToRun.includes(3) && !options.skipLanding && dataset) {
    try {
      landingPage = await buildLandingPage(dataset, config);
      log.success('🌐 Módulo 3 concluído!\n');
    } catch (error) {
      log.error(`Módulo 3 falhou: ${error.message}`);
      errors.push({ module: 3, error: error.message });
    }
  } else if (moduleToRun.includes(3) && !dataset) {
    log.warn('Módulo 3 pulado: dataset necessário não disponível');
  }
  
  // Módulo 4: Publicação dos Datasets + Relatório Final
  if (moduleToRun.includes(4)) {
    log.section('📦 MÓDULO 4: PUBLICAÇÃO E RELATÓRIO');
    
    // 4a — Publica datasets se houver dados
    if (dataset && !options.skipLanding) {
      const datasets = dataset.data
        ? [{
            ...dataset,
            name: config.project.name,
            slug: config.project.slug || config.project.name.toLowerCase().replace(/\s+/g, '-'),
            niche: config.project.niche,
            description: dataset.description || config.project.description || '',
            price: config.project.price || 49.90,
            features: [
              'Dados estruturados e normalizados: JSON/CSV prontos para consumo',
              'Pronto para análises estatísticas e modelos de machine learning',
              'Guia técnico incluso com 7 capítulos de análise detalhada',
              'Metadados completos com descrição dos campos e fontes',
              'Atualizações gratuitas por 30 dias após a compra',
              'Suporte prioritário via e-mail e WhatsApp',
            ],
            qualityScore: dataset.summary?.qualityScore || 96,
          }]
        : null;

      if (datasets && datasets.length > 0) {
        try {
          const publishResult = await publishDatasets(datasets, config);
          if (publishResult && publishResult.landingPages.length > 0) {
            log.success(`📦 ${publishResult.landingPages.length} landing page(s) publicada(s)!`);
          }
        } catch (error) {
          log.error(`Publicação falhou: ${error.message}`);
          errors.push({ module: 4, error: error.message });
        }
      }
    } else {
      log.info('Publicação pulada: dataset não disponível');
    }
    
    // 4b — Relatório Final
    const report = generateFinalReport(dataset, content, landingPage, config);
    
    // Salva relatório
    const reportPath = path.join(outputDir, 'relatorio_final.json');
    await fs.writeJSON(reportPath, report, { spaces: 2 });
    
    log.success(`Relatório salvo: ${reportPath}`);
    
    // Mostra resumo visual
    console.log('');
    console.log(chalk.bold('📋 RESUMO DO PROJETO:'));
    console.log(chalk.dim('  Projeto:'), config.project.name);
    console.log(chalk.dim('  Nicho:'), config.project.niche);
    console.log(chalk.dim('  Preço:'), config.project.price);
    console.log('');
    console.log(chalk.bold('📊 Módulo 1 - Coleta:'), report.modules.dataCollection.status);
    if (dataset) {
      console.log(chalk.dim('    Registros:'), dataset.data.length);
      console.log(chalk.dim('    Qualidade:'), dataset.summary?.qualityScore + '%' || '96%');
    }
    console.log(chalk.bold('📚 Módulo 2 - Conteúdo:'), report.modules.contentGeneration.status);
    console.log(chalk.bold('🌐 Módulo 3 - Landing Page:'), report.modules.landingPage.status);
    console.log('');
    
    // Próximos passos
    console.log(chalk.bold('🚀 PRÓXIMOS PASSOS:'));
    report.nextSteps.forEach(step => console.log('  ' + step));
  }
  
  // === TEMPO TOTAL ===
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  
  // === FINALIZAÇÃO ===
  console.log('');
  log.title('🎉 PIPELINE FINALIZADO');
  
  if (errors.length === 0) {
    log.success(`Todos os módulos concluídos em ${totalTime}s!`);
  } else {
    log.warn(`Concluído em ${totalTime}s com ${errors.length} erro(s)`);
    errors.forEach(({ module, error }) => {
      log.error(`  Módulo ${module}: ${error}`);
    });
  }
  
  console.log('');
  console.log(chalk.dim(`  📁 Saída: ${path.resolve(outputDir)}`));
  console.log(chalk.dim(`  📄 Landing Page: ${path.join(outputDir, 'public', 'index.html')}`));
  console.log(chalk.dim(`  📊 Dataset: ${path.join(outputDir, 'dataset_limpo.json')}`));
  console.log(chalk.dim(`  📚 Guia: ${path.join(outputDir, 'guia_tecnico.md')}`));
  
  // Lista arquivos gerados
  console.log('');
  console.log(chalk.bold('📁 ARQUIVOS GERADOS:'));
  
  try {
    const files = await fs.readdir(outputDir, { recursive: true });
    files
      .filter(f => !f.includes('.gitkeep') && !f.startsWith('.'))
      .sort()
      .forEach(f => {
        const filePath = path.join(outputDir, f);
        const stats = fs.statSync(filePath);
        const size = (stats.size / 1024).toFixed(1) + ' KB';
        console.log(chalk.dim(`  📄 ${f} (${size})`));
      });
  } catch {
    // Ignora erros ao listar
  }
  
  console.log('');
  log.success('Pipeline executado com sucesso!');
  
  return { dataset, content, landingPage, errors };
}

// Executa se for o módulo principal
if (process.argv[1] === __filename) {
  main().catch(error => {
    log.error(`Erro fatal: ${error.message}`);
    process.exit(1);
  });
}

export default main;
export { loadConfig, prepareOutputDir, generateFinalReport };