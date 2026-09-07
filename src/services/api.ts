import { FechamentoCulto } from '../types';
import { GoogleGenAI } from '@google/genai';

/**
 * Função utilitária para higienização e correção ortográfica de termos da ata eclesiástica.
 */
function sanitizeReport(text: string): string {
  if (!text) return '';
  return text
    .replace(/Exgressamos/gi, 'Expressamos')
    .replace(/Orientação Auditiva/gi, 'Orientação de Auditoria')
    .replace(/Orientacao Auditiva/gi, 'Orientação de Auditoria')
    .replace(/orientação auditiva/gi, 'orientação de auditoria')
    .replace(/orientacao auditiva/gi, 'orientação de auditoria')
    .replace(/inconsciência/gi, 'inconsistência')
    .replace(/inconsciencia/gi, 'inconsistência')
    .replace(/Inconsciência/gi, 'Inconsistência')
    .replace(/Inconsciencia/gi, 'Inconsistência')
    .replace(/aplicarRepasseMatriz:\s*true/gi, 'Repasse à Matriz: Ativo')
    .replace(/aplicarRepasseMatriz:\s*false/gi, 'Repasse à Matriz: Isento')
    .replace(/aplicarPrebenda:\s*true/gi, 'Prebenda Pastoral: Ativa')
    .replace(/aplicarPrebenda:\s*false/gi, 'Prebenda Pastoral: Não Aplicada')
    .replace(/\bTesoureiro Responsável\b/gi, 'Tesoureiro(a) Responsável')
    .replace(/\bPastor Responsável\b/gi, 'Pastor(a) Responsável')
    .replace(/\bPastor Local\b/gi, 'Pastor(a) Local')
    .replace(/\bPastor Presidente\b/gi, 'Pastor(a) Presidente');
}

/**
 * Monta o prompt detalhado para a auditoria do caixa da igreja com IA.
 * Padrão visual: LIMPO, EXECUTIVO, DIRETO e SEM POLUIÇÃO.
 */
function buildAuditPrompt(fechamentoData: any): string {
  const resumoCalc = fechamentoData.resumoCalculado;
  const tipoBase = fechamentoData.tipoBaseRepasseMatriz || 'todas';
  const catsRepasse = fechamentoData.categoriasRepasseMatriz || [];
  const aplicarRepasse = fechamentoData.aplicarRepasseMatriz !== false;
  const pctMatriz = fechamentoData.porcentagemMatriz ?? 20;

  const rotuloBase = resumoCalc?.rotuloBaseMatriz || (
    tipoBase === 'todas' || catsRepasse.length === 0 || catsRepasse.length >= 6
      ? 'Toda a Entrada'
      : catsRepasse.length === 1 && catsRepasse[0] === 'dizimo'
      ? 'Somente Dízimos'
      : catsRepasse.join(' + ')
  );

  return `
Você é um auditor fiscal de tesouraria de igrejas cristãs experiente, zeloso, ético e transparente.
Elabore um **Relatório Oficial da Tesouraria da Igreja** com padrão visual LIMPO, EXECUTIVO, DIRETO e SEM POLUIÇÃO visual.

DADOS BRUTOS DO FECHAMENTO:
${JSON.stringify(fechamentoData, null, 2)}

DIRETRIZES FUNDAMENTAIS DE FORMATAÇÃO E APRESENTAÇÃO (ESTRITAMENTE OBRIGATÓRIAS):
1. **NUNCA EXIBA NOMES DE VARIÁVEIS DE CÓDIGO OU BOOLEANOS BRUTOS**:
   - NUNCA escreva expressões como 'aplicarRepasseMatriz: true', 'aplicarPrebenda: false', 'fechamentoData', 'null' ou 'undefined'.
   - Escreva sempre em linguagem formal e natural:
     * Para repasse à sede: "Repasse à Matriz: Ativo (${pctMatriz}%) - Valor: R$ X,XX" ou "Repasse à Matriz: Isento / Não Aplicável".
     * Para prebenda pastoral: "Prebenda Pastoral: Ativa (X%) - Valor: R$ Y,YY" ou "Prebenda Pastoral: Não Aplicada".

2. **EXCLUSÃO COMPLETA DE ENTRADAS ISENTAS / FILTRAGEM STRICT**:
   - O relatório e a ATA devem incluir APENAS as categorias de entrada ativamente marcadas como base para 'Repasse à Matriz' ou 'Prebenda Pastoral' (ex: se apenas 'Dízimo' estiver marcado para repasse/prebenda, exiba exclusivamente os Dízimos e omita Ofertas, Doações e Outras Entradas do documento).
   - REMOVA TOTALMENTE e NUNCA crie a seção 'Outras Arrecadações (Sem Repasse)' nem qualquer referência a entradas que não fazem parte do cálculo do repasse ou da prebenda.
   - O valor de 'Total de Entradas' no relatório DEVE ser rigorosamente igual à soma das entradas sujeitas ao repasse/prebenda.

3. **DETALHAMENTO CLARO DA FÓRMULA DO REPASSE E GARANTIA MATEMÁTICA**:
   - Exiba a fórmula de forma explícita na síntese de fechamento:
     * **Base de Cálculo Matriz (${rotuloBase}): R$ XXX,XX**
     * **(-) Repasse Matriz (${pctMatriz}%): -R$ XXX,XX**
   - GARANTIA MATEMÁTICA: O Repasse Matriz DEVE ser calculado aplicando a porcentagem (${pctMatriz}%) RIGOROSAMENTE sobre o valor da Base de Cálculo Matriz (${rotuloBase}).

4. **NUNCA EXIBA FÓRMULAS MATEMÁTICAS EM CÓDIGO LATEX OU CONTAGEM UNITÁRIA DE NOTAS**:
   - NÃO utilize blocos LaTeX ($$...$$).
   - NUNCA detalhe nota por nota ou moeda por moeda de troco (ex: "10 x R$ 50 + 4 x R$ 20...").
   - Mostre apenas a síntese consolidada direta:
     "Total Físico Apurado: R$ 727,40 (Cédulas: R$ 724,00 | Moedas: R$ 3,40)".

5. **TABELAS DE RECEITAS E DESPESAS ENXUTAS (FILTRO > R$ 0,00)**:
   - Exiba nas tabelas EXCLUSIVAMENTE as categorias e itens sujeitos a repasse/prebenda que tiveram movimentação superior a R$ 0,00.
   - OCULTE E NUNCA exiba linhas com valor zerado (R$ 0,00).
   - Se houver nomes de dizimistas informados, relacione-os sucintamente com nome, forma e valor.
   - Liste as despesas com sua respectiva categoria e descrição somente se valor > 0.

6. **FLUXO LIMPO DE LEITURA**:
   - Exiba apenas:
     * Entradas Sujeitas a Repasse/Prebenda (Relação e Nomes)
     * Total de Entradas (rigorosamente a soma das categorias sujeitas)
     * (-) Saídas / Despesas Efetivadas (com discriminação)
     * Saldo Líquido Operacional (Entradas Sujeitas - Saídas)
     * (-) Repasse para Matriz / Prebenda Pastoral
     * Saldo Final Disponível em Caixa Local

ESTRUTURA DO RELATÓRIO (DIVIDIDO ESTRITAMENTE EM 4 BLOCOS OBJETIVOS):

### 1. Cabeçalho e Resumo Financeiro
- Título: Relatório Oficial de Fechamento de Caixa
- Igreja: ${fechamentoData.nomeIgreja || 'ABS CHURCH'}
- Período: ${fechamentoData.dataInicio || fechamentoData.data || 'Data Inicial'} a ${fechamentoData.dataFim || fechamentoData.data || 'Data Final'}

#### Entradas Sujeitas a Repasse/Prebenda (${rotuloBase})
[Tabela com apenas as categorias ativamente sujeitas a repasse/prebenda. Se houver dizimistas identificados, listar sucintamente com nome e valor]
- **Total de Entradas: R$ XXX,XX** (Soma estrita das categorias sujeitas a repasse/prebenda)

#### Saídas / Despesas Efetivadas
[Tabela enxuta de saídas > 0 com discriminação detalhada]
- **Total de Saídas: -R$ XXX,XX**

- Resumo agrupado das Formas de Pagamento (Dinheiro | Pix | Cartão/Transf.)

#### Síntese e Fechamento de Caixa
- Saldo Líquido Operacional (Entradas - Saídas): R$ XXX,XX
${aplicarRepasse ? `- Base de Cálculo Matriz (${rotuloBase}): R$ XXX,XX\n- (-) Repasse Matriz (${pctMatriz}%): -R$ XXX,XX` : '- Repasse Matriz: Isento / Não Aplicável (R$ 0,00)'}
- Prebenda Pastoral (se ativa, percentual e valor; se desativada, omitir ou informar não aplicada)
- **Saldo Final Disponível em Caixa Local: R$ XXX,XX**

### 2. Apuração do Caixa Físico
- Comparativo direto entre Lançado no Sistema x Contado na Tesouraria:
  * Total Lançado em Dinheiro (Espécie)
  * Total Físico Apurado na Contagem (Cédulas + Moedas consolidadas)
  * Resultado da Conferência: Conclusão direta (Caixa Exato / Sobra de R$ X,XX / Inconsistência de Falta de R$ X,XX).

### 3. Parecer Sintético e Recomendações
- Parecer conciso de auditoria avaliando a integridade dos lançamentos, regularidade das deduções e saúde financeira da igreja.
- Recomendações pontuais e diretas de governança.
- Conclusão com a expressão formal: "Expressamos nossa gratidão pela fidelidade dos membros e pelo zelo na administração dos recursos." (NUNCA utilize 'Exgressamos', 'Orientação Auditiva' ou 'inconsciência').

### 4. Assinaturas
- Bloco de Assinaturas Obrigatório:
  * Tesoureiro(a) Responsável: ${fechamentoData.tesoureiro || 'Tesoureiro(a) Responsável'}
  * Pastor(a) Local: ${fechamentoData.pastorLocal || fechamentoData.pastorName || 'Pastor(a) Local'}
  * Pastor(a) Presidente: ${fechamentoData.pastorPresidente || 'Pastor(a) Presidente'}

Formatação do Bloco (exiba os campos organizados com linha de assinatura e nomes centralizados/alinhados exatamente assim ao final):

__________________________________________
${fechamentoData.tesoureiro || 'Tesoureiro(a) Responsável'}
Tesoureiro(a) Responsável

__________________________________________
${fechamentoData.pastorLocal || fechamentoData.pastorName || 'Pastor(a) Local'}
Pastor(a) Local

__________________________________________
${fechamentoData.pastorPresidente || 'Pastor(a) Presidente'}
Pastor(a) Presidente

(Sem repetição de cabeçalho ou dados redundantes).

Responda em Português do Brasil com excelente clareza, rigor gramatical e formatação limpa e executiva em Markdown.
`;
}

const FRIENDLY_HIGH_DEMAND_MESSAGE =
  "O servidor da Inteligência Artificial está temporariamente instável devido a alta demanda do Google. Por favor, aguarde alguns instantes e clique em 'Gerar Relatório Completo' novamente.";

function isHighDemandOrTransient(errorMsg: string, status?: number): boolean {
  if (!errorMsg && !status) return false;
  const s = String(errorMsg || '').toLowerCase();
  return (
    status === 503 ||
    status === 429 ||
    status === 502 ||
    status === 504 ||
    s.includes('503') ||
    s.includes('429') ||
    s.includes('unavailable') ||
    s.includes('high demand') ||
    s.includes('alta demanda') ||
    s.includes('overloaded') ||
    s.includes('temporariamente instável') ||
    s.includes('resource_exhausted') ||
    s.includes('rate limit')
  );
}

/**
 * Gera o relatório de tesouraria utilizando o backend ou a chave client-side Gemini como fallback seguro.
 * Aplica re-tentativas automáticas, troca dinâmica de modelos e mensagem amigável em português.
 */
export async function generateChurchReport(fechamentoData: FechamentoCulto): Promise<string> {
  let backendError: string | null = null;
  let isBackendHighDemand = false;

  // 1. Tenta gerar via rota do backend (/api/gemini/church-report)
  try {
    const res = await fetch('/api/gemini/church-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fechamentoData }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.report) {
        return sanitizeReport(data.report);
      }
    } else {
      const errorData = await res.json().catch(() => ({}));
      const rawError = errorData.error || `Erro HTTP ${res.status} do servidor.`;
      if (isHighDemandOrTransient(rawError, res.status)) {
        isBackendHighDemand = true;
        backendError = FRIENDLY_HIGH_DEMAND_MESSAGE;
      } else {
        backendError = rawError;
      }
    }
  } catch (err: any) {
    const msg = err?.message || '';
    if (isHighDemandOrTransient(msg)) {
      isBackendHighDemand = true;
      backendError = FRIENDLY_HIGH_DEMAND_MESSAGE;
    } else {
      backendError = msg || 'Erro de conexão com o servidor local.';
    }
  }

  // Se o backend já tentou os retries e esgotou devido à alta demanda do Google,
  // repassamos a mensagem amigável imediatamente para o usuário.
  if (isBackendHighDemand) {
    throw new Error(FRIENDLY_HIGH_DEMAND_MESSAGE);
  }

  // 2. Fallback: Se o backend não respondeu ou reportou erro de chave, tenta client-side com VITE_GEMINI_API_KEY
  const clientApiKey =
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined) ||
    '';

  if (clientApiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey: clientApiKey,
      });

      const clientEnvModel = (import.meta as any).env?.VITE_GEMINI_MODEL?.trim();
      const validClientEnvModel =
        clientEnvModel && !['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash-8b', 'gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-3.6-flash'].includes(clientEnvModel)
          ? clientEnvModel
          : null;

      const modelsToTry = [
        validClientEnvModel,
        'gemini-3.1-flash-lite',
        'gemini-flash-latest',
        'gemini-3.8-flash',
      ].filter(Boolean) as string[];
      let clientLastError: any = null;

      for (const model of modelsToTry) {
        const retries = 2;
        for (let i = 0; i < retries; i++) {
          try {
            console.log(`[Gemini Client] Tentando modelo ${model} (tentativa ${i + 1}/${retries})...`);
            const response = await ai.models.generateContent({
              model,
              contents: buildAuditPrompt(fechamentoData),
              config: {
                systemInstruction:
                  "Você é um auditor e assistente financeiro especializado em tesouraria de igrejas evangélicas e cristãs. Use sempre os termos corretos em português: 'Expressamos', 'Orientação de Auditoria', 'inconsistência'.",
                temperature: 0.2,
              },
            });

            const text = response.text || '';
            if (text) {
              return sanitizeReport(text);
            }
          } catch (err: any) {
            clientLastError = err;
            const errMsg = String(err?.message || '');
            const is404 =
              err?.status === 404 ||
              err?.statusCode === 404 ||
              errMsg.includes('404') ||
              errMsg.toLowerCase().includes('not found');
            if (is404) {
              console.warn(`[Gemini Client] Modelo '${model}' não encontrado (404). Alternando para próximo modelo.`);
              break;
            }
            if (i < retries - 1 && isHighDemandOrTransient(errMsg)) {
              await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
            } else {
              break; // Passa para o próximo modelo se esgotar ou não for transitório
            }
          }
        }
      }

      if (clientLastError) {
        const msg = String(clientLastError?.message || '');
        if (isHighDemandOrTransient(msg)) {
          throw new Error(FRIENDLY_HIGH_DEMAND_MESSAGE);
        }
        if (msg.includes('API_KEY_INVALID') || msg.includes('401') || msg.includes('403')) {
          throw new Error('Chave de API do Gemini inválida ou não autorizada. Verifique a chave configurada.');
        }
        throw new Error(`Falha ao comunicar com o Gemini: ${msg}`);
      }
    } catch (clientErr: any) {
      console.error('Erro na chamada client-side do Gemini:', clientErr);
      const msg = String(clientErr?.message || '');
      if (isHighDemandOrTransient(msg)) {
        throw new Error(FRIENDLY_HIGH_DEMAND_MESSAGE);
      }
      throw clientErr;
    }
  }

  // 3. Se nenhuma chave estiver disponível e o backend falhou
  if (backendError) {
    if (backendError.includes('GEMINI_API_KEY não configurada') || backendError.includes('não configurada')) {
      throw new Error('Chave de API do Gemini não configurada. Defina a variável VITE_GEMINI_API_KEY ou GEMINI_API_KEY.');
    }
    if (backendError.includes('Failed to fetch') || backendError.includes('NetworkError')) {
      throw new Error('Erro de conexão: não foi possível conectar ao serviço de IA.');
    }
    throw new Error(backendError);
  }

  throw new Error('Chave de API do Gemini não configurada no ambiente.');
}
