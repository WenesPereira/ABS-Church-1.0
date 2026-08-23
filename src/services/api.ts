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
    .replace(/Inconsciencia/gi, 'Inconsistência');
}

/**
 * Monta o prompt detalhado para a auditoria do caixa da igreja com IA.
 */
function buildAuditPrompt(fechamentoData: FechamentoCulto): string {
  return `
Você é um auditor fiscal de tesouraria de igrejas cristãs experiente, zeloso, ético e transparente.
Analise os seguintes dados do fechamento de caixa do culto e elabore um **Relatório Oficial da Tesouraria da Igreja** bem formatado em Markdown, pronto para ser lido no culto administrativo ou apresentado ao Pastor Presidente e Conselho Fiscal.

DADOS DO CULTO E FECHAMENTO:
${JSON.stringify(fechamentoData, null, 2)}

INSTRUÇÕES DETALHADAS DO RELATÓRIO:
1. **Cabeçalho Formal**: Nome da Igreja, Período do Fechamento de Caixa (Data Inicial até Data Final), Pastor Presidente, Pastor Local e Tesoureiro Responsável.
2. **Resumo Financeiro Executivo**:
   - Total Arrecadado em Dízimos
   - **Relação de Dizimistas (Discriminação)**: Se houver nomes de dizimistas informados nos lançamentos, inclua a lista com os nomes dos dizimistas, forma de pagamento e valor individual.
   - Total Arrecadado em Ofertas (Oferta Geral do Culto, Missões, Ofertas Especiais e Doações)
   - Distribuição por Forma de Pagamento (Espécie/Dinheiro, Pix, Cartão/Transferência)
   - **Discriminação Detalhada de Cada Saída/Despesa**: Liste obrigatoriamente cada saída realizada com sua categoria exata e descrição (ex: Conta de Água, Conta de Luz, Internet, Alimentação/Lanche, Aluguel do Templo, Manutenção, etc.) e o respectivo valor.
   - Total Geral de Saídas / Despesas
   - **Saldo Líquido Operacional do Caixa** (Entradas - Saídas)
   - **Repasse para a Matriz / Sede**: 
     - Se 'aplicarRepasseMatriz' for verdadeiro (true), destaque a porcentagem configurada (ex: ${fechamentoData.porcentagemMatriz || 20}%), a base de cálculo e o valor exato a ser enviado para a Matriz/Sede.
     - Se 'aplicarRepasseMatriz' for falso (false), declare expressamente que o fechamento é isento de repasse à Matriz.
   - **Prebenda Pastoral / Proventos Ministeriais**:
     - Se 'aplicarPrebenda' for verdadeiro (true), discrimine expressamente a porcentagem da Prebenda Pastoral (ex: ${fechamentoData.porcentagemPrebenda || 0}%), o valor calculado da dedução pastoral e o pastor titular/local beneficiário (${fechamentoData.pastorLocal || fechamentoData.pastorPresidente || 'Pastor Titular'}).
     - Se 'aplicarPrebenda' for falso (false), informe que não houve dedução de prebenda pastoral neste período.
   - **Saldo Disponível em Caixa Local**:
     - Apresente claramente a fórmula oficial e o resultado final:
       **[Saldo Disponível = Entradas - Saídas - Repasse Matriz - Prebenda Pastoral]**.
3. **Análise de Conferência do Caixa Físico (Espécie)**:
   - Compare o valor lançado em Dinheiro vs o Total Contado na Calculadora de Cédulas e Moedas.
   - Diga se o caixa fechou exato, com sobra ou com falta em dinheiro físico. Se houver discrepância, utilize o termo técnico "inconsistência" contábil.
4. **Parecer Executivo de Tesouraria e Anotações de Transparência / Orientação de Auditoria**:
   - Destaque o Parecer Executivo de Tesouraria avaliando a conformidade dos repasses, a dedução regular da Prebenda Pastoral (se aplicável), e a saúde financeira do caixa local.
   - Utilize a seção "Orientação de Auditoria" para recomendações fiscais e administrativas.
   - Use a forma correta "Expressamos nossa gratidão pela fidelidade..." ao concluir.
   - NUNCA utilize termos incorretos como "Exgressamos", "Orientação Auditiva" ou "inconsciência".
5. **Campo de Assinaturas Oficiais**: Inclua obrigatoriamente as linhas de assinatura para apenas: **Pastor Presidente**, **Tesoureiro** e **Pastor Local**.

Responda em Português do Brasil com excelente clareza, rigor gramatical e formatação impecável em Markdown (usando tabelas, tópicos e negritos).
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
        model: 'gemini-2.5-flash',
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
