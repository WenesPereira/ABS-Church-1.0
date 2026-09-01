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
    .replace(/aplicarPrebenda:\s*false/gi, 'Prebenda Pastoral: Não Aplicada');
}

/**
 * Monta o prompt detalhado para a auditoria do caixa da igreja com IA.
 * Padrão visual: LIMPO, EXECUTIVO, DIRETO e SEM POLUIÇÃO.
 */
function buildAuditPrompt(fechamentoData: FechamentoCulto): string {
  return `
Você é um auditor fiscal de tesouraria de igrejas cristãs experiente, zeloso, ético e transparente.
Elabore um **Relatório Oficial da Tesouraria da Igreja** com padrão visual LIMPO, EXECUTIVO, DIRETO e SEM POLUIÇÃO visual.

DADOS BRUTOS DO FECHAMENTO:
${JSON.stringify(fechamentoData, null, 2)}

DIRETRIZES FUNDAMENTAIS DE FORMATAÇÃO E APRESENTAÇÃO (ESTRITAMENTE OBRIGATÓRIAS):
1. **NUNCA EXIBA NOMES DE VARIÁVEIS DE CÓDIGO OU BOOLEANOS BRUTOS**:
   - NUNCA escreva expressões como 'aplicarRepasseMatriz: true', 'aplicarPrebenda: false', 'fechamentoData', 'null' ou 'undefined'.
   - Escreva sempre em linguagem formal e natural:
     * Para repasse à sede: "Repasse à Matriz: Ativo (50%) - Valor: R$ X,XX" ou "Repasse à Matriz: Isento / Não Aplicável".
     * Para prebenda pastoral: "Prebenda Pastoral: Ativa (X%) - Valor: R$ Y,YY" ou "Prebenda Pastoral: Não Aplicada".

2. **NUNCA EXIBA FÓRMULAS MATEMÁTICAS EM CÓDIGO LATEX OU CONTAGEM UNITÁRIA DE NOTAS**:
   - NÃO utilize blocos LaTeX ($$...$$).
   - NUNCA detalhe nota por nota ou moeda por moeda de troco (ex: "10 x R$ 50 + 4 x R$ 20...").
   - Mostre apenas a síntese consolidada direta:
     "Total Físico Apurado: R$ 727,40 (Cédulas: R$ 724,00 | Moedas: R$ 3,40)".

3. **TABELAS DE RECEITAS E DESPESAS ENXUTAS (FILTRO > R$ 0,00)**:
   - Exiba nas tabelas EXCLUSIVAMENTE as categorias e itens que tiveram movimentação superior a R$ 0,00.
   - OCULTE E NUNCA exiba linhas com valor zerado (R$ 0,00).
   - Se houver nomes de dizimistas informados, relacione-os sucintamente com nome, forma e valor.
   - Liste as despesas com sua respectiva categoria e descrição somente se valor > 0.

4. **FORMAS DE PAGAMENTO AGRUPADAS**:
   - Agrupe as formas de pagamento em um resumo direto (ex: Dinheiro/Espécie: R$ X,XX | Pix: R$ Y,YY | Cartão/Transferência: R$ Z,ZZ) em vez de criar tópicos extensos.

ESTRUTURA DO RELATÓRIO (DIVIDIDO ESTRITAMENTE EM 4 BLOCOS OBJETIVOS):

### 1. Cabeçalho e Resumo Financeiro
- Título: Relatório Oficial de Fechamento de Caixa
- Igreja: ${fechamentoData.nomeIgreja || 'ABS CHURCH'}
- Período: ${fechamentoData.dataInicio || fechamentoData.data || 'Data Inicial'} a ${fechamentoData.dataFim || fechamentoData.data || 'Data Final'}
- Tabela enxuta de Entradas (apenas itens > R$ 0,00)
- Tabela enxuta de Saídas / Despesas (apenas itens > R$ 0,00)
- Resumo agrupado das Formas de Pagamento
- Totais Consolidados:
  * Total de Entradas
  * Total de Saídas
  * Repasse à Matriz (Percentual e Valor, ou "Isento")
  * Prebenda Pastoral (Percentual e Valor, ou "Não Aplicada")
  * **Saldo Final Disponível em Caixa Local**

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
- Linhas de assinatura para:
  * **Tesoureiro Responsável**: ${fechamentoData.tesoureiro || 'Tesoureiro'}
  * **Pastor Responsável**: ${fechamentoData.pastorName || fechamentoData.pastorLocal || fechamentoData.pastorPresidente || 'Pastor Titular'}
(Sem repetição de cabeçalho ou dados redundantes).

Responda em Português do Brasil com excelente clareza, rigor gramatical e formatação limpa e executiva em Markdown.
`;
}

/**
 * Gera o relatório de tesouraria utilizando o backend ou a chave client-side Gemini como fallback seguro.
 */
export async function generateChurchReport(fechamentoData: FechamentoCulto): Promise<string> {
  let backendError: string | null = null;

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
      backendError = errorData.error || `Erro HTTP ${res.status} do servidor.`;
    }
  } catch (err: any) {
    backendError = err?.message || 'Erro de conexão com o servidor local.';
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

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
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
    } catch (clientErr: any) {
      console.error('Erro na chamada client-side do Gemini:', clientErr);
      const msg = String(clientErr?.message || '');

      if (msg.includes('API_KEY_INVALID') || msg.includes('401') || msg.includes('403')) {
        throw new Error('Chave de API do Gemini inválida ou não autorizada. Verifique a chave configurada.');
      }
      if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        throw new Error('Limite de requisições do Gemini atingido temporariamente. Aguarde alguns segundos.');
      }
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('CORS')) {
        throw new Error('Erro de conexão ou CORS ao contatar a API do Gemini. Verifique sua conexão com a internet.');
      }

      throw new Error(`Falha ao comunicar com o Gemini: ${msg}`);
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
