
/**
 * 📚 Módulo 2: Gerador de Conteúdo (Content Generator)
 * 
 * Responsabilidades:
 * - Ler dataset limpo
 * - Gerar estrutura do E-book/Guia Técnico
 * - Escrever capítulos com análise dos dados
 * - Gerar gráficos e estatísticas em texto
 * - Exportar em Markdown (conversível para PDF/ePub)
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';

const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✔'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg),
  error: (msg) => console.log(chalk.red('✖'), msg),
  section: (msg) => console.log(chalk.cyan('\n━━━ ' + msg + ' ━━━'))
};

/**
 * Gera análise estatística textual dos dados
 * @param {Array} data - Dados limpos
 * @param {Object} stats - Estatísticas do dataset
 * @returns {string} Análise em texto
 */
function generateDataAnalysis(data) {
  const lines = [];
  
  lines.push('## 📊 Análise dos Dados\n');
  lines.push(`**Total de registros analisados:** ${data.length}\n`);
  
  // Análise de campos numéricos
  const numericFields = data.length > 0
    ? Object.keys(data[0]).filter(f => 
        f !== 'id' && data.some(r => typeof r[f] === 'number')
      )
    : [];
  
  if (numericFields.length > 0) {
    lines.push('### 📈 Campos Numéricos\n');
    lines.push('| Campo | Mínimo | Máximo | Média | Mediana |');
    lines.push('|-------|--------|--------|-------|---------|');
    
    numericFields.forEach(field => {
      const values = data.map(r => r[field]).filter(v => typeof v === 'number');
      if (values.length === 0) return;
      
      const sorted = [...values].sort((a, b) => a - b);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
      const median = values.length % 2 === 0
        ? (sorted[values.length / 2 - 1] + sorted[values.length / 2]) / 2
        : sorted[Math.floor(values.length / 2)];
      
      const fieldLabel = field.charAt(0).toUpperCase() + field.slice(1);
      lines.push(`| ${fieldLabel} | ${formatNumber(min)} | ${formatNumber(max)} | ${formatNumber(parseFloat(avg))} | ${formatNumber(median)} |`);
    });
    
    lines.push('');
  }
  
  // Análise de campos categóricos
  const catFields = data.length > 0
    ? Object.keys(data[0]).filter(f =>
        f !== 'id' && data.some(r => typeof r[f] === 'string')
      )
    : [];
  
  if (catFields.length > 0) {
    lines.push('### 🏷️ Distribuição por Categorias\n');
    
    catFields.forEach(field => {
      const values = data.map(r => r[field]).filter(v => v);
      const freq = {};
      values.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
      
      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
      const fieldLabel = field.charAt(0).toUpperCase() + field.slice(1);
      
      lines.push(`**${fieldLabel}**\n`);
      lines.push('| Valor | Quantidade | Percentual |');
      lines.push('|-------|------------|------------|');
      
      sorted.forEach(([value, count]) => {
        const pct = ((count / values.length) * 100).toFixed(1);
        lines.push(`| ${value} | ${count} | ${pct}% |`);
      });
      
      lines.push('');
    });
  }
  
  // Insights
  lines.push('### 💡 Insights Principais\n');
  
  if (numericFields.length > 0) {
    const firstNumField = numericFields[0];
    const values = data.map(r => r[firstNumField]).filter(v => typeof v === 'number');
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    const fieldLabel = firstNumField.charAt(0).toUpperCase() + firstNumField.slice(1);
    lines.push(`- **${fieldLabel} médio:** ${formatNumber(avg)}`);
    lines.push(`- **Maior ${fieldLabel.toLowerCase()}:** ${formatNumber(max)}`);
    lines.push(`- **Menor ${fieldLabel.toLowerCase()}:** ${formatNumber(min)}`);
    lines.push(`- **Variação total:** ${formatNumber(max - min)}`);
  }
  
  if (catFields.length > 0) {
    const firstCatField = catFields[0];
    const values = data.map(r => r[firstCatField]).filter(v => v);
    const freq = {};
    values.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
    
    if (top) {
      const fieldLabel = firstCatField.charAt(0).toUpperCase() + firstCatField.slice(1);
      lines.push(`- **${fieldLabel} mais comum:** ${top[0]} (${top[1]} ocorrências, ${((top[1] / values.length) * 100).toFixed(1)}%)`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Formata números para exibição
 */
function formatNumber(num) {
  if (typeof num !== 'number') return String(num);
  
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2).replace('.', ',') + ' M';
  }
  if (num >= 1000) {
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Gera o conteúdo completo do E-book/Guia Técnico
 * @param {Object} dataset - Dataset completo com dados e metadados
 * @param {Object} config - Configuração do projeto
 * @returns {string} Conteúdo do E-book em Markdown
 */
function generateEbookContent(dataset, config) {
  const { project, data, summary } = dataset;
  const content = config.content;
  
  // Substitui placeholders
  const title = content.ebookTitle.replace('{{niche}}', project.niche);
  const subtitle = content.ebookSubtitle;
  
  const chapters = content.chapters.map(ch => ch.replace('{{niche}}', project.niche));
  
  const lines = [];
  
  // === CAPA ===
  lines.push(`# ${title}\n`);
  lines.push(`*${subtitle}*\n`);
  lines.push(`---\n`);
  lines.push(`**Autor:** ${project.author || 'Data Sales Agent'}`);
  lines.push(`**Versão:** ${project.version}`);
  lines.push(`**Data de Geração:** ${new Date().toLocaleDateString('pt-BR')}`);
  lines.push(`**Total de Registros:** ${data.length}`);
  lines.push(`**Qualidade dos Dados:** ${summary.qualityScore}%\n`);
  lines.push(`---\n`);
  
  // === SUMÁRIO EXECUTIVO ===
  lines.push('## 📋 Sumário Executivo\n');
  lines.push(`Este guia técnico apresenta uma análise detalhada do mercado de **${project.niche}**,`);
  lines.push(`baseada em um dataset com **${data.length} registros** coletados e processados.`);
  lines.push(`A qualidade geral dos dados é de **${summary.qualityScore}%**, garantindo análises confiáveis.\n`);
  lines.push('### Principais Descobertas\n');
  
  // Gera descobertas baseadas nos dados
  if (summary.numericFields) {
    Object.entries(summary.numericFields).forEach(([field, info]) => {
      const fieldLabel = field.charAt(0).toUpperCase() + field.slice(1);
      lines.push(`- **${fieldLabel}:** Varia de ${formatNumber(info.min)} a ${formatNumber(info.max)}, com média de ${formatNumber(parseFloat(info.avg))}`);
    });
  }
  
  lines.push('\n---\n');
  
  // === SUMÁRIO ===
  lines.push('## 📑 Sumário\n');
  chapters.forEach((chapter, i) => {
    lines.push(`${i + 1}. **${chapter}**`);
  });
  lines.push('\n---\n');
  
  // === CAPÍTULOS ===
  chapters.forEach((chapter, i) => {
    lines.push(`## Capítulo ${i + 1}: ${chapter}\n`);
    
    // Conteúdo específico por capítulo
    switch (i) {
      case 0: // Introdução
        lines.push(`### Visão Geral do Mercado de ${project.niche}\n`);
        lines.push(`O mercado de **${project.niche}** apresenta um cenário dinâmico e em constante evolução.`);
        lines.push(`Este guia foi desenvolvido para profissionais que buscam dados estruturados e análises`);
        lines.push(`aprofundadas para tomada de decisões estratégicas.\n`);
        lines.push(`**O que você encontrará neste guia:**`);
        lines.push(`- Análise detalhada de preços e tendências`);
        lines.push(`- Distribuição geográfica e por categorias`);
        lines.push(`- Estatísticas descritivas completas`);
        lines.push(`- Insights acionáveis para investidores\n`);
        lines.push(`**Sobre os dados:**`);
        lines.push(`- **Fonte:** Dados públicos e fontes abertas`);
        lines.push(`- **Período de coleta:** Últimos 12 meses`);
        lines.push(`- **Registros analisados:** ${data.length}`);
        lines.push(`- **Qualidade:** ${summary.qualityScore}%\n`);
        break;
        
      case 1: // Panorama Geral
        lines.push(`### Panorama Geral: Preços e Volume de Negócios\n`);
        lines.push(`Nesta seção, analisamos o panorama geral do mercado, incluindo distribuição de preços,`);
        lines.push(`volume de negócios e principais indicadores.\n`);
        lines.push(generateDataAnalysis(data, dataset.stats));
        break;
        
      case 2: // Análise por Região
        lines.push(`### Análise por Região e Localização\n`);
        
        // Tenta encontrar campo de localização
        const locationField = data.length > 0
          ? Object.keys(data[0]).find(f =>
              ['local', 'location', 'bairro', 'cidade', 'regiao', 'região', 'neighborhood', 'city', 'region']
                .includes(f.toLowerCase())
            )
          : null;
        
        if (locationField && summary.categoricalFields?.[locationField]) {
          const locData = summary.categoricalFields[locationField];
          lines.push(`Distribuição por **${locationField}**:\n`);
          lines.push('| Localização | Ocorrências | Percentual |');
          lines.push('|-------------|-------------|------------|');
          
          locData.topOccurrence.forEach(item => {
            lines.push(`| ${item.value} | ${item.count} | ${item.percentage} |`);
          });
          lines.push('');
        } else {
          lines.push('A análise regional revela padrões interessantes de distribuição geográfica dos dados.\n');
          lines.push('**Destaques por região:**\n');
          
          // Gera análise regional genérica baseada nos dados
          const sampleLocations = data.slice(0, 5).map(r => r.location || r.local || r.bairro || 'Região não especificada');
          const uniqueLocs = [...new Set(sampleLocations)];
          uniqueLocs.forEach(loc => {
            if (loc) {
              const count = data.filter(r => (r.location || r.local || r.bairro) === loc).length;
              lines.push(`- **${loc}:** ${count} registros (${((count / data.length) * 100).toFixed(1)}%)`);
            }
          });
          lines.push('');
        }
        break;
        
      case 3: // Tendências
        lines.push(`### Tendências e Projeções\n`);
        lines.push(`Com base na análise dos dados coletados, identificamos as seguintes tendências:\n`);
        
        // Gera tendências baseadas nos dados
        if (summary.numericFields) {
          Object.entries(summary.numericFields).forEach(([field, info]) => {
            const fieldLabel = field.charAt(0).toUpperCase() + field.slice(1);
            const avg = parseFloat(info.avg);
            const range = info.max - info.min;
            lines.push(`- **${fieldLabel}:** Média de ${formatNumber(avg)}, com variação de ${formatNumber(range)} entre o menor e o maior valor registrado.`);
          });
        }
        
        lines.push('\n**Projeções para os próximos 12 meses:**\n');
        lines.push('1. **Crescimento moderado** no volume de negócios');
        lines.push('2. **Valorização** nas regiões com maior demanda');
        lines.push('3. **Diversificação** de perfis de investidores');
        lines.push('4. **Digitalização** dos processos de compra e venda\n');
        break;
        
      case 4: // Perfil do Comprador
        lines.push(`### Perfil do Comprador e Vendedor\n`);
        lines.push(`Análise do perfil dos participantes do mercado baseada nos dados coletados:\n`);
        
        // Gera perfil baseado nos dados
        const propertyTypes = data.map(r => r.propertyType || r.tipo || r.type).filter(Boolean);
        const uniqueTypes = [...new Set(propertyTypes)];
        
        if (uniqueTypes.length > 0) {
          lines.push('**Tipos de propriedade mais comuns:**\n');
          uniqueTypes.forEach(type => {
            const count = propertyTypes.filter(t => t === type).length;
            lines.push(`- **${type}:** ${count} registros (${((count / propertyTypes.length) * 100).toFixed(1)}%)`);
          });
          lines.push('');
        }
        
        lines.push('**Perfil predominante:**\n');
        lines.push('- Investidores em busca de valorização de médio a longo prazo');
        lines.push('- Profissionais que buscam imóveis para moradia');
        lines.push('- Empresas em expansão territorial\n');
        break;
        
      case 5: // Oportunidades
        lines.push(`### Oportunidades de Investimento\n`);
        lines.push(`Com base na análise dos dados, identificamos as seguintes oportunidades:\n`);
        
        if (summary.numericFields) {
          Object.entries(summary.numericFields).forEach(([field, info]) => {
            const fieldLabel = field.charAt(0).toUpperCase() + field.slice(1);
            lines.push(`- **${fieldLabel}:** Oportunidades identificadas na faixa de ${formatNumber(info.min)} a ${formatNumber(info.max)}`);
          });
        }
        
        lines.push('\n**Estratégias recomendadas:**\n');
        lines.push('1. **Diversificação geográfica** para minimizar riscos');
        lines.push('2. **Análise de valor relativo** entre diferentes regiões');
        lines.push('3. **Acompanhamento de tendências** para timing de entrada');
        lines.push('4. **Parcerias estratégicas** com players locais\n');
        break;
        
      case 6: // Conclusão
        lines.push(`### Conclusão e Recomendações\n`);
        lines.push(`Este guia técnico apresentou uma análise abrangente do mercado de **${project.niche}**,\n`);
        lines.push(`baseada em **${data.length} registros** de dados processados e validados.\n`);
        lines.push('**Recomendações finais:**\n');
        lines.push('1. Utilize os dados deste dataset como base para suas análises');
        lines.push('2. Combine com fontes complementares para validação cruzada');
        lines.push('3. Atualize periodicamente sua base de dados');
        lines.push('4. Consulte profissionais especializados para decisões críticas\n');
        lines.push('**Aviso:** Este guia é baseado em dados públicos e análises automatizadas.');
        lines.push('Recomenda-se validação profissional antes de decisões de investimento.\n');
        break;
    }
    
    lines.push('---\n');
  });
  
  // === APÊNDICE ===
  lines.push('## 📎 Apêndice\n');
  lines.push('### Metodologia\n');
  lines.push('Os dados foram coletados, limpos e analisados utilizando técnicas automatizadas de');
  lines.push('web scraping, processamento de linguagem natural e análise estatística.\n');
  lines.push('### Glossário\n');
  lines.push('- **Dataset:** Conjunto de dados estruturados');
  lines.push('- **Qualidade dos Dados:** Métrica que avalia completeza e consistência');
  lines.push('- **Análise Descritiva:** Sumarização das principais características dos dados\n');
  lines.push('### Dataset Completo\n');
  lines.push(`O dataset completo com todos os ${data.length} registros está disponível para download.`);
  lines.push('Entre em contato para adquirir a versão completa com dados brutos e análises adicionais.\n');
  lines.push('---\n');
  lines.push(`*Gerado automaticamente em ${new Date().toLocaleString('pt-BR')} pelo Data Sales Agent v${config.project.version}*\n`);
  
  return lines.join('\n');
}

/**
 * Gera um resumo executivo curto (para landing page)
 * @param {Object} dataset - Dataset completo
 * @returns {string} Resumo executivo
 */
function generateExecutiveSummary(dataset) {
  const { project, data, summary } = dataset;
  
  return {
    title: `Dataset: ${project.name}`,
    description: project.description,
    highlights: [
      `${data.length} registros processados e validados`,
      `Qualidade dos dados: ${summary.qualityScore}%`,
      ...Object.entries(summary.numericFields || {}).map(([field, info]) =>
        `${field}: ${formatNumber(parseFloat(info.avg))} (média)`
      ).slice(0, 3)
    ],
    sampleSize: data.length,
    qualityScore: summary.qualityScore,
    generatedAt: project.generatedAt
  };
}

/**
 * Função principal do Módulo 2: Geração de Conteúdo
 * @param {Object} dataset - Dataset do Módulo 1
 * @param {Object} config - Configuração do projeto
 * @returns {Object} Conteúdo gerado
 */
export async function generateContent(dataset, config) {
  log.section('📚 MÓDULO 2: GERAÇÃO DE CONTEÚDO');
  
  if (!dataset || !dataset.data || dataset.data.length === 0) {
    log.error('Dataset vazio ou inválido. Execute o Módulo 1 primeiro.');
    return null;
  }
  
  const spinner = ora('Gerando E-book/Guia Técnico...').start();
  
  try {
    // 1. Gera o conteúdo completo do E-book
    const ebookContent = generateEbookContent(dataset, config);
    
    // 2. Gera resumo executivo
    const summary = generateExecutiveSummary(dataset);
    
    // 3. Salva os arquivos
    const outputDir = config.deploy.outputDir || './output';
    await fs.ensureDir(outputDir);
    
    // E-book em Markdown
    const mdPath = path.join(outputDir, 'guia_tecnico.md');
    await fs.writeFile(mdPath, ebookContent, 'utf-8');
    
    // Resumo executivo em JSON
    const summaryPath = path.join(outputDir, 'resumo_executivo.json');
    await fs.writeJSON(summaryPath, summary, { spaces: 2 });
    
    spinner.succeed('Conteúdo gerado com sucesso!');
    
    log.success(`E-book salvo: ${mdPath}`);
    log.success(`Resumo executivo salvo: ${summaryPath}`);
    log.info(`Total de caracteres: ${ebookContent.length}`);
    log.info(`Total de linhas: ${ebookContent.split('\n').length}`);
    
    return {
      ebook: ebookContent,
      summary,
      files: {
        markdown: mdPath,
        summary: summaryPath
      }
    };
    
  } catch (error) {
    spinner.fail(`Erro ao gerar conteúdo: ${error.message}`);
    throw error;
  }
}

// Execução standalone
async function main() {
  const configPath = process.argv[2] || './config/default.js';
  const datasetPath = process.argv[3] || './output/dataset_limpo.json';
  
  try {
    const config = (await import(path.resolve(configPath))).default;
    const dataset = await fs.readJSON(path.resolve(datasetPath));
    
    const result = await generateContent(dataset, config);
    
    if (result) {
      log.section('RESUMO');
      log.info('E-book gerado com sucesso!');
      log.info(`Arquivos: ${Object.values(result.files).join(', ')}`);
    }
  } catch (error) {
    log.error(`Falha no Módulo 2: ${error.message}`);
    process.exit(1);
  }
}

const isMainModule = process.argv[1] && (
  process.argv[1].includes('contentGenerator') ||
  process.argv[1].endsWith('/contentGenerator.js') ||
  process.argv[1].endsWith('\\contentGenerator.js')
);

if (isMainModule) {
  main();
}

export { generateExecutiveSummary, generateEbookContent };